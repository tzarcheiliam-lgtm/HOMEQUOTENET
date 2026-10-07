import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SummaryItem {
  label: string;
  value: number | string;
  /** One plain-language line saying what the number counts. */
  meaning: string;
  icon: LucideIcon;
  /** Draw attention (failures, items needing action) when value is non-zero. */
  attention?: boolean;
}

/**
 * Compact row of counts: one bordered strip, not a card per metric. Each cell
 * pairs an icon and a label with an explicit meaning line, so status is never
 * carried by color alone.
 */
export function SummaryStrip({ items, className }: { items: SummaryItem[]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 divide-x divide-y rounded-xl border bg-card lg:grid-cols-4 lg:divide-y-0', className)}>
      {items.map(({ label, value, meaning, icon: Icon, attention }) => {
        const flagged = attention && Number(value) > 0;
        return (
          <div key={label} className={cn('min-w-0 px-4 py-3', flagged && 'bg-red-50')}>
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className={cn('size-3.5 shrink-0', flagged && 'text-red-700')} aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-2">
              <span className={cn('text-xl font-semibold tabular-nums leading-7', flagged && 'text-red-800')}>{value}</span>
            </dd>
            <dd className="text-xs leading-4 text-muted-foreground">{meaning}</dd>
          </div>
        );
      })}
    </dl>
  );
}
