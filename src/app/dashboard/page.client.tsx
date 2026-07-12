"use client";

import { useState } from "react";
import { AppShell } from "@/components/templates/AppShell";
import { KillersTabTemplate } from "@/components/templates/KillersTabTemplate";
import { StatisticsTabTemplate } from "@/components/templates/StatisticsTabTemplate";
import { StreakTabTemplate } from "@/components/templates/StreakTabTemplate";
import { TeamTabTemplate } from "@/components/templates/TeamTabTemplate";
import { HistoryTabTemplate } from "@/components/templates/HistoryTabTemplate";
import { useKillers } from "@/hooks/useKillers";
import type { TabId } from "@/components/molecules/TabNav";
import type { KillerStats } from "@/types/killer";

interface KillersPageClientProps {
  initialKillers: KillerStats[];
}

export function KillersPageClient({ initialKillers }: KillersPageClientProps) {
  const {
    killers,
    isLoading,
    loadingWin,
    loadingLoss,
    loadingUndoWin,
    loadingUndoLoss,
    registerWin,
    registerLoss,
    undoWin,
    undoLoss,
  } = useKillers(initialKillers);

  const [activeTab, setActiveTab] = useState<TabId>("killers");
  const [statsNav, setStatsNav] = useState<{ killer: KillerStats; nonce: number } | null>(null);

  function navigateToStats(killer: KillerStats) {
    setStatsNav({ killer, nonce: Date.now() });
    setActiveTab("statistics");
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      killersContent={
        <KillersTabTemplate
          killers={killers}
          isLoading={isLoading}
          loadingWin={loadingWin}
          loadingLoss={loadingLoss}
          loadingUndoWin={loadingUndoWin}
          loadingUndoLoss={loadingUndoLoss}
          onWin={registerWin}
          onLoss={registerLoss}
          onUndoWin={undoWin}
          onUndoLoss={undoLoss}
          onNavigateToStats={navigateToStats}
        />
      }
      streakContent={<StreakTabTemplate isActive={activeTab === "streak"} killers={killers} />}
      statisticsContent={<StatisticsTabTemplate killers={killers} isLoading={isLoading} statsNav={statsNav} onNavigateToStats={navigateToStats} />}
      teamContent={<TeamTabTemplate isActive={activeTab === "team"} />}
      historyContent={<HistoryTabTemplate isActive={activeTab === "history"} />}
    />
  );
}
