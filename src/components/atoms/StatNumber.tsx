import * as React from "react";
import { cn } from "@/lib/utils";

interface StatNumberProps {
  value: number | string;
  label: string;
  className?: string;
  valueClassName?: string;
  highlight?: boolean;
}

export function StatNumber({ value, label, className, valueClassName, highlight = false }: StatNumberProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums leading-none",
          highlight ? "text-blood glow-blood-text" : "text-white",
          valueClassName
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}
