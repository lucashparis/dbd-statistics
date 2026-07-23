"use client";

import { Swords, Skull, Activity, TrendingUp, Flame, TrendingDown } from "lucide-react";
import { aggregateStats, cn } from "@/lib/utils";
import { KillersPieChart } from "@/components/organisms/KillersPieChart";
import { KillerRankingList } from "@/components/organisms/KillerRankingList";
import { StatItem } from "@/components/molecules/StatItem";
import type { KillerStats, StreaksData } from "@/types/killer";

interface StatisticsOverviewProps {
  killers: KillerStats[];
  selectedKiller: KillerStats | null;
  streaks?: StreaksData | null;
  onNavigateToStats?: (killer: KillerStats) => void;
  className?: string;
}

StatisticsOverview.Skeleton = function StatisticsOverviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-dark p-4 flex flex-col items-center gap-2 animate-pulse">
            <div className="h-5 w-5 rounded bg-surface-3" />
            <div className="h-6 w-12 rounded bg-surface-3" />
            <div className="h-3 w-16 rounded bg-surface-3" />
          </div>
        ))}
      </div>
      <div className="card-dark p-4 animate-pulse">
        <div className="h-3 w-40 rounded bg-surface-3 mb-4" />
        <div className="h-64 w-full rounded bg-surface-3" />
      </div>
    </div>
  );
};

export function StatisticsOverview({ killers, selectedKiller, streaks, onNavigateToStats, className }: StatisticsOverviewProps) {
  const target = selectedKiller ? [selectedKiller] : killers;
  const totals = aggregateStats(target);

  const streakSource = selectedKiller ? streaks?.perKiller[selectedKiller.id] : streaks?.global;
  const longestWinStreak = streakSource?.longestWin ?? 0;
  const longestLossStreak = streakSource?.longestLoss ?? 0;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Swords, value: totals.wins, label: "Total Wins" },
          { icon: Skull, value: totals.losses, label: "Total Losses" },
          { icon: Activity, value: totals.total, label: "Total Matches" },
          { icon: TrendingUp, value: `${totals.winRate}%`, label: "Win Rate" },
          { icon: Flame, value: longestWinStreak, label: "Longest Win Run" },
          { icon: TrendingDown, value: longestLossStreak, label: "Longest Loss Run" },
        ].map(({ icon, value, label }) => (
          <div key={label} className="card-dark p-4 flex flex-col items-center gap-1">
            <StatItem icon={icon} value={value} label={label} />
          </div>
        ))}
      </div>

      <div className="card-dark p-4">
        <h3 className="mb-4 text-xs uppercase tracking-widest text-muted">
          {selectedKiller ? `${selectedKiller.name} · Wins vs Losses` : "Top Killers by Matches Played"}
        </h3>
        <KillersPieChart
          killers={killers}
          mode={selectedKiller ? "winloss" : "appearances"}
          selectedKiller={selectedKiller}
        />
      </div>

      {!selectedKiller && (
        <div className="card-dark p-4">
          <h3 className="mb-4 text-xs uppercase tracking-widest text-muted">
            Top Killers Ranking
          </h3>
          <KillerRankingList killers={killers} onKillerClick={onNavigateToStats} />
        </div>
      )}
    </div>
  );
}
