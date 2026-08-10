"use client";

import * as React from "react";
import { AppHeader } from "@/components/organisms/AppHeader";
import { TabNav, type TabId } from "@/components/molecules/TabNav";
import type { Perspective } from "@/types/killer";

const SURVIVOR_TABS = [
  { id: "killers" as TabId, label: "Killers" },
  { id: "streak" as TabId, label: "Streak" },
  { id: "team" as TabId, label: "Team" },
  { id: "community" as TabId, label: "Community" },
  { id: "rank" as TabId, label: "Rank" },
  { id: "statistics" as TabId, label: "Statistics" },
  { id: "history" as TabId, label: "History" },
];

// Killer mode drops Streak and Team — those are survivor-only concepts.
const KILLER_TABS = [
  { id: "killers" as TabId, label: "Killers" },
  { id: "community" as TabId, label: "Community" },
  { id: "rank" as TabId, label: "Rank" },
  { id: "statistics" as TabId, label: "Statistics" },
  { id: "history" as TabId, label: "History" },
];

const ADMIN_TAB = { id: "admin" as TabId, label: "Admin" };

interface AppShellProps {
  killersContent: React.ReactNode;
  streakContent: React.ReactNode;
  statisticsContent: React.ReactNode;
  teamContent: React.ReactNode;
  historyContent: React.ReactNode;
  communityContent: React.ReactNode;
  rankContent: React.ReactNode;
  adminContent?: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mode?: Perspective;
  isAdmin?: boolean;
  headerExtra?: React.ReactNode;
}

export function AppShell({ killersContent, streakContent, statisticsContent, teamContent, historyContent, communityContent, rankContent, adminContent, activeTab, onTabChange, mode = "survivor", isAdmin = false, headerExtra }: AppShellProps) {
  const baseTabs = mode === "killer" ? KILLER_TABS : SURVIVOR_TABS;
  const tabs = isAdmin ? [...baseTabs, ADMIN_TAB] : baseTabs;

  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader headerExtra={headerExtra} />
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
        <TabNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} className="mt-4" />
      </div>
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <div role="tabpanel" hidden={activeTab !== "killers"}>
          {killersContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "streak"}>
          {streakContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "statistics"}>
          {statisticsContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "team"}>
          {teamContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "history"}>
          {historyContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "community"}>
          {communityContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "rank"}>
          {rankContent}
        </div>
        {isAdmin && (
          <div role="tabpanel" hidden={activeTab !== "admin"}>
            {adminContent}
          </div>
        )}
      </main>
    </div>
  );
}
