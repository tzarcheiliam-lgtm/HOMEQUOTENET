import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { requireCallWorkspace } from '@/lib/auth';
import { listCalendarAdds, listPartners, listSalesAppointments } from '@/lib/data/prospects';
import { siteUrl } from '@/lib/calendar/config';
import { googleCalendarUrl, googleDayUrl, salesMeetingEvent } from '@/lib/calls/calendar-links';
import { AddToCalendar, type AddToCalendarProps } from '@/components/calls/add-to-calendar';
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
import { CreditControl, SaleBadge, SaleOutcomeControl } from '@/components/calls/sale-outcome-control';
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

  const partners = await listPartners();
  const rateOf = new Map(partners.map((p) => [p.id, p.payPerSale]));
  const needsDecision = isAdmin && when === 'decide';
  const rows = await listSalesAppointments(partners, {
    partner,
    status,
    upcoming: when === 'upcoming',
    needsDecision,
  });
  const adds = await listCalendarAdds(rows.map((r) => r.id));
  const site = siteUrl();
  const nowMs = Date.now();
  const calendarOf = (a: (typeof rows)[number]): AddToCalendarProps => {
    const added = adds.get(a.id) ?? { google: null, apple: null };
    const event = salesMeetingEvent(
      {
        id: a.id,
        prospectId: a.prospect_id,
        companyName: a.company_name,
        decisionMakerName: a.decision_maker_name,
        phone: a.phone,
        scheduledAt: a.scheduled_at,
        timeZone: a.time_zone,
        appointmentType: a.appointment_type,
        contactInfo: a.contact_info,
        notes: a.notes,
      },
      site
    );
    return {
      id: a.id,
      scheduledAt: a.scheduled_at,
      cancelled: a.status === 'cancelled',
      past: event.endMs < nowMs,
      googleAddUrl: googleCalendarUrl(event, a.time_zone),
      googleAddedDayUrl: added.google ? googleDayUrl(added.google, a.time_zone) : null,
      icsUrl: `/api/calls/appointments/${a.id}/ics`,
      added,
    };
  };
  const payOf = (a: (typeof rows)[number]) =>
    a.setter_pay_amount === null || a.setter_pay_amount === undefined ? null : Number(a.setter_pay_amount);

  return (
    <div className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Sales appointments"
        description={
          isAdmin
            ? 'Calls booked with contractor prospects. Mark each one Sold or Not sold after the meeting — Sold pays the setter who booked it.'
            : 'Calls booked with contractor prospects. Confirm them the day before; mark the result afterwards. You earn when one sells.'
        }
      >
        {isAdmin ? (
          <Link href="/app/calls/payouts" className={buttonVariants({ variant: 'outline' })}>
            Payouts
          </Link>
        ) : null}
      </PageHeader>
      <CallsSubnav />

      <Card className="p-3">
        <form method="get" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {isAdmin ? (
            <Select name="partner" defaultValue={partner ?? ''} aria-label="Partner" className="col-span-2 sm:col-span-1 sm:w-auto">
              <option value="">All partners</option>
              {partners.map((c) => (
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
            {isAdmin ? <option value="decide">Needs a sale decision</option> : null}
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
                  <AddToCalendar {...calendarOf(a)} />
                  {isAdmin ? (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sale</p>
                      <SaleOutcomeControl
                        id={a.id}
                        outcome={a.sale_outcome ?? null}
                        pay={payOf(a)}
                        partnerRate={a.partner_id ? (rateOf.get(a.partner_id) ?? null) : null}
                      />
                      <CreditControl id={a.id} partnerId={a.partner_id} partners={partners} />
                    </div>
                  ) : a.sale_outcome ? (
                    <div className="border-t pt-3">
                      <SaleBadge outcome={a.sale_outcome} pay={payOf(a)} />
                    </div>
                  ) : null}
                </MobileCard>
              </li>
            );
          })}
        </ul>
        <Card className="hidden p-0 lg:block">
          <div className="overflow-x-auto">
            <Table className={isAdmin ? 'min-w-[1280px]' : 'min-w-[1040px]'}>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Decision maker</TableHead>
                  {isAdmin ? <TableHead>Partner</TableHead> : null}
                  <TableHead>Type / contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sale</TableHead>
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
                      <div className="mt-1.5 [&>div]:flex-col [&>div]:items-start [&_a]:h-7 [&_a]:px-2 [&_a]:text-xs">
                        <AddToCalendar {...calendarOf(a)} />
                      </div>
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
                    {isAdmin ? (
                      <TableCell>
                        <CreditControl id={a.id} partnerId={a.partner_id} partners={partners} />
                      </TableCell>
                    ) : null}
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
                    <TableCell>
                      {isAdmin ? (
                        <SaleOutcomeControl
                          id={a.id}
                          outcome={a.sale_outcome ?? null}
                          pay={payOf(a)}
                          partnerRate={a.partner_id ? (rateOf.get(a.partner_id) ?? null) : null}
                        />
                      ) : (
                        a.sale_outcome ? <SaleBadge outcome={a.sale_outcome} pay={payOf(a)} /> : <span className="text-muted-foreground">—</span>
                      )}
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
