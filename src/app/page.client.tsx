"use client";

import * as React from "react";
import { AppShell } from "@/components/templates/AppShell";
import { KillersTabTemplate } from "@/components/templates/KillersTabTemplate";
import { StatisticsTabTemplate } from "@/components/templates/StatisticsTabTemplate";
import { useKillers } from "@/hooks/useKillers";
import type { TabId } from "@/components/molecules/TabNav";
import type { KillerStats } from "@/types/killer";

interface KillersPageClientProps {
  initialKillers: KillerStats[];
}

export function KillersPageClient({ initialKillers }: KillersPageClientProps) {
  const { killers, loadingWin, loadingLoss, registerWin, registerLoss } =
    useKillers(initialKillers);

  const [activeTab, setActiveTab] = React.useState<TabId>("killers");
  const [statsNav, setStatsNav] = React.useState<{ killer: KillerStats; nonce: number } | null>(null);

  const navigateToStats = React.useCallback((killer: KillerStats) => {
    setStatsNav({ killer, nonce: Date.now() });
    setActiveTab("statistics");
  }, []);

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      killersContent={
        <KillersTabTemplate
          killers={killers}
          loadingWin={loadingWin}
          loadingLoss={loadingLoss}
          onWin={registerWin}
          onLoss={registerLoss}
          onNavigateToStats={navigateToStats}
        />
      }
      statisticsContent={<StatisticsTabTemplate killers={killers} statsNav={statsNav} />}
    />
  );
}
