import { prisma } from "@/lib/prisma";
import type { Survivor } from "@/types/survivor";

export function getSurvivors(): Promise<Survivor[]> {
  return prisma.survivor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, imageUrl: true },
  });
}
