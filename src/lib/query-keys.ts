import type { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  killers: ["killers"] as const,
  history: ["history"] as const,
  streaks: ["streaks"] as const,
  players: ["players"] as const,
  teams: ["teams"] as const,
  teamStreaks: ["teamStreaks"] as const,
  profile: ["profile"] as const,
  community: ["community"] as const,
  rank: ["rank"] as const,
  crews: ["crews"] as const,
  invites: ["invites"] as const,
  invitees: ["invitees"] as const,
};

// A `Match` write feeds every match-derived read: the killer grid/pie,
// the paginated history, the streak aggregates, and the community/rank
// projections (all filter only by userId, so team-streak matches count too).
export function invalidateMatchDerived(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.killers });
  queryClient.invalidateQueries({ queryKey: queryKeys.history });
  queryClient.invalidateQueries({ queryKey: queryKeys.streaks });
  queryClient.invalidateQueries({ queryKey: queryKeys.community });
  queryClient.invalidateQueries({ queryKey: queryKeys.rank });
}
