"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatPercent } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import type { KillerStats } from "@/types/killer";

const DEFAULT_LIMIT = 10;

interface KillerRankingListProps {
  killers: KillerStats[];
  onKillerClick?: (killer: KillerStats) => void;
}

function RankingItem({
  killer,
  rank,
  onClick,
}: {
  killer: KillerStats;
  rank: number;
  onClick?: (killer: KillerStats) => void;
}) {
  const isGoodRate = killer.winRate >= 60;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg bg-surface border border-subtle transition-colors duration-150",
        onClick && "cursor-pointer hover:border-blood/50 hover:bg-surface-2"
      )}
      onClick={() => onClick?.(killer)}
    >
      <span className="w-5 shrink-0 text-right text-xs font-mono text-muted">
        {rank}
      </span>

      <div className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden border border-subtle">
        <Image
          src={killer.imageUrl}
          alt={killer.name}
          fill
          className="object-cover object-top"
          sizes="36px"
          unoptimized
        />
      </div>

      <span className="flex-1 min-w-0 truncate text-sm font-medium text-white">
        {killer.name}
      </span>

      <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-muted">
        <span>
          <span className="font-semibold text-emerald-400">{killer.wins}</span> W
        </span>
        <span>
          <span className="font-semibold text-blood">{killer.losses}</span> L
        </span>
        <span>
          <span className="font-semibold text-white">{killer.total}</span> M
        </span>
      </div>

      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
          isGoodRate
            ? "bg-emerald-700/20 text-emerald-400 border-emerald-700/40"
            : "bg-blood/10 text-blood border-blood/30"
        )}
      >
        {formatPercent(killer.winRate)}
      </span>
    </li>
  );
}

export function KillerRankingList({ killers, onKillerClick }: KillerRankingListProps) {
  const [showAll, setShowAll] = useState(false);

  const ranked = [...killers]
    .filter((k) => k.total > 0)
    .sort((a, b) => b.total - a.total);

  const displayed = showAll ? ranked : ranked.slice(0, DEFAULT_LIMIT);

  if (ranked.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted">
        No match data yet. Register some wins or losses to see the ranking.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {displayed.map((killer, index) => (
          <RankingItem key={killer.id} killer={killer} rank={index + 1} onClick={onKillerClick} />
        ))}
      </ul>

      {ranked.length > DEFAULT_LIMIT && (
        <div className="flex justify-center pt-1">
          <Button variant="default" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show top 10" : `Show all ${ranked.length} killers`}
          </Button>
        </div>
      )}
    </div>
  );
}
