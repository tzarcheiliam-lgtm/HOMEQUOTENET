import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { NOT_QUALIFIED_REASONS, QUALIFIED_REASONS } from '@/lib/leads/constants';

const LABEL: Record<string, string> = {
  qualified: 'Marked qualified', not_qualified: 'Marked not qualified', needs_qualification: 'Moved back to needs qualification',
  appointment_booked: 'Appointment booked', appointment_held: 'Appointment held', appointment_no_show: 'Appointment no-show', appointment_cancelled: 'Appointment cancelled',
  won: 'Job won', lost: 'Marked lost', correction: 'Correction',
};
const REASONS = new Map<string, string>([...QUALIFIED_REASONS, ...NOT_QUALIFIED_REASONS].map((r) => [r.value, r.label]));
const META_STATUS: Record<string, [string, 'warning' | 'info' | 'success' | 'danger' | 'muted']> = {
  pending: ['Pending', 'warning'], processing: ['Processing', 'info'], accepted: ['Accepted by Meta', 'success'], failed: ['Failed', 'danger'], skipped: ['Not sent', 'muted'],
};
const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

/** Append-only outcome history for a lead, plus (admins) what was sent to Meta. Read under the viewer's RLS. */
export async function OutcomeHistory({ leadId, isAdmin }: { leadId: string; isAdmin: boolean }) {
  const db = await createClient();
  const { data: events } = await db.from('lead_outcome_events')
    .select('id, outcome, reason_code, amount, currency, occurred_at, occurred_precision, recorded_at, actor_kind, corrects_id')
    .eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(50);
  const sent = isAdmin
    ? (await db.from('meta_conversion_events').select('id, event_name, status, test_mode, event_time, sent_at, skip_reason, last_error_code').eq('lead_id', leadId).order('event_time', { ascending: false }).limit(20)).data ?? []
    : [];
  if (!(events ?? []).length && !sent.length) return null;

  return (
    <Card className="order-3 lg:order-none">
      <CardHeader>
        <CardTitle>Outcome history</CardTitle>
        <CardDescription>Append-only. Fixing a status adds a new entry; earlier entries stay.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-2.5 text-sm">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5 border-l-2 pl-3">
              <span className="font-medium">
                {LABEL[e.outcome] ?? e.outcome}
                {e.amount != null && <span className="ml-1 text-emerald-700">{Number(e.amount).toLocaleString('en-US', { style: 'currency', currency: e.currency ?? 'USD' })}</span>}
                {e.corrects_id && <span className="ml-1 text-xs font-normal text-muted-foreground">(corrects an earlier entry)</span>}
              </span>
              <span className="text-xs text-muted-foreground">
                {e.occurred_precision === 'date' ? new Date(e.occurred_at).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : fmt(e.occurred_at)}
                {' · '}{e.actor_kind === 'ai' ? 'AI call (evidence saved)' : e.actor_kind === 'system' ? 'system' : 'team member'}
                {e.reason_code ? ` · ${REASONS.get(e.reason_code) ?? e.reason_code.replaceAll('_', ' ')}` : ''}
              </span>
            </li>
          ))}
        </ol>
        {isAdmin && sent.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sent to Meta</p>
            <ul className="space-y-1.5 text-sm">
              {sent.map((s) => {
                const [label, tone] = META_STATUS[s.status] ?? [s.status, 'muted' as const];
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <Badge variant={tone}>{label}</Badge>{s.test_mode && <Badge variant="info">test</Badge>}
                    <span>{s.event_name}</span><span className="text-xs text-muted-foreground">event time {fmt(s.event_time)}{s.skip_reason ? ` · ${s.skip_reason.replaceAll('_', ' ')}` : ''}{s.last_error_code ? ` · ${s.last_error_code}` : ''}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">Changing a status here does not unsend an event Meta already accepted; Meta offers no way to retract it. The correction is recorded above and affects HQN reporting and any future events.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
