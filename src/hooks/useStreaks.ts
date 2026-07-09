"use client";

import * as React from "react";
import type { StreaksData } from "@/types/killer";

const EMPTY: StreaksData = {
  global: { longestWin: 0, longestLoss: 0 },
  perKiller: {},
};

export function useStreaks(signal: number) {
  const [streaks, setStreaks] = React.useState<StreaksData>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/stats/streaks")
      .then((res) => {
        if (!res.ok) throw new Error(`Streaks request failed: ${res.status}`);
        return res.json() as Promise<StreaksData>;
      })
      .then((data) => {
        if (!cancelled) setStreaks(data);
      })
      .catch(() => {
        if (!cancelled) setStreaks(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signal]);

  return { streaks, loading };
}
