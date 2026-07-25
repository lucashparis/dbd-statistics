"use client";

import * as React from "react";
import { Swords, Skull, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityAutocomplete } from "@/components/organisms/EntityAutocomplete";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { READ_ONLY_SEASON_HINT } from "@/components/molecules/ActionButtons";
import type { Crew } from "@/types/crew";
import type { KillerStats, MatchResult } from "@/types/killer";

interface CrewLaunchFormProps {
  crews: Crew[];
  killers: KillerStats[];
  launching: boolean;
  onLaunch: (crewId: number, killerId: number, result: MatchResult) => Promise<boolean>;
  // A crew match is stamped with `now()`, so it can only be logged while the
  // current season (or all time) is on screen.
  readOnly?: boolean;
}

const fieldClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

export function CrewLaunchForm({
  crews,
  killers,
  launching,
  onLaunch,
  readOnly = false,
}: CrewLaunchFormProps) {
  const writable = crews.filter((c) => c.canWrite);
  const [crewId, setCrewId] = React.useState<number | "">("");
  const [result, setResult] = React.useState<MatchResult>("win");
  const killerAutocomplete = useAutocomplete(killers);
  const killerId = killerAutocomplete.selected?.id ?? "";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (crewId === "" || killerId === "") return;
    const ok = await onLaunch(Number(crewId), Number(killerId), result);
    if (ok) killerAutocomplete.clearSelection();
  }

  if (readOnly) {
    return (
      <section className="card-dark p-5">
        <h3 className="mb-2 text-xs uppercase tracking-widest text-muted">Log a match</h3>
        <p className="text-sm text-muted">
          {READ_ONLY_SEASON_HINT} — switch to the current season to log a match.
        </p>
      </section>
    );
  }

  if (writable.length === 0) {
    return (
      <section className="card-dark p-5">
        <h3 className="mb-2 text-xs uppercase tracking-widest text-muted">Log a match</h3>
        <p className="text-sm text-muted">
          No crew is ready for you to log yet. Create a crew, wait for everyone to accept, or ask the host
          to let members log.
        </p>
      </section>
    );
  }

  return (
    <section className="card-dark p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-widest text-muted">Log a match</h3>
      <form onSubmit={submit} className="space-y-3">
        <select
          aria-label="Crew"
          value={crewId}
          onChange={(e) => setCrewId(e.target.value === "" ? "" : Number(e.target.value))}
          className={fieldClass}
        >
          <option value="">Select crew…</option>
          {writable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
              result === "win" ? "border-blood bg-blood/15 text-white" : "border-subtle text-muted hover:text-white"
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
              result === "loss" ? "border-white/40 bg-white/10 text-white" : "border-subtle text-muted hover:text-white"
            )}
          >
            <Skull size={15} /> Loss (died)
          </button>
        </div>

        <button
          type="submit"
          disabled={launching || crewId === "" || killerId === ""}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
        >
          {launching ? <Loader2 size={15} className="animate-spin" /> : null}
          Log match
        </button>
      </form>
    </section>
  );
}
