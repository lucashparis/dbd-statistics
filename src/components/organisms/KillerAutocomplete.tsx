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
  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const listboxOpen = isOpen && suggestions.length > 0;
  const activeDescendant =
    listboxOpen && highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <KillerSearchInput
        value={query}
        onChange={setQuery}
        onClear={clearSelection}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        role="combobox"
        ariaAutoComplete="list"
        ariaExpanded={listboxOpen}
        ariaControls={listboxOpen ? listboxId : undefined}
        ariaActiveDescendant={activeDescendant}
      />

      {selected && (
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterTag label={selected.name} onRemove={clearSelection} />
        </div>
      )}

      {listboxOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Killer suggestions"
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto",
            "rounded-lg border border-subtle bg-surface-2 shadow-xl shadow-black/50 scrollbar-dark"
          )}
        >
          {suggestions.map((killer, idx) => (
            <AutocompleteOption
              key={killer.id}
              id={optionId(idx)}
              killer={killer}
              highlighted={idx === highlightedIndex}
              onClick={selectKiller}
            />
          ))}
        </ul>
      )}

      {isOpen && suggestions.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-subtle bg-surface-2 px-3 py-4 text-center text-xs text-muted shadow-xl">
          No killers found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
