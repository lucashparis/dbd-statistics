import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Killer, KillerStats, MatchResult, Streaks } from "@/types/killer";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

export function computeStats(killer: Killer): KillerStats {
  const total = killer.wins + killer.losses;
  return { ...killer, total, winRate: computeWinRate(killer.wins, killer.losses) };
}

export function aggregateStats(killers: Pick<Killer, "wins" | "losses">[]) {
  const wins = killers.reduce((sum, k) => sum + k.wins, 0);
  const losses = killers.reduce((sum, k) => sum + k.losses, 0);
  return { wins, losses, total: wins + losses, winRate: computeWinRate(wins, losses) };
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function computeStreaks(results: MatchResult[]): Streaks {
  let longestWin = 0;
  let longestLoss = 0;
  let currentWin = 0;
  let currentLoss = 0;

  for (const result of results) {
    if (result === "win") {
      currentWin += 1;
      currentLoss = 0;
      if (currentWin > longestWin) longestWin = currentWin;
      continue;
    }
    currentLoss += 1;
    currentWin = 0;
    if (currentLoss > longestLoss) longestLoss = currentLoss;
  }

  return { longestWin, longestLoss };
}
