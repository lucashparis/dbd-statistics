"use client";

import * as React from "react";
import { EntityAutocomplete } from "@/components/organisms/EntityAutocomplete";
import { KillerDetailPanel } from "@/components/organisms/KillerDetailPanel";
import { StatisticsOverview } from "@/components/organisms/StatisticsOverview";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { useStreaks } from "@/hooks/useStreaks";
import type { KillerStats } from "@/types/killer";

interface StatisticsTabTemplateProps {
  killers: KillerStats[];
  isLoading?: boolean;
  statsNav?: { killer: KillerStats; nonce: number } | null;
  onNavigateToStats?: (killer: KillerStats) => void;
}

export function StatisticsTabTemplate({ killers, isLoading, statsNav, onNavigateToStats }: StatisticsTabTemplateProps) {
  const autocomplete = useAutocomplete(killers);
  const { streaks } = useStreaks();
  const selectedStreaks = autocomplete.selected ? streaks.perKiller[autocomplete.selected.id] : undefined;

  React.useEffect(() => {
    if (statsNav) {
      autocomplete.select(statsNav.killer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsNav?.nonce]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="max-w-sm h-10 rounded-lg bg-surface-3 animate-pulse" />
        <StatisticsOverview.Skeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EntityAutocomplete
        {...autocomplete}
        placeholder="Filter statistics by killer..."
        className="max-w-sm"
        searchLabel="Search killers"
        suggestionsLabel="Killer suggestions"
        notFoundLabel="No killers found for"
      />

      {autocomplete.selected && (
        <KillerDetailPanel
          killer={autocomplete.selected}
          longestWinStreak={selectedStreaks?.longestWin ?? 0}
          longestLossStreak={selectedStreaks?.longestLoss ?? 0}
        />
      )}

      <StatisticsOverview
        killers={killers}
        selectedKiller={autocomplete.selected}
        streaks={streaks}
        onNavigateToStats={onNavigateToStats}
      />
    </div>
  );
}
