import Link from 'next/link';
import { CalendarDays, ChevronRight, MapPin, Phone, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/mobile-card';
import { AppointmentStatusSheet } from '@/components/appointments/appointment-status-sheet';
import { APPOINTMENT_STATUSES } from '@/lib/leads/constants';
import { telHref } from '@/lib/leads/lead-emails';
import { dayLabel, directionsUrl, timeLabel } from '@/lib/appointments/view';
import { cn } from '@/lib/utils';
import type { AppointmentRow } from '@/lib/data/appointments';

const statusLabel = (s: string) => APPOINTMENT_STATUSES.find((x) => x.value === s)?.label ?? s;

function statusVariant(s: string) {
  if (s === 'held') return 'success' as const;
  if (s === 'no_show' || s === 'cancelled') return 'muted' as const;
  if (s === 'rescheduled') return 'warning' as const;
  return 'secondary' as const;
}

/**
 * Phone appointment list (below lg). Each card leads with the time — the thing
 * you check first — then who, what and where, then Call / Directions / Update.
 */
export function AppointmentCards({
  rows,
  showContractor,
  emptyText,
}: {
  rows: AppointmentRow[];
  showContractor: boolean;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
        <CalendarDays className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((a) => {
        const tel = a.lead_phone ? telHref(a.lead_phone) : null;
        const dir = directionsUrl(a);
        const place = [a.city, a.zip].filter(Boolean).join(' ') || a.location;
        return (
          <li key={a.id}>
            <MobileCard className="p-0">
              <Link
                href={a.lead_id ? `/app/leads/${a.lead_id}` : '/app/appointments'}
                className="block rounded-t-xl p-4 pb-3 active:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight tabular-nums">
                      {dayLabel(a.scheduled_at)}
                      {a.scheduled_at ? (
                        <span className="text-muted-foreground"> · {timeLabel(a.scheduled_at)}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 truncate text-base font-medium">{a.lead_name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </div>
                {a.project ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{a.project}</p>
                ) : null}
                {place ? (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{place}</span>
                  </p>
                ) : null}
                {showContractor && a.contractor_name ? (
                  <p className="mt-1 text-xs text-muted-foreground">{a.contractor_name}</p>
                ) : null}
              </Link>

              <div className="flex gap-2 border-t p-3">
                {tel ? (
                  <a
                    href={tel}
                    aria-label={`Call ${a.lead_name}`}
                    className={cn(buttonVariants(), 'flex-[1.4] gap-2')}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    Call
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'pointer-events-none flex-[1.4] gap-2 opacity-60'
                    )}
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    No number
                  </span>
                )}
                {dir ? (
                  <a
                    href={dir}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 gap-1.5 px-2')}
                  >
                    <MapPin className="size-4" aria-hidden="true" />
                    Map
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'pointer-events-none flex-1 gap-1.5 px-2 opacity-50'
                    )}
                  >
                    <MapPin className="size-4" aria-hidden="true" />
                    Map
                  </span>
                )}
                {a.lead_id ? (
                  <AppointmentStatusSheet
                    appointmentId={a.id}
                    leadId={a.lead_id}
                    status={a.status}
                    triggerClassName={cn(buttonVariants({ variant: 'outline' }), 'flex-1 gap-1.5 px-2')}
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Update
                  </AppointmentStatusSheet>
                ) : null}
              </div>
            </MobileCard>
          </li>
        );
      })}
    </ul>
  );
}
