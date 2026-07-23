import type { QueryClient } from "@tanstack/react-query";
import type { Perspective } from "@/types/killer";

// Match-derived reads are keyed by perspective so the survivor and killer
// caches never collide. The first segment stays stable, so prefix-based
// invalidation (`invalidateMatchDerived`) still busts both perspectives.
export const queryKeys = {
  killers: (p: Perspective) => ["killers", p] as const,
  history: (p: Perspective) => ["history", p] as const,
  streaks: (p: Perspective) => ["streaks", p] as const,
  community: (p: Perspective) => ["community", p] as const,
  rank: (p: Perspective) => ["rank", p] as const,
  players: ["players"] as const,
  teams: ["teams"] as const,
  teamStreaks: ["teamStreaks"] as const,
  profile: ["profile"] as const,
  crews: ["crews"] as const,
  invites: ["invites"] as const,
  invitees: ["invitees"] as const,
};

// A `Match` write feeds every match-derived read: the killer grid/pie, the
// paginated history, the streak aggregates, and the community/rank projections.
// Invalidating by first-segment prefix busts both perspectives at once (the
// active mode only writes to its own perspective, so over-invalidation is cheap).
export function invalidateMatchDerived(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["killers"] });
  queryClient.invalidateQueries({ queryKey: ["history"] });
  queryClient.invalidateQueries({ queryKey: ["streaks"] });
  queryClient.invalidateQueries({ queryKey: ["community"] });
  queryClient.invalidateQueries({ queryKey: ["rank"] });
}
