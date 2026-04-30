"use client";

import * as React from "react";
import type { Match, HistoryPage } from "@/types/killer";

export function useHistory(isActive: boolean) {
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const initializedRef = React.useRef(false);

  const fetchPage = React.useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/history?page=${pageNum}`);
      const data: HistoryPage = await res.json();
      setMatches((prev) => (append ? [...prev, ...data.matches] : data.matches));
      setHasMore(data.hasMore);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isActive) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchPage(1, false);
      return;
    }
    setPage(1);
    fetchPage(1, false);
  }, [isActive, fetchPage]);

  const loadMore = React.useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [page, fetchPage]);

  return { matches, hasMore, loading, loadingMore, loadMore };
}
