"use client";

import * as React from "react";
import { Flame, Trophy, Activity, TrendingUp, ChevronDown, Users, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamStreak } from "@/types/team";

export function TeamStreakCard({
  streak,
  onDeleteMatch,
  deletingId,
}: {
  streak: TeamStreak;
  onDeleteMatch?: (matchId: number) => void;
  deletingId?: number | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);

  return (
    <article className="card-dark p-5 space-y-4">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Users size={15} className="text-blood" />
          {streak.team.name}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {streak.team.members.map((m) => (
            <span key={m.id} className="rounded-full border border-subtle px-2 py-0.5 text-[11px] text-muted">
              {m.nick}
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Flame} label="Current streak" value={streak.currentStreak} highlight />
        <Metric icon={Trophy} label="Best streak" value={streak.bestStreak} />
        <Metric icon={Activity} label="Matches" value={streak.totalMatches} />
        <Metric icon={TrendingUp} label="Win rate" value={`${streak.winRate}%`} />
      </div>

      {streak.matches.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted transition-colors hover:text-white"
          >
            Timeline ({streak.matches.length})
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <ul className="mt-3 divide-y divide-subtle">
              {streak.matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate text-white">{m.killer.name}</span>
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        m.result === "win" ? "bg-blood/15 text-blood" : "bg-white/10 text-white/60"
                      )}
                    >
                      {m.result === "win" ? "Win" : "Loss"}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {onDeleteMatch &&
                      (confirmId === m.id ? (
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmId(null);
                              onDeleteMatch(m.id);
                            }}
                            disabled={deletingId === m.id}
                            className="text-[11px] font-medium text-blood transition-colors hover:text-blood-dark disabled:opacity-50"
                            aria-label={`Confirm removing match against ${m.killer.name}`}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className="text-[11px] text-muted transition-colors hover:text-white"
                            aria-label="Cancel removal"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(m.id)}
                          disabled={deletingId === m.id}
                          className="text-muted transition-colors hover:text-blood disabled:opacity-50"
                          aria-label={`Remove match against ${m.killer.name}`}
                        >
                          {deletingId === m.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-subtle bg-surface-2 p-3 text-center">
      <Icon size={16} className={highlight ? "text-blood" : "text-muted"} />
      <span className={cn("text-2xl font-bold", highlight ? "text-blood" : "text-white")}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}
