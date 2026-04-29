"use client";

import * as React from "react";
import { Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { KillerCard } from "@/components/organisms/KillerCard";
import { EmptyState } from "@/components/molecules/EmptyState";
import type { KillerStats } from "@/types/killer";

interface KillerGridProps {
  killers: KillerStats[];
  loadingWin: number | null;
  loadingLoss: number | null;
  onWin: (id: number) => void;
  onLoss: (id: number) => void;
  onKillerClick?: (killer: KillerStats) => void;
  className?: string;
}

function CardSkeleton() {
  return (
    <div className="card-dark overflow-hidden animate-pulse">
      <div className="aspect-3/4 bg-surface-3" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-2/3 rounded bg-surface-3" />
        <div className="h-2 w-full rounded bg-surface-3" />
        <div className="h-8 w-full rounded bg-surface-3" />
      </div>
    </div>
  );
}

export function KillerGrid({
  killers,
  loadingWin,
  loadingLoss,
  onWin,
  onLoss,
  onKillerClick,
  className,
}: KillerGridProps) {
  if (killers.length === 0) {
    return (
      <EmptyState
        icon={Ghost}
        title="No killers found"
        description="Try adjusting your search filter."
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        className
      )}
    >
      {killers.map((killer) => (
        <KillerCard
          key={killer.id}
          killer={killer}
          loadingWin={loadingWin === killer.id}
          loadingLoss={loadingLoss === killer.id}
          onWin={onWin}
          onLoss={onLoss}
          onKillerClick={onKillerClick}
        />
      ))}
    </div>
  );
}

KillerGrid.Skeleton = function KillerGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};
