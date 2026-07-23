"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";
import type { Crew, CrewWritePolicy } from "@/types/crew";
import type { MatchResult } from "@/types/killer";

async function fetchCrews(): Promise<Crew[]> {
  const res = await fetch("/api/crews");
  if (!res.ok) throw new Error("Failed to load crews");
  return (await res.json()) as Crew[];
}

function upsert(list: Crew[] | undefined, updated: Crew): Crew[] {
  const current = list ?? [];
  return current.some((c) => c.id === updated.id)
    ? current.map((c) => (c.id === updated.id ? updated : c))
    : [...current, updated];
}

interface CreateVars {
  name: string;
  inviteeUserIds: string[];
  writePolicy: CrewWritePolicy;
}

export function useCrews(isActive: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.crews,
    queryFn: fetchCrews,
    enabled: isActive,
  });

  const setCrew = (crew: Crew) =>
    queryClient.setQueryData<Crew[]>(queryKeys.crews, (old) => upsert(old, crew));

  const createMutation = useMutation({
    mutationFn: async (vars: CreateVars) => {
      const res = await fetch("/api/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (res.status === 409) throw new Error("A crew with that name already exists");
      if (res.status === 400) throw new Error("Some invited players are not on the community");
      if (!res.ok) throw new Error("Could not create crew");
      return (await res.json()) as Crew;
    },
    onSuccess: (crew) => {
      setCrew(crew);
      toast.success("Crew created — invites sent");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create crew"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/crews/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not delete crew");
      return id;
    },
    onSuccess: (id) =>
      queryClient.setQueryData<Crew[]>(queryKeys.crews, (old) => old?.filter((c) => c.id !== id)),
    onError: () => toast.error("Could not delete crew"),
  });

  const logMutation = useMutation({
    mutationFn: async (vars: { crewId: number; killerId: number; result: MatchResult }) => {
      const res = await fetch(`/api/crews/${vars.crewId}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killerId: vars.killerId, result: vars.result }),
      });
      if (res.status === 403) throw new Error("You are not allowed to log for this crew yet");
      if (!res.ok) throw new Error("Could not log the match");
      return (await res.json()) as Crew;
    },
    onSuccess: (crew, vars) => {
      setCrew(crew);
      toast.success(vars.result === "win" ? "Win logged — the streak grows" : "Loss logged — streak reset");
      invalidateMatchDerived(queryClient);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not log the match"),
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (vars: { crewId: number; matchId: number }) => {
      const res = await fetch(`/api/crews/${vars.crewId}/matches/${vars.matchId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove the match");
      return (await res.json()) as Crew;
    },
    onSuccess: (crew) => {
      setCrew(crew);
      toast.success("Match removed");
      invalidateMatchDerived(queryClient);
    },
    onError: () => toast.error("Could not remove the match"),
  });

  const policyMutation = useMutation({
    mutationFn: async (vars: { crewId: number; writePolicy: CrewWritePolicy }) => {
      const res = await fetch(`/api/crews/${vars.crewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writePolicy: vars.writePolicy }),
      });
      if (!res.ok) throw new Error("Could not update the crew");
      return (await res.json()) as Crew;
    },
    onSuccess: (crew) => setCrew(crew),
    onError: () => toast.error("Could not update the crew"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (vars: { crewId: number; userId: string }) => {
      const res = await fetch(`/api/crews/${vars.crewId}/members/${vars.userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove the member");
      return (await res.json()) as Crew;
    },
    onSuccess: (crew) => {
      setCrew(crew);
      toast.success("Member removed");
    },
    onError: () => toast.error("Could not remove the member"),
  });

  return {
    crews: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? "Could not load crews." : null,
    creating: createMutation.isPending,
    launching: logMutation.isPending,
    deletingMatchId: deleteMatchMutation.isPending ? deleteMatchMutation.variables?.matchId ?? null : null,
    createCrew: async (vars: CreateVars): Promise<boolean> => {
      try {
        await createMutation.mutateAsync(vars);
        return true;
      } catch {
        return false;
      }
    },
    deleteCrew: async (id: number): Promise<void> => {
      await deleteMutation.mutateAsync(id).catch(() => {});
    },
    logMatch: async (crewId: number, killerId: number, result: MatchResult): Promise<boolean> => {
      try {
        await logMutation.mutateAsync({ crewId, killerId, result });
        return true;
      } catch {
        return false;
      }
    },
    deleteMatch: async (crewId: number, matchId: number): Promise<boolean> => {
      try {
        await deleteMatchMutation.mutateAsync({ crewId, matchId });
        return true;
      } catch {
        return false;
      }
    },
    setPolicy: async (crewId: number, writePolicy: CrewWritePolicy): Promise<void> => {
      await policyMutation.mutateAsync({ crewId, writePolicy }).catch(() => {});
    },
    removeMember: async (crewId: number, userId: string): Promise<void> => {
      await removeMemberMutation.mutateAsync({ crewId, userId }).catch(() => {});
    },
    refetch: async () => {
      await query.refetch();
    },
  };
}
