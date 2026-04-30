import * as React from "react";

export function MatchItemSkeleton() {
  return (
    <li className="flex items-center gap-4 px-4 py-3 rounded-lg bg-surface border border-subtle animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-full bg-surface-3" />
      <div className="flex-1 h-4 max-w-[180px] rounded bg-surface-3" />
      <div className="hidden h-3 w-28 rounded bg-surface-3 sm:block" />
      <div className="h-5 w-16 rounded-full bg-surface-3" />
    </li>
  );
}
