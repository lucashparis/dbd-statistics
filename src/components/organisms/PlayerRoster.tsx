"use client";

import * as React from "react";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import type { Player } from "@/types/team";

const inputClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

interface PlayerRosterProps {
  players: Player[];
  loading: boolean;
  saving: boolean;
  deletingId: number | null;
  onAdd: (name: string, nick: string) => Promise<boolean>;
  onDelete: (id: number) => void;
}

export function PlayerRoster({ players, loading, saving, deletingId, onAdd, onDelete }: PlayerRosterProps) {
  const [name, setName] = React.useState("");
  const [nick, setNick] = React.useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !nick.trim()) return;
    const ok = await onAdd(name.trim(), nick.trim());
    if (ok) {
      setName("");
      setNick("");
    }
  }

  return (
    <section className="card-dark p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-widest text-muted">Players</h3>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          maxLength={60}
          className={inputClass}
        />
        <input
          aria-label="Player nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Nick"
          maxLength={40}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={saving || !name.trim() || !nick.trim()}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-blood px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading players…</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-muted">No players yet. Add your first survivor above.</p>
      ) : (
        <ul className="divide-y divide-subtle">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{p.name}</p>
                <p className="truncate text-xs text-blood">{p.nick}</p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                disabled={deletingId === p.id}
                aria-label={`Delete ${p.nick}`}
                className="shrink-0 rounded-md p-2 text-muted transition-colors hover:text-blood disabled:opacity-50"
              >
                {deletingId === p.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
