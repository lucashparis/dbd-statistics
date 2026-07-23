"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Invitee } from "@/types/crew";

async function fetchInvitees(q: string): Promise<Invitee[]> {
  const res = await fetch(`/api/crews/invitees?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Failed to search players");
  return (await res.json()) as Invitee[];
}

export function useInviteeSearch(query: string) {
  const q = query.trim();
  const result = useQuery({
    queryKey: [...queryKeys.invitees, q],
    queryFn: () => fetchInvitees(q),
    enabled: q.length >= 2,
  });

  return {
    results: result.data ?? [],
    loading: result.isFetching,
  };
}
