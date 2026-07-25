"use client";

import * as React from "react";
import { Trophy, AlertTriangle, Search } from "lucide-react";
import { useRank } from "@/hooks/useRank";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { RankMetricToggle } from "@/components/molecules/RankMetricToggle";
import { RankRow } from "@/components/molecules/RankRow";
import { RankSelfBanner } from "@/components/molecules/RankSelfBanner";
import { KillerSearchInput } from "@/components/molecules/KillerSearchInput";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Button } from "@/components/atoms/Button";
import { type RankMetric } from "@/types/profile";
import { seasonLabel, type SeasonSelection } from "@/lib/seasons";
import type { Perspective } from "@/types/killer";

interface RankTabTemplateProps {
  isActive: boolean;
  perspective?: Perspective;
  season?: SeasonSelection;
}

export function RankTabTemplate({ isActive, perspective = "survivor", season = "all" }: RankTabTemplateProps) {
  const [metric, setMetric] = React.useState<RankMetric>("matches");
  const [searchInput, setSearchInput] = React.useState("");
  const search = useDebouncedValue(searchInput, 300);

  const { entries, me, minMatches, hasMore, loading, loadingMore, error, loadMore, retry } = useRank(
    isActive,
    metric,
    search,
    perspective,
    season
  );
  const windowLabel = season === "all" ? "" : ` in ${seasonLabel(season)}`;

  const hasSearch = search.trim().length > 0;
  const meUserId = me?.status === "ranked" ? me.entry.userId : undefined;

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-dark h-20 animate-pulse" />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-col items-center gap-4">
        <EmptyState icon={AlertTriangle} title="Could not load the rank" description={error} />
        <Button variant="default" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  } else if (entries.length === 0) {
    body = hasSearch ? (
      <EmptyState
        icon={Search}
        title="No players match your search"
        description="Try a different name or nick."
      />
    ) : (
      <EmptyState
        icon={Trophy}
        title={`No players have ${minMatches}+ matches${windowLabel} yet`}
        description={`Once players reach ${minMatches} matches${windowLabel}, they'll show up here.`}
      />
    );
  } else {
    body = (
      <div className="space-y-3">
        {entries.map((entry) => (
          <RankRow
            key={entry.userId}
            entry={entry}
            metric={metric}
            isMe={entry.userId === meUserId}
          />
        ))}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="default" onClick={loadMore} loading={loadingMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Rank</h2>
        <p className="mt-1 text-sm text-muted">
          The community leaderboard — compare matches, wins and win rate.
        </p>
      </div>

      <p className="text-xs text-muted">
        Only players with at least {minMatches} matches{windowLabel} appear in the rank.
      </p>

      {!loading && !error && (
        <RankSelfBanner me={me} metric={metric} minMatches={minMatches} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RankMetricToggle value={metric} onChange={setMetric} />
        <KillerSearchInput
          value={searchInput}
          onChange={setSearchInput}
          onClear={() => setSearchInput("")}
          placeholder="Search by name or nick…"
          ariaLabel="Search rank"
          className="sm:w-64"
        />
      </div>

      {body}
    </div>
  );
}
