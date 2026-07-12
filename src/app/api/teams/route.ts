import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamsForUser, serializeTeam } from "@/lib/teams";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  playerIds: z.array(z.number().int()).min(1).max(4),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await getTeamsForUser(userId);
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name } = parsed.data;
  const playerIds = [...new Set(parsed.data.playerIds)];

  const owned = await prisma.player.count({
    where: { id: { in: playerIds }, userId },
  });
  if (owned !== playerIds.length) {
    return NextResponse.json({ error: "Invalid players" }, { status: 400 });
  }

  const existing = await prisma.team.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) {
    return NextResponse.json({ error: "Team name already exists" }, { status: 409 });
  }

  const team = await prisma.team.create({
    data: {
      userId,
      name,
      members: { create: playerIds.map((playerId) => ({ playerId })) },
    },
    include: { members: { include: { player: true } } },
  });

  return NextResponse.json(serializeTeam(team), { status: 201 });
}
