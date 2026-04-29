"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { KillerImage } from "@/components/atoms/KillerImage";
import { WinRateBadge } from "@/components/molecules/WinRateBadge";
import { StatRow } from "@/components/molecules/StatRow";
import { ActionButtons } from "@/components/molecules/ActionButtons";
import type { KillerStats } from "@/types/killer";

interface KillerCardProps {
  killer: KillerStats;
  loadingWin?: boolean;
  loadingLoss?: boolean;
  onWin: (id: number) => void;
  onLoss: (id: number) => void;
  onKillerClick?: (killer: KillerStats) => void;
}

export function KillerCard({
  killer,
  loadingWin = false,
  loadingLoss = false,
  onWin,
  onLoss,
  onKillerClick,
}: KillerCardProps) {
  return (
    <article
      className={cn(
        "card-dark card-hover flex flex-col overflow-hidden",
        "transition-all duration-300"
      )}
    >
      <div
        className={cn(
          "relative aspect-3/4",
          onKillerClick && "cursor-pointer"
        )}
        onClick={() => onKillerClick?.(killer)}
        role={onKillerClick ? "button" : undefined}
        tabIndex={onKillerClick ? 0 : undefined}
        aria-label={onKillerClick ? `View ${killer.name} statistics` : undefined}
        onKeyDown={(e) => {
          if (onKillerClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onKillerClick(killer);
          }
        }}
      >
        <KillerImage src={killer.imageUrl} alt={killer.name} className="absolute inset-0" />
        {onKillerClick && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors duration-200" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3
            className="font-display text-sm font-bold uppercase tracking-wider text-white"
            style={{ fontFamily: "var(--font-cinzel), serif", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {killer.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <StatRow wins={killer.wins} losses={killer.losses} total={killer.total} />
        <WinRateBadge winRate={killer.winRate} />
        <ActionButtons
          killerId={killer.id}
          loadingWin={loadingWin}
          loadingLoss={loadingLoss}
          onWin={onWin}
          onLoss={onLoss}
        />
      </div>
    </article>
  );
}
