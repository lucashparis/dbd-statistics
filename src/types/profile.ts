import type { KillerStats, StreaksData } from "@/types/killer";
import type { Survivor } from "@/types/survivor";

export interface KillerRef {
  id: number;
  name: string;
  imageUrl: string;
}

export interface ProfileStats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

// The current user's own profile, as returned by GET /api/profile. Always
// present (even before a profile exists) so the editor can prefill `name` from
// User.name; `isPublic` reflects whether a Profile row exists.
export interface MyProfile {
  name: string | null;
  nick: string;
  channelUrl: string | null;
  mainKiller: KillerRef | null;
  mainSurv: Survivor | null;
  isPublic: boolean;
}

export interface ProfileInput {
  name?: string;
  nick: string;
  channelUrl?: string | null;
  mainKillerId?: number | null;
  mainSurvId?: number | null;
}

// Public projection — never carries email/password.
export interface PublicProfileSummary {
  userId: string;
  name: string | null;
  nick: string;
  channelUrl: string | null;
  mainKiller: KillerRef | null;
  mainSurv: Survivor | null;
  stats: ProfileStats;
}

export interface PublicProfileDetail extends PublicProfileSummary {
  killers: KillerStats[];
  streaks: StreaksData;
}

export interface CommunityPage {
  profiles: PublicProfileSummary[];
  hasMore: boolean;
}

export type RankMetric = "matches" | "wins" | "winRate";

// A public summary plus its 1-indexed position in the eligible (>=30 matches)
// leaderboard, assigned before any search filter is applied.
export interface RankEntry extends PublicProfileSummary {
  rank: number;
}

// The viewer's own standing, resolved server-side from the session:
// - ranked        → in the eligible leaderboard (carries the entry + global rank)
// - belowThreshold → has a public profile but < 30 matches (`remaining` to go)
// - noProfile      → not discoverable yet — must create a public profile first
// `null` means unknown (still loading, or a degraded/error response).
export type RankViewer =
  | { status: "ranked"; entry: RankEntry }
  | { status: "belowThreshold"; total: number; remaining: number }
  | { status: "noProfile" };

export interface RankPage {
  entries: RankEntry[];
  hasMore: boolean;
  me: RankViewer | null;
}
