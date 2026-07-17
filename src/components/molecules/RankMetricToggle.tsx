"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { RankMetric } from "@/types/profile";

const OPTIONS: { value: RankMetric; label: string }[] = [
  { value: "matches", label: "Matches" },
  { value: "wins", label: "Wins" },
  { value: "winRate", label: "Win rate" },
];

interface RankMetricToggleProps {
  value: RankMetric;
  onChange: (metric: RankMetric) => void;
  className?: string;
}

export function RankMetricToggle({ value, onChange, className }: RankMetricToggleProps) {
  return (
    <div
      role="group"
      aria-label="Sort rank by"
      className={cn("inline-flex rounded-lg border border-subtle bg-surface-2 p-1", className)}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60",
              active ? "bg-blood text-white" : "text-muted hover:text-white"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
