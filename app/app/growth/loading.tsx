// Skeleton for the services pages while company context and requests load.
export default function GrowthLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading services…</span>
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl border bg-card motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
