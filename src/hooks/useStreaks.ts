"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { StreaksData } from "@/types/killer";

const EMPTY: StreaksData = {
  global: { longestWin: 0, longestLoss: 0 },
  perKiller: {},
};

async function fetchStreaks(): Promise<StreaksData> {
  const res = await fetch("/api/stats/streaks");
  if (!res.ok) throw new Error(`Streaks request failed: ${res.status}`);
  return (await res.json()) as StreaksData;
}

export function useStreaks() {
  const query = useQuery({
    queryKey: queryKeys.streaks,
    queryFn: fetchStreaks,
  });

  return {
    streaks: query.data ?? EMPTY,
    loading: query.isLoading,
  };
}
