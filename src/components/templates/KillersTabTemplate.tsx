"use client";

import * as React from "react";
import { EntityAutocomplete } from "@/components/organisms/EntityAutocomplete";
import { KillerGrid } from "@/components/organisms/KillerGrid";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import type { KillerStats } from "@/types/killer";

interface KillersTabTemplateProps {
  killers: KillerStats[];
  isLoading?: boolean;
  loadingWin: number | null;
  loadingLoss: number | null;
  loadingUndoWin: number | null;
  loadingUndoLoss: number | null;
  onWin: (id: number) => void;
  onLoss: (id: number) => void;
  onUndoWin: (id: number) => void;
  onUndoLoss: (id: number) => void;
  onNavigateToStats: (killer: KillerStats) => void;
}

export function KillersTabTemplate({
  killers,
  isLoading,
  loadingWin,
  loadingLoss,
  loadingUndoWin,
  loadingUndoLoss,
  onWin,
  onLoss,
  onUndoWin,
  onUndoLoss,
  onNavigateToStats,
}: KillersTabTemplateProps) {
  const autocomplete = useAutocomplete(killers);

  const displayed = autocomplete.selected
    ? killers.filter((k) => k.id === autocomplete.selected!.id)
    : killers;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="max-w-sm h-10 rounded-lg bg-surface-3 animate-pulse" />
        <KillerGrid.Skeleton count={12} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EntityAutocomplete
        {...autocomplete}
        placeholder="Search and filter killers..."
        className="max-w-sm"
        searchLabel="Search killers"
        suggestionsLabel="Killer suggestions"
        notFoundLabel="No killers found for"
      />
      <KillerGrid
        killers={displayed}
        loadingWin={loadingWin}
        loadingLoss={loadingLoss}
        loadingUndoWin={loadingUndoWin}
        loadingUndoLoss={loadingUndoLoss}
        onWin={onWin}
        onLoss={onLoss}
        onUndoWin={onUndoWin}
        onUndoLoss={onUndoLoss}
        onKillerClick={onNavigateToStats}
      />
    </div>
  );
}
