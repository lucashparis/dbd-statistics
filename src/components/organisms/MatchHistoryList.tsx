import * as React from "react";
import { ClipboardList } from "lucide-react";
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
  onLoadMore: () => void;
}

const SKELETON_COUNT = 10;
const LOADING_MORE_COUNT = 3;

export function MatchHistoryList({
  matches,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
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

      {hasMore && !loadingMore && (
        <div className="flex justify-center pt-2">
          <Button variant="default" onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
