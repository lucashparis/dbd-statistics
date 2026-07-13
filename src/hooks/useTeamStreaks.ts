"use client";

import * as React from "react";
import { toast } from "sonner";
import type { TeamStreak } from "@/types/team";
import type { MatchResult } from "@/types/killer";

export function useTeamStreaks(isActive: boolean) {
  const [teamStreaks, setTeamStreaks] = React.useState<TeamStreak[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [launching, setLaunching] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  async function fetchStreaks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/streaks");
      if (!res.ok) throw new Error("Failed to load streaks");
      setTeamStreaks(await res.json());
    } catch {
      setError("Could not load streaks.");
      setTeamStreaks([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isActive) return;
    fetchStreaks();
  }, [isActive]);

  async function launchMatch(
    teamId: number,
    killerId: number,
    result: MatchResult
  ): Promise<boolean> {
    setLaunching(true);
    try {
      const res = await fetch("/api/streaks/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, killerId, result }),
      });
      if (!res.ok) {
        toast.error("Could not log the match");
        return false;
      }
      const updated: TeamStreak = await res.json();
      setTeamStreaks((prev) => {
        const exists = prev.some((t) => t.team.id === updated.team.id);
        return exists
          ? prev.map((t) => (t.team.id === updated.team.id ? updated : t))
          : [...prev, updated];
      });
      toast.success(result === "win" ? "Win logged — the streak grows" : "Loss logged — streak reset");
      return true;
    } catch {
      toast.error("Could not log the match");
      return false;
    } finally {
      setLaunching(false);
    }
  }

  async function deleteMatch(matchId: number): Promise<boolean> {
    setDeletingId(matchId);
    try {
      const res = await fetch(`/api/streaks/matches/${matchId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not remove the match");
        return false;
      }
      const updated: TeamStreak = await res.json();
      setTeamStreaks((prev) => prev.map((t) => (t.team.id === updated.team.id ? updated : t)));
      toast.success("Match removed");
      return true;
    } catch {
      toast.error("Could not remove the match");
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  return { teamStreaks, loading, error, launching, deletingId, launchMatch, deleteMatch, refetch: fetchStreaks };
}
