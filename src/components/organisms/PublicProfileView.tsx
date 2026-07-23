"use client";

import * as React from "react";
import { Skull, Ghost } from "lucide-react";
import { Avatar } from "@/components/atoms/Avatar";
import { ChannelLinkButton } from "@/components/molecules/ChannelLinkButton";
import { StatisticsOverview } from "@/components/organisms/StatisticsOverview";
import { cn } from "@/lib/utils";
import type { PublicProfileDetail } from "@/types/profile";
import type { Perspective } from "@/types/killer";

interface PublicProfileViewProps {
  survivor: PublicProfileDetail;
  // Present only when killer mode is enabled — enables the perspective toggle.
  killer?: PublicProfileDetail | null;
}

const OPTIONS: { value: Perspective; label: string; Icon: typeof Skull }[] = [
  { value: "survivor", label: "Survivor", Icon: Ghost },
  { value: "killer", label: "Killer", Icon: Skull },
];

export function PublicProfileView({ survivor, killer }: PublicProfileViewProps) {
  const [perspective, setPerspective] = React.useState<Perspective>("survivor");
  const active = perspective === "killer" && killer ? killer : survivor;
  const displayName = active.name?.trim() || active.nick;

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Avatar imageUrl={active.mainKiller?.imageUrl} label={displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-sm text-muted">@{active.nick}</p>
          {active.mainKiller && (
            <p className="mt-1 text-xs uppercase tracking-widest text-blood">
              Main · {active.mainKiller.name}
            </p>
          )}
          {active.mainSurv && (
            <p className="mt-1 text-xs uppercase tracking-widest text-muted">
              Surv · {active.mainSurv.name}
            </p>
          )}
        </div>
        <ChannelLinkButton channelUrl={active.channelUrl} />
      </header>

      {killer && (
        <div
          role="group"
          aria-label="Play perspective"
          className="inline-flex rounded-lg border border-subtle bg-surface-2 p-1"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const isActive = value === perspective;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setPerspective(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60",
                  isActive ? "bg-blood text-white" : "text-muted hover:text-white"
                )}
              >
                <Icon size={15} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      )}

      <StatisticsOverview killers={active.killers} selectedKiller={null} streaks={active.streaks} />
    </div>
  );
}
