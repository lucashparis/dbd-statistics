"use client";

import * as React from "react";
import { useTeamStreaks } from "@/hooks/useTeamStreaks";
import { StreakLaunchForm } from "@/components/organisms/StreakLaunchForm";
import { TeamStreakCard } from "@/components/organisms/TeamStreakCard";
import type { KillerStats } from "@/types/killer";

export function StreakTabTemplate({ isActive, killers }: { isActive: boolean; killers: KillerStats[] }) {
  const { teamStreaks, loading, launching, launchMatch } = useTeamStreaks(isActive);
  const teams = teamStreaks.map((s) => s.team);

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <p className="text-muted text-xs tracking-[0.3em] uppercase font-display">Dead by Daylight</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-widest text-white uppercase glow-blood-text">
          Streak
        </h2>
        <p className="text-muted text-sm tracking-widest">Run the gauntlet — one loss resets it all</p>
      </header>

      <StreakLaunchForm teams={teams} killers={killers} launching={launching} onLaunch={launchMatch} />

      {loading ? (
        <p className="text-center text-sm text-muted">Loading streaks…</p>
      ) : teamStreaks.length === 0 ? (
        <p className="text-center text-sm text-muted">No teams yet. Build a team to start a streak.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {teamStreaks.map((s) => (
            <TeamStreakCard key={s.team.id} streak={s} />
          ))}
        </div>
      )}
    </div>
  );
}
