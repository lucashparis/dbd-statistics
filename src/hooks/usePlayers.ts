"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { Player } from "@/types/team";

async function fetchPlayers(): Promise<Player[]> {
  const res = await fetch("/api/players");
  if (!res.ok) throw new Error("Failed to load players");
  return (await res.json()) as Player[];
}

export function usePlayers(isActive: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.players,
    queryFn: fetchPlayers,
    enabled: isActive,
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, nick }: { name: string; nick: string }) => {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nick }),
      });
      if (res.status === 409) throw new Error("That nick is already taken");
      if (!res.ok) throw new Error("Could not add player");
      return (await res.json()) as Player;
    },
    onSuccess: (player) => {
      queryClient.setQueryData<Player[]>(queryKeys.players, (old) => [...(old ?? []), player]);
      toast.success("Player added");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add player"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      if (res.status === 409) throw new Error("Player is in a team — remove them first");
      if (!res.ok && res.status !== 204) throw new Error("Could not delete player");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Player[]>(queryKeys.players, (old) => old?.filter((p) => p.id !== id));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete player"),
  });

  return {
    players: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? "Could not load players." : null,
    saving: addMutation.isPending,
    deletingId: deleteMutation.isPending ? deleteMutation.variables ?? null : null,
    addPlayer: async (name: string, nick: string): Promise<boolean> => {
      try {
        await addMutation.mutateAsync({ name, nick });
        return true;
      } catch {
        return false;
      }
    },
    deletePlayer: async (id: number): Promise<void> => {
      await deleteMutation.mutateAsync(id).catch(() => {});
    },
    refetch: async () => {
      await query.refetch();
    },
  };
}
