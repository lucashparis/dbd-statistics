"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { KillerStats } from "@/types/killer";

interface UseAutocompleteReturn {
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
}

export function useAutocomplete(killers: KillerStats[]): UseAutocompleteReturn {
  const [query, setQueryRaw] = useState("");
  const [selected, setSelected] = useState<KillerStats | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.trim()
    ? killers.filter((k) =>
        k.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    setSelected(null);
    setIsOpen(q.trim().length > 0);
    setHighlightedIndex(-1);
  }, []);

  const selectKiller = useCallback((killer: KillerStats) => {
    setSelected(killer);
    setQueryRaw(killer.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setQueryRaw("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        selectKiller(suggestions[highlightedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, suggestions, highlightedIndex, selectKiller]
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return {
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
  };
}
