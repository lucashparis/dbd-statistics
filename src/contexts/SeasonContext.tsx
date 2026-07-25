"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  isWritableSeason,
  listSeasons,
  toPreference,
  type Season,
  type SeasonSelection,
} from "@/lib/seasons";

interface SeasonContextValue {
  season: SeasonSelection;
  setSeason: (season: SeasonSelection) => void;
  seasons: Season[];
  // A past season cannot receive writes: a match logged now lands in the
  // current one, so the grid and the crew log go read-only.
  isReadOnly: boolean;
}

const SeasonContext = React.createContext<SeasonContextValue | null>(null);

export function SeasonProvider({
  initialSeason,
  children,
}: {
  initialSeason: SeasonSelection;
  children: React.ReactNode;
}) {
  const [season, setSeasonState] = React.useState<SeasonSelection>(initialSeason);
  const [seasons] = React.useState(() => listSeasons());

  function setSeason(next: SeasonSelection) {
    if (next === season) return;
    const previous = season;
    setSeasonState(next);
    fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season: toPreference(next) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save season");
      })
      .catch(() => {
        setSeasonState(previous);
        toast.error("Could not switch season");
      });
  }

  return (
    <SeasonContext.Provider
      value={{ season, setSeason, seasons, isReadOnly: !isWritableSeason(season) }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason(): SeasonContextValue {
  const ctx = React.useContext(SeasonContext);
  if (!ctx) throw new Error("useSeason must be used within a SeasonProvider");
  return ctx;
}
