"use client";

import * as React from "react";
import { MatchHistoryList } from "@/components/organisms/MatchHistoryList";
import { useHistory } from "@/hooks/useHistory";
import type { Perspective } from "@/types/killer";

interface HistoryTabTemplateProps {
  isActive: boolean;
  perspective?: Perspective;
}

export function HistoryTabTemplate({ isActive, perspective = "survivor" }: HistoryTabTemplateProps) {
  const { matches, hasMore, loading, loadingMore, error, loadMore, retry } =
    useHistory(isActive, perspective);

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
