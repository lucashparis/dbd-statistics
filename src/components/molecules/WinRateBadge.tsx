import * as React from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/atoms/ProgressBar";

interface WinRateBadgeProps {
  winRate: number;
  className?: string;
}

export function WinRateBadge({ winRate, className }: WinRateBadgeProps) {
  const color =
    winRate >= 60
      ? "text-emerald-400"
      : winRate >= 40
        ? "text-amber-400"
        : "text-blood";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted uppercase tracking-wider">Win Rate</span>
        <span className={cn("font-bold tabular-nums", color)}>{winRate}%</span>
      </div>
      <ProgressBar value={winRate} />
    </div>
  );
}
