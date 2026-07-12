"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Team } from "@/types/team";

export function useTeams(isActive: boolean) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  async function fetchTeams() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load teams");
      setTeams(await res.json());
    } catch {
      setError("Could not load teams.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isActive) return;
    fetchTeams();
  }, [isActive]);

  async function createTeam(name: string, playerIds: number[]): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, playerIds }),
      });
      if (res.status === 409) {
        toast.error("A team with that name already exists");
        return false;
      }
      if (!res.ok) {
        toast.error("Could not create team");
        return false;
      }
      const team: Team = await res.json();
      setTeams((prev) => [...prev, team]);
      toast.success("Team created");
      return true;
    } catch {
      toast.error("Could not create team");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeam(id: number): Promise<void> {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        toast.error("Could not delete team");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Could not delete team");
    } finally {
      setDeletingId(null);
    }
  }

  return { teams, loading, error, saving, deletingId, createTeam, deleteTeam, refetch: fetchTeams };
}
