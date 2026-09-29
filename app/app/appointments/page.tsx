import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { listAppointments } from '@/lib/data/appointments';
import { APPOINTMENT_STATUSES } from '@/lib/leads/constants';
import {
  APPOINTMENT_TABS,
  appointmentTab,
  type AppointmentTab,
} from '@/lib/appointments/view';
import { fmtDateTime } from '@/components/calls/format';
import { AppointmentCards } from '@/components/appointments/appointment-cards';
import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata = { title: 'Appointments · HomeQuote Network' };

const statusLabel = (s: string) =>
  APPOINTMENT_STATUSES.find((x) => x.value === s)?.label ?? s;

const EMPTY: Record<AppointmentTab, string> = {
  today: 'Nothing on the calendar today.',
  upcoming: 'No upcoming appointments.',
  past: 'No past appointments yet.',
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const appointments = await listAppointments();
  const sp = await searchParams;

  // Phone tabs. Bucketed once on the server; the desktop table below still
  // shows every appointment exactly as before.
  const now = new Date();
  const buckets: Record<AppointmentTab, typeof appointments> = {
    today: [],
    upcoming: [],
    past: [],
  };
  for (const a of appointments) buckets[appointmentTab(a.scheduled_at, now)].push(a);
  buckets.past.reverse(); // newest first; the query is soonest-first
  const requested = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) as AppointmentTab | undefined;
  const tab: AppointmentTab =
    APPOINTMENT_TABS.some((t) => t.value === requested)
      ? (requested as AppointmentTab)
      : buckets.today.length > 0
        ? 'today'
        : 'upcoming';

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Appointments"
        description="Appointments across your assigned leads, soonest first."
      />

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments scheduled"
          description="Schedule one from a lead's distribution section and it'll appear here."
        />
      ) : (
        <>
          {/* Phone: Today / Upcoming / Past cards */}
          <div className="space-y-3 lg:hidden">
            <nav
              aria-label="Appointment range"
              className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
            >
              {APPOINTMENT_TABS.map((t) => (
                <Link
                  key={t.value}
                  href={`/app/appointments?tab=${t.value}`}
                  replace
                  aria-current={tab === t.value ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium',
                    tab === t.value
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground'
                  )}
                >
                  {t.label}
                  <span className="rounded-full bg-background/70 px-1.5 text-[11px] tabular-nums">
                    {buckets[t.value].length}
                  </span>
                </Link>
              ))}
            </nav>
            <AppointmentCards
              rows={buckets[tab]}
              showContractor={profile.role !== 'contractor'}
              emptyText={EMPTY[tab]}
            />
          </div>

          <Card className="hidden p-0 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.scheduled_at ? fmtDateTime(a.scheduled_at) : '—'}
                    </TableCell>
                    <TableCell>
                      {a.lead_id ? (
                        <Link
                          href={`/app/leads/${a.lead_id}`}
                          className="font-medium hover:underline"
                        >
                          {a.lead_name}
                        </Link>
                      ) : (
                        a.lead_name
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.contractor_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.location ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{statusLabel(a.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
