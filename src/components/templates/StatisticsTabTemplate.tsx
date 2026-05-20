"use client";

import * as React from "react";
import { KillerAutocomplete } from "@/components/organisms/KillerAutocomplete";
import { KillerDetailPanel } from "@/components/organisms/KillerDetailPanel";
import { StatisticsOverview } from "@/components/organisms/StatisticsOverview";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import type { KillerStats } from "@/types/killer";

interface StatisticsTabTemplateProps {
  killers: KillerStats[];
  isLoading?: boolean;
  statsNav?: { killer: KillerStats; nonce: number } | null;
  onNavigateToStats?: (killer: KillerStats) => void;
}

export function StatisticsTabTemplate({ killers, isLoading, statsNav, onNavigateToStats }: StatisticsTabTemplateProps) {
  const autocomplete = useAutocomplete(killers);

  React.useEffect(() => {
    if (statsNav) {
      autocomplete.selectKiller(statsNav.killer);
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
      <KillerAutocomplete
        killers={killers}
        {...autocomplete}
        placeholder="Filter statistics by killer..."
        className="max-w-sm"
      />

      {autocomplete.selected && (
        <KillerDetailPanel killer={autocomplete.selected} />
      )}

      <StatisticsOverview
        killers={killers}
        selectedKiller={autocomplete.selected}
        onNavigateToStats={onNavigateToStats}
      />
    </div>
  );
}
