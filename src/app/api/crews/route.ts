import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewsForUser, getCrewDetail, resolveInvitees } from "@/lib/crews";
import { blockIfBanned, isBanned } from "@/lib/ban";
import { mutationError, parseSeason } from "@/lib/api";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  inviteeUserIds: z.array(z.string().min(1)).max(3).default([]),
  writePolicy: z.enum(["hostOnly", "allMembers"]).default("allMembers"),
});

export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const season = parseSeason(new URL(req.url).searchParams.get("season"));
  const crews = await getCrewsForUser(userId, season, await isBanned(userId));
  return NextResponse.json(crews);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A banned user cannot host a crew — creating one makes them the owner.
  const banned = await blockIfBanned(userId);
  if (banned) return banned;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, writePolicy } = parsed.data;

  const invitees = await resolveInvitees(parsed.data.inviteeUserIds, userId);
  if (!invitees.ok) {
    return NextResponse.json({ error: "Invalid invitees" }, { status: 400 });
  }

  try {
    const crew = await prisma.crew.create({
      data: {
        name,
        ownerId: userId,
        writePolicy,
        members: {
          create: [
            { userId, status: "accepted", isOwner: true, respondedAt: new Date() },
            ...invitees.ids.map((id) => ({ userId: id })),
          ],
        },
      },
    });

    const season = parseSeason(new URL(req.url).searchParams.get("season"));
    const detail = await getCrewDetail(userId, crew.id, season, false);
    return NextResponse.json(detail, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "A crew with that name already exists" }, { status: 409 });
    }
    return mutationError("create crew", e);
  }
}
