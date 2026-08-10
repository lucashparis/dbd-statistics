"use client";

import * as React from "react";
import { useCrews } from "@/hooks/useCrews";
import { CrewManager } from "@/components/organisms/CrewManager";
import { CrewCard } from "@/components/organisms/CrewCard";

export function CrewTeamTabTemplate({
  isActive,
  banned = false,
}: {
  isActive: boolean;
  banned?: boolean;
}) {
  // Crew management (create, invite, policy) is season-agnostic, so this tab
  // always reads the all-time projection — only the Streak tab is windowed.
  const { crews, loading, creating, createCrew, deleteCrew, setPolicy, removeMember } = useCrews(
    isActive,
    "all",
    banned
  );

  return (
    <div className="space-y-10">
      <header className="text-center space-y-2">
        <p className="text-muted text-xs tracking-[0.3em] uppercase font-display">Dead by Daylight</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-widest text-white uppercase glow-blood-text">
          Crews
        </h2>
        <p className="text-muted text-sm tracking-widest">Invite your survivors — share one streak</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CrewManager creating={creating} onCreate={createCrew} />
        <div className="space-y-6">
          {loading ? (
            <p className="text-center text-sm text-muted">Loading crews…</p>
          ) : crews.length === 0 ? (
            <p className="text-center text-sm text-muted">No crews yet. Create one and invite your team.</p>
          ) : (
            crews.map((crew) => (
              <CrewCard
                key={crew.id}
                crew={crew}
                onDeleteCrew={deleteCrew}
                onRemoveMember={removeMember}
                onSetPolicy={setPolicy}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
