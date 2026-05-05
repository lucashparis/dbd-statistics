import * as React from "react";
import { PlayerCard, type TeamPlayer } from "@/components/organisms/PlayerCard";

const TEAM_PLAYERS: TeamPlayer[] = [
  {
    name: "Lucas Paris",
    nick: "OldDeadMemories",
    imageUrl: "/images/team/lucas.webp",
    killer: {
      name: "Kaneki",
      imageUrl: "/images/killers/kaneki.webp",
    },
    survivor: {
      name: "Nea Karsson",
      imageUrl: "/images/survivors/nea-eto.webp",
      skin: "Eto Yoshimura",
    },
  },
  {
    name: "Fran Coelho",
    nick: "Francyx",
    imageUrl: "/images/team/fran.webp",
    killer: {
      name: "Spectro",
      imageUrl: "/images/killers/wraith.webp",
    },
    survivor: {
      name: "Feng Min",
      imageUrl: "/images/survivors/feng-arcade.webp",
      skin: "Arcade Tournament",
    },
  },
  {
    name: "Gabriel Zubioli",
    nick: "Zubioli",
    imageUrl: "/images/team/gabriel.webp",
    killer: {
      name: "Spectro",
      imageUrl: "/images/killers/wraith.webp",
    },
    survivor: {
      name: "Feng Min",
      imageUrl: "/images/survivors/feng.webp",
    },
  },
  {
    name: "Breno Antonuci",
    nick: "BreNaN",
    imageUrl: "/images/team/breno.webp",
    killer: {
      name: "Trickster",
      imageUrl: "/images/killers/trickster.webp",
    },
    survivor: {
      name: "Sable Ward",
      skin: "Clima Esquisito",
      imageUrl: "/images/survivors/sable.webp",
    },
  },
  {
    name: "Alison Gomes",
    nick: "menob7",
    imageUrl: "/images/team/alisson.webp",
    killer: {
      name: "Trickster",
      imageUrl: "/images/killers/vecna.webp",
    },
    survivor: {
      name: "Mikaela Reid",
      skin: "Sessão de Banho de Sol",
      imageUrl: "/images/survivors/mikaela.webp",
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
