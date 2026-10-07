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
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'money';
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
        <p
          className={cn(
            'mt-1 text-xl font-semibold leading-7 tabular-nums tracking-tight lg:text-2xl lg:leading-8',
            isMoney && 'text-emerald-700'
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs leading-4 text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
