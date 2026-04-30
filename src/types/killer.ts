export interface Killer {
  id: number;
  name: string;
  imageUrl: string;
  wins: number;
  losses: number;
  createdAt: string;
  updatedAt: string;
}

export interface KillerStats extends Killer {
  total: number;
  winRate: number;
}

export type KillerUpdateAction = "win" | "loss";

export type MatchResult = "win" | "loss";

export interface Match {
  id: number;
  killerId: number;
  result: MatchResult;
  createdAt: string;
  killer: {
    id: number;
    name: string;
    imageUrl: string;
  };
}

export interface HistoryPage {
  matches: Match[];
  total: number;
  hasMore: boolean;
}
