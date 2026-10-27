import Link from 'next/link';
import { ChevronRight, Phone, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { telHref } from '@/components/calls/format';
import { QUEUE_LABELS, type QueueItem } from '@/lib/setter/queue';
import { formatMoney } from '@/lib/setter/money';

const TONE: Record<'red' | 'amber' | 'blue' | 'slate', string> = {
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-900',
  blue: 'bg-blue-100 text-blue-800',
  slate: 'bg-muted text-muted-foreground',
};

/**
 * "Money on the table": the next calls, most urgent first. Every row is a real
 * record — a meeting to confirm, a callback promised, an interested contractor
 * to book, a no-show to rebook — with one tap to dial or open it.
 */
export function MoneyQueue({
  items,
  chances,
  payPerSale,
  limit = 12,
}: {
  items: QueueItem[];
  chances: number;
  payPerSale: number | null;
  limit?: number;
}) {
  const shown = items.slice(0, limit);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-base">Money on the table</CardTitle>
          <p className="text-sm text-muted-foreground">
            {chances > 0 ? (
              <>
                <strong className="text-foreground tabular-nums">{chances}</strong> {chances === 1 ? 'chance' : 'chances'} to book
                {payPerSale !== null ? (
                  <>
                    {' '}· each that sells = <span className="font-semibold text-emerald-700">{formatMoney(payPerSale)}</span>
                  </>
                ) : null}
              </>
            ) : (
              'Work it top to bottom'
            )}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm font-medium">Board&rsquo;s clear 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing waiting on you. The next booking is in the call list.</p>
            <Link href="/app/calls/dial" className={cn(buttonVariants(), 'mt-3')}>
              <Timer className="size-4" aria-hidden="true" /> Start a power hour
            </Link>
          </div>
        ) : (
          <ol className="divide-y">
            {shown.map((i) => {
              const label = QUEUE_LABELS[i.kind];
              const tel = i.phone ? telHref(i.phone) : null;
              return (
                <li key={i.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn('w-[4.5rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold sm:w-24 sm:px-2 sm:text-[11px]', TONE[label.tone])}>
                    {label.tag}
                  </span>
                  <Link href={i.href} className="group min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium group-hover:underline">{i.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.detail}</span>
                  </Link>
                  {tel ? (
                    <a href={tel} aria-label={`Call ${i.title}`} className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 gap-1.5')}>
                      <Phone className="size-3.5" aria-hidden="true" />
                      <span className="max-sm:hidden">Call</span>
                    </a>
                  ) : (
                    <Link href={i.href} aria-label={`Open ${i.title}`} className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'shrink-0')}>
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {items.length > shown.length ? (
          <p className="pt-2 text-xs text-muted-foreground">
            +{items.length - shown.length} more after these.{' '}
            <Link href="/app/calls?view=callbacks" className="underline">
              See callbacks
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
