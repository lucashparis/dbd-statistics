"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";
import type { TeamStreak } from "@/types/team";
import type { MatchResult } from "@/types/killer";

async function fetchTeamStreaks(): Promise<TeamStreak[]> {
  const res = await fetch("/api/streaks");
  if (!res.ok) throw new Error("Failed to load streaks");
  return (await res.json()) as TeamStreak[];
}

function upsertStreak(list: TeamStreak[] | undefined, updated: TeamStreak): TeamStreak[] {
  const current = list ?? [];
  const exists = current.some((t) => t.team.id === updated.team.id);
  return exists
    ? current.map((t) => (t.team.id === updated.team.id ? updated : t))
    : [...current, updated];
}

export function useTeamStreaks(isActive: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.teamStreaks,
    queryFn: fetchTeamStreaks,
    enabled: isActive,
  });

  const launchMutation = useMutation({
    mutationFn: async (vars: { teamId: number; killerId: number; result: MatchResult }) => {
      const res = await fetch("/api/streaks/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (!res.ok) throw new Error("Could not log the match");
      return (await res.json()) as TeamStreak;
    },
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<TeamStreak[]>(queryKeys.teamStreaks, (old) => upsertStreak(old, updated));
      toast.success(
        vars.result === "win" ? "Win logged — the streak grows" : "Loss logged — streak reset"
      );
      invalidateMatchDerived(queryClient);
    },
    onError: () => toast.error("Could not log the match"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (matchId: number) => {
      const res = await fetch(`/api/streaks/matches/${matchId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove the match");
      return (await res.json()) as TeamStreak;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TeamStreak[]>(queryKeys.teamStreaks, (old) =>
        old?.map((t) => (t.team.id === updated.team.id ? updated : t))
      );
      toast.success("Match removed");
      invalidateMatchDerived(queryClient);
    },
    onError: () => toast.error("Could not remove the match"),
  });

  return {
    teamStreaks: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? "Could not load streaks." : null,
    launching: launchMutation.isPending,
    deletingId: deleteMutation.isPending ? deleteMutation.variables ?? null : null,
    launchMatch: async (
      teamId: number,
      killerId: number,
      result: MatchResult
    ): Promise<boolean> => {
      try {
        await launchMutation.mutateAsync({ teamId, killerId, result });
        return true;
      } catch {
        return false;
      }
    },
    deleteMatch: async (matchId: number): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(matchId);
        return true;
      } catch {
        return false;
      }
    },
    refetch: async () => {
      await query.refetch();
    },
  };
}
