"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TabButton } from "@/components/atoms/TabButton";

export type TabId = "killers" | "streak" | "statistics" | "team" | "history";

interface Tab {
  id: TabId;
  label: string;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  className?: string;
}

export function TabNav({ tabs, activeTab, onTabChange, className }: TabNavProps) {
  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className={cn("flex gap-1 border-b border-subtle overflow-x-auto scrollbar-dark", className)}
    >
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className="shrink-0 whitespace-nowrap"
        >
          {tab.label}
        </TabButton>
      ))}
    </nav>
  );
}
