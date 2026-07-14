import Link from "next/link";
import { Ghost } from "lucide-react";

export default function CommunityProfileNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Ghost size={48} className="text-muted" strokeWidth={1.5} />
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
          Profile not found
        </h1>
        <p className="max-w-sm text-sm text-muted">
          This player has no public profile, or it was removed from the community.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md bg-blood px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-blood-dark"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
