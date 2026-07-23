"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { Invite } from "@/types/crew";

async function fetchInvites(): Promise<Invite[]> {
  const res = await fetch("/api/invites");
  if (!res.ok) throw new Error("Failed to load invites");
  return (await res.json()) as Invite[];
}

export function useInvites() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.invites,
    queryFn: fetchInvites,
    refetchOnWindowFocus: true,
  });

  const respondMutation = useMutation({
    mutationFn: async (vars: { id: number; action: "accept" | "decline" }) => {
      const res = await fetch(`/api/invites/${vars.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: vars.action }),
      });
      if (!res.ok) throw new Error("Could not answer the invite");
      return vars;
    },
    onSuccess: (vars) => {
      queryClient.setQueryData<Invite[]>(queryKeys.invites, (old) => old?.filter((i) => i.id !== vars.id));
      queryClient.invalidateQueries({ queryKey: queryKeys.crews });
      toast.success(vars.action === "accept" ? "Invite accepted" : "Invite declined");
    },
    onError: () => toast.error("Could not answer the invite"),
  });

  const invites = query.data ?? [];

  return {
    invites,
    count: invites.length,
    loading: query.isLoading,
    respondingId: respondMutation.isPending ? respondMutation.variables?.id ?? null : null,
    accept: async (id: number): Promise<void> => {
      await respondMutation.mutateAsync({ id, action: "accept" }).catch(() => {});
    },
    decline: async (id: number): Promise<void> => {
      await respondMutation.mutateAsync({ id, action: "decline" }).catch(() => {});
    },
  };
}
