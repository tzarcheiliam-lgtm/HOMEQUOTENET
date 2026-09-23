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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
          label="Interested"
          value={data.interestedOpen}
          sub={`Interest rate today ${formatRate(t.interestRate)}`}
          icon={Sparkles}
        />
        <KpiCard
          label="Appointments booked"
          value={data.appointmentsBooked}
          sub={`Booking rate today ${formatRate(t.bookingRate)}`}
          icon={CalendarCheck}
        />
      </div>
      <p className="text-xs text-muted-foreground">
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
