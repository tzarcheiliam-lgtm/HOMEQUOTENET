import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Standard KPI tile. Monetary metrics use `accent="money"` to render the value
 * in emerald — the one consistent splash of color across the whole product.
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
    <Card className={cn(isMoney && 'border-emerald-600/20 bg-emerald-50/40', className)}>
      <CardContent className="space-y-2 p-4 lg:space-y-3 lg:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:text-xs">
            {label}
          </span>
          {Icon && (
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-lg',
                isMoney
                  ? 'bg-emerald-600/10 text-emerald-700'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div>
          <p
            className={cn(
              'font-semibold tabular-nums tracking-tight',
              isMoney
                ? 'text-xl text-emerald-700 min-[400px]:text-2xl lg:text-3xl'
                : 'text-xl min-[400px]:text-2xl lg:text-3xl'
            )}
          >
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
