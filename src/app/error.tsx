"use client";

import { Skull } from "lucide-react";
import { Button } from "@/components/atoms/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-blood/40 bg-blood/10">
        <Skull size={32} className="text-blood" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted">
          An unexpected error interrupted the trial. You can try again.
        </p>
        {error.digest && (
          <p className="text-xs text-muted/60">Reference: {error.digest}</p>
        )}
      </div>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
