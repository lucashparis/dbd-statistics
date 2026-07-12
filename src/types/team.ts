import type { MatchResult } from "./killer";

export interface Player {
  id: number;
  name: string;
  nick: string;
  createdAt: string;
}

export interface TeamMember {
  id: number;
  name: string;
  nick: string;
}

export interface Team {
  id: number;
  name: string;
  createdAt: string;
  members: TeamMember[];
}

export interface StreakMatch {
  id: number;
  result: MatchResult;
  createdAt: string;
  killer: { id: number; name: string; imageUrl: string };
}

export interface TeamStreak {
  team: Team;
  currentStreak: number;
  bestStreak: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  matches: StreakMatch[];
}
