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
}

export function KillerCard({
  killer,
  loadingWin = false,
  loadingLoss = false,
  onWin,
  onLoss,
}: KillerCardProps) {
  return (
    <article
      className={cn(
        "card-dark card-hover flex flex-col overflow-hidden",
        "transition-all duration-300"
      )}
    >
      <div className="relative aspect-[3/4]">
        <KillerImage src={killer.imageUrl} alt={killer.name} className="absolute inset-0" />
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
