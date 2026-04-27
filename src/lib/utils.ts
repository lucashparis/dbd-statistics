import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Killer, KillerStats } from "@/types/killer";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeStats(killer: Killer): KillerStats {
  const total = killer.wins + killer.losses;
  const winRate = total === 0 ? 0 : Math.round((killer.wins / total) * 100);
  return { ...killer, total, winRate };
}

export function formatPercent(value: number): string {
  return `${value}%`;
}
