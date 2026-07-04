import * as React from "react";
import Image from "next/image";
import { Swords, Skull, Activity, TrendingUp, Flame, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatItem } from "@/components/molecules/StatItem";
import { WinRateBadge } from "@/components/molecules/WinRateBadge";
import type { KillerStats } from "@/types/killer";

interface KillerDetailPanelProps {
  killer: KillerStats;
  longestWinStreak?: number;
  longestLossStreak?: number;
  className?: string;
}

KillerDetailPanel.Skeleton = function KillerDetailPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "card-dark overflow-hidden",
        "flex flex-col sm:flex-row gap-0 animate-pulse",
        className
      )}
    >
      <div className="relative h-64 sm:h-auto sm:w-48 shrink-0 bg-surface-3" />
      <div className="flex flex-col justify-center gap-6 p-6 flex-1">
        <div className="h-7 w-40 rounded bg-surface-3" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-4 rounded bg-surface-3" />
              <div className="h-6 w-12 rounded bg-surface-3" />
              <div className="h-3 w-10 rounded bg-surface-3" />
            </div>
          ))}
        </div>
        <div className="h-4 w-full max-w-xs rounded bg-surface-3" />
      </div>
    </div>
  );
};

export function KillerDetailPanel({ killer, longestWinStreak = 0, longestLossStreak = 0, className }: KillerDetailPanelProps) {
  return (
    <div
      className={cn(
        "card-dark overflow-hidden",
        "flex flex-col sm:flex-row gap-0",
        className
      )}
    >
      <div className="relative h-64 sm:h-auto sm:w-48 shrink-0">
        <Image
          src={killer.imageUrl}
          alt={killer.name}
          fill
          className="object-cover object-top"
          sizes="(max-width: 640px) 100vw, 192px"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface sm:block hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent sm:hidden" />
      </div>

      <div className="flex flex-col justify-center gap-6 p-6 flex-1">
        <h2
          className="text-2xl font-bold uppercase tracking-[0.12em] text-white glow-blood-text"
          style={{ fontFamily: "var(--font-cinzel), serif", color: "#DC143C" }}
        >
          {killer.name}
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatItem icon={Swords} value={killer.wins} label="Wins" valueClassName="text-emerald-400" />
          <StatItem icon={Skull} value={killer.losses} label="Losses" valueClassName="text-blood" highlight />
          <StatItem icon={Activity} value={killer.total} label="Total" />
          <StatItem icon={TrendingUp} value={`${killer.winRate}%`} label="Win Rate" highlight={killer.winRate >= 60} />
          <StatItem icon={Flame} value={longestWinStreak} label="Win Streak" valueClassName="text-emerald-400" />
          <StatItem icon={TrendingDown} value={longestLossStreak} label="Loss Streak" valueClassName="text-blood" />
        </div>

        <WinRateBadge winRate={killer.winRate} className="max-w-xs" />
      </div>
    </div>
  );
}
