"use client";

import * as React from "react";
import type { Match, HistoryPage } from "@/types/killer";

export function useHistory(isActive: boolean) {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initializedRef = React.useRef(false);

  async function fetchPage(pageNum: number, append: boolean) {
    if (!append) setLoading(true);
    if (append) setLoadingMore(true);
    setError(null);

    try {
      const res = await fetch(`/api/history?page=${pageNum}`);
      if (!res.ok) throw new Error(`History request failed: ${res.status}`);
      const data: HistoryPage = await res.json();
      setMatches((prev) => (append ? [...prev, ...data.matches] : data.matches));
      setHasMore(data.hasMore);
    } catch {
      setError("Could not load match history.");
      if (!append) {
        setMatches([]);
        setHasMore(false);
      }
    } finally {
      if (!append) setLoading(false);
      if (append) setLoadingMore(false);
    }
  }

  React.useEffect(() => {
    if (!isActive) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchPage(1, false);
      return;
    }
    setPage(1);
    fetchPage(1, false);
  }, [isActive]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }

  function retry() {
    setPage(1);
    fetchPage(1, false);
  }

  return { matches, hasMore, loading, loadingMore, error, loadMore, retry };
}
