"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { BannableUser } from "@/types/ban";

async function fetchBannableUsers(q: string): Promise<BannableUser[]> {
  const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Failed to search players");
  return (await res.json()) as BannableUser[];
}

export function useBannableUserSearch(query: string) {
  const q = query.trim();
  const result = useQuery({
    queryKey: [...queryKeys.bannableUsers, q],
    queryFn: () => fetchBannableUsers(q),
    enabled: q.length >= 2,
  });

  return {
    results: result.data ?? [],
    loading: result.isFetching,
  };
}
