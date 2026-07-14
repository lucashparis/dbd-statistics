"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { CommunityPage } from "@/types/profile";

async function fetchCommunityPage(page: number): Promise<CommunityPage> {
  const res = await fetch(`/api/community/profiles?page=${page}`);
  if (!res.ok) throw new Error(`Community request failed: ${res.status}`);
  return (await res.json()) as CommunityPage;
}

export function useCommunity(isActive: boolean) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.community,
    queryFn: ({ pageParam }) => fetchCommunityPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    enabled: isActive,
  });

  return {
    profiles: query.data?.pages.flatMap((p) => p.profiles) ?? [],
    hasMore: query.hasNextPage,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.isError ? "Could not load the community." : null,
    loadMore: () => {
      query.fetchNextPage();
    },
    retry: () => {
      query.refetch();
    },
  };
}
