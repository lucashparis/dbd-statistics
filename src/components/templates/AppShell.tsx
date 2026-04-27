"use client";

import * as React from "react";
import { AppHeader } from "@/components/organisms/AppHeader";
import { TabNav, type TabId } from "@/components/molecules/TabNav";

const TABS = [
  { id: "killers" as TabId, label: "Killers" },
  { id: "statistics" as TabId, label: "Statistics" },
];

interface AppShellProps {
  killersContent: React.ReactNode;
  statisticsContent: React.ReactNode;
}

export function AppShell({ killersContent, statisticsContent }: AppShellProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("killers");

  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader />
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
        <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="mt-4" />
      </div>
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <div role="tabpanel" hidden={activeTab !== "killers"}>
          {killersContent}
        </div>
        <div role="tabpanel" hidden={activeTab !== "statistics"}>
          {statisticsContent}
        </div>
      </main>
    </div>
  );
}
