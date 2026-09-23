import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Phone, ExternalLink, PhoneOff, AlarmClock, CalendarCheck } from 'lucide-react';
import { requireCallerOrAdmin } from '@/lib/auth';
import { getProspect, listCallers } from '@/lib/data/prospects';
import { clearDoNotCall } from '@/lib/actions/prospects';
import { isDialable } from '@/lib/calls/rules';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { DispositionBadge, SalesAppointmentBadge } from '@/components/calls/disposition-badge';
import { OutcomeForm } from '@/components/calls/outcome-form';
import { CallScript } from '@/components/calls/call-script';
import { ActivityTimeline } from '@/components/calls/activity-timeline';
import { AssignControl } from '@/components/calls/assign-control';
import {
  fmtDateTime,
  fmtPhone,
  fmtRelative,
  isDue,
  siteHref,
  siteLabel,
  telHref,
} from '@/components/calls/format';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Prospect · HomeQuote Network' };

/**
 * The calling workspace for one prospect: everything needed during the call
 * on one screen. Left column is the record and the log form; right column is
 * the script and history. On a phone the columns stack with the record and
 * the form first.
 */
export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireCallerOrAdmin();
  const isAdmin = me.role === 'admin';
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const callers = await listCallers();
  const detail = await getProspect(id, callers);
  // RLS returns nothing for a prospect the user may not see; to them it does
  // not exist, which is the correct thing to say.
  if (!detail) notFound();
  const { prospect: p, attempts, appointments } = detail;

  const dnc = p.disposition === 'do_not_call';
  const tel = isDialable(p) ? telHref(p.phone) : null;
  const site = siteHref(p.website);
  const nextAppt = appointments.find((a) =>
    ['scheduled', 'confirmed', 'rescheduled'].includes(a.status)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.company_name}
        description={[p.city, p.county ? `${p.county} County` : null, p.category]
          .filter(Boolean)
          .join(' · ')}
        backHref="/app/calls"
        backLabel="Back to call list"
      >
        {tel ? (
          <a href={tel} className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
            <Phone className="size-4" aria-hidden="true" />
            Call {fmtPhone(p.phone)}
          </a>
        ) : (
          <span
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'pointer-events-none gap-2 opacity-60'
            )}
            aria-disabled="true"
          >
            <PhoneOff className="size-4" aria-hidden="true" />
            {dnc ? 'Do not call' : 'No phone number'}
          </span>
        )}
      </PageHeader>

      <CallsSubnav />

      {dnc ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span>
            <strong>Do not call.</strong> This contractor asked not to be contacted
            {p.do_not_call_at ? ` on ${fmtDateTime(p.do_not_call_at)}` : ''}. The
            number is hidden from every calling list.
          </span>
          {isAdmin ? (
            <ConfirmAction
              action={clearDoNotCall}
              fields={{ prospect_id: p.id }}
              triggerLabel="Lift do-not-call"
              title="Lift do-not-call?"
              description="Only do this if the status was set in error. The change is recorded in the audit log and the prospect returns to the New queue."
              confirmLabel="Lift and return to queue"
              destructive
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Record + log form */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Prospect</CardTitle>
                <div className="flex items-center gap-2">
                  <DispositionBadge value={p.disposition} />
                  {isAdmin ? (
                    <AssignControl prospectId={p.id} assignedTo={p.assigned_to} callers={callers} />
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Row label="Phone">
                  <span className={cn('tabular-nums', dnc && 'line-through')}>
                    {fmtPhone(p.phone)}
                  </span>
                </Row>
                <Row label="Website">
                  {site ? (
                    <a
                      href={site}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {siteLabel(p.website)}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    '—'
                  )}
                </Row>
                <Row label="City / market">
                  {[p.city, p.county ? `${p.county} County` : null].filter(Boolean).join(', ') ||
                    '—'}
                  {p.service_area ? (
                    <span className="block text-xs text-muted-foreground">{p.service_area}</span>
                  ) : null}
                </Row>
                <Row label="Reviews">
                  {p.rating !== null ? (
                    <span className="tabular-nums">
                      {p.rating.toFixed(1)} &#9733;{' '}
                      <span className="text-muted-foreground">({p.review_count ?? 0} reviews)</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </Row>
                <Row label="Services" className="sm:col-span-2">
                  {p.primary_services.length > 0 ? p.primary_services.join(', ') : '—'}
                  {p.is_pool_cleaning_only ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      Reads as cleaning-only
                    </span>
                  ) : null}
                </Row>
                <Row label="Assigned caller">
                  {p.assigned_name ?? <span className="text-muted-foreground">Unassigned</span>}
                </Row>
                <Row label="Attempts">
                  <span className="tabular-nums">{p.call_attempt_count}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    last {fmtRelative(p.last_contacted_at).toLowerCase()}
                  </span>
                </Row>
                {p.decision_maker_name ? (
                  <Row label="Decision maker">
                    {p.decision_maker_name}
                    {p.best_contact_method ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        via {p.best_contact_method}
                      </span>
                    ) : null}
                  </Row>
                ) : null}
                {p.next_callback_at ? (
                  <Row label="Next callback">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1',
                        isDue(p.next_callback_at) && 'font-medium text-amber-700'
                      )}
                    >
                      <AlarmClock className="size-3.5" aria-hidden="true" />
                      {fmtDateTime(p.next_callback_at)}
                    </span>
                  </Row>
                ) : null}
                {p.follow_up_at ? (
                  <Row label="Follow-up">{fmtDateTime(p.follow_up_at)}</Row>
                ) : null}
                {nextAppt ? (
                  <Row label="Sales appointment" className="sm:col-span-2">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <CalendarCheck className="size-3.5 text-emerald-700" aria-hidden="true" />
                      {fmtDateTime(nextAppt.scheduled_at, nextAppt.time_zone)}
                      <SalesAppointmentBadge value={nextAppt.status} />
                      <Link href="/app/calls/appointments" className="text-xs hover:underline">
                        Manage
                      </Link>
                    </span>
                  </Row>
                ) : null}
                {p.notes ? (
                  <Row label="Notes" className="sm:col-span-2">
                    <span className="whitespace-pre-wrap">{p.notes}</span>
                  </Row>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <OutcomeForm
            prospectId={p.id}
            disposition={p.disposition}
            decisionMakerName={p.decision_maker_name}
            bestContactMethod={p.best_contact_method}
            isDnc={dnc}
          />
        </div>

        {/* Script + history */}
        <div className="space-y-6 lg:col-span-2">
          <CallScript />
          <ActivityTimeline attempts={attempts} />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
