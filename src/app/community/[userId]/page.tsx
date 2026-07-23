import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/organisms/AppHeader";
import { PublicProfileView } from "@/components/organisms/PublicProfileView";
import { getPublicProfile } from "@/lib/community";
import { killerModeEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

export default async function CommunityProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [survivor, killer] = await Promise.all([
    getPublicProfile(userId, "survivor"),
    killerModeEnabled ? getPublicProfile(userId, "killer") : Promise.resolve(null),
  ]);
  if (!survivor) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted transition-colors hover:text-blood"
        >
          <ArrowLeft size={14} aria-hidden />
          Back
        </Link>
        <PublicProfileView survivor={survivor} killer={killer} />
      </main>
    </div>
  );
}
