"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys, invalidateMatchDerived } from "@/lib/query-keys";
import type { BanView } from "@/types/ban";

async function fetchBans(): Promise<BanView[]> {
  const res = await fetch("/api/admin/bans");
  if (!res.ok) throw new Error("Failed to load the ban list");
  return (await res.json()) as BanView[];
}

function upsert(list: BanView[] | undefined, updated: BanView): BanView[] {
  const current = list ?? [];
  return current.some((b) => b.id === updated.id)
    ? current.map((b) => (b.id === updated.id ? updated : b))
    : [updated, ...current];
}

export function useAdminBans(isActive: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.adminBans,
    queryFn: fetchBans,
    enabled: isActive,
  });

  const setBan = (ban: BanView) =>
    queryClient.setQueryData<BanView[]>(queryKeys.adminBans, (old) => upsert(old, ban));

  // A ban changes who may write, so every crew/match-derived read is stale.
  const afterWrite = (ban: BanView) => {
    setBan(ban);
    queryClient.invalidateQueries({ queryKey: queryKeys.bannableUsers });
    invalidateMatchDerived(queryClient);
  };

  const banMutation = useMutation({
    mutationFn: async (vars: { userId: string; reason: string }) => {
      const res = await fetch("/api/admin/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars),
      });
      if (res.status === 409) throw new Error("User is already on the ban list");
      if (!res.ok) throw new Error("Could not add the user to the ban list");
      return (await res.json()) as BanView;
    },
    onSuccess: (ban) => {
      afterWrite(ban);
      toast.success(`${ban.nick ?? ban.name ?? "User"} added to the ban list`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not add the user to the ban list"),
  });

  const liftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/bans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not lift the ban");
      return (await res.json()) as BanView;
    },
    onSuccess: (ban) => {
      afterWrite(ban);
      toast.success("Ban lifted");
    },
    onError: () => toast.error("Could not lift the ban"),
  });

  return {
    bans: query.data ?? [],
    loading: query.isLoading,
    error: query.isError ? "Could not load the ban list." : null,
    banning: banMutation.isPending,
    liftingId: liftMutation.isPending ? liftMutation.variables ?? null : null,
    ban: async (userId: string, reason: string): Promise<boolean> => {
      try {
        await banMutation.mutateAsync({ userId, reason });
        return true;
      } catch {
        return false;
      }
    },
    liftBan: async (id: string): Promise<void> => {
      await liftMutation.mutateAsync(id).catch(() => {});
    },
  };
}
