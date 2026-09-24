import { RotateCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { retryLeadEmail } from '@/lib/actions/lead-distribution';
import {
  QUALIFICATION_STATUS_LABELS,
  qualificationVariant,
} from '@/lib/leads/constants';
import type { LeadDistribution, RecipientRow } from '@/lib/data/lead-distribution';
import type { Lead } from '@/lib/types';
import { SendLeadForm, type SendRecipientOption } from '@/components/leads/send-lead-form';

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

type Step = { key: string; at: string; title: string; detail?: string; badge?: React.ReactNode; retryId?: string };

function DeliveryBadge({ status, attempts }: { status: string; attempts: number }) {
  if (status === 'sent') return <Badge variant="success">Sent</Badge>;
  if (status === 'failed') return <Badge variant="warning">Failed · {attempts} tr{attempts === 1 ? 'y' : 'ies'}</Badge>;
  return <Badge variant="muted">Sending</Badge>;
}

export function LeadDistributionPanel({
  lead,
  distribution,
  recipients,
  isAdmin,
}: {
  lead: Lead;
  distribution: LeadDistribution;
  recipients: RecipientRow[];
  isAdmin: boolean;
}) {
  const { deliveries, bookings, funnel } = distribution;
  const sends = deliveries.filter((d) => d.kind === 'qualified_lead');
  const alerts = deliveries.filter((d) => d.kind === 'new_lead_alert');

  const steps: Step[] = [
    { key: 'submitted', at: lead.created_at, title: 'Lead submitted', detail: funnel ? `${funnel.clientName ?? funnel.slug} form` : undefined },
    ...alerts.map((a) => ({
      key: a.id,
      at: a.sent_at ?? a.created_at,
      title: a.is_repeat ? 'Team notified of a repeat request' : 'HomeQuote team notified',
      detail: a.status === 'sent' ? a.recipient_email ?? undefined : a.last_error ?? undefined,
      badge: <DeliveryBadge status={a.status} attempts={a.attempts} />,
      retryId: a.status === 'failed' ? a.id : undefined,
    })),
    ...bookings.map((b, i) => ({
      key: `booking-${i}`,
      at: b.created_at,
      title: `Homeowner booked through ${b.provider === 'calendly' ? 'Calendly' : 'the website calendar'}`,
      detail: b.scheduled_at ? `For ${when(b.scheduled_at)}` : 'Time not captured — check Calendly',
      badge: b.verified ? undefined : <Badge variant="muted">Unverified</Badge>,
    })),
    ...(lead.qualification_status === 'qualified' && lead.qualified_at
      ? [{ key: 'qualified', at: lead.qualified_at, title: `Qualified${distribution.qualifiedByName ? ` by ${distribution.qualifiedByName}` : ''}` }]
      : []),
    ...sends.map((s) => ({
      key: s.id,
      at: s.sent_at ?? s.created_at,
      title: `${s.is_resend ? 'Re-sent' : 'Sent'} to ${s.recipient_name ?? s.recipient_email}`,
      detail: [s.recipient_email, s.requester ? `by ${s.requester.full_name || s.requester.email}` : null, s.status === 'failed' ? s.last_error : null]
        .filter(Boolean)
        .join(' · '),
      badge: <DeliveryBadge status={s.status} attempts={s.attempts} />,
      retryId: s.status === 'failed' ? s.id : undefined,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const lastSent = new Map<string, string>();
  for (const s of sends) {
    if (s.recipient_id && s.status !== 'failed') {
      const prev = lastSent.get(s.recipient_id);
      const at = s.sent_at ?? s.created_at;
      if (!prev || at > prev) lastSent.set(s.recipient_id, at);
    }
  }
  const options: SendRecipientOption[] = recipients
    .filter((r) => r.is_active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      company: r.company ?? r.contractor?.name ?? null,
      kind: r.kind,
      lastSentAt: lastSent.get(r.id) ?? null,
    }));

  const qualified = lead.qualification_status === 'qualified';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={qualificationVariant(lead.qualification_status)}>
          {QUALIFICATION_STATUS_LABELS[lead.qualification_status]}
        </Badge>
        {sends.length === 0 && <span className="text-sm text-muted-foreground">Not sent to anyone yet</span>}
      </div>

      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.key} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{s.title}</span>
                {s.badge}
                {s.retryId && isAdmin && (
                  <form action={retryLeadEmail}>
                    <input type="hidden" name="delivery_id" value={s.retryId} />
                    <input type="hidden" name="lead_id" value={lead.id} />
                    <Button type="submit" variant="ghost" size="sm" className="h-7 px-2">
                      <RotateCw className="size-3.5" /> Retry
                    </Button>
                  </form>
                )}
              </div>
              <p className="break-words text-xs text-muted-foreground">
                {when(s.at)}
                {s.detail ? ` · ${s.detail}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="space-y-3 border-t pt-5">
        <div>
          <p className="text-sm font-medium">Send lead to</p>
          <p className="text-xs text-muted-foreground">
            {!qualified
              ? 'Mark the lead Qualified above before sending it.'
              : !isAdmin
                ? 'Only admins can send leads.'
                : 'Each person gets the homeowner’s details by email. Recipients linked to a contractor business also get the lead assigned to that business in HomeQuote.'}
          </p>
          {funnel?.contractorName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Came in through the {funnel.clientName ?? funnel.slug} form and is assigned to {funnel.contractorName} in HomeQuote. Nobody has been emailed it.
            </p>
          )}
        </div>
        <SendLeadForm leadId={lead.id} recipients={options} canSend={qualified && isAdmin} />
      </div>
    </div>
  );
}
