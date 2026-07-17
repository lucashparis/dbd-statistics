export default function ChangelogLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-[73px] border-b border-subtle bg-surface/80" />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 h-4 w-16 animate-pulse rounded bg-surface-3" />
        <div className="mb-6 space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-surface-3" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-3" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-3" />
          ))}
        </div>
      </main>
    </div>
  );
}
