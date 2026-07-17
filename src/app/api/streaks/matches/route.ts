import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { decideStreakAction, getTeamStreak } from "@/lib/streak";

const schema = z.object({
  teamId: z.number().int(),
  killerId: z.number().int(),
  result: z.enum(["win", "loss"]),
});

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { teamId, killerId, result } = parsed.data;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.userId !== userId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const killer = await prisma.killer.findUnique({ where: { id: killerId } });
  if (!killer) {
    return NextResponse.json({ error: "Killer not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const activeRun = await tx.streakRun.findFirst({
      where: { userId, teamId, status: "active" },
    });
    const action = decideStreakAction(!!activeRun, result);

    let runId = activeRun?.id ?? null;
    if (action.createRun) {
      const run = await tx.streakRun.create({ data: { userId, teamId } });
      runId = run.id;
    }

    await tx.match.create({
      data: {
        userId,
        teamId,
        killerId,
        result,
        streakRunId: action.attachToRun ? runId : null,
      },
    });

    if (action.incrementWin && runId !== null) {
      await tx.streakRun.update({ where: { id: runId }, data: { winCount: { increment: 1 } } });
    }
    if (action.closeRun && runId !== null) {
      await tx.streakRun.update({
        where: { id: runId },
        data: { status: "ended", endedAt: new Date() },
      });
    }
  });

  revalidateTag(`streaks:${userId}`, "max");
  revalidateTag("community", "max");

  const summary = await getTeamStreak(userId, teamId);
  return NextResponse.json(summary, { status: 201 });
}
