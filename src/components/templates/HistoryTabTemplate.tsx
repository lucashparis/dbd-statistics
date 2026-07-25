"use client";

import * as React from "react";
import { MatchHistoryList } from "@/components/organisms/MatchHistoryList";
import { useHistory } from "@/hooks/useHistory";
import { seasonLabel, type SeasonSelection } from "@/lib/seasons";
import type { Perspective } from "@/types/killer";

interface HistoryTabTemplateProps {
  isActive: boolean;
  perspective?: Perspective;
  season?: SeasonSelection;
}

export function HistoryTabTemplate({
  isActive,
  perspective = "survivor",
  season = "all",
}: HistoryTabTemplateProps) {
  const { matches, hasMore, loading, loadingMore, error, loadMore, retry } = useHistory(
    isActive,
    perspective,
    season
  );

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-xl font-bold text-white"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Match History
        </h2>
        <p className="mt-1 text-sm text-muted">
          {season === "all"
            ? "All your recorded matches, from most recent to oldest."
            : `${seasonLabel(season)} — from most recent to oldest.`}
        </p>
      </div>

      <MatchHistoryList
        matches={matches}
        hasMore={hasMore}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        onLoadMore={loadMore}
        onRetry={retry}
      />
    </div>
  );
}
