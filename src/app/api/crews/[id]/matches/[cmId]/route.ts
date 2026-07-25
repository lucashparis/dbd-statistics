import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-helpers";
import { canWrite, getCrewDetail } from "@/lib/crews";
import { recomputeStreakRuns } from "@/lib/streak";
import { mutationError, parseId, parseSeason, readOnlySeason } from "@/lib/api";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; cmId: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, cmId } = await params;
  const crewId = parseId(id);
  const crewMatchId = parseId(cmId);
  if (!crewId || !crewMatchId) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const season = parseSeason(new URL(req.url).searchParams.get("season"));
  const blocked = readOnlySeason(season);
  if (blocked) return blocked;

  const crewMatch = await prisma.crewMatch.findUnique({
    where: { id: crewMatchId },
    select: {
      crewId: true,
      crew: {
        select: { ownerId: true, writePolicy: true, members: { select: { userId: true, status: true } } },
      },
    },
  });
  if (!crewMatch || crewMatch.crewId !== crewId) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const { ownerId, writePolicy, members } = crewMatch.crew;
  if (!members.some((m) => m.userId === userId && m.status === "accepted")) {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }
  if (!canWrite(members, writePolicy, ownerId, userId)) {
    return NextResponse.json({ error: "You cannot remove matches for this crew" }, { status: 403 });
  }

  const acceptedIds = members.filter((m) => m.status === "accepted").map((m) => m.userId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.crewMatch.delete({ where: { id: crewMatchId } });

      const remaining = await tx.crewMatch.findMany({
        where: { crewId },
        orderBy: { createdAt: "asc" },
        select: { id: true, result: true, createdAt: true },
      });

      await tx.crewStreakRun.deleteMany({ where: { crewId } });

      for (const run of recomputeStreakRuns(remaining)) {
        const created = await tx.crewStreakRun.create({
          data: {
            crewId,
            winCount: run.winCount,
            status: run.status,
            startedAt: run.startedAt,
            endedAt: run.endedAt,
          },
        });
        await tx.crewMatch.updateMany({
          where: { id: { in: run.matchIds } },
          data: { crewStreakRunId: created.id },
        });
      }
    });
  } catch (e) {
    return mutationError("delete crew match", e);
  }

  for (const memberId of acceptedIds) revalidateTag(`streaks:${memberId}`, "max");
  revalidateTag("community", "max");

  const detail = await getCrewDetail(userId, crewId, season);
  return NextResponse.json(detail);
}
