"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { RankMetric, RankPage } from "@/types/profile";

async function fetchRankPage(metric: RankMetric, search: string, page: number): Promise<RankPage> {
  const params = new URLSearchParams({ metric, search, page: String(page) });
  const res = await fetch(`/api/rank?${params.toString()}`);
  if (!res.ok) throw new Error(`Rank request failed: ${res.status}`);
  return (await res.json()) as RankPage;
}

export function useRank(isActive: boolean, metric: RankMetric, search: string) {
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.rank, metric, search],
    queryFn: ({ pageParam }) => fetchRankPage(metric, search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: isActive,
  });

  return {
    entries: query.data?.pages.flatMap((p) => p.entries) ?? [],
    me: query.data?.pages[0]?.me ?? null,
    hasMore: query.hasNextPage,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.isError ? "Could not load the rank." : null,
    loadMore: () => {
      query.fetchNextPage();
    },
    retry: () => {
      query.refetch();
    },
  };
}
