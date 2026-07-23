"use client";

import * as React from "react";
import { Skull, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMode } from "@/contexts/ModeContext";
import type { Perspective } from "@/types/killer";

const OPTIONS: { value: Perspective; label: string; Icon: typeof Skull }[] = [
  { value: "survivor", label: "Surv", Icon: Ghost },
  { value: "killer", label: "Killer", Icon: Skull },
];

export function ModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useMode();

  return (
    <div
      role="group"
      aria-label="Play perspective"
      className={cn("inline-flex rounded-lg border border-subtle bg-surface-2 p-1", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = value === mode;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => setMode(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer sm:px-3",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60",
              active ? "bg-blood text-white" : "text-muted hover:text-white"
            )}
          >
            <Icon size={15} aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
