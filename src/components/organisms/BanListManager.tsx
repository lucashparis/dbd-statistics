"use client";

import * as React from "react";
import { Loader2, Search, ShieldBan, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { useBannableUserSearch } from "@/hooks/useBannableUserSearch";
import type { BanView, BannableUser } from "@/types/ban";

const fieldClass =
  "w-full rounded-md border border-subtle bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blood";

interface BanListManagerProps {
  bans: BanView[];
  loading: boolean;
  error: string | null;
  banning: boolean;
  liftingId: string | null;
  onBan: (userId: string, reason: string) => Promise<boolean>;
  onLift: (id: string) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function BanListManager({
  bans,
  loading,
  error,
  banning,
  liftingId,
  onBan,
  onLift,
}: BanListManagerProps) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<BannableUser | null>(null);
  const [reason, setReason] = React.useState("");
  const { results, loading: searching } = useBannableUserSearch(selected ? "" : query);

  const active = bans.filter((b) => b.liftedAt === null);
  const history = bans.filter((b) => b.liftedAt !== null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || reason.trim() === "") return;
    const ok = await onBan(selected.userId, reason.trim());
    if (!ok) return;
    setSelected(null);
    setQuery("");
    setReason("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card-dark space-y-4 p-5">
        <h3 className="text-xs uppercase tracking-widest text-muted">Add to the ban list</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="ban-search" className="mb-1 block text-xs text-muted">
              Player
            </label>
            {selected ? (
              <div className="flex items-center gap-2 rounded-md border border-subtle bg-surface-2 px-3 py-2">
                <Avatar imageUrl={selected.imageUrl} label={selected.nick} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-white">{selected.nick}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs text-muted transition-colors hover:text-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <Search size={15} />
                  </span>
                  <input
                    id="ban-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a nick…"
                    autoComplete="off"
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
                {query.trim().length >= 2 && (
                  <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-subtle bg-surface-2 scrollbar-dark">
                    {searching ? (
                      <li className="px-3 py-2 text-sm text-muted">Searching…</li>
                    ) : results.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-muted">No public players found.</li>
                    ) : (
                      results.map((u) => (
                        <li key={u.userId}>
                          <button
                            type="button"
                            disabled={u.isBanned}
                            onClick={() => {
                              setSelected(u);
                              setQuery("");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-surface-3 hover:text-white disabled:opacity-40"
                          >
                            <Avatar imageUrl={u.imageUrl} label={u.nick} size="sm" />
                            <span className="min-w-0 flex-1 truncate">{u.nick}</span>
                            {u.isBanned && <span className="text-xs text-muted">Already banned</span>}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="ban-reason" className="mb-1 block text-xs text-muted">
              Reason
            </label>
            <input
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="Fake matches distorting the ranking"
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            disabled={banning || !selected || reason.trim() === ""}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-blood py-2.5 text-sm font-medium text-white transition-colors hover:bg-blood-dark disabled:opacity-50"
          >
            {banning ? <Loader2 size={15} className="animate-spin" /> : <ShieldBan size={15} />}
            Ban player
          </button>
        </form>
      </section>

      <section className="card-dark space-y-4 p-5">
        <h3 className="text-xs uppercase tracking-widest text-muted">
          Banned players ({active.length})
        </h3>

        {loading ? (
          <p className="text-sm text-muted">Loading the ban list…</p>
        ) : error ? (
          <p className="text-sm text-blood">{error}</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted">Nobody is on the ban list.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((b) => (
              <li
                key={b.id}
                className="flex items-start gap-3 rounded-md border border-subtle bg-surface-2 p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium text-white">{b.nick ?? b.name ?? b.userId}</p>
                  <p className="text-xs text-muted">{b.reason}</p>
                  <p className="text-xs text-muted">
                    {formatDate(b.createdAt)}
                    {b.bannedBy ? ` · by ${b.bannedBy}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onLift(b.id)}
                  disabled={liftingId === b.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-subtle px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-emerald-600 hover:text-emerald-400 disabled:opacity-50"
                >
                  {liftingId === b.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={12} />
                  )}
                  Lift
                </button>
              </li>
            ))}
          </ul>
        )}

        {history.length > 0 && (
          <div className="space-y-2 border-t border-subtle pt-4">
            <h4 className="text-xs uppercase tracking-widest text-muted">History</h4>
            <ul className="space-y-1.5">
              {history.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-xs text-muted">
                  <Badge variant="default">Lifted</Badge>
                  <span className="min-w-0 flex-1 truncate">
                    {b.nick ?? b.name ?? b.userId} — {b.reason}
                  </span>
                  <span className="shrink-0">{formatDate(b.liftedAt!)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
