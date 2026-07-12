import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStreaks } from "@/lib/utils";
import type { MatchResult, StreaksData } from "@/types/killer";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    where: { userId: session.user.id },
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

  const payload: StreaksData = { global, perKiller };
  return NextResponse.json(payload);
}
