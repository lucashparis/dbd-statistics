import * as React from "react";
import { ClipboardList, AlertTriangle } from "lucide-react";
import { MatchItem } from "@/components/molecules/MatchItem";
import { MatchItemSkeleton } from "@/components/molecules/MatchItemSkeleton";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/molecules/EmptyState";
import type { Match } from "@/types/killer";

interface MatchHistoryListProps {
  matches: Match[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error?: string | null;
  onLoadMore: () => void;
  onRetry?: () => void;
}

const SKELETON_COUNT = 10;
const LOADING_MORE_COUNT = 3;

export function MatchHistoryList({
  matches,
  hasMore,
  loading,
  loadingMore,
  error,
  onLoadMore,
  onRetry,
}: MatchHistoryListProps) {
  if (loading) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <MatchItemSkeleton key={i} />
        ))}
      </ul>
    );
  }

  if (error && matches.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load history"
          description={error}
        />
        {onRetry && (
          <div className="flex justify-center">
            <Button variant="default" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No matches recorded"
        description="Register wins and losses in the Killers tab to see the history here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {matches.map((match, i) => (
          <MatchItem key={match.id} match={match} index={i} />
        ))}
      </ul>

      {loadingMore && (
        <ul className="space-y-2">
          {Array.from({ length: LOADING_MORE_COUNT }).map((_, i) => (
            <MatchItemSkeleton key={i} />
          ))}
        </ul>
      )}

      {error && !loadingMore && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-muted">{error}</p>
          {onRetry && (
            <Button variant="default" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {hasMore && !loadingMore && !error && (
        <div className="flex justify-center pt-2">
          <Button variant="default" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
