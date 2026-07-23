"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { computeStats } from "@/lib/utils";
import { toast } from "sonner";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";
import type { Killer, KillerStats, Perspective } from "@/types/killer";

interface UseKillersReturn {
  killers: KillerStats[];
  isLoading: boolean;
  error: string | null;
  loadingWin: number | null;
  loadingLoss: number | null;
  loadingUndoWin: number | null;
  loadingUndoLoss: number | null;
  fetchKillers: () => Promise<void>;
  registerWin: (id: number) => Promise<void>;
  registerLoss: (id: number) => Promise<void>;
  undoWin: (id: number) => Promise<void>;
  undoLoss: (id: number) => Promise<void>;
}

type KillerAction = "win" | "loss" | "win/undo" | "loss/undo";

const ERROR_MESSAGE: Record<KillerAction, string> = {
  win: "Failed to register win",
  loss: "Failed to register loss",
  "win/undo": "Failed to undo win",
  "loss/undo": "Failed to undo loss",
};

async function fetchKillersApi(perspective: Perspective): Promise<KillerStats[]> {
  const res = await fetch(`/api/killers?perspective=${perspective}`);
  if (!res.ok) throw new Error("Failed to fetch killers");
  const data: Killer[] = await res.json();
  return data.map(computeStats);
}

function applyOptimistic(k: KillerStats, action: KillerAction): KillerStats {
  const wins =
    action === "win" ? k.wins + 1 : action === "win/undo" ? Math.max(0, k.wins - 1) : k.wins;
  const losses =
    action === "loss" ? k.losses + 1 : action === "loss/undo" ? Math.max(0, k.losses - 1) : k.losses;
  return computeStats({ ...k, wins, losses });
}

function useKillerAction(action: KillerAction, perspective: Perspective) {
  const queryClient = useQueryClient();
  const key = queryKeys.killers(perspective);

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/killers/${id}/${action}?perspective=${perspective}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(ERROR_MESSAGE[action]);
      return (await res.json()) as Killer;
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<KillerStats[]>(key);
      queryClient.setQueryData<KillerStats[]>(key, (old) =>
        old?.map((k) => (k.id === id ? applyOptimistic(k, action) : k))
      );
      return { previous };
    },
    onError: (err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(err instanceof Error ? err.message : "Unknown error");
    },
    onSettled: () => invalidateMatchDerived(queryClient),
  });
}

export function useKillers(
  initialKillers: Killer[],
  perspective: Perspective = "survivor"
): UseKillersReturn {
  // The server seeds `initialKillers` for the mode the page loaded in. Only seed
  // that perspective's cache — the other mode must fetch its own data.
  const [seedPerspective] = useState(perspective);
  const query = useQuery({
    queryKey: queryKeys.killers(perspective),
    queryFn: () => fetchKillersApi(perspective),
    initialData: () =>
      perspective === seedPerspective ? initialKillers.map(computeStats) : undefined,
  });

  const winAction = useKillerAction("win", perspective);
  const lossAction = useKillerAction("loss", perspective);
  const undoWinAction = useKillerAction("win/undo", perspective);
  const undoLossAction = useKillerAction("loss/undo", perspective);

  const pendingId = (m: { isPending: boolean; variables?: number }) =>
    m.isPending ? m.variables ?? null : null;

  const run = (m: { mutateAsync: (id: number) => Promise<Killer> }) => async (id: number) => {
    await m.mutateAsync(id).catch(() => {});
  };

  return {
    killers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    loadingWin: pendingId(winAction),
    loadingLoss: pendingId(lossAction),
    loadingUndoWin: pendingId(undoWinAction),
    loadingUndoLoss: pendingId(undoLossAction),
    fetchKillers: async () => {
      await query.refetch();
    },
    registerWin: run(winAction),
    registerLoss: run(lossAction),
    undoWin: run(undoWinAction),
    undoLoss: run(undoLossAction),
  };
}
