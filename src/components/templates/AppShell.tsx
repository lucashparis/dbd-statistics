"use client";

import * as React from "react";
import { AppHeader } from "@/components/organisms/AppHeader";
import { TabNav, type TabId } from "@/components/molecules/TabNav";

const TABS = [
  { id: "killers" as TabId, label: "Killers" },
  { id: "streak" as TabId, label: "Streak" },
  { id: "team" as TabId, label: "Team" },
  { id: "community" as TabId, label: "Community" },
  { id: "rank" as TabId, label: "Rank" },
  { id: "statistics" as TabId, label: "Statistics" },
  { id: "history" as TabId, label: "History" },
];

interface AppShellProps {
  killersContent: React.ReactNode;
  streakContent: React.ReactNode;
  statisticsContent: React.ReactNode;
  teamContent: React.ReactNode;
  historyContent: React.ReactNode;
  communityContent: React.ReactNode;
  rankContent: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function AppShell({ killersContent, streakContent, statisticsContent, teamContent, historyContent, communityContent, rankContent, activeTab, onTabChange }: AppShellProps) {

  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader />
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} className="mt-4" />
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
      </main>
    </div>
  );
}
