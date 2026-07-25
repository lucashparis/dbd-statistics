"use client";

import { useState } from "react";
import { AppShell } from "@/components/templates/AppShell";
import { KillersTabTemplate } from "@/components/templates/KillersTabTemplate";
import { StatisticsTabTemplate } from "@/components/templates/StatisticsTabTemplate";
import { StreakTabTemplate } from "@/components/templates/StreakTabTemplate";
import { TeamTabTemplate } from "@/components/templates/TeamTabTemplate";
import { CrewStreakTabTemplate } from "@/components/templates/CrewStreakTabTemplate";
import { CrewTeamTabTemplate } from "@/components/templates/CrewTeamTabTemplate";
import { crewsEnabled, killerModeEnabled, seasonsEnabled } from "@/lib/flags";
import { HistoryTabTemplate } from "@/components/templates/HistoryTabTemplate";
import { CommunityTabTemplate } from "@/components/templates/CommunityTabTemplate";
import { RankTabTemplate } from "@/components/templates/RankTabTemplate";
import { ModeToggle } from "@/components/molecules/ModeToggle";
import { SeasonSelect } from "@/components/molecules/SeasonSelect";
import { ModeProvider, useMode } from "@/contexts/ModeContext";
import { SeasonProvider, useSeason } from "@/contexts/SeasonContext";
import { useKillers } from "@/hooks/useKillers";
import type { SeasonSelection } from "@/lib/seasons";
import type { TabId } from "@/components/molecules/TabNav";
import type { KillerStats, Perspective } from "@/types/killer";

interface KillersPageClientProps {
  initialKillers: KillerStats[];
  initialMode?: Perspective;
  initialSeason?: SeasonSelection;
}

// Tabs that only exist in survivor mode. When the user switches to killer mode
// while sitting on one of them, we fall back to the Killers tab.
const SURVIVOR_ONLY_TABS: TabId[] = ["streak", "team"];

export function KillersPageClient({
  initialKillers,
  initialMode = "survivor",
  initialSeason = "all",
}: KillersPageClientProps) {
  return (
    <SeasonProvider initialSeason={seasonsEnabled ? initialSeason : "all"}>
      <ModeProvider initialMode={killerModeEnabled ? initialMode : "survivor"}>
        <DashboardContent initialKillers={initialKillers} />
      </ModeProvider>
    </SeasonProvider>
  );
}

function DashboardContent({ initialKillers }: { initialKillers: KillerStats[] }) {
  const { mode } = useMode();
  const { season, isReadOnly } = useSeason();
  const isKiller = mode === "killer";

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
  } = useKillers(initialKillers, mode, season);

  const [activeTab, setActiveTab] = useState<TabId>("killers");
  const [statsNav, setStatsNav] = useState<{ killer: KillerStats; nonce: number } | null>(null);

  // Killer mode has no Streak/Team tabs. Derive the effective tab instead of
  // resetting state in an effect: the raw `activeTab` is remembered so switching
  // back to survivor restores the previous tab.
  const effectiveTab = isKiller && SURVIVOR_ONLY_TABS.includes(activeTab) ? "killers" : activeTab;

  function navigateToStats(killer: KillerStats) {
    setStatsNav({ killer, nonce: Date.now() });
    setActiveTab("statistics");
  }

  return (
    <AppShell
      mode={mode}
      headerExtra={
        <>
          {seasonsEnabled && <SeasonSelect />}
          {killerModeEnabled && <ModeToggle />}
        </>
      }
      activeTab={effectiveTab}
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
          readOnly={isReadOnly}
        />
      }
      streakContent={
        isKiller ? null : crewsEnabled ? (
          <CrewStreakTabTemplate
            isActive={effectiveTab === "streak"}
            killers={killers}
            season={season}
            readOnly={isReadOnly}
          />
        ) : (
          <StreakTabTemplate isActive={effectiveTab === "streak"} killers={killers} />
        )
      }
      statisticsContent={<StatisticsTabTemplate killers={killers} isLoading={isLoading} statsNav={statsNav} onNavigateToStats={navigateToStats} perspective={mode} season={season} />}
      teamContent={
        isKiller ? null : crewsEnabled ? (
          <CrewTeamTabTemplate isActive={effectiveTab === "team"} />
        ) : (
          <TeamTabTemplate isActive={effectiveTab === "team"} />
        )
      }
      historyContent={<HistoryTabTemplate isActive={effectiveTab === "history"} perspective={mode} season={season} />}
      communityContent={<CommunityTabTemplate isActive={effectiveTab === "community"} perspective={mode} season={season} />}
      rankContent={<RankTabTemplate isActive={effectiveTab === "rank"} perspective={mode} season={season} />}
    />
  );
}
