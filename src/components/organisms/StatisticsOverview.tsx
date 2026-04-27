"use client";

import * as React from "react";
import { Swords, Skull, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { KillersPieChart } from "@/components/organisms/KillersPieChart";
import { StatItem } from "@/components/molecules/StatItem";
import type { KillerStats } from "@/types/killer";

interface StatisticsOverviewProps {
  killers: KillerStats[];
  selectedKiller: KillerStats | null;
  className?: string;
}

export function StatisticsOverview({ killers, selectedKiller, className }: StatisticsOverviewProps) {
  const totals = React.useMemo(() => {
    const target = selectedKiller ? [selectedKiller] : killers;
    const wins = target.reduce((s, k) => s + k.wins, 0);
    const losses = target.reduce((s, k) => s + k.losses, 0);
    const total = wins + losses;
    const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
    return { wins, losses, total, winRate };
  }, [killers, selectedKiller]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Swords, value: totals.wins, label: "Total Wins", color: "text-emerald-400" },
          { icon: Skull, value: totals.losses, label: "Total Losses", color: "text-blood" },
          { icon: Activity, value: totals.total, label: "Total Matches", color: "text-white" },
          { icon: TrendingUp, value: `${totals.winRate}%`, label: "Win Rate", color: totals.winRate >= 60 ? "text-emerald-400" : "text-blood" },
        ].map(({ icon, value, label, color }) => (
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
    </div>
  );
}
