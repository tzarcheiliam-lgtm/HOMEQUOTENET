import Link from 'next/link';
import { AlarmClock, CalendarCheck, ChevronRight, Phone, PhoneOff, Star } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/mobile-card';
import { cn } from '@/lib/utils';
import { isDialable } from '@/lib/calls/rules';
import type { ProspectListRow } from '@/lib/data/prospects';
import { DispositionBadge } from './disposition-badge';
import { fmtDateTime, fmtPhone, fmtRelative, isDue, telHref } from './format';

/**
 * Phone version of the calling list (below lg; the table takes over above).
 * One prospect per card, laid out for a caller between dials: who, the number,
 * where they stand and when they are next due, then one big Call button with
 * Log and Open beside it. Same rows, same rules as the table — a
 * do-not-call prospect gets no call button and a struck number.
 */
export function ProspectCards({
  rows,
  isAdmin,
}: {
  rows: ProspectListRow[];
  isAdmin: boolean;
}) {
  return (
    <ul className="space-y-3 lg:hidden">
      {rows.map((p) => {
        const dnc = p.disposition === 'do_not_call';
        const tel = isDialable(p) ? telHref(p.phone) : null;
        const due = isDue(p.next_callback_at);
        const booked = p.appointment_at && p.disposition === 'appointment_booked';
        const market = [p.city, p.niche ?? p.category].filter(Boolean).join(' · ');
        return (
          <li key={p.id}>
            <MobileCard className={cn('p-0', dnc && 'bg-muted/40')}>
              <Link
                href={`/app/calls/${p.id}`}
                className="block rounded-t-xl p-4 pb-3 active:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-snug">{p.company_name}</p>
                    {market ? (
                      <p className="truncate text-sm text-muted-foreground">{market}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <DispositionBadge value={p.disposition} />
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>

                <p
                  className={cn(
                    'mt-2 text-lg font-semibold tabular-nums tracking-tight',
                    dnc && 'text-muted-foreground line-through'
                  )}
                >
                  {fmtPhone(p.phone)}
                </p>

                {p.primary_services.length > 0 ? (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {p.primary_services.join(', ')}
                  </p>
                ) : null}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {booked ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <CalendarCheck className="size-3.5" aria-hidden="true" />
                      Appt {fmtDateTime(p.appointment_at)}
                    </span>
                  ) : p.next_callback_at ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1',
                        due ? 'font-semibold text-amber-700' : 'text-muted-foreground'
                      )}
                    >
                      <AlarmClock className="size-3.5" aria-hidden="true" />
                      {due ? 'Due ' : 'Callback '}
                      {fmtDateTime(p.next_callback_at)}
                    </span>
                  ) : null}
                  {p.rating !== null ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Star className="size-3.5" aria-hidden="true" />
                      {p.rating.toFixed(1)} ({p.review_count ?? 0})
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">
                    {p.call_attempt_count} {p.call_attempt_count === 1 ? 'attempt' : 'attempts'}
                    {p.last_contacted_at ? ` · ${fmtRelative(p.last_contacted_at)}` : ''}
                  </span>
                  {isAdmin ? (
                    <span className="text-muted-foreground">
                      {p.assigned_name ?? 'Unassigned'}
                    </span>
                  ) : null}
                </div>
              </Link>

              <div className="flex gap-2 border-t p-3">
                {tel ? (
                  <a
                    href={tel}
                    aria-label={`Call ${p.company_name}`}
                    className={cn(buttonVariants(), 'flex-[2] gap-2')}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    Call
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'pointer-events-none flex-[2] gap-2 opacity-60'
                    )}
                  >
                    <PhoneOff className="size-4" aria-hidden="true" />
                    {dnc ? 'Do not call' : 'No number'}
                  </span>
                )}
                {dnc ? null : (
                  <Link
                    href={`/app/calls/${p.id}#log`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
                  >
                    Log
                  </Link>
                )}
                <Link
                  href={`/app/calls/${p.id}`}
                  className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
                >
                  Open
                </Link>
              </div>
            </MobileCard>
          </li>
        );
      })}
    </ul>
  );
}
