"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { KillerSearchInput } from "@/components/molecules/KillerSearchInput";
import { AutocompleteOption } from "@/components/molecules/AutocompleteOption";
import { FilterTag } from "@/components/molecules/FilterTag";
import type { KillerStats } from "@/types/killer";

interface KillerAutocompleteProps {
  killers: KillerStats[];
  query: string;
  setQuery: (q: string) => void;
  selected: KillerStats | null;
  suggestions: KillerStats[];
  isOpen: boolean;
  highlightedIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectKiller: (killer: KillerStats) => void;
  clearSelection: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
}

export function KillerAutocomplete({
  query,
  setQuery,
  selected,
  suggestions,
  isOpen,
  highlightedIndex,
  containerRef,
  selectKiller,
  clearSelection,
  handleKeyDown,
  placeholder,
  className,
}: KillerAutocompleteProps) {
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <KillerSearchInput
        value={query}
        onChange={setQuery}
        onClear={clearSelection}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
      />

      {selected && (
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterTag label={selected.name} onRemove={clearSelection} />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto",
            "rounded-lg border border-subtle bg-surface-2 shadow-xl shadow-black/50 scrollbar-dark"
          )}
        >
          {suggestions.map((killer, idx) => (
            <AutocompleteOption
              key={killer.id}
              killer={killer}
              highlighted={idx === highlightedIndex}
              onClick={selectKiller}
            />
          ))}
        </div>
      )}

      {isOpen && suggestions.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-subtle bg-surface-2 px-3 py-4 text-center text-xs text-muted shadow-xl">
          No killers found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
