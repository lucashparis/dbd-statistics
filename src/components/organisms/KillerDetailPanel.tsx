import * as React from "react";
import Image from "next/image";
import { Swords, Skull, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatItem } from "@/components/molecules/StatItem";
import { WinRateBadge } from "@/components/molecules/WinRateBadge";
import type { KillerStats } from "@/types/killer";

interface KillerDetailPanelProps {
  killer: KillerStats;
  className?: string;
}

export function KillerDetailPanel({ killer, className }: KillerDetailPanelProps) {
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatItem icon={Swords} value={killer.wins} label="Wins" valueClassName="text-emerald-400" />
          <StatItem icon={Skull} value={killer.losses} label="Losses" valueClassName="text-blood" highlight />
          <StatItem icon={Activity} value={killer.total} label="Total" />
          <StatItem icon={TrendingUp} value={`${killer.winRate}%`} label="Win Rate" highlight={killer.winRate >= 60} />
        </div>

        <WinRateBadge winRate={killer.winRate} className="max-w-xs" />
      </div>
    </div>
  );
}
