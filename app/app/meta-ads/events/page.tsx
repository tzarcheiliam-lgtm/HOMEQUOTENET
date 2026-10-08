import Link from 'next/link';
import { Send } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { retryConversionEvent } from '@/lib/actions/meta-ads';
import { META_MAX_EVENT_AGE_MS } from '@/lib/meta/conversions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { when } from '@/components/meta/format';

export const metadata = { title: 'Meta delivery · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const LABEL: Record<string, [string, 'warning' | 'info' | 'success' | 'danger' | 'muted']> = {
  pending: ['Pending', 'warning'], processing: ['Processing', 'info'], accepted: ['Accepted by Meta', 'success'], failed: ['Failed', 'danger'], skipped: ['Not sent', 'muted'],
};
// Errors where the request may have reached Meta before failing: a resend uses the same event id so Meta can de-duplicate.
const OUTCOME_UNKNOWN = /transient|network|timeout|retries_exhausted/;
const SKIP_TEXT: Record<string, string> = {
  measurement_not_allowed: 'Visitor did not allow advertising measurement', too_old: 'Older than Meta’s 7-day limit', before_lead_created: 'Happened before the lead was created',
  no_dataset: 'No dataset configured', missing_meta_lead_id: 'No valid Meta lead id', no_pixel: 'Funnel has no Pixel', sent_directly_by_funnel: 'Already sent directly by the funnel', demo: 'Demo funnel', no_source_url: 'No page URL', lead_missing: 'Lead deleted',
};

export default async function MetaEventsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(['admin']);
  const { status } = await searchParams;
  const db = await createClient();
  let q = db.from('meta_conversion_events').select('id, lead_id, stage, source_kind, event_name, action_source, dataset_id, event_id, origin, event_time, value, currency, test_mode, status, attempt_count, max_attempts, next_attempt_at, last_http_status, last_error_code, last_error_message, fbtrace_id, events_received, sent_at, skip_reason, created_at').order('created_at', { ascending: false }).limit(200);
  if (status && LABEL[status]) q = q.eq('status', status);
  const { data } = await q;
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Meta delivery" description="Every outcome event queued for Meta. Redacted: no names, emails, phone numbers or tokens appear here." backHref="/app/meta-ads" backLabel="Meta Ads" />
      <nav className="flex flex-wrap gap-1.5 text-sm" aria-label="Filter by status">
        {[['', 'All'], ...Object.entries(LABEL).map(([k, v]) => [k, v[0]])].map(([k, l]) => (
          <Link key={k} href={k ? `?status=${k}` : '?'} className={`rounded-full border px-3 py-1.5 ${(status ?? '') === k ? 'border-primary bg-accent font-medium' : 'text-muted-foreground hover:bg-muted'}`}>{l}</Link>
        ))}
      </nav>
      <p className="text-xs text-muted-foreground">“Accepted by Meta” means the API accepted the event. It does not mean Meta matched it to an ad or used it for optimization. Test-mode events never count.</p>
      {rows.length === 0 ? <EmptyState icon={Send} title="No events" description="Nothing has been queued. Events are only queued after you switch delivery to Test or Live, and only for outcomes recorded afterwards." /> : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const [label, tone] = LABEL[r.status] ?? [r.status, 'muted' as const];
            const canRetry = r.status === 'failed' && Date.now() - new Date(r.event_time).getTime() <= META_MAX_EVENT_AGE_MS;
            return (
              <li key={r.id}>
                <Card className="gap-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={tone}>{label}</Badge>
                    {r.test_mode && <Badge variant="info">test</Badge>}
                    {r.origin === 'legacy_direct' && <Badge variant="muted">sent directly</Badge>}
                    <span className="font-medium">{r.event_name}</span>
                    <span className="text-xs text-muted-foreground">{r.source_kind === 'instant_form_crm' ? 'Instant Form · CRM' : 'Website · Pixel'} · {r.action_source}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                    <div><dt>Happened</dt><dd className="text-foreground">{when(r.event_time)}</dd></div>
                    <div><dt>Attempts</dt><dd className="text-foreground">{r.attempt_count}/{r.max_attempts}</dd></div>
                    <div><dt>{r.status === 'accepted' ? 'Accepted' : r.status === 'pending' ? 'Next try' : 'Updated'}</dt><dd className="text-foreground">{when(r.status === 'accepted' ? r.sent_at : r.status === 'pending' ? r.next_attempt_at : r.created_at)}</dd></div>
                    <div><dt>Lead</dt><dd><Link className="text-foreground underline" href={`/app/leads/${r.lead_id}`}>open</Link></dd></div>
                    <div className="col-span-2 break-all"><dt>Event id</dt><dd className="text-foreground">{r.event_id}</dd></div>
                    {r.fbtrace_id && <div><dt>fbtrace_id</dt><dd className="text-foreground">{r.fbtrace_id}</dd></div>}
                    {r.value != null && <div><dt>Value</dt><dd className="text-foreground">{r.value} {r.currency}</dd></div>}
                  </dl>
                  {r.skip_reason && <p className="text-xs">Not sent: {SKIP_TEXT[r.skip_reason] ?? r.skip_reason}</p>}
                  {r.last_error_code && <p className="text-xs text-destructive">{r.last_error_code}{r.last_http_status ? ` (HTTP ${r.last_http_status})` : ''}: {r.last_error_message}</p>}
                  {canRetry && (
                    <form action={retryConversionEvent} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" size="sm" variant="outline">Retry</Button>
                      <span className="text-xs text-muted-foreground">Reuses the same event id, so Meta de-duplicates it.{OUTCOME_UNKNOWN.test(r.last_error_code ?? '') ? ' This failure may have reached Meta first, so it could already be counted.' : ''}</span>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
