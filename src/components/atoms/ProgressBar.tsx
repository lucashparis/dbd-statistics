import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className, showLabel = false }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const barColor =
    percentage >= 60
      ? "bg-emerald-500"
      : percentage >= 40
        ? "bg-amber-500"
        : "bg-blood";

  return (
    <div className={cn("w-full", className)}>
      <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="mt-1 block text-right text-xs text-muted">{Math.round(percentage)}%</span>
      )}
    </div>
  );
}
