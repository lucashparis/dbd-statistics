"use client";

import * as React from "react";
import { KillerAutocomplete } from "@/components/organisms/KillerAutocomplete";
import { KillerGrid } from "@/components/organisms/KillerGrid";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import type { KillerStats } from "@/types/killer";

interface KillersTabTemplateProps {
  killers: KillerStats[];
  loadingWin: number | null;
  loadingLoss: number | null;
  onWin: (id: number) => void;
  onLoss: (id: number) => void;
}

export function KillersTabTemplate({
  killers,
  loadingWin,
  loadingLoss,
  onWin,
  onLoss,
}: KillersTabTemplateProps) {
  const autocomplete = useAutocomplete(killers);

  const displayed = autocomplete.selected
    ? killers.filter((k) => k.id === autocomplete.selected!.id)
    : killers;

  return (
    <div className="space-y-4">
      <KillerAutocomplete
        killers={killers}
        {...autocomplete}
        placeholder="Search and filter killers..."
        className="max-w-sm"
      />
      <KillerGrid
        killers={displayed}
        loadingWin={loadingWin}
        loadingLoss={loadingLoss}
        onWin={onWin}
        onLoss={onLoss}
      />
    </div>
  );
}
