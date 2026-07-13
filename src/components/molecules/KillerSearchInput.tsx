"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface KillerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  role?: "combobox";
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaActiveDescendant?: string;
  ariaAutoComplete?: "list" | "none";
}

export function KillerSearchInput({
  value,
  onChange,
  onClear,
  onKeyDown,
  placeholder = "Search killers...",
  className,
  ariaLabel = "Search killers",
  role,
  ariaExpanded,
  ariaControls,
  ariaActiveDescendant,
  ariaAutoComplete,
}: KillerSearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role={role}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-activedescendant={ariaActiveDescendant}
        aria-autocomplete={ariaAutoComplete}
        className={cn(
          "h-10 w-full rounded-lg border border-subtle bg-surface-2 pl-9 pr-8 text-sm text-white",
          "placeholder:text-muted",
          "focus:outline-none focus:border-blood/60 focus:shadow-[0_0_0_1px_rgba(220,20,60,0.3)]",
          "transition-all duration-200"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
