import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getKillersForUser } from "@/lib/killers";
import { computeStats } from "@/lib/utils";
import { KillersPageClient } from "./page.client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const killers = (await getKillersForUser(session.user.id)).map(computeStats);
  return <KillersPageClient initialKillers={killers} />;
}
