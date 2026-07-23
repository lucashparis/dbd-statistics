"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { HistoryPage, Perspective } from "@/types/killer";

async function fetchHistoryPage(page: number, perspective: Perspective): Promise<HistoryPage> {
  const res = await fetch(`/api/history?page=${page}&perspective=${perspective}`);
  if (!res.ok) throw new Error(`History request failed: ${res.status}`);
  return (await res.json()) as HistoryPage;
}

export function useHistory(isActive: boolean, perspective: Perspective = "survivor") {
  const query = useInfiniteQuery({
    queryKey: queryKeys.history(perspective),
    queryFn: ({ pageParam }) => fetchHistoryPage(pageParam, perspective),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: isActive,
  });

  return {
    matches: query.data?.pages.flatMap((p) => p.matches) ?? [],
    hasMore: query.hasNextPage,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.isError ? "Could not load match history." : null,
    loadMore: () => {
      query.fetchNextPage();
    },
    retry: () => {
      query.refetch();
    },
  };
}
