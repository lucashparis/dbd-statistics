import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKillersForUser } from "@/lib/killers";
import { computeStats } from "@/lib/utils";
import { seasonsEnabled } from "@/lib/flags";
import { resolvePreferredSeason, type SeasonSelection } from "@/lib/seasons";
import type { Perspective } from "@/types/killer";
import { KillersPageClient } from "./page.client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  // Always loaded: `isAdmin` gates the Admin tab and the active ban decides
  // whether the write controls are live. Both are read per request
  // (`force-dynamic`), so a ban applies without forcing a new sign-in.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferredMode: true,
      preferredSeason: true,
      isAdmin: true,
      bans: { where: { liftedAt: null }, select: { id: true }, take: 1 },
    },
  });

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
      isAdmin={user?.isAdmin ?? false}
      isBanned={(user?.bans.length ?? 0) > 0}
    />
  );
}
