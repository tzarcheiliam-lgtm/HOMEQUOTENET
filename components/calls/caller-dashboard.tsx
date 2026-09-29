import {
  PhoneCall,
  PhoneOutgoing,
  UserCheck,
  AlarmClock,
  Sparkles,
  CalendarCheck,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { formatRate } from '@/lib/calls/metrics';
import type { CallerDashboard as CallerDashboardData } from '@/lib/data/prospects';

/**
 * The caller's numbers for today, straight from their rows. Rates read as a
 * dash, not 0%, until there is a denominator — an empty morning is "no data",
 * not a bad day. Definitions live in lib/calls/metrics.ts.
 */
export function CallerDashboard({
  data,
  name,
}: {
  data: CallerDashboardData;
  name?: string | null;
}) {
  const t = data.today;
  return (
    <section aria-label={name ? `${name}'s day` : 'Your day'} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <KpiCard label="Calls due today" value={data.callsDueToday} icon={PhoneCall} />
        <KpiCard label="Attempted today" value={t.attempts} icon={PhoneOutgoing} />
        <KpiCard
          label="Decision-makers reached"
          value={t.dmConversations}
          sub={`Contact rate ${formatRate(t.contactRate)}`}
          icon={UserCheck}
        />
        <KpiCard label="Callbacks due" value={data.callbacksDue} icon={AlarmClock} />
        <KpiCard
          className="max-lg:hidden"
          label="Interested"
          value={data.interestedOpen}
          sub={`Interest rate today ${formatRate(t.interestRate)}`}
          icon={Sparkles}
        />
        <KpiCard
          className="max-lg:hidden"
          label="Appointments booked"
          value={data.appointmentsBooked}
          sub={`Booking rate today ${formatRate(t.bookingRate)}`}
          icon={CalendarCheck}
        />
      </div>
      <details className="group rounded-xl border bg-card lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          More stats
          <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
          <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
        </summary>
        <dl className="space-y-1.5 border-t px-4 py-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Interested</dt><dd className="tabular-nums">{data.interestedOpen} · {formatRate(t.interestRate)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Appointments booked</dt><dd className="tabular-nums">{data.appointmentsBooked} · {formatRate(t.bookingRate)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">All-time contact rate</dt><dd className="tabular-nums">{formatRate(data.allTime.contactRate)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">All-time attempts</dt><dd className="tabular-nums">{data.allTime.attempts}</dd></div>
        </dl>
      </details>
      <p className="hidden text-xs text-muted-foreground lg:block">
        Contact rate = decision-maker conversations &divide; call attempts. Interest
        rate = interested &divide; decision-maker conversations. Booking rate =
        appointments booked &divide; decision-maker conversations. All-time:{' '}
        <span className="tabular-nums">
          {data.allTime.attempts} attempts, contact {formatRate(data.allTime.contactRate)},
          interest {formatRate(data.allTime.interestRate)}, booking{' '}
          {formatRate(data.allTime.bookingRate)}
        </span>
        .
      </p>
    </section>
  );
}
