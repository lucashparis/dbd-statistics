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
