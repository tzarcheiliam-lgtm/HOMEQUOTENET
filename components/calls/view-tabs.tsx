import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CALL_VIEWS, type CallView } from '@/lib/calls/constants';

/**
 * Saved views as links, so the browser back button and a shared URL both
 * work. Admin-only views are simply not rendered for callers; the data
 * layer refuses them anyway.
 */
export function ViewTabs({
  current,
  isAdmin,
  counts,
}: {
  current: CallView;
  isAdmin: boolean;
  counts?: Partial<Record<CallView, number>>;
}) {
  const views = CALL_VIEWS.filter((v) => isAdmin || !v.adminOnly);
  return (
    <nav
      aria-label="Saved views"
      className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0"
    >
      {views.map((v) => {
        const active = v.value === current;
        const count = counts?.[v.value];
        return (
          <Link
            key={v.value}
            href={`/app/calls?view=${v.value}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors lg:min-h-0 lg:rounded-md lg:px-3',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {v.label}
            {typeof count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-primary-foreground/20' : 'bg-background'
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
