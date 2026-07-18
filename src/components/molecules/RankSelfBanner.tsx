import * as React from "react";
import { cn } from "@/lib/utils";
import { RANK_MIN_MATCHES, type RankEntry, type RankMetric, type RankViewer } from "@/types/profile";

interface RankSelfBannerProps {
  me: RankViewer | null;
  metric: RankMetric;
  className?: string;
}

const METRIC_LABEL: Record<RankMetric, string> = {
  matches: "matches",
  wins: "wins",
  winRate: "win rate",
};

function metricValue(entry: RankEntry, metric: RankMetric): string {
  if (metric === "wins") return String(entry.stats.wins);
  if (metric === "winRate") return `${entry.stats.winRate}%`;
  return String(entry.stats.total);
}

function Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("card-dark p-4 text-sm text-muted", className)}>{children}</div>;
}

export function RankSelfBanner({ me, metric, className }: RankSelfBannerProps) {
  if (!me) return null;

  if (me.status === "noProfile") {
    return (
      <Hint className={className}>
        You&apos;re not on the rank yet — create a public profile from the avatar menu to appear.
      </Hint>
    );
  }

  if (me.status === "belowThreshold") {
    return (
      <Hint className={className}>
        You&apos;re not on the rank yet — {me.remaining} more{" "}
        {me.remaining === 1 ? "match" : "matches"} to qualify ({me.total}/{RANK_MIN_MATCHES} played).
      </Hint>
    );
  }

  const entry = me.entry;
  const displayName = entry.name?.trim() || entry.nick;
  return (
    <div
      className={cn(
        "card-dark flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-blood/40 p-4",
        className
      )}
    >
      <p className="text-sm text-gray-300">
        Your position:{" "}
        <span className="font-display text-lg font-bold text-blood">#{entry.rank}</span>
        <span className="ml-2 text-muted">({displayName})</span>
      </p>
      <p className="text-sm text-muted">
        <span className="font-display font-bold text-white">{metricValue(entry, metric)}</span>{" "}
        <span className="uppercase tracking-wide">{METRIC_LABEL[metric]}</span>
      </p>
    </div>
  );
}
