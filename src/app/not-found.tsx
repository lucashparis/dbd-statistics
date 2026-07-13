import Link from "next/link";
import { Ghost } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-subtle bg-surface">
        <Ghost size={32} className="text-muted" />
      </div>
      <div className="space-y-2">
        <p className="font-display text-5xl font-bold text-blood">404</p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
          Lost in the fog
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted">
          The page you are looking for does not exist.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md bg-blood px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-blood-dark"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
