"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Perspective } from "@/types/killer";
import type { CommunityPage } from "@/types/profile";

async function fetchCommunityPage(page: number, perspective: Perspective): Promise<CommunityPage> {
  const res = await fetch(`/api/community/profiles?page=${page}&perspective=${perspective}`);
  if (!res.ok) throw new Error(`Community request failed: ${res.status}`);
  return (await res.json()) as CommunityPage;
}

export function useCommunity(isActive: boolean, perspective: Perspective = "survivor") {
  const query = useInfiniteQuery({
    queryKey: queryKeys.community(perspective),
    queryFn: ({ pageParam }) => fetchCommunityPage(pageParam, perspective),
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
