import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getCrewDetail, isCrewReady } from "@/lib/crews";
import { blockIfBanned } from "@/lib/ban";
import { decideStreakAction } from "@/lib/streak";
import { mutationError, parseId, parseSeason, readOnlySeason } from "@/lib/api";

const schema = z.object({
  killerId: z.number().int(),
  result: z.enum(["win", "loss"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const crewId = parseId(id);
  if (!crewId) return NextResponse.json({ error: "Invalid crew ID" }, { status: 400 });

  const season = parseSeason(new URL(req.url).searchParams.get("season"));
  const blocked = readOnlySeason(season);
  if (blocked) return blocked;

  // A banned user never logs a match — not even for a crew they belong to. The
  // crew matches someone else logs still fan out to them and count.
  const banned = await blockIfBanned(userId);
  if (banned) return banned;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { killerId, result } = parsed.data;

  const crew = await prisma.crew.findUnique({
    where: { id: crewId },
    select: { ownerId: true, writePolicy: true, members: { select: { userId: true, status: true } } },
  });
  if (!crew) return NextResponse.json({ error: "Crew not found" }, { status: 404 });

  const membership = crew.members.find((m) => m.userId === userId);
  if (!membership || membership.status !== "accepted") {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }
  if (!isCrewReady(crew.members)) {
    return NextResponse.json({ error: "Waiting for all members to accept" }, { status: 403 });
  }
  if (crew.writePolicy === "hostOnly" && crew.ownerId !== userId) {
    return NextResponse.json({ error: "Only the host can log for this crew" }, { status: 403 });
  }

  const killer = await prisma.killer.findUnique({ where: { id: killerId } });
  if (!killer) return NextResponse.json({ error: "Killer not found" }, { status: 404 });

  const acceptedIds = crew.members.filter((m) => m.status === "accepted").map((m) => m.userId);

  try {
    await prisma.$transaction(async (tx) => {
      const activeRun = await tx.crewStreakRun.findFirst({ where: { crewId, status: "active" } });
      const action = decideStreakAction(!!activeRun, result);

      let runId = activeRun?.id ?? null;
      if (action.createRun) {
        const run = await tx.crewStreakRun.create({ data: { crewId } });
        runId = run.id;
      }

      const crewMatch = await tx.crewMatch.create({
        data: {
          crewId,
          killerId,
          result,
          loggedByUserId: userId,
          crewStreakRunId: action.attachToRun ? runId : null,
        },
      });

      await tx.match.createMany({
        data: acceptedIds.map((memberId) => ({
          userId: memberId,
          killerId,
          result,
          crewMatchId: crewMatch.id,
        })),
      });

      if (action.incrementWin && runId !== null) {
        await tx.crewStreakRun.update({ where: { id: runId }, data: { winCount: { increment: 1 } } });
      }
      if (action.closeRun && runId !== null) {
        await tx.crewStreakRun.update({
          where: { id: runId },
          data: { status: "ended", endedAt: new Date() },
        });
      }
    });
  } catch (e) {
    return mutationError("log crew match", e);
  }

  for (const memberId of acceptedIds) revalidateTag(`streaks:${memberId}`, "max");
  revalidateTag("community", "max");

  const detail = await getCrewDetail(userId, crewId, season, false);
  return NextResponse.json(detail, { status: 201 });
}
