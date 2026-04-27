import { prisma } from "@/lib/prisma";
import { computeStats } from "@/lib/utils";
import { KillersPageClient } from "./page.client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rawKillers = await prisma.killer.findMany({ orderBy: { name: "asc" } });
  const killers = rawKillers
    .map((k) => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    }))
    .map(computeStats);

  return <KillersPageClient initialKillers={killers} />;
}
