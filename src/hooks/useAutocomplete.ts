"use client";

import { useState, useRef, useEffect } from "react";
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

  function setQuery(q: string) {
    setQueryRaw(q);
    setSelected(null);
    setIsOpen(q.trim().length > 0);
    setHighlightedIndex(-1);
  }

  function selectKiller(killer: KillerStats) {
    setSelected(killer);
    setQueryRaw(killer.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function clearSelection() {
    setSelected(null);
    setQueryRaw("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectKiller(suggestions[highlightedIndex]);
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

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
