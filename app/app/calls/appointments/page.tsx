import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { requireCallWorkspace } from '@/lib/auth';
import { listCallers, listSalesAppointments } from '@/lib/data/prospects';
import { SALES_APPOINTMENT_STATUSES } from '@/lib/calls/constants';
import { Button, buttonVariants } from '@/components/ui/button';
import { MobileCard } from '@/components/mobile/mobile-card';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { SalesAppointmentBadge } from '@/components/calls/disposition-badge';
import { AppointmentStatusControl } from '@/components/calls/appointment-status-control';
import { fmtDateTime, fmtPhone, telHref } from '@/components/calls/format';
import type { SalesAppointmentStatus } from '@/lib/types';

export const metadata = { title: 'Sales appointments · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

/**
 * Sales calls booked WITH contractor prospects. These are not the homeowner
 * appointments HomeQuote sells to contractors — those live at /app/appointments.
 */
export default async function SalesAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireCallWorkspace();
  const isAdmin = me.role === 'admin';
  const sp = await searchParams;
  const partner = isAdmin ? first(sp.partner) : undefined;
  const status = first(sp.status) as SalesAppointmentStatus | undefined;
  const when = first(sp.when) ?? 'upcoming';

  const callers = await listCallers();
  const rows = await listSalesAppointments(callers, {
    partner,
    status,
    upcoming: when === 'upcoming',
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Sales appointments"
        description="Calls booked with contractor prospects. Confirm them the day before; mark the result afterwards."
      />
      <CallsSubnav />

      <Card className="p-3">
        <form method="get" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {isAdmin ? (
            <Select name="partner" defaultValue={partner ?? ''} aria-label="Partner" className="col-span-2 sm:col-span-1 sm:w-auto">
              <option value="">All partners</option>
              {callers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Select name="status" defaultValue={status ?? ''} aria-label="Status" className="sm:w-auto">
            <option value="">All statuses</option>
            {SALES_APPOINTMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select name="when" defaultValue={when} aria-label="When" className="sm:w-auto">
            <option value="upcoming">Upcoming</option>
            <option value="all">All dates</option>
          </Select>
          <Button type="submit" size="sm" className="col-span-2 sm:col-span-1">
            Apply
          </Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No sales appointments"
          description="Log a call with the outcome “Appointment booked” and it will appear here."
        />
      ) : (
        <>
        <ul className="space-y-3 lg:hidden">
          {rows.map((a) => {
            const tel = telHref(a.phone);
            return (
              <li key={a.id}>
                <MobileCard className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold leading-tight tabular-nums">
                        {fmtDateTime(a.scheduled_at, a.time_zone)}
                      </p>
                      <Link
                        href={`/app/calls/${a.prospect_id}`}
                        className="mt-1 block truncate text-base font-medium hover:underline"
                      >
                        {a.company_name}
                      </Link>
                    </div>
                    <SalesAppointmentBadge value={a.status} />
                  </div>
                  <dl className="space-y-0.5 text-sm">
                    {a.decision_maker_name ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Decision maker</dt>
                        <dd className="text-right">{a.decision_maker_name}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="text-right capitalize">
                        {(a.appointment_type ?? '—').replace('_', ' ')}
                        {a.contact_info ? (
                          <span className="block text-xs normal-case text-muted-foreground">
                            {a.contact_info}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    {isAdmin && a.partner_name ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Partner</dt>
                        <dd className="text-right">{a.partner_name}</dd>
                      </div>
                    ) : null}
                    {a.confirmed_at ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Confirmed</dt>
                        <dd className="text-right">{fmtDateTime(a.confirmed_at)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {a.notes ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{a.notes}</p>
                  ) : null}
                  <div className="flex items-center gap-2 border-t pt-3">
                    {tel ? (
                      <a
                        href={tel}
                        aria-label={`Call ${a.company_name}`}
                        className={cn(buttonVariants(), 'shrink-0 gap-2')}
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        Call
                      </a>
                    ) : null}
                    <AppointmentStatusControl id={a.id} status={a.status} />
                  </div>
                </MobileCard>
              </li>
            );
          })}
        </ul>
        <Card className="hidden p-0 lg:block">
          <div className="overflow-x-auto">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Decision maker</TableHead>
                  {isAdmin ? <TableHead>Partner</TableHead> : null}
                  <TableHead>Type / contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {fmtDateTime(a.scheduled_at, a.time_zone)}
                      <span className="block text-xs text-muted-foreground">{a.time_zone}</span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/app/calls/${a.prospect_id}`} className="font-medium hover:underline">
                        {a.company_name}
                      </Link>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {fmtPhone(a.phone)}
                      </span>
                    </TableCell>
                    <TableCell>{a.decision_maker_name ?? '—'}</TableCell>
                    {isAdmin ? <TableCell>{a.partner_name ?? '—'}</TableCell> : null}
                    <TableCell>
                      <span className="capitalize">{(a.appointment_type ?? '—').replace('_', ' ')}</span>
                      {a.contact_info ? (
                        <span className="block text-xs text-muted-foreground">{a.contact_info}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <SalesAppointmentBadge value={a.status} />
                      {a.confirmed_at ? (
                        <span className="block text-xs text-muted-foreground">
                          Confirmed {fmtDateTime(a.confirmed_at)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {a.notes ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <AppointmentStatusControl id={a.id} status={a.status} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>
      )}
    </div>
  );
}
