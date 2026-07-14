"use client";

import * as React from "react";
import { Swords, Skull, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityAutocomplete } from "@/components/organisms/EntityAutocomplete";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import type { Team } from "@/types/team";
import type { KillerStats, MatchResult } from "@/types/killer";

interface StreakLaunchFormProps {
  teams: Team[];
  killers: KillerStats[];
  launching: boolean;
  onLaunch: (teamId: number, killerId: number, result: MatchResult) => Promise<boolean>;
}

const fieldClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

export function StreakLaunchForm({ teams, killers, launching, onLaunch }: StreakLaunchFormProps) {
  const [teamId, setTeamId] = React.useState<number | "">("");
  const [result, setResult] = React.useState<MatchResult>("win");
  const killerAutocomplete = useAutocomplete(killers);
  const killerId = killerAutocomplete.selected?.id ?? "";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (teamId === "" || killerId === "") return;
    const ok = await onLaunch(Number(teamId), Number(killerId), result);
    if (ok) killerAutocomplete.clearSelection();
  }

  if (teams.length === 0) {
    return (
      <section className="card-dark p-5">
        <h3 className="mb-2 text-xs uppercase tracking-widest text-muted">Log a match</h3>
        <p className="text-sm text-muted">Create a team first to start a streak.</p>
      </section>
    );
  }

  return (
    <section className="card-dark p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-widest text-muted">Log a match</h3>
      <form onSubmit={submit} className="space-y-3">
        <select
          aria-label="Team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value === "" ? "" : Number(e.target.value))}
          className={fieldClass}
        >
          <option value="">Select team…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <EntityAutocomplete
          {...killerAutocomplete}
          placeholder="Search killer faced..."
          searchLabel="Killer faced"
          suggestionsLabel="Killer suggestions"
          notFoundLabel="No killers found for"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={result === "win"}
            onClick={() => setResult("win")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
              result === "win"
                ? "border-blood bg-blood/15 text-white"
                : "border-subtle text-muted hover:text-white"
            )}
          >
            <Swords size={15} /> Win (escaped)
          </button>
          <button
            type="button"
            aria-pressed={result === "loss"}
            onClick={() => setResult("loss")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
              result === "loss"
                ? "border-white/40 bg-white/10 text-white"
                : "border-subtle text-muted hover:text-white"
            )}
          >
            <Skull size={15} /> Loss (died)
          </button>
        </div>

        <button
          type="submit"
          disabled={launching || teamId === "" || killerId === ""}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
        >
          {launching ? <Loader2 size={15} className="animate-spin" /> : null}
          Log match
        </button>
      </form>
    </section>
  );
}
