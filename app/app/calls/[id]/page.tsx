import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Phone, ExternalLink, PhoneOff, AlarmClock, CalendarCheck } from 'lucide-react';
import { requireCallWorkspace } from '@/lib/auth';
import { getProspect, listCallers, nextProspectIdFor, nextProspectInContext, type ProspectFilters } from '@/lib/data/prospects';
import { contextFrom, contextQuery, hasListContext, withContext } from '@/lib/calls/context';
import { clearDoNotCall, setEmailOptOut } from '@/lib/actions/prospects';
import { listEmailTemplates } from '@/lib/data/email-templates';
import { getGmailConnectionStatus } from '@/lib/emails/gmail';
import { emailLogoUrl, mailingAddress } from '@/lib/emails/template';
import { homequoteSystemValues } from '@/lib/emails/variables';
import { signerFor } from '@/lib/emails/prospect-send.server';
import { CALL_FOLLOW_UP_CATEGORY, quickTemplates } from '@/lib/emails/call-followups';
import { QuickEmailSheet } from '@/components/calls/quick-email-sheet';
import { EditAppointment } from '@/components/calls/edit-appointment';
import { EmailButton } from '@/components/calls/email-button';
import { isDialable } from '@/lib/calls/rules';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { DispositionBadge, SalesAppointmentBadge } from '@/components/calls/disposition-badge';
import { OutcomeForm } from '@/components/calls/outcome-form';
import { CallWorkspace } from '@/components/calls/call-workspace';
import { CallScript } from '@/components/calls/call-script';
import { tradeFromNiche } from '@/lib/calls/script';
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireCallWorkspace();
  const isAdmin = me.role === 'admin';
  const { id } = await params;
  const sp = await searchParams;
  // The list the caller came from (niche, city, view …): Next stays inside it.
  const ctx = contextFrom((k) => {
    const v = sp[k];
    const one = Array.isArray(v) ? v[0] : v;
    return k === 'caller' && !isAdmin ? undefined : one;
  });
  const ctxQs = contextQuery(ctx);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const callers = await listCallers();
  const detail = await getProspect(id, callers);
  // RLS returns nothing for a prospect the user may not see; to them it does
  // not exist, which is the correct thing to say.
  if (!detail) notFound();
  const { prospect: p, attempts, emails, appointments } = detail;

  // Quick follow-up emails: the templates, who it's signed by, and whether Gmail can send.
  const QUICK_CATEGORIES = ['Contractor Sales', CALL_FOLLOW_UP_CATEGORY, 'Appointments'];
  const [library, gmail] = await Promise.all([
    listEmailTemplates().catch(() => []),
    getGmailConnectionStatus(me.id).catch(() => ({ canSend: false })),
  ]);
  const templates = quickTemplates(library.filter((t) => QUICK_CATEGORIES.includes(t.category)));
  const optedOut = Boolean((p as { email_opt_out_at?: string | null }).email_opt_out_at);
  const lastEmailAt =
    emails
      .filter((e) => e.status === 'sent' && e.sent_at)
      .map((e) => e.sent_at as string)
      .sort()
      .at(-1) ?? null;

  const dnc = p.disposition === 'do_not_call';
  const tel = isDialable(p) ? telHref(p.phone) : null;
  const site = siteHref(p.website);
  // Skip-ahead target for the phone action bar. One small indexed query.
  const nextId = dnc
    ? null
    : hasListContext(ctx)
      ? await nextProspectInContext(me, p.id, ctx as unknown as ProspectFilters, callers)
      : await nextProspectIdFor(me, p.id);
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
        backHref={withContext('/app/calls', ctxQs)}
        backLabel="Back to call list"
      >
        {tel ? (
          <a href={tel} className={cn(buttonVariants({ size: 'lg' }), 'gap-2 max-lg:hidden')}>
            <Phone className="size-4" aria-hidden="true" />
            Call {fmtPhone(p.phone)}
          </a>
        ) : (
          <span
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'pointer-events-none gap-2 opacity-60 max-lg:hidden'
            )}
            aria-disabled="true"
          >
            <PhoneOff className="size-4" aria-hidden="true" />
            {dnc ? 'Do not call' : 'No phone number'}
          </span>
        )}
        {!dnc && !optedOut ? <EmailButton className="max-lg:hidden" /> : null}
      </PageHeader>

      <div className="hidden lg:block">
        <CallsSubnav />
      </div>

      {/* Phone: the number is the hero, one tap to dial. */}
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 lg:hidden">
        <div className="min-w-0">
          {tel ? (
            <a href={tel} className="text-2xl font-semibold tabular-nums tracking-tight">
              {fmtPhone(p.phone)}
            </a>
          ) : (
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-muted-foreground line-through">
              {fmtPhone(p.phone)}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.call_attempt_count} {p.call_attempt_count === 1 ? 'attempt' : 'attempts'} · last{' '}
            {fmtRelative(p.last_contacted_at).toLowerCase()}
          </p>
        </div>
        <DispositionBadge value={p.disposition} />
      </div>

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

      <CallWorkspace
        tel={tel}
        dnc={dnc}
        nextHref={nextId ? withContext(`/app/calls/${nextId}`, ctxQs) : withContext('/app/calls', ctxQs || 'view=mine')}
        emailable={!dnc && !optedOut}
        historyCount={attempts.length + emails.length}
        info={
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Prospect</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <DispositionBadge value={p.disposition} />
                  {isAdmin ? (
                    <AssignControl prospectId={p.id} assignedTo={p.assigned_to} callers={callers} />
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:gap-x-6">
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
                <Row label="Services" className="col-span-2">
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
                    {p.decision_maker_email ? (
                      <span className="block text-xs text-muted-foreground">
                        {p.decision_maker_email}
                      </span>
                    ) : null}
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
                  <Row label="Sales appointment" className="col-span-2">
                    <span id="meeting" className="inline-flex scroll-mt-24 flex-wrap items-center gap-2">
                      <CalendarCheck className="size-3.5 text-emerald-700" aria-hidden="true" />
                      {fmtDateTime(nextAppt.scheduled_at, nextAppt.time_zone)}
                      <SalesAppointmentBadge value={nextAppt.status} />
                      {me.role === 'admin' || nextAppt.partner_id === me.id ? (
                        <EditAppointment meeting={{ id: nextAppt.id, company: p.company_name, scheduledAt: nextAppt.scheduled_at, timeZone: nextAppt.time_zone, appointmentType: nextAppt.appointment_type, contactInfo: nextAppt.contact_info, decisionMakerName: nextAppt.decision_maker_name, notes: nextAppt.notes }} />
                      ) : null}
                      <Link href="/app/calls/appointments" className="text-xs hover:underline">
                        Manage
                      </Link>
                    </span>
                  </Row>
                ) : null}
                <Row label="Email" className="col-span-2">
                  <span className="flex flex-wrap items-center gap-2">
                    {optedOut ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">Asked not to be emailed</span>
                    ) : (
                      <span className={cn(!(p.decision_maker_email || p.email) && 'text-muted-foreground')}>
                        {p.decision_maker_email || p.email || 'None yet — ask for it on the call'}
                        {!p.decision_maker_email && p.email ? <span className="ml-1 text-xs text-muted-foreground">(company inbox)</span> : null}
                      </span>
                    )}
                    {!optedOut && !dnc ? (
                      <ConfirmAction
                        action={setEmailOptOut}
                        fields={{ prospect_id: p.id }}
                        triggerLabel="Asked to stop emails"
                        title="Stop emailing this contractor?"
                        description="No more emails can be sent to them from anywhere in the app. Only an administrator can undo this."
                        confirmLabel="Stop emails"
                      />
                    ) : null}
                    {optedOut && isAdmin ? (
                      <ConfirmAction
                        action={setEmailOptOut}
                        fields={{ prospect_id: p.id, lift: '1' }}
                        triggerLabel="Lift"
                        title="Allow emails again?"
                        description="Only if the opt-out was recorded by mistake. The change is audited."
                        confirmLabel="Allow emails"
                      />
                    ) : null}
                  </span>
                </Row>
                {p.notes ? (
                  <Row label="Notes" className="col-span-2">
                    <span className="whitespace-pre-wrap">{p.notes}</span>
                  </Row>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        }
        log={
          <OutcomeForm
            prospectId={p.id}
            disposition={p.disposition}
            decisionMakerName={p.decision_maker_name}
            decisionMakerEmail={p.decision_maker_email}
            bestContactMethod={p.best_contact_method}
            isDnc={dnc}
            contextQuery={ctxQs}
            emailFollowUps={gmail.canSend && !dnc && !optedOut}
            existingMeeting={nextAppt ? fmtDateTime(nextAppt.scheduled_at, nextAppt.time_zone) : null}
          />
        }
        script={
          <CallScript
            vars={{
              name: p.decision_maker_name,
              company: p.company_name,
              caller: me.full_name,
              trade: tradeFromNiche(p.niche),
            }}
          />
        }
        history={<ActivityTimeline attempts={attempts} emails={emails} />}
      />

      <QuickEmailSheet
        prospect={{
          id: p.id,
          company_name: p.company_name,
          city: p.city,
          disposition: p.disposition,
          decision_maker_name: p.decision_maker_name,
          decision_maker_email: p.decision_maker_email,
          email: p.email,
          email_service_interests: p.email_service_interests ?? [],
          email_opt_out_at: (p as { email_opt_out_at?: string | null }).email_opt_out_at ?? null,
        }}
        templates={templates}
        signer={signerFor(me)}
        address={mailingAddress()}
        logoUrl={emailLogoUrl(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')}
        gmailConnected={gmail.canSend}
        homequote={homequoteSystemValues()}
        lastEmailAt={lastEmailAt}
      />
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
