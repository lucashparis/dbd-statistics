import { prisma } from "@/lib/prisma";
import { seasonWhere, type SeasonSelection } from "@/lib/seasons";
import type { Killer, Perspective } from "@/types/killer";

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

export async function getKillersForUser(
  userId: string,
  perspective: Perspective = "survivor",
  season: SeasonSelection = "all"
): Promise<Killer[]> {
  const [killers, grouped] = await Promise.all([
    prisma.killer.findMany({ orderBy: { name: "asc" } }),
    prisma.match.groupBy({
      by: ["killerId", "result"],
      where: { userId, perspective, ...seasonWhere(season) },
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
  killerId: number,
  perspective: Perspective = "survivor",
  season: SeasonSelection = "all"
): Promise<Killer | null> {
  const killer = await prisma.killer.findUnique({ where: { id: killerId } });
  if (!killer) return null;

  const window = seasonWhere(season);
  const [wins, losses] = await Promise.all([
    prisma.match.count({ where: { userId, killerId, result: "win", perspective, ...window } }),
    prisma.match.count({ where: { userId, killerId, result: "loss", perspective, ...window } }),
  ]);

  return serialize(killer, wins, losses);
}
