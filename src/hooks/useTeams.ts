"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { Team } from "@/types/team";

async function fetchTeams(): Promise<Team[]> {
  const res = await fetch("/api/teams");
  if (!res.ok) throw new Error("Failed to load teams");
  return (await res.json()) as Team[];
}

export function useTeams(isActive: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.teams,
    queryFn: fetchTeams,
    enabled: isActive,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, playerIds }: { name: string; playerIds: number[] }) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, playerIds }),
      });
      if (res.status === 409) throw new Error("A team with that name already exists");
      if (!res.ok) throw new Error("Could not create team");
      return (await res.json()) as Team;
    },
    onSuccess: (team) => {
      queryClient.setQueryData<Team[]>(queryKeys.teams, (old) => [...(old ?? []), team]);
      toast.success("Team created");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create team"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not delete team");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Team[]>(queryKeys.teams, (old) => old?.filter((t) => t.id !== id));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete team"),
  });

  return {
    teams: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? "Could not load teams." : null,
    saving: createMutation.isPending,
    deletingId: deleteMutation.isPending ? deleteMutation.variables ?? null : null,
    createTeam: async (name: string, playerIds: number[]): Promise<boolean> => {
      try {
        await createMutation.mutateAsync({ name, playerIds });
        return true;
      } catch {
        return false;
      }
    },
    deleteTeam: async (id: number): Promise<void> => {
      await deleteMutation.mutateAsync(id).catch(() => {});
    },
    refetch: async () => {
      await query.refetch();
    },
  };
}
