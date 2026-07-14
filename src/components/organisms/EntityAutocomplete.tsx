"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { KillerSearchInput } from "@/components/molecules/KillerSearchInput";
import { AutocompleteOption } from "@/components/molecules/AutocompleteOption";
import { FilterTag } from "@/components/molecules/FilterTag";
import type { AutocompleteItem } from "@/hooks/useAutocomplete";

interface EntityAutocompleteProps<T extends AutocompleteItem> {
  query: string;
  setQuery: (q: string) => void;
  selected: T | null;
  suggestions: T[];
  isOpen: boolean;
  highlightedIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  select: (item: T) => void;
  clearSelection: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  searchLabel: string;
  suggestionsLabel: string;
  notFoundLabel: string;
  placeholder?: string;
  className?: string;
}

export function EntityAutocomplete<T extends AutocompleteItem>({
  query,
  setQuery,
  selected,
  suggestions,
  isOpen,
  highlightedIndex,
  containerRef,
  select,
  clearSelection,
  handleKeyDown,
  searchLabel,
  suggestionsLabel,
  notFoundLabel,
  placeholder,
  className,
}: EntityAutocompleteProps<T>) {
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
        ariaLabel={searchLabel}
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
          aria-label={suggestionsLabel}
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto",
            "rounded-lg border border-subtle bg-surface-2 shadow-xl shadow-black/50 scrollbar-dark"
          )}
        >
          {suggestions.map((item, idx) => (
            <AutocompleteOption
              key={item.id}
              id={optionId(idx)}
              item={item}
              highlighted={idx === highlightedIndex}
              onClick={select}
            />
          ))}
        </ul>
      )}

      {isOpen && suggestions.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-subtle bg-surface-2 px-3 py-4 text-center text-xs text-muted shadow-xl">
          {notFoundLabel} &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
