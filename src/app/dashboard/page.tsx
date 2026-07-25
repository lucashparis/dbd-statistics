import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillersForUser } from "@/lib/killers";
import { computeStats } from "@/lib/utils";
import { killerModeEnabled, seasonsEnabled } from "@/lib/flags";
import { resolvePreferredSeason, type SeasonSelection } from "@/lib/seasons";
import type { Perspective } from "@/types/killer";
import { KillersPageClient } from "./page.client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const needsPreferences = killerModeEnabled || seasonsEnabled;
  const user = needsPreferences
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredMode: true, preferredSeason: true },
      })
    : null;

  const initialMode: Perspective = user?.preferredMode ?? "survivor";
  const initialSeason: SeasonSelection = seasonsEnabled
    ? resolvePreferredSeason(user?.preferredSeason)
    : "all";

  const killers = (await getKillersForUser(userId, initialMode, initialSeason)).map(computeStats);
  return (
    <KillersPageClient
      initialKillers={killers}
      initialMode={initialMode}
      initialSeason={initialSeason}
    />
  );
}
