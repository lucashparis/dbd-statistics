import type { QueryClient } from "@tanstack/react-query";
import { seasonKey, type SeasonSelection } from "@/lib/seasons";
import type { Perspective } from "@/types/killer";

// Match-derived reads are keyed by perspective *and* season so the caches never
// collide. The first segment stays stable, so prefix-based invalidation
// (`invalidateMatchDerived`) still busts every perspective/season variant.
export const queryKeys = {
  killers: (p: Perspective, s: SeasonSelection) => ["killers", p, seasonKey(s)] as const,
  history: (p: Perspective, s: SeasonSelection) => ["history", p, seasonKey(s)] as const,
  streaks: (p: Perspective, s: SeasonSelection) => ["streaks", p, seasonKey(s)] as const,
  community: (p: Perspective, s: SeasonSelection) => ["community", p, seasonKey(s)] as const,
  rank: (p: Perspective, s: SeasonSelection) => ["rank", p, seasonKey(s)] as const,
  crews: (s: SeasonSelection) => ["crews", seasonKey(s)] as const,
  players: ["players"] as const,
  teams: ["teams"] as const,
  teamStreaks: ["teamStreaks"] as const,
  profile: ["profile"] as const,
  invites: ["invites"] as const,
  invitees: ["invitees"] as const,
  adminBans: ["adminBans"] as const,
  bannableUsers: ["bannableUsers"] as const,
};

// A `Match` write feeds every match-derived read: the killer grid/pie, the
// paginated history, the streak aggregates, the crews and the community/rank
// projections. Invalidating by first-segment prefix busts every perspective and
// season at once (the active window only writes to its own, so
// over-invalidation is cheap).
export function invalidateMatchDerived(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["killers"] });
  queryClient.invalidateQueries({ queryKey: ["history"] });
  queryClient.invalidateQueries({ queryKey: ["streaks"] });
  queryClient.invalidateQueries({ queryKey: ["community"] });
  queryClient.invalidateQueries({ queryKey: ["rank"] });
  queryClient.invalidateQueries({ queryKey: ["crews"] });
}
