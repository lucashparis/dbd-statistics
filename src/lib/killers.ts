import { prisma } from "@/lib/prisma";
import type { Killer } from "@/types/killer";

interface KillerRow {
  id: number;
  name: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(k: KillerRow, wins: number, losses: number): Killer {
  return {
    id: k.id,
    name: k.name,
    imageUrl: k.imageUrl,
    wins,
    losses,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  };
}

export async function getKillersForUser(userId: string): Promise<Killer[]> {
  const [killers, grouped] = await Promise.all([
    prisma.killer.findMany({ orderBy: { name: "asc" } }),
    prisma.match.groupBy({
      by: ["killerId", "result"],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  const wins = new Map<number, number>();
  const losses = new Map<number, number>();
  for (const g of grouped) {
    (g.result === "win" ? wins : losses).set(g.killerId, g._count._all);
  }

  return killers.map((k) => serialize(k, wins.get(k.id) ?? 0, losses.get(k.id) ?? 0));
}

export async function getKillerForUser(
  userId: string,
  killerId: number
): Promise<Killer | null> {
  const killer = await prisma.killer.findUnique({ where: { id: killerId } });
  if (!killer) return null;

  const [wins, losses] = await Promise.all([
    prisma.match.count({ where: { userId, killerId, result: "win" } }),
    prisma.match.count({ where: { userId, killerId, result: "loss" } }),
  ]);

  return serialize(killer, wins, losses);
}
