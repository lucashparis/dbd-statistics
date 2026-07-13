import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStreaks } from "@/lib/utils";
import type { MatchResult, StreaksData } from "@/types/killer";

async function computeStreaksForUser(userId: string): Promise<StreaksData> {
  const matches = await prisma.match.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { killerId: true, result: true },
  });

  const global = computeStreaks(matches.map((m) => m.result));

  const byKiller = new Map<number, MatchResult[]>();
  for (const match of matches) {
    const list = byKiller.get(match.killerId) ?? [];
    list.push(match.result);
    byKiller.set(match.killerId, list);
  }

  const perKiller: StreaksData["perKiller"] = {};
  for (const [killerId, results] of byKiller) {
    perKiller[killerId] = computeStreaks(results);
  }

  return { global, perKiller };
}

// Cached per user so the full recompute only runs when a match changes. The match
// mutation routes call `revalidateTag("streaks:<userId>", "max")` to invalidate it
// (stale-while-revalidate); `revalidate` is a time-based safety net if a tag call
// is ever missed. Streaks are a secondary "longest run" metric, so brief staleness
// is acceptable.
const STREAKS_TTL_SECONDS = 60;

function getStreaksForUser(userId: string): Promise<StreaksData> {
  return unstable_cache(
    () => computeStreaksForUser(userId),
    ["streaks", userId],
    { tags: [`streaks:${userId}`], revalidate: STREAKS_TTL_SECONDS }
  )();
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await getStreaksForUser(session.user.id);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("streaks route failed", e);
    return NextResponse.json(
      { error: "Failed to fetch streaks" },
      { status: 500 }
    );
  }
}
