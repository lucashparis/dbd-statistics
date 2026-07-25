"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSeason } from "@/contexts/SeasonContext";
import { seasonLabel, type SeasonSelection } from "@/lib/seasons";

const itemClass =
  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-gray-300 outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-white";

// A dropdown instead of a button group: the list grows by one entry every
// quarter. Radix rather than a native <select> so the panel inherits the dark
// theme — a native option list is painted by the OS and ignores our tokens.
export function SeasonSelect({ className }: { className?: string }) {
  const { season, setSeason, seasons } = useSeason();

  const options: { value: SeasonSelection; label: string; short: string }[] = [
    ...seasons.map((s) => ({ value: s.id, label: s.label, short: `S${s.id}` })),
    { value: "all" as const, label: seasonLabel("all"), short: "All" },
  ];
  const active = options.find((o) => o.value === season) ?? options[0];

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Season"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-subtle bg-surface-2 px-2 py-1.5 text-sm font-medium text-white",
            "cursor-pointer transition-colors hover:border-blood/40 hover:bg-surface-3",
            "outline-none focus-visible:ring-2 focus-visible:ring-blood/60 sm:px-3",
            className
          )}
        >
          <CalendarRange size={15} className="shrink-0 text-muted" aria-hidden />
          <span className="hidden sm:inline">{active.label}</span>
          <span className="sm:hidden">{active.short}</span>
          <ChevronDown size={14} className="shrink-0 text-muted" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[170px] rounded-lg border border-subtle bg-surface-2 p-1 shadow-xl shadow-black/50"
        >
          <DropdownMenu.RadioGroup
            value={String(active.value)}
            onValueChange={(value) => setSeason(value === "all" ? "all" : Number(value))}
          >
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={String(option.value)}
                value={String(option.value)}
                className={cn(itemClass, option.value === active.value && "text-white")}
              >
                {option.label}
                {option.value === active.value && (
                  <Check size={14} className="shrink-0 text-blood" aria-hidden />
                )}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
