"use client";

import { useState, useCallback } from "react";
import { computeStats } from "@/lib/utils";
import type { Killer, KillerStats } from "@/types/killer";

interface UseKillersReturn {
  killers: KillerStats[];
  isLoading: boolean;
  error: string | null;
  loadingWin: number | null;
  loadingLoss: number | null;
  fetchKillers: () => Promise<void>;
  registerWin: (id: number) => Promise<void>;
  registerLoss: (id: number) => Promise<void>;
}

export function useKillers(initialKillers: Killer[]): UseKillersReturn {
  const [killers, setKillers] = useState<KillerStats[]>(
    initialKillers.map(computeStats)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingWin, setLoadingWin] = useState<number | null>(null);
  const [loadingLoss, setLoadingLoss] = useState<number | null>(null);

  const fetchKillers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/killers");
      if (!res.ok) throw new Error("Failed to fetch killers");
      const data: Killer[] = await res.json();
      setKillers(data.map(computeStats));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerWin = useCallback(async (id: number) => {
    setLoadingWin(id);
    try {
      const res = await fetch(`/api/killers/${id}/win`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to register win");
      const updated: Killer = await res.json();
      setKillers((prev) =>
        prev.map((k) => (k.id === id ? computeStats(updated) : k))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingWin(null);
    }
  }, []);

  const registerLoss = useCallback(async (id: number) => {
    setLoadingLoss(id);
    try {
      const res = await fetch(`/api/killers/${id}/loss`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to register loss");
      const updated: Killer = await res.json();
      setKillers((prev) =>
        prev.map((k) => (k.id === id ? computeStats(updated) : k))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingLoss(null);
    }
  }, []);

  return {
    killers,
    isLoading,
    error,
    loadingWin,
    loadingLoss,
    fetchKillers,
    registerWin,
    registerLoss,
  };
}
