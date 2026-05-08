"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface PlayerRole {
  name: string;
  imageUrl: string;
  skin?: string;
}

export interface TeamPlayer {
  name: string;
  nick: string;
  killer: PlayerRole;
  survivor: PlayerRole;
}

interface PlayerCardProps {
  player: TeamPlayer;
  index: number;
}

export function PlayerCard({ player, index }: PlayerCardProps) {
  return (
    <article
      className={cn(
        "animate-fade-in-up card-dark team-card-glow",
        "flex flex-col overflow-hidden transition-all duration-300"
      )}
      style={{ animationDelay: `${index * 130}ms` }}
    >
      <div className="flex flex-col items-center pt-8 pb-5 px-6">
        <Avatar name={player.name} />
        <p className="text-blood font-display text-xs tracking-[0.25em] uppercase mt-5 mb-1">
          {player.nick}
        </p>
        <p className="text-white font-medium text-base">{player.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 pt-0 pb-5">
        <RoleShowcase role={player.killer} label="KILLER" type="killer" />
        <RoleShowcase role={player.survivor} label="SURVIVOR" type="survivor" />
      </div>
    </article>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="player-avatar-ring w-24 h-24 rounded-full overflow-hidden shrink-0">
      <div className="w-full h-full bg-surface-2 flex items-center justify-center">
        <span className="font-display text-blood text-3xl">{name[0]}</span>
      </div>
    </div>
  );
}

function RoleShowcase({
  role,
  label,
  type,
}: {
  role: PlayerRole;
  label: string;
  type: "killer" | "survivor";
}) {
  const [error, setError] = React.useState(false);
  const isKiller = type === "killer";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-xl p-3 pb-4 border overflow-hidden",
        "transition-all duration-300 group",
        isKiller
          ? "bg-blood/5 border-blood/25 hover:border-blood/60 hover:bg-blood/10"
          : "bg-white/3 border-white/10 hover:border-white/25 hover:bg-white/6"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          isKiller
            ? "bg-linear-to-b from-blood/15 via-transparent to-transparent"
            : "bg-linear-to-b from-white/8 via-transparent to-transparent"
        )}
      />

      <span
        className={cn(
          "relative z-10 text-[8px] tracking-[0.3em] font-display font-bold uppercase",
          isKiller ? "text-blood" : "text-white/35"
        )}
      >
        {label}
      </span>

      <div
        className={cn(
          "relative w-20 h-20 rounded-full overflow-hidden shrink-0 border-2 transition-all duration-300",
          isKiller
            ? "border-blood/50 group-hover:border-blood group-hover:shadow-[0_0_20px_rgba(220,20,60,0.55)]"
            : "border-white/20 group-hover:border-white/45 group-hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]"
        )}
      >
        {error ? (
          <div className="w-full h-full bg-surface-3 flex items-center justify-center">
            <span className="text-muted text-lg font-display">{role.name[0]}</span>
          </div>
        ) : (
          <Image
            src={role.imageUrl}
            alt={role.name}
            fill
            className="object-cover object-top"
            onError={() => setError(true)}
            sizes="80px"
          />
        )}
      </div>

      <div className="relative z-10 text-center w-full min-w-0 px-1">
        <p className="text-white text-xs font-bold leading-snug truncate">{role.name}</p>
        {role.skin && (
          <p className="text-white/40 text-[9px] italic leading-tight mt-0.5 truncate">
            {role.skin}
          </p>
        )}
      </div>
    </div>
  );
}
