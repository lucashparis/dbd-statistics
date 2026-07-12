"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Player } from "@/types/team";

export function usePlayers(isActive: boolean) {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  async function fetchPlayers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/players");
      if (!res.ok) throw new Error("Failed to load players");
      setPlayers(await res.json());
    } catch {
      setError("Could not load players.");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isActive) return;
    fetchPlayers();
  }, [isActive]);

  async function addPlayer(name: string, nick: string): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nick }),
      });
      if (res.status === 409) {
        toast.error("That nick is already taken");
        return false;
      }
      if (!res.ok) {
        toast.error("Could not add player");
        return false;
      }
      const player: Player = await res.json();
      setPlayers((prev) => [...prev, player]);
      toast.success("Player added");
      return true;
    } catch {
      toast.error("Could not add player");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deletePlayer(id: number): Promise<void> {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        toast.error("Player is in a team — remove them first");
        return;
      }
      if (!res.ok && res.status !== 204) {
        toast.error("Could not delete player");
        return;
      }
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Could not delete player");
    } finally {
      setDeletingId(null);
    }
  }

  return { players, loading, error, saving, deletingId, addPlayer, deletePlayer, refetch: fetchPlayers };
}
