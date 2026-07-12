"use client";

import * as React from "react";
import { usePlayers } from "@/hooks/usePlayers";
import { useTeams } from "@/hooks/useTeams";
import { PlayerRoster } from "@/components/organisms/PlayerRoster";
import { TeamRoster } from "@/components/organisms/TeamRoster";

export function TeamTabTemplate({ isActive }: { isActive: boolean }) {
  const players = usePlayers(isActive);
  const teams = useTeams(isActive);

  return (
    <div className="space-y-10">
      <header className="text-center space-y-2">
        <p className="text-muted text-xs tracking-[0.3em] uppercase font-display animate-fade-in-up">
          Dead by Daylight
        </p>
        <h2
          className="font-display text-3xl sm:text-4xl font-bold tracking-widest text-white uppercase animate-fade-in-up glow-blood-text"
          style={{ animationDelay: "60ms" }}
        >
          Our Team
        </h2>
        <p
          className="text-muted text-sm tracking-widest animate-fade-in-up"
          style={{ animationDelay: "120ms" }}
        >
          Survivors of The Fog
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlayerRoster
          players={players.players}
          loading={players.loading}
          saving={players.saving}
          deletingId={players.deletingId}
          onAdd={players.addPlayer}
          onDelete={players.deletePlayer}
        />
        <TeamRoster
          teams={teams.teams}
          players={players.players}
          loading={teams.loading}
          saving={teams.saving}
          deletingId={teams.deletingId}
          onCreate={teams.createTeam}
          onDelete={teams.deleteTeam}
        />
      </div>
    </div>
  );
}
