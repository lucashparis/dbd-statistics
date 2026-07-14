"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import type { MyProfile, ProfileInput } from "@/types/profile";

async function fetchProfile(): Promise<MyProfile> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Failed to load profile");
  return (await res.json()) as MyProfile;
}

export function useProfile(enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: fetchProfile,
    enabled,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: ProfileInput) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.status === 404) throw new Error("Selected killer no longer exists");
      if (res.status === 400) throw new Error("Please check the profile fields");
      if (!res.ok) throw new Error("Could not save profile");
      return (await res.json()) as MyProfile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      queryClient.invalidateQueries({ queryKey: queryKeys.community });
      toast.success("Profile saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save profile"),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Could not remove profile");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.community });
      toast.success("Profile removed from the community");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove profile"),
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.isError ? "Could not load profile." : null,
    saving: saveMutation.isPending,
    removing: removeMutation.isPending,
    saveProfile: async (input: ProfileInput): Promise<boolean> => {
      try {
        await saveMutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },
    removeProfile: async (): Promise<void> => {
      await removeMutation.mutateAsync().catch(() => {});
    },
  };
}
