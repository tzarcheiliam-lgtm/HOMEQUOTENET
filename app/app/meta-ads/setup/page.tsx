import { CheckCircle2, Circle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listContractors } from '@/lib/data/contractors';
import { backfillReport, crmReadinessReport, datasetReport, envStatus } from '@/lib/data/meta-ads-admin';
import { GRAPH_VERSION, MARKETING_API_VERSION } from '@/lib/meta/marketing-api';
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
    db.from('meta_settings').select('delivery_mode, test_event_code, test_dataset_id, dataset_id, insights_days, legacy_direct_qualified').eq('id', true).maybeSingle(),
    db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id, show_spend_to_contractor, sync_enabled, last_synced_at, last_sync_error').order('name'),
    db.from('meta_campaigns').select('id, name, contractor_id, account_id').order('name').limit(200),
    db.from('meta_sync_runs').select('started_at, finished_at, status, trigger, counts, error_code, error_message').order('started_at', { ascending: false }).limit(5),
    db.from('meta_conversion_events').select('status, test_mode').order('created_at', { ascending: false }).limit(2000),
  ]);
  const report = await backfillReport(db);
  const datasets = await datasetReport(db, settings?.dataset_id ?? null);
  const readiness = await crmReadinessReport(db);
  const tally = (counts ?? []).reduce<Record<string, number>>((m, r: { status: string; test_mode: boolean }) => { const k = `${r.status}${r.test_mode ? ' (test)' : ''}`; m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const lastOk = (runs ?? []).find((r) => r.status === 'ok' || r.status === 'partial');
  const acctName = new Map((accounts ?? []).map((a) => [a.id, a.name ?? a.id]));
  const mode = settings?.delivery_mode ?? 'off';

  const missing: string[] = [];
  for (const e of env) if (e.required && !e.set) missing.push(`${e.key} — ${e.purpose}`);
  if (!(accounts ?? []).length) missing.push('No ad accounts imported yet — run a sync once the Marketing API token is set');
  if (mode !== 'off' && !settings?.dataset_id) missing.push('Dataset ID for Instant Form (CRM) events');
  if (mode === 'test' && !settings?.test_event_code) missing.push('Test Events code');
  if (mode === 'test' && !settings?.test_dataset_id) missing.push('Separate test dataset ID');

  return (
    <div className="space-y-6">
      <PageHeader title="Meta Ads setup" description="Connection health, account mapping, and conversion delivery." backHref="/app/meta-ads" backLabel="Meta Ads" />

      <Card>
        <CardHeader><CardTitle>Connection & health</CardTitle><CardDescription>Versions in use: Marketing API {MARKETING_API_VERSION}, Conversions API {GRAPH_VERSION}. Tokens live only in server environment variables and are never shown here.</CardDescription></CardHeader>
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
        <CardContent><DeliveryForm settings={{ legacy: settings?.legacy_direct_qualified ?? true, mode, test_event_code: settings?.test_event_code ?? null, test_dataset_id: settings?.test_dataset_id ?? null, dataset_id: settings?.dataset_id ?? null, insights_days: settings?.insights_days ?? 30 }} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dataset check</CardTitle>
          <CardDescription>Compares the dataset each funnel sends events to with the dataset your ad sets and ads use. Read-only: nothing is changed in Meta or HQN.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="space-y-1 text-xs text-muted-foreground">
            {datasets.funnelPixels.map((f) => <li key={f.slug}>Funnel <b className="text-foreground">{f.slug}</b>{f.published ? '' : ' (unpublished)'} → dataset <code>{f.pixelId ?? 'none'}</code>{f.sessionPixels.length ? ` · sessions in the last 30 days carried ${f.sessionPixels.join(', ')}` : ''}</li>)}
            {datasets.adsetPixels.map((a) => <li key={a.pixelId}>{a.adsets} ad set(s) optimize on dataset <code>{a.pixelId}</code></li>)}
          </ul>
          {datasets.findings.length === 0 ? <p className="text-emerald-700">Funnels, ad sets and ads agree on their dataset.</p> : (
            <ul className="space-y-2">{datasets.findings.map((f, i) => (
              <li key={i} className={`rounded-md border p-3 ${f.severity === 'error' ? 'border-red-300 bg-red-50' : f.severity === 'warning' ? 'border-amber-300 bg-amber-50' : ''}`}>{f.message}</li>
            ))}</ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instant Form optimization readiness</CardTitle>
          <CardDescription>Meta&rsquo;s documented fit guidelines for the Conversion Leads goal, measured on your Instant Form leads from the last 30 days. Meta alone decides eligibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{readiness.leads30d} Instant Form leads in 30 days — Meta suggests at least 200 per month. {readiness.meetsVolume ? 'Volume is sufficient.' : 'Below that volume, optimizing on a later stage is unlikely to work well.'}</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {readiness.stages.map((s) => <li key={s.stage}><b className="text-foreground">{s.stage}</b>: {s.count} reached it{s.rate != null ? ` (${(s.rate * 100).toFixed(1)}%)` : ''} — {s.note}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground">Other Meta requirements: the stage should happen within 28 days of the lead, events must be uploaded at least daily, and the goal exists only for native Instant Form campaigns in a business Ads Manager account.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Event mappings and sources</CardTitle><CardDescription>Which Meta event each outcome becomes, and where Meta is told the action happened. Nothing here is active until delivery is switched on. Delivery to Meta is not the same as being usable for optimization - see the checks below.</CardDescription></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2 pr-3">HQN outcome</th><th className="pr-3">Website lead → funnel Pixel dataset</th><th>Instant Form lead → CRM dataset</th></tr></thead>
              <tbody className="divide-y align-top">
                <tr><td className="py-2 pr-3">Lead received</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.lead}</code> standard · <code>website</code> · sent by the funnel</td><td><code>{CRM_EVENT_NAME.lead}</code> · <code>system_generated</code></td></tr>
                <tr><td className="py-2 pr-3">Qualified by a person</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.qualified}</code> custom · where the confirmation happened: <code>phone_call</code> / <code>chat</code> / <code>email</code>, else <code>other</code></td><td><code>{CRM_EVENT_NAME.qualified}</code></td></tr>
                <tr><td className="py-2 pr-3">Appointment booked</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.appointment}</code> standard · <code>website</code> if the visitor booked in the funnel; otherwise the stated channel, an AI call that reported the booking → <code>phone_call</code>, else <code>other</code></td><td><code>{CRM_EVENT_NAME.appointment}</code></td></tr>
                <tr><td className="py-2 pr-3">Won job</td><td className="pr-3"><code>{WEBSITE_EVENT_NAME.won}</code> custom · <code>other</code> · value only if a real sale amount exists · never <code>Purchase</code></td><td><code>{CRM_EVENT_NAME.won}</code></td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground">Instant Form events carry only Meta&rsquo;s lead id (no name, email or phone). Website events use <code>fbp/fbc</code> plus hashed email/phone, a shared event id for browser/server de-duplication, and only when the visitor allowed advertising measurement. Meta rejects any event older than 7 days.</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li><b className="text-foreground">Delivery accepted</b> — the API answered 200 with <code>events_received ≥ 1</code> (shown as “Accepted by Meta”).</li>
            <li><b className="text-foreground">Received in the right dataset</b> — Events Manager → dataset → Overview shows the event under the expected connection method. Test Events only shows receipt, and test events are <b>not</b> sandboxed.</li>
            <li><b className="text-foreground">Matched</b> — Event Match Quality and the customer parameters Meta reports for that event.</li>
            <li><b className="text-foreground">Attributed</b> — conversions appear against ads in Ads Manager under the ad set&rsquo;s attribution setting.</li>
            <li><b className="text-foreground">Eligible to optimize</b> — the campaign type and goal Meta documents for that event source are available and its fit guidelines are met (below).</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Making Meta optimize for these outcomes</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><b className="text-foreground">Sending events does not change optimization.</b> Nothing in this release edits a live campaign. To use an outcome you must change the campaign yourself in Ads Manager:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b className="text-foreground">Instant Form campaigns:</b> use the Leads objective with Instant Forms, and choose the conversion-leads optimization (“Maximize number of conversion leads”) so Meta learns from the CRM stages. Meta supports this only for native Facebook/Instagram Instant Form leads and needs the stages to arrive consistently first.</li>
            <li><b className="text-foreground">Website campaigns:</b> <code>QualifiedLead</code> and <code>WonJob</code> are custom events. Create a custom conversion on each in Events Manager (or use them as the campaign&rsquo;s conversion event) before an ad set can optimize for them. <code>Lead</code> and <code>Schedule</code> are standard events.</li>
            
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
