"use client";

import * as React from "react";
import { useCrews } from "@/hooks/useCrews";
import { CrewLaunchForm } from "@/components/organisms/CrewLaunchForm";
import { CrewCard } from "@/components/organisms/CrewCard";
import type { KillerStats } from "@/types/killer";

export function CrewStreakTabTemplate({ isActive, killers }: { isActive: boolean; killers: KillerStats[] }) {
  const { crews, loading, launching, deletingMatchId, logMatch, deleteMatch } = useCrews(isActive);

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <p className="text-muted text-xs tracking-[0.3em] uppercase font-display">Dead by Daylight</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-widest text-white uppercase glow-blood-text">
          Streak
        </h2>
        <p className="text-muted text-sm tracking-widest">Run the gauntlet — one loss resets it all</p>
      </header>

      <CrewLaunchForm crews={crews} killers={killers} launching={launching} onLaunch={logMatch} />

      {loading ? (
        <p className="text-center text-sm text-muted">Loading streaks…</p>
      ) : crews.length === 0 ? (
        <p className="text-center text-sm text-muted">No crews yet. Build a crew to start a streak.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {crews.map((crew) => (
            <CrewCard key={crew.id} crew={crew} onDeleteMatch={deleteMatch} deletingMatchId={deletingMatchId} />
          ))}
        </div>
      )}
    </div>
  );
}
