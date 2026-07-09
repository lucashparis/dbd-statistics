"use client";

import * as React from "react";
import { MatchHistoryList } from "@/components/organisms/MatchHistoryList";
import { useHistory } from "@/hooks/useHistory";

interface HistoryTabTemplateProps {
  isActive: boolean;
}

export function HistoryTabTemplate({ isActive }: HistoryTabTemplateProps) {
  const { matches, hasMore, loading, loadingMore, error, loadMore, retry } =
    useHistory(isActive);

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
          All your recorded matches, from most recent to oldest.
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
