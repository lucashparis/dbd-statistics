import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { getTeamStreak, recomputeStreakRuns } from "@/lib/streak";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
  }

  const match = await prisma.match.findFirst({ where: { id: matchId, userId } });
  if (!match || match.teamId === null) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  const teamId = match.teamId;

  await prisma.$transaction(async (tx) => {
    await tx.match.delete({ where: { id: matchId } });

    const remaining = await tx.match.findMany({
      where: { userId, teamId },
      orderBy: { createdAt: "asc" },
      select: { id: true, result: true, createdAt: true },
    });

    await tx.streakRun.deleteMany({ where: { userId, teamId } });

    for (const run of recomputeStreakRuns(remaining)) {
      const created = await tx.streakRun.create({
        data: {
          userId,
          teamId,
          winCount: run.winCount,
          status: run.status,
          startedAt: run.startedAt,
          endedAt: run.endedAt,
        },
      });
      await tx.match.updateMany({
        where: { id: { in: run.matchIds } },
        data: { streakRunId: created.id },
      });
    }
  });

  revalidateTag(`streaks:${userId}`, "max");
  revalidateTag("community", "max");

  const summary = await getTeamStreak(userId, teamId);
  return NextResponse.json(summary);
}
