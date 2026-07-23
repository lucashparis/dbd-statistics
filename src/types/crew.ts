import type { CrewMemberStatus, CrewWritePolicy } from "@prisma/client";
import type { MatchResult } from "./killer";

export type { CrewMemberStatus, CrewWritePolicy };

export interface CrewMemberView {
  userId: string;
  name: string | null;
  nick: string | null;
  imageUrl: string | null;
  status: CrewMemberStatus;
  isOwner: boolean;
}

export interface CrewMatchView {
  id: number;
  result: MatchResult;
  createdAt: string;
  killer: { id: number; name: string; imageUrl: string };
  loggedBy: { userId: string; name: string | null; nick: string | null };
}

export interface Crew {
  id: number;
  name: string;
  writePolicy: CrewWritePolicy;
  ownerId: string;
  isOwner: boolean;
  isReady: boolean;
  canWrite: boolean;
  members: CrewMemberView[];
  currentStreak: number;
  bestStreak: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  matches: CrewMatchView[];
}

export interface Invite {
  id: number;
  crew: { id: number; name: string };
  invitedBy: { name: string | null; nick: string | null };
  invitedAt: string;
}

export interface Invitee {
  userId: string;
  name: string | null;
  nick: string;
  imageUrl: string | null;
}
