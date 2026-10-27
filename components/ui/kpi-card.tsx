import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Compact KPI tile: icon + label on one line, the number below, an optional
 * one-line qualifier. Monetary metrics use `accent="money"` to render the
 * value in emerald, the one consistent splash of color across the product.
 */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'money';
  /** Optional small chart (e.g. a sparkline) beside the value. */
  trend?: React.ReactNode;
  className?: string;
}) {
  const isMoney = accent === 'money';
  return (
    <Card className={cn('gap-0 py-0 lg:gap-0 lg:py-0', className)}>
      <CardContent className="px-3.5 py-3 lg:px-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
          <span className="min-w-0">{label}</span>
        </p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p
            className={cn(
              'text-xl font-semibold leading-7 tabular-nums tracking-tight lg:text-2xl lg:leading-8',
              isMoney && 'text-emerald-700'
            )}
          >
            {value}
          </p>
          {trend ? <span className="mb-1.5 shrink-0">{trend}</span> : null}
        </div>
        {sub && <p className="text-xs leading-4 text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
