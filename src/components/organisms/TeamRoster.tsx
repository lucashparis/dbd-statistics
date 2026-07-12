"use client";

import * as React from "react";
import { Users, Trash2, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/types/team";

const MAX_MEMBERS = 4;
const inputClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

interface TeamRosterProps {
  teams: Team[];
  players: Player[];
  loading: boolean;
  saving: boolean;
  deletingId: number | null;
  onCreate: (name: string, playerIds: number[]) => Promise<boolean>;
  onDelete: (id: number) => void;
}

export function TeamRoster({ teams, players, loading, saving, deletingId, onCreate, onDelete }: TeamRosterProps) {
  const [name, setName] = React.useState("");
  const [selected, setSelected] = React.useState<number[]>([]);

  function toggle(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_MEMBERS) return prev;
      return [...prev, id];
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || selected.length === 0) return;
    const ok = await onCreate(name.trim(), selected);
    if (ok) {
      setName("");
      setSelected([]);
    }
  }

  return (
    <section className="card-dark p-5 space-y-5">
      <h3 className="text-xs uppercase tracking-widest text-muted">Teams</h3>

      <form onSubmit={submit} className="space-y-3">
        <input
          aria-label="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          maxLength={60}
          className={inputClass}
        />

        {players.length === 0 ? (
          <p className="text-sm text-muted">Add players first to build a team.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const active = selected.includes(p.id);
              const disabled = !active && selected.length >= MAX_MEMBERS;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  disabled={disabled}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "border-blood bg-blood/15 text-white"
                      : "border-subtle text-muted hover:border-blood/50 hover:text-white",
                    disabled && "opacity-40 hover:border-subtle hover:text-muted"
                  )}
                >
                  {p.nick}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {selected.length}/{MAX_MEMBERS} selected
          </span>
          <button
            type="submit"
            disabled={saving || !name.trim() || selected.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-blood px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create team
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading teams…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted">No teams yet.</p>
      ) : (
        <ul className="space-y-3">
          {teams.map((t) => (
            <li key={t.id} className="rounded-lg border border-subtle bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Users size={14} className="text-blood" />
                    {t.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.members.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full border border-subtle px-2 py-0.5 text-[11px] text-muted"
                      >
                        {m.nick}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(t.id)}
                  disabled={deletingId === t.id}
                  aria-label={`Delete ${t.name}`}
                  className="shrink-0 rounded-md p-2 text-muted transition-colors hover:text-blood disabled:opacity-50"
                >
                  {deletingId === t.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
