import { CheckCircle2, Circle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listContractors } from '@/lib/data/contractors';
import { backfillReport, envStatus } from '@/lib/data/meta-ads-admin';
import { GRAPH_VERSION } from '@/lib/meta/marketing-api';
import { CRM_EVENT_NAME, WEBSITE_EVENT_NAME } from '@/lib/meta/conversions';
import { freshness } from '@/lib/meta/metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { AccountMappingForm, CampaignMappingForm, ConnectionCheck, DeliveryForm } from '@/components/meta/setup-forms';
import { when } from '@/components/meta/format';

export const metadata = { title: 'Meta Ads setup · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function MetaSetupPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const env = envStatus();
  const contractors = (await listContractors()).map((c) => ({ id: c.id, name: c.name }));
  const [{ data: settings }, { data: accounts }, { data: campaigns }, { data: runs }, { data: counts }] = await Promise.all([
    db.from('meta_settings').select('delivery_mode, test_event_code, dataset_id, insights_days').eq('id', true).maybeSingle(),
    db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id, show_spend_to_contractor, sync_enabled, last_synced_at, last_sync_error').order('name'),
    db.from('meta_campaigns').select('id, name, contractor_id, account_id').order('name').limit(200),
    db.from('meta_sync_runs').select('started_at, finished_at, status, trigger, counts, error_code, error_message').order('started_at', { ascending: false }).limit(5),
    db.from('meta_conversion_events').select('status, test_mode').order('created_at', { ascending: false }).limit(2000),
  ]);
  const report = await backfillReport(db);
  const tally = (counts ?? []).reduce<Record<string, number>>((m, r: { status: string; test_mode: boolean }) => { const k = `${r.status}${r.test_mode ? ' (test)' : ''}`; m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const lastOk = (runs ?? []).find((r) => r.status === 'ok' || r.status === 'partial');
  const acctName = new Map((accounts ?? []).map((a) => [a.id, a.name ?? a.id]));
  const mode = settings?.delivery_mode ?? 'off';

  const missing: string[] = [];
  for (const e of env) if (e.required && !e.set) missing.push(`${e.key} — ${e.purpose}`);
  if (!(accounts ?? []).length) missing.push('No ad accounts imported yet — run a sync once the Marketing API token is set');
  if (mode !== 'off' && !settings?.dataset_id) missing.push('Dataset ID for Instant Form (CRM) events');
  if (mode === 'test' && !settings?.test_event_code) missing.push('Test Events code');

  return (
    <div className="space-y-6">
      <PageHeader title="Meta Ads setup" description="Connection health, account mapping, and conversion delivery." backHref="/app/meta-ads" backLabel="Meta Ads" />

      <Card>
        <CardHeader><CardTitle>Connection & health</CardTitle><CardDescription>Graph API version in use: {GRAPH_VERSION}. Tokens live only in server environment variables and are never shown here.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y text-sm">
            {env.map((e) => (
              <li key={e.key} className="flex items-start gap-2 py-2">
                {e.set ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="set" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="not set" />}
                <div><code className="text-xs">{e.key}</code> <span className="text-muted-foreground">{e.required ? '' : '(optional) '}— {e.purpose}</span></div>
              </li>
            ))}
          </ul>
          <ConnectionCheck />
          <p className="text-sm">Last successful reporting sync: <b>{when(lastOk?.finished_at ?? null)}</b> ({freshness(lastOk?.finished_at)})</p>
          {(runs ?? []).length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {(runs ?? []).map((r) => <li key={r.started_at}>{when(r.started_at)} · {r.trigger} · {r.status}{r.error_code ? ` · ${r.error_code}: ${r.error_message}` : ''}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Still missing</CardTitle></CardHeader>
        <CardContent>{missing.filter(Boolean).length === 0 ? <p className="text-sm text-emerald-700">Nothing required is missing.</p> : <ul className="list-disc space-y-1 pl-5 text-sm">{missing.filter(Boolean).map((m) => <li key={m}>{m}</li>)}</ul>}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ad accounts → contractors</CardTitle><CardDescription>Contractors only ever see campaigns mapped to their company. Unmapped accounts are visible to HomeQuote admins only.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {(accounts ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No accounts imported yet.</p> : (accounts ?? []).map((a) => <AccountMappingForm key={a.id} account={a} contractors={contractors} />)}
        </CardContent>
      </Card>

      {(campaigns ?? []).length > 0 && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Per-campaign overrides (for shared accounts)</summary>
          <div className="mt-3">{(campaigns ?? []).map((c) => <CampaignMappingForm key={c.id} campaign={{ ...c, account: acctName.get(c.account_id) ?? null }} contractors={contractors} />)}</div>
        </details>
      )}

      <Card>
        <CardHeader><CardTitle>Conversion delivery</CardTitle><CardDescription>Currently <b>{mode.toUpperCase()}</b>. Queue: {Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(' · ') || 'empty'}.</CardDescription></CardHeader>
        <CardContent><DeliveryForm settings={{ mode, test_event_code: settings?.test_event_code ?? null, dataset_id: settings?.dataset_id ?? null, insights_days: settings?.insights_days ?? 30 }} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Proposed event mappings</CardTitle><CardDescription>Not active until you switch delivery on. Website and Instant Form leads use different Meta mechanisms.</CardDescription></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-3">HQN outcome</th><th className="pr-3">Website lead (Pixel dataset)</th><th>Instant Form lead (CRM events)</th></tr></thead>
              <tbody className="divide-y align-top">
                <tr><td className="py-2 pr-3">Lead received</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.lead}</code> standard — already sent by the funnel, not re-sent</td><td><code>{CRM_EVENT_NAME.lead}</code> (initial stage)</td></tr>
                <tr><td className="py-2 pr-3">Qualified by a person</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.qualified}</code> custom</td><td><code>{CRM_EVENT_NAME.qualified}</code></td></tr>
                <tr><td className="py-2 pr-3">Appointment booked</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.appointment}</code> standard (Calendly bookings are already sent by the funnel)</td><td><code>{CRM_EVENT_NAME.appointment}</code></td></tr>
                <tr><td className="py-2 pr-3">Won job</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.won}</code> custom, value + currency only if a real sale amount is recorded. <b>Not</b> sent as Purchase.</td><td><code>{CRM_EVENT_NAME.won}</code></td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">Instant Form events: <code>action_source=system_generated</code>, <code>user_data.lead_id</code> = Meta&rsquo;s lead id, <code>custom_data.event_source=crm</code>. No name, email or phone is sent. Website events: <code>action_source=website</code>, <code>fbp/fbc</code> + hashed email/phone, shared <code>event_id</code> for browser/server de-duplication, only when the visitor allowed advertising measurement.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Making Meta optimize for these outcomes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><b className="text-foreground">Sending events does not change optimization.</b> Nothing in this release edits a live campaign. To use an outcome you must change the campaign yourself in Ads Manager:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b className="text-foreground">Instant Form campaigns:</b> use the Leads objective with Instant Forms, and choose the conversion-leads optimization (“Maximize number of conversion leads”) so Meta learns from the CRM stages. Meta supports this only for native Facebook/Instagram Instant Form leads and needs the stages to arrive consistently first.</li>
            <li><b className="text-foreground">Website campaigns:</b> <code>QualifiedLead</code> and <code>WonJob</code> are custom events. Create a custom conversion on each in Events Manager (or use them as the campaign&rsquo;s conversion event) before an ad set can optimize for them. <code>Lead</code> and <code>Schedule</code> are standard events.</li>
            <li>Verify arrival in Events Manager → Test events first (use Test mode above), then check the dataset&rsquo;s event match quality and volume before changing any budget or optimization goal.</li>
            <li>“Accepted by Meta” here only means the API accepted the event. It does not mean Meta matched it to an ad or will use it.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historical outcomes — eligibility report (read-only)</CardTitle><CardDescription>Generated {when(report.generatedAt)}. Nothing is queued or sent. Any backfill needs your approval first.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Outcome · source</th><th className="text-right">Recorded</th><th className="text-right">Sendable now</th><th className="text-right">Older than 7 days</th><th className="text-right">No identifier</th><th className="text-right">No consent</th><th className="text-right">AI/system</th></tr></thead>
              <tbody className="divide-y">
                {(['qualified', 'appointment', 'won'] as const).flatMap((st) => (['instantForm', 'website'] as const).map((src) => {
                  const b = report.byStage[st][src];
                  return <tr key={st + src}><td className="py-2">{st} · {src === 'instantForm' ? 'Instant Form' : 'website'}</td>{[b.total, b.sendableNow, b.tooOld, b.noIdentifier, b.noConsent, b.aiOrSystem].map((n, i) => <td key={i} className="text-right tabular-nums">{n}</td>)}</tr>;
                }))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{report.note}</p>
        </CardContent>
      </Card>
    </div>
  );
}
