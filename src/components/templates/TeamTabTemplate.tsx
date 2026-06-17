import * as React from "react";
import { PlayerCard, type TeamPlayer } from "@/components/organisms/PlayerCard";

const TEAM_PLAYERS: TeamPlayer[] = [
  {
    name: "Lucas Paris",
    nick: "OldDeadMemories",
    killer: {
      name: "Kaneki",
      imageUrl: "/images/killers/kaneki.webp",
    },
    survivor: {
      name: "Nea Karsson",
      imageUrl: "/images/surv/paris.webp",
      skin: "Eto Yoshimura",
    },
  },
  {
    name: "Fran Coelho",
    nick: "Francyx",
    killer: {
      name: "Spirit",
      imageUrl: "/images/killers/spirit.webp",
    },
    survivor: {
      name: "Michonne",
      imageUrl: "/images/surv/fran.webp",
    },
  },
  {
    name: "Gabriel Zubioli",
    nick: "Zubioli",
    killer: {
      name: "Spectro",
      imageUrl: "/images/killers/wraith.webp",
    },
    survivor: {
      name: "Feng Min",
      imageUrl: "/images/surv/zubioli.webp",
    },
  },
  {
    name: "Breno Antonuci",
    nick: "BreNaN",
    killer: {
      name: "Trickster",
      imageUrl: "/images/killers/trickster.webp",
    },
    survivor: {
      name: "Sable Ward",
      skin: "Clima Esquisito",
      imageUrl: "/images/surv/breno.webp",
    },
  },
  {
    name: "Alison Gomes",
    nick: "menob7",
    killer: {
      name: "Vecna",
      imageUrl: "/images/killers/vecna.webp",
    },
    survivor: {
      name: "Mikaela Reid",
      skin: "Sessão de Banho de Sol",
      imageUrl: "/images/surv/alisson.webp",
    },
  },
];

export function TeamTabTemplate() {
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {TEAM_PLAYERS.map((player, index) => (
          <PlayerCard key={player.nick} player={player} index={index} />
        ))}
      </div>
    </div>
  );
}
