"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { SeasonSelection } from "@/lib/seasons";
import type { StreaksData, Perspective } from "@/types/killer";

const EMPTY: StreaksData = {
  global: { longestWin: 0, longestLoss: 0 },
  perKiller: {},
};

async function fetchStreaks(season: SeasonSelection): Promise<StreaksData> {
  const res = await fetch(`/api/stats/streaks?season=${season}`);
  if (!res.ok) throw new Error(`Streaks request failed: ${res.status}`);
  return (await res.json()) as StreaksData;
}

// Streaks are survivor-only. In killer mode the query is disabled and the empty
// state is returned so the statistics view degrades cleanly (no streak data).
export function useStreaks(
  perspective: Perspective = "survivor",
  season: SeasonSelection = "all"
) {
  const query = useQuery({
    queryKey: queryKeys.streaks(perspective, season),
    queryFn: () => fetchStreaks(season),
    enabled: perspective === "survivor",
  });

  return {
    streaks: query.data ?? EMPTY,
    loading: query.isLoading,
  };
}
