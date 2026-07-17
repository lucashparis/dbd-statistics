import * as React from "react";
import { Sparkles } from "lucide-react";
import { ChangelogEntryCard } from "@/components/molecules/ChangelogEntryCard";
import { EmptyState } from "@/components/molecules/EmptyState";
import type { ChangelogEntry } from "@/types/changelog";

interface ChangelogTemplateProps {
  entries: ChangelogEntry[];
}

export function ChangelogTemplate({ entries }: ChangelogTemplateProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          className="text-2xl font-bold uppercase tracking-[0.1em] text-white"
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          What&apos;s new
        </h1>
        <p className="text-sm text-muted">
          The latest features shipped to the tracker, newest first.
        </p>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No updates yet"
          description="New features will show up here as they ship."
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <ChangelogEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
