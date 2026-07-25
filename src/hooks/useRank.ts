"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { SeasonSelection } from "@/lib/seasons";
import type { Perspective } from "@/types/killer";
import { rankThreshold, type RankMetric, type RankPage } from "@/types/profile";

async function fetchRankPage(
  metric: RankMetric,
  search: string,
  page: number,
  perspective: Perspective,
  season: SeasonSelection
): Promise<RankPage> {
  const params = new URLSearchParams({
    metric,
    search,
    page: String(page),
    perspective,
    season: String(season),
  });
  const res = await fetch(`/api/rank?${params.toString()}`);
  if (!res.ok) throw new Error(`Rank request failed: ${res.status}`);
  return (await res.json()) as RankPage;
}

export function useRank(
  isActive: boolean,
  metric: RankMetric,
  search: string,
  perspective: Perspective = "survivor",
  season: SeasonSelection = "all"
) {
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.rank(perspective, season), metric, search],
    queryFn: ({ pageParam }) => fetchRankPage(metric, search, pageParam, perspective, season),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: isActive,
  });

  return {
    entries: query.data?.pages.flatMap((p) => p.entries) ?? [],
    me: query.data?.pages[0]?.me ?? null,
    // Falls back to the local threshold while the first page is in flight, so
    // the copy never flashes the wrong minimum.
    minMatches: query.data?.pages[0]?.minMatches ?? rankThreshold(season),
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
