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
