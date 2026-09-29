/**
 * Instant skeleton for every /app screen that has no loading UI of its own:
 * the shell (nav, header) stays put and the content area shimmers, so tapping
 * a tab feels immediate instead of showing a blank page or a spinner.
 */
export default function AppLoading() {
  return (
    <div className="space-y-4 motion-safe:animate-pulse" role="status" aria-label="Loading">
      <div className="h-7 w-48 rounded-md bg-muted" />
      <div className="h-4 w-64 max-w-full rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="h-20 rounded-xl bg-muted" />
        <div className="h-20 rounded-xl bg-muted" />
        <div className="hidden h-20 rounded-xl bg-muted sm:block" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-xl bg-muted" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
