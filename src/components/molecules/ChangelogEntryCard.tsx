import * as React from "react";
import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { formatChangelogDate } from "@/lib/changelog";
import type { ChangelogEntry } from "@/types/changelog";

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
}

export function ChangelogEntryCard({ entry }: ChangelogEntryCardProps) {
  return (
    <article className="card-dark p-5">
      <h2
        className="text-lg font-bold text-white"
        style={{ fontFamily: "var(--font-cinzel), serif" }}
      >
        {entry.feature}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} aria-hidden />
          <time dateTime={entry.date}>{formatChangelogDate(entry.date)}</time>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UserRound size={14} aria-hidden />
          Requested by{" "}
          {entry.requestedByUserId ? (
            <Link
              href={`/community/${entry.requestedByUserId}`}
              className="rounded text-gray-300 underline-offset-2 transition-colors hover:text-blood hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood/60"
            >
              {entry.requestedBy}
            </Link>
          ) : (
            <span className="text-gray-300">{entry.requestedBy}</span>
          )}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-300">{entry.description}</p>
    </article>
  );
}
