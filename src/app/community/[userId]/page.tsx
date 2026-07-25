import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/organisms/AppHeader";
import { PublicProfileView } from "@/components/organisms/PublicProfileView";
import { getPublicProfile } from "@/lib/community";
import { killerModeEnabled, seasonsEnabled } from "@/lib/flags";
import { listSeasons, parseSeasonParam, seasonLabel } from "@/lib/seasons";

export const dynamic = "force-dynamic";

export default async function CommunityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const [{ userId }, { season: seasonParam }] = await Promise.all([params, searchParams]);
  // Server-driven so the page stays a cacheable Server Component: prefetching
  // every season × perspective combination would fan out the queries instead.
  const season = seasonsEnabled ? parseSeasonParam(seasonParam) : "all";

  const [survivor, killer] = await Promise.all([
    getPublicProfile(userId, "survivor", season),
    killerModeEnabled ? getPublicProfile(userId, "killer", season) : Promise.resolve(null),
  ]);
  if (!survivor) notFound();

  const options = seasonsEnabled
    ? [...listSeasons().map((s) => ({ value: String(s.id), label: s.label })), { value: "all", label: seasonLabel("all") }]
    : [];
  const activeValue = season === "all" ? "all" : String(season);

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

        {options.length > 0 && (
          <nav
            aria-label="Season"
            className="mb-6 inline-flex flex-wrap gap-1 rounded-lg border border-subtle bg-surface-2 p-1"
          >
            {options.map((option) => (
              <Link
                key={option.value}
                href={`?season=${option.value}`}
                aria-current={option.value === activeValue ? "page" : undefined}
                className={
                  option.value === activeValue
                    ? "rounded-md bg-blood px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60"
                }
              >
                {option.label}
              </Link>
            ))}
          </nav>
        )}

        <PublicProfileView survivor={survivor} killer={killer} />
      </main>
    </div>
  );
}
