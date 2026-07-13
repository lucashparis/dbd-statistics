"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { HistoryPage } from "@/types/killer";

async function fetchHistoryPage(page: number): Promise<HistoryPage> {
  const res = await fetch(`/api/history?page=${page}`);
  if (!res.ok) throw new Error(`History request failed: ${res.status}`);
  return (await res.json()) as HistoryPage;
}

export function useHistory(isActive: boolean) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.history,
    queryFn: ({ pageParam }) => fetchHistoryPage(pageParam),
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
