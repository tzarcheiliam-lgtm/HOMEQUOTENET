import { Card } from '@/components/ui/card';

/** Skeleton for the calling workspace while the list and metrics load. */
export default function CallsLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="h-9 w-72 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-28" />
        ))}
      </div>
      <div className="h-9 w-full max-w-2xl rounded bg-muted" />
      <Card className="h-14" />
      <Card className="p-0">
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="ml-auto h-8 w-40 rounded bg-muted" />
            </div>
          ))}
        </div>
      </Card>
      <span className="sr-only">Loading your call list</span>
    </div>
  );
}
