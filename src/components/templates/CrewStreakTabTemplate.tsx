"use client";

import * as React from "react";
import { useCrews } from "@/hooks/useCrews";
import { CrewLaunchForm } from "@/components/organisms/CrewLaunchForm";
import { CrewCard } from "@/components/organisms/CrewCard";
import { seasonLabel, type SeasonSelection } from "@/lib/seasons";
import type { KillerStats } from "@/types/killer";

interface CrewStreakTabTemplateProps {
  isActive: boolean;
  killers: KillerStats[];
  season?: SeasonSelection;
  readOnly?: boolean;
  banned?: boolean;
}

export function CrewStreakTabTemplate({
  isActive,
  killers,
  season = "all",
  readOnly = false,
  banned = false,
}: CrewStreakTabTemplateProps) {
  const { crews, loading, launching, deletingMatchId, logMatch, deleteMatch } = useCrews(
    isActive,
    season,
    banned
  );

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <p className="text-muted text-xs tracking-[0.3em] uppercase font-display">Dead by Daylight</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-widest text-white uppercase glow-blood-text">
          Streak
        </h2>
        <p className="text-muted text-sm tracking-widest">
          {season === "all"
            ? "Run the gauntlet — one loss resets it all"
            : `${seasonLabel(season)} — one loss resets it all`}
        </p>
      </header>

      <CrewLaunchForm
        crews={crews}
        killers={killers}
        launching={launching}
        onLaunch={logMatch}
        readOnly={readOnly}
      />

      {loading ? (
        <p className="text-center text-sm text-muted">Loading streaks…</p>
      ) : crews.length === 0 ? (
        <p className="text-center text-sm text-muted">No crews yet. Build a crew to start a streak.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {crews.map((crew) => (
            <CrewCard
              key={crew.id}
              crew={crew}
              onDeleteMatch={deleteMatch}
              deletingMatchId={deletingMatchId}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
