import * as React from "react";
import { Skull } from "lucide-react";
import { Skeleton } from "@/components/atoms/Skeleton";

function CardSkeleton() {
  return (
    <div className="card-dark overflow-hidden">
      <Skeleton className="aspect-3/4 rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="flex min-h-dvh flex-col"
    >
      <header className="sticky top-0 z-40 border-b border-subtle bg-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blood/40 bg-blood/10">
                <Skull size={22} className="text-blood/40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2 w-40" />
              </div>
            </div>
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20" />
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <div className="space-y-4">
          <Skeleton className="h-10 max-w-sm" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
