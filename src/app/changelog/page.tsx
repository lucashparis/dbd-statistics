import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/organisms/AppHeader";
import { ChangelogTemplate } from "@/components/templates/ChangelogTemplate";
import { getChangelogEntries } from "@/lib/changelog";

export const dynamic = "force-dynamic";

export default function ChangelogPage() {
  const entries = getChangelogEntries();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted transition-colors hover:text-blood"
        >
          <ArrowLeft size={14} aria-hidden />
          Back
        </Link>
        <ChangelogTemplate entries={entries} />
      </main>
    </div>
  );
}
