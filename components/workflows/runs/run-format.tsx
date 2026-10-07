import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WORKFLOW_TRIGGERS } from '@/lib/workflows/events';

/** Small display helpers shared by the run list and the run detail. */

export const humanize = (code: string | null | undefined) => {
  const text = (code ?? '').replace(/[_.:]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

export const triggerLabel = (type: string) => (WORKFLOW_TRIGGERS as Record<string, { label: string } | undefined>)[type]?.label ?? (humanize(type) || '—');

/** Date and time in the viewer's locale. Wrapped in <When> so server/client differences never warn. */
export const formatWhen = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function When({ iso, className }: { iso: string | null | undefined; className?: string }) {
  if (!iso) return <span className={className}>—</span>;
  return <time dateTime={iso} suppressHydrationWarning className={cn('whitespace-nowrap', className)}>{formatWhen(iso)}</time>;
}

export const RUN_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', running: 'Running', waiting: 'Waiting', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled',
};

const RUN_STATUS_STYLE: Record<string, string> = {
  completed: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  waiting: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  running: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  pending: 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  cancelled: 'border-transparent bg-muted text-muted-foreground',
};

/** Status is always spelled out in words; colour is only a hint. */
export function RunStatusBadge({ status, mode }: { status: string; mode?: 'live' | 'test' }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={RUN_STATUS_STYLE[status] ?? RUN_STATUS_STYLE.cancelled}>{RUN_STATUS_LABEL[status] ?? humanize(status)}</Badge>
      {mode === 'test' && <Badge variant="outline">Test</Badge>}
    </span>
  );
}

export function SourceBadge({ source, mode }: { source: string; mode: 'live' | 'test' }) {
  if (mode === 'test' || source === 'test') return <Badge variant="outline">Test</Badge>;
  return <Badge variant={source === 'manual' ? 'outline' : 'secondary'}>{source === 'manual' ? 'Manual' : 'Event'}</Badge>;
}

export const STEP_STATUS_LABEL: Record<string, string> = {
  running: 'Running', waiting: 'Waiting', retry_scheduled: 'Retry scheduled', succeeded: 'Done', failed: 'Failed', skipped: 'Skipped', cancelled: 'Cancelled',
};

export const STEP_STATUS_STYLE: Record<string, string> = {
  succeeded: RUN_STATUS_STYLE.completed,
  failed: RUN_STATUS_STYLE.failed,
  waiting: RUN_STATUS_STYLE.waiting,
  retry_scheduled: RUN_STATUS_STYLE.waiting,
  running: RUN_STATUS_STYLE.running,
  skipped: RUN_STATUS_STYLE.cancelled,
  cancelled: RUN_STATUS_STYLE.cancelled,
};
