import type { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  killers: ["killers"] as const,
  history: ["history"] as const,
  streaks: ["streaks"] as const,
  players: ["players"] as const,
  teams: ["teams"] as const,
  teamStreaks: ["teamStreaks"] as const,
};

// A `Match` write feeds every match-derived read: the killer grid/pie,
// the paginated history, and the streak aggregates (getKillersForUser and the
// history route filter only by userId, so team-streak matches count too).
export function invalidateMatchDerived(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.killers });
  queryClient.invalidateQueries({ queryKey: queryKeys.history });
  queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
}
