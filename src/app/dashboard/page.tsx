import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillersForUser } from "@/lib/killers";
import { computeStats } from "@/lib/utils";
import { killerModeEnabled } from "@/lib/flags";
import type { Perspective } from "@/types/killer";
import { KillersPageClient } from "./page.client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const user = killerModeEnabled
    ? await prisma.user.findUnique({ where: { id: userId }, select: { preferredMode: true } })
    : null;
  const initialMode: Perspective = user?.preferredMode ?? "survivor";

  const killers = (await getKillersForUser(userId, initialMode)).map(computeStats);
  return <KillersPageClient initialKillers={killers} initialMode={initialMode} />;
}
