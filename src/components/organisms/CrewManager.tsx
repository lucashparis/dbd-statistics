"use client";

import * as React from "react";
import { Loader2, Plus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/atoms/Avatar";
import { useInviteeSearch } from "@/hooks/useInviteeSearch";
import type { CrewWritePolicy, Invitee } from "@/types/crew";

const fieldClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

interface CrewManagerProps {
  creating: boolean;
  onCreate: (vars: { name: string; inviteeUserIds: string[]; writePolicy: CrewWritePolicy }) => Promise<boolean>;
}

const MAX_INVITES = 3;

export function CrewManager({ creating, onCreate }: CrewManagerProps) {
  const [name, setName] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Invitee[]>([]);
  const [writePolicy, setWritePolicy] = React.useState<CrewWritePolicy>("allMembers");
  const { results, loading } = useInviteeSearch(query);

  const selectedIds = new Set(selected.map((s) => s.userId));
  const suggestions = results.filter((r) => !selectedIds.has(r.userId));
  const canAddMore = selected.length < MAX_INVITES;

  function addInvitee(invitee: Invitee) {
    if (!canAddMore) return;
    setSelected((prev) => [...prev, invitee]);
    setQuery("");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (name.trim() === "") return;
    const ok = await onCreate({
      name: name.trim(),
      inviteeUserIds: selected.map((s) => s.userId),
      writePolicy,
    });
    if (ok) {
      setName("");
      setSelected([]);
      setQuery("");
      setWritePolicy("allMembers");
    }
  }

  return (
    <section className="card-dark p-5 space-y-4">
      <h3 className="text-xs uppercase tracking-widest text-muted">Create a crew</h3>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="crew-name" className="mb-1 block text-xs text-muted">
            Crew name
          </label>
          <input
            id="crew-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="The Fog Runners"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="crew-invite" className="mb-1 block text-xs text-muted">
            Invite players by community nick ({selected.length}/{MAX_INVITES})
          </label>

          {selected.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <span
                  key={s.userId}
                  className="flex items-center gap-1.5 rounded-full border border-subtle bg-surface-2 py-0.5 pl-1 pr-2 text-xs text-white"
                >
                  <Avatar imageUrl={s.imageUrl} label={s.nick} size="sm" className="h-5! w-5!" />
                  {s.nick}
                  <button
                    type="button"
                    onClick={() => setSelected((prev) => prev.filter((p) => p.userId !== s.userId))}
                    aria-label={`Remove ${s.nick}`}
                    className="text-muted transition-colors hover:text-blood"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {canAddMore && (
            <div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Search size={15} />
                </span>
                <input
                  id="crew-invite"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a nick…"
                  className={cn(fieldClass, "pl-9")}
                  autoComplete="off"
                />
              </div>
              {query.trim().length >= 2 && (
                <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-subtle bg-surface-2 scrollbar-dark">
                  {loading ? (
                    <li className="px-3 py-2 text-sm text-muted">Searching…</li>
                  ) : suggestions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted">No public players found.</li>
                  ) : (
                    suggestions.map((s) => (
                      <li key={s.userId}>
                        <button
                          type="button"
                          onClick={() => addInvitee(s)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-surface-3 hover:text-white"
                        >
                          <Avatar imageUrl={s.imageUrl} label={s.nick} size="sm" />
                          <span className="min-w-0 flex-1 truncate">{s.nick}</span>
                          <Plus size={14} className="text-muted" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div role="radiogroup" aria-label="Who can log matches for this crew" className="space-y-1.5">
          <p className="text-xs text-muted">Who can log matches</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "allMembers", label: "Anyone in the crew" },
                { value: "hostOnly", label: "Only the host" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={writePolicy === opt.value}
                onClick={() => setWritePolicy(opt.value)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm transition-colors",
                  writePolicy === opt.value
                    ? "border-blood bg-blood/15 text-white"
                    : "border-subtle text-muted hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={creating || name.trim() === ""}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
        >
          {creating ? <Loader2 size={15} className="animate-spin" /> : null}
          Create crew
        </button>
      </form>
    </section>
  );
}
