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
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'money';
}) {
  const isMoney = accent === 'money';
  return (
    <Card className={isMoney ? 'border-emerald-600/20 bg-emerald-50/40' : undefined}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              isMoney ? 'text-3xl text-emerald-700' : 'text-3xl'
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
