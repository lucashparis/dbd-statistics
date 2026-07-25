"use client";

import * as React from "react";
import { Flame, Trophy, Activity, TrendingUp, ChevronDown, Users, Trash2, Loader2, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import type { Crew, CrewMemberView, CrewWritePolicy } from "@/types/crew";

interface CrewCardProps {
  crew: Crew;
  onDeleteMatch?: (crewId: number, matchId: number) => void;
  deletingMatchId?: number | null;
  onRemoveMember?: (crewId: number, userId: string) => void;
  onDeleteCrew?: (crewId: number) => void;
  onSetPolicy?: (crewId: number, policy: CrewWritePolicy) => void;
  // Past seasons are historical: the timeline is visible but not editable.
  readOnly?: boolean;
}

function StatusBadge({ status }: { status: CrewMemberView["status"] }) {
  if (status === "accepted") return <Badge variant="success">Accepted</Badge>;
  if (status === "declined") return <Badge variant="danger">Declined</Badge>;
  return <Badge variant="muted">Pending</Badge>;
}

export function CrewCard({
  crew,
  onDeleteMatch,
  deletingMatchId,
  onRemoveMember,
  onDeleteCrew,
  onSetPolicy,
  readOnly = false,
}: CrewCardProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);
  const manage = crew.isOwner && (onRemoveMember != null || onDeleteCrew != null || onSetPolicy != null);
  const canDeleteMatch = onDeleteMatch != null && !readOnly;

  return (
    <article className="card-dark p-5 space-y-4">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users size={15} className="text-blood" />
            {crew.name}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant={crew.writePolicy === "hostOnly" ? "danger" : "default"}>
              {crew.writePolicy === "hostOnly" ? "Host-only logging" : "Anyone can log"}
            </Badge>
            {manage && onDeleteCrew && (
              <button
                type="button"
                onClick={() => onDeleteCrew(crew.id)}
                aria-label={`Delete crew ${crew.name}`}
                className="text-muted transition-colors hover:text-blood"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {!crew.isReady && (
          <p className="text-xs text-amber-400/80">Waiting for all members to accept before logging.</p>
        )}

        <ul className="space-y-1.5">
          {crew.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar imageUrl={m.imageUrl} label={m.nick || m.name || "Player"} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">
                    {m.nick || m.name || "Player"}
                    {m.isOwner && <span className="ml-1 text-[11px] text-blood">host</span>}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                {manage && onRemoveMember && !m.isOwner && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(crew.id, m.userId)}
                    aria-label={`Remove ${m.nick || m.name || "player"} from the crew`}
                    className="text-muted transition-colors hover:text-blood"
                  >
                    <UserMinus size={15} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>

        {manage && onSetPolicy && (
          <div className="flex items-center gap-2 pt-1" role="radiogroup" aria-label="Who can log matches">
            {(["allMembers", "hostOnly"] as const).map((policy) => (
              <button
                key={policy}
                type="button"
                role="radio"
                aria-checked={crew.writePolicy === policy}
                onClick={() => onSetPolicy(crew.id, policy)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                  crew.writePolicy === policy
                    ? "border-blood bg-blood/15 text-white"
                    : "border-subtle text-muted hover:text-white"
                )}
              >
                {policy === "allMembers" ? "Anyone can log" : "Only host"}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Flame} label="Current streak" value={crew.currentStreak} highlight />
        <Metric icon={Trophy} label="Best streak" value={crew.bestStreak} />
        <Metric icon={Activity} label="Matches" value={crew.totalMatches} />
        <Metric icon={TrendingUp} label="Win rate" value={`${crew.winRate}%`} />
      </div>

      {crew.matches.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted transition-colors hover:text-white"
          >
            Timeline ({crew.matches.length})
            <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <ul className="mt-3 divide-y divide-subtle">
              {crew.matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-white">{m.killer.name}</span>
                    {m.loggedBy.nick && (
                      <span className="block truncate text-[11px] text-muted">by {m.loggedBy.nick}</span>
                    )}
                  </span>
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
                    {canDeleteMatch &&
                      (confirmId === m.id ? (
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmId(null);
                              onDeleteMatch?.(crew.id, m.id);
                            }}
                            disabled={deletingMatchId === m.id}
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
                          disabled={deletingMatchId === m.id}
                          className="text-muted transition-colors hover:text-blood disabled:opacity-50"
                          aria-label={`Remove match against ${m.killer.name}`}
                        >
                          {deletingMatchId === m.id ? (
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
