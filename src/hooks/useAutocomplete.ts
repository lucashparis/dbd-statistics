"use client";

import { useState, useRef, useEffect } from "react";

export interface AutocompleteItem {
  id: number;
  name: string;
  imageUrl: string;
}

interface UseAutocompleteReturn<T> {
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
}

export function useAutocomplete<T extends AutocompleteItem>(items: T[]): UseAutocompleteReturn<T> {
  const [query, setQueryRaw] = useState("");
  const [selected, setSelected] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.trim()
    ? items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  function setQuery(q: string) {
    setQueryRaw(q);
    setSelected(null);
    setIsOpen(q.trim().length > 0);
    setHighlightedIndex(-1);
  }

  function select(item: T) {
    setSelected(item);
    setQueryRaw(item.name);
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
      select(suggestions[highlightedIndex]);
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
    select,
    clearSelection,
    handleKeyDown,
  };
}
