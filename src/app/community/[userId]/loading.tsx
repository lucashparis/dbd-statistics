export default function CommunityProfileLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-[73px] border-b border-subtle bg-surface/80" />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 h-4 w-16 animate-pulse rounded bg-surface-3" />
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-20 w-20 animate-pulse rounded-full bg-surface-3" />
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-surface-3" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-3" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-3" />
          ))}
        </div>
      </main>
    </div>
  );
}
