import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/atoms/Avatar";
import { cn } from "@/lib/utils";
import type { RankEntry, RankMetric } from "@/types/profile";

interface RankRowProps {
  entry: RankEntry;
  metric: RankMetric;
  isMe?: boolean;
}

function RowStat({
  label,
  value,
  active,
}: {
  label: string;
  value: number | string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md px-2 py-1 text-center sm:min-w-14",
        active ? "bg-blood/15" : "bg-surface-2"
      )}
    >
      <p className={cn("truncate font-display text-base font-bold", active ? "text-blood" : "text-white")}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}

export function RankRow({ entry, metric, isMe = false }: RankRowProps) {
  const displayName = entry.name?.trim() || entry.nick;

  return (
    <Link
      href={`/community/${entry.userId}`}
      aria-label={`View ${displayName}'s statistics`}
      className={cn(
        "card-dark card-hover flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4",
        isMe && "border-blood/60 ring-1 ring-blood/40"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-7 shrink-0 text-center font-display text-lg font-bold text-muted sm:w-10 sm:text-xl">
          #{entry.rank}
        </span>
        <Avatar imageUrl={entry.mainKiller?.imageUrl} label={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-base font-semibold text-white">{displayName}</p>
            {isMe && (
              <span className="shrink-0 rounded-full bg-blood px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                You
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted">@{entry.nick}</p>
          {entry.mainKiller && (
            <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-blood">
              {entry.mainKiller.name}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:shrink-0 sm:gap-2">
        <RowStat label="Matches" value={entry.stats.total} active={metric === "matches"} />
        <RowStat label="Wins" value={entry.stats.wins} active={metric === "wins"} />
        <RowStat label="Win rate" value={`${entry.stats.winRate}%`} active={metric === "winRate"} />
      </div>
    </Link>
  );
}
