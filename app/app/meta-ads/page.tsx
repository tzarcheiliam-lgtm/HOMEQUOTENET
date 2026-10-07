import Link from 'next/link';
import { AlertTriangle, Megaphone, Plug } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canViewMetaAds, isHqnAdministrator } from '@/lib/permissions';
import { HQN_TIMEZONE, loadMetaReport, type EntityRow, type MetaReport } from '@/lib/data/meta-ads';
import { freshness, parseRange } from '@/lib/meta/metrics';
import { listContractors } from '@/lib/data/contractors';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EntityList } from '@/components/meta/entity-list';
import { MetaFilters } from '@/components/meta/meta-filters';
import { SyncButton } from '@/components/meta/sync-button';
import { int, money, pct, when } from '@/components/meta/format';
import { QUALIFICATION_STATUS_LABELS } from '@/lib/leads/constants';

export const metadata = { title: 'Meta Ads · HomeQuote Network' };
export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const uuid = /^[0-9a-f-]{36}$/i;
const metaId = /^[0-9]{5,25}$/;

export default async function MetaAdsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await requireProfile();
  if (!canViewMetaAds(profile)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meta Ads" description="Ad performance and lead outcomes." />
        <EmptyState icon={Megaphone} title="Owners only" description="Meta Ads reporting is available to HomeQuote administrators and to contractor account owners." />
      </div>
    );
  }
  const admin = isHqnAdministrator(profile);
  const sp = await searchParams;
  const range = parseRange(one(sp.since), one(sp.until), HQN_TIMEZONE);
  const contractorParam = admin ? one(sp.contractor) : undefined;
  const campaignId = one(sp.campaign), adsetId = one(sp.adset), adId = one(sp.ad);
  const filters = {
    range,
    contractorId: contractorParam && uuid.test(contractorParam) ? contractorParam : null,
    campaignId: campaignId && metaId.test(campaignId) ? campaignId : null,
    adsetId: adsetId && metaId.test(adsetId) ? adsetId : null,
    adId: adId && metaId.test(adId) ? adId : null,
  };

  const db = await createClient();
  let report: MetaReport | null = null;
  let loadError = false;
  try { report = await loadMetaReport(db, filters); } catch { loadError = true; }
  const contractors = admin ? (await listContractors()).map((c) => ({ id: c.id, name: c.name })) : undefined;

  const qs = (extra: Record<string, string | null | undefined>) => {
    const q = new URLSearchParams({ since: range.since, until: range.until });
    if (filters.contractorId) q.set('contractor', filters.contractorId);
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    return `/app/meta-ads?${q}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Meta Ads" description="Ad performance from Meta next to what actually happened to the leads in HQN.">
        {admin && (
          <div className="flex items-start gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/app/meta-ads/setup"><Plug className="size-4" aria-hidden="true" />Setup</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/app/meta-ads/events">Delivery</Link></Button>
            <SyncButton />
          </div>
        )}
      </PageHeader>

      <MetaFilters range={range} tz={HQN_TIMEZONE} contractors={contractors} contractorId={filters.contractorId}
        hidden={{ campaign: filters.campaignId ?? undefined, adset: filters.adsetId ?? undefined, ad: filters.adId ?? undefined }} />

      {loadError || !report ? (
        <EmptyState icon={AlertTriangle} title="Couldn’t load Meta Ads data" description="This is a problem on our side, not with your ads. Try again in a moment; if it keeps happening, an administrator can check the server logs." />
      ) : report.accounts.length === 0 ? (
        <EmptyState icon={Plug}
          title={admin ? 'Meta isn’t connected yet' : 'No Meta ad accounts are linked to your company'}
          description={admin ? 'Connect a Marketing API token on the Setup page, run a sync, then map each ad account to a contractor.' : 'When HomeQuote links your ad campaigns here you’ll see their performance and lead outcomes.'}
          action={admin ? <Button asChild><Link href="/app/meta-ads/setup">Open setup</Link></Button> : undefined} />
      ) : (
        <Report report={report} admin={admin} qs={qs} filters={filters} range={range} />
      )}
    </div>
  );
}

function Report({ report, admin, qs, filters, range }: { report: MetaReport; admin: boolean; qs: (e: Record<string, string | null | undefined>) => string; filters: { campaignId: string | null; adsetId: string | null; adId: string | null }; range: { since: string; until: string } }) {
  const fresh = freshness(report.lastSyncedAt);
  const currencies = [...new Set(report.accounts.map((a) => a.currency).filter(Boolean))] as string[];
  const zones = [...new Set(report.accounts.map((a) => a.timezone_name).filter(Boolean))] as string[];
  const authErr = report.accounts.find((a) => a.last_sync_error && /expired|revoked|token|permission|auth/i.test(a.last_sync_error));
  const syncErr = report.accounts.find((a) => a.last_sync_error);
  const showSpend = !report.spendHidden && (admin || report.accounts.some((a) => a.show_spend_to_contractor));
  const t = report.totals;
  const a = t.activity;
  const wonValue = Object.entries(t.hqnCohort.wonValue);
  const href = (r: EntityRow) => report.level === 'campaign' ? qs({ campaign: r.id }) : report.level === 'adset' ? qs({ campaign: filters.campaignId, adset: r.id }) : qs({ campaign: filters.campaignId, adset: filters.adsetId, ad: r.id });

  return (
    <>
      {authErr ? (
        <Banner tone="danger" title="Meta access problem" body={admin ? `${authErr.last_sync_error} Generate a new System User token and update META_MARKETING_ACCESS_TOKEN.` : 'Ad data is temporarily unavailable. HomeQuote has been asked to reconnect.'} />
      ) : syncErr ? (
        <Banner tone="warning" title="Last sync had an error" body={admin ? syncErr.last_sync_error! : 'Some numbers may be out of date.'} />
      ) : null}
      {fresh === 'never' && <Banner tone="warning" title="No sync has completed yet" body="Meta numbers will appear after the first successful sync. HQN lead numbers below are live." />}
      {fresh === 'stale' && <Banner tone="warning" title="Meta data is stale" body={`The last successful sync was ${when(report.lastSyncedAt)}. Meta figures may be behind; HQN figures are live.`} />}
      {report.spendHidden && <Banner tone="info" title="Ad spend isn’t shared for your account" body="HomeQuote funds this advertising, so spend and cost figures are hidden. Lead and outcome numbers are shown." />}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Currency: <b className="text-foreground">{currencies.join(', ') || 'unknown'}</b></span>
        <span>Meta reporting timezone: <b className="text-foreground">{zones.join(', ') || 'unknown'}</b></span>
        <span>Last sync: <b className="text-foreground">{when(report.lastSyncedAt)}</b></span>
        <span>Attribution: <b className="text-foreground">each ad set&rsquo;s own setting (Meta default is 7-day click + 1-day view)</b></span>
      </p>

      {/* breadcrumbs */}
      <nav aria-label="Drill-down" className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link className="text-muted-foreground hover:underline" href={qs({})}>All campaigns</Link>
        {report.breadcrumbs.campaign && <><span aria-hidden="true">›</span><Link className="hover:underline" href={qs({ campaign: filters.campaignId })}>{report.breadcrumbs.campaign}</Link></>}
        {report.breadcrumbs.adset && <><span aria-hidden="true">›</span><Link className="hover:underline" href={qs({ campaign: filters.campaignId, adset: filters.adsetId })}>{report.breadcrumbs.adset}</Link></>}
        {report.breadcrumbs.ad && <><span aria-hidden="true">›</span><span className="font-medium">{report.breadcrumbs.ad}</span></>}
      </nav>

      {showSpend && (
        <section aria-labelledby="meta-h" className="space-y-3">
          <h2 id="meta-h" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Meta-reported</h2>
          {t.meta.length === 0 ? <p className="text-sm text-muted-foreground">No Meta delivery recorded for these dates and filters.</p> : t.meta.map((m) => (
            <div key={m.currency} className="space-y-2">
              {t.meta.length > 1 && <p className="text-xs font-medium text-muted-foreground">{m.currency} accounts</p>}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="Spend" value={money(m.spend, m.currency)} />
                <KpiCard label="Impressions" value={int(m.impressions)} sub={m.cpm != null ? `${money(m.cpm, m.currency)} per 1,000` : undefined} />
                <KpiCard label="Link clicks" value={int(m.linkClicks)} sub={m.ctr != null ? `${pct(m.ctr)} CTR · ${m.cpc != null ? money(m.cpc, m.currency) : '—'} per click` : undefined} />
                <KpiCard label="Leads (Meta)" value={int(t.metaLeadsByCurrency[m.currency])} sub="Meta’s own count and attribution" />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Reach isn’t shown here: it can’t be added across days or ads. It appears on a single ad for a single day.</p>
        </section>
      )}

      <section aria-labelledby="hqn-h" className="space-y-3">
        <h2 id="hqn-h" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">HQN first-party — leads acquired {range.since} to {range.until}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Leads received" value={int(t.hqnCohort.leads)} sub="Attributed to these ads in HQN" />
          <KpiCard label="Qualified" value={int(t.hqnCohort.qualified)} sub="Confirmed by a person (to date)" />
          <KpiCard label="Appointments" value={int(t.hqnCohort.appointments)} sub="A booking was recorded" />
          <KpiCard label="Won jobs" value={int(t.hqnCohort.won)} sub={t.hqnCohort.wonWithoutValue ? `${t.hqnCohort.wonWithoutValue} without a recorded value` : 'Net of refunds/cancellations'} />
        </div>
        {wonValue.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {wonValue.map(([cur, v]) => <KpiCard key={cur} label={`Recorded won value (${cur})`} value={money(v, cur)} accent="money" sub="Sum of recorded sale amounts" />)}
          </div>
        )}
        {showSpend && t.costs.map((c) => (
          <div key={c.currency} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={`Cost per lead${t.costs.length > 1 ? ` (${c.currency})` : ''}`} value={money(c.costs.perLead, c.currency)} />
            <KpiCard label="Cost per qualified lead" value={money(c.costs.perQualified, c.currency)} />
            <KpiCard label="Cost per appointment" value={money(c.costs.perAppointment, c.currency)} />
            <KpiCard label="Cost per won job" value={money(c.costs.perWon, c.currency)} />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Cost per acquired contractor isn’t shown: HQN doesn’t connect an ad click to a signed contractor account, so it can’t be calculated honestly.
          “—” means no outcomes yet. Costs divide Meta spend by the HQN-attributed leads of the same ads, so they exclude leads Meta can’t be matched to.
        </p>
        <Card className="gap-1 p-4 text-sm">
          <p className="font-medium">Outcomes that occurred {range.since} to {range.until}</p>
          <p className="text-muted-foreground">Regardless of when the lead arrived: {int(a.qualified)} qualified · {int(a.appointments)} appointments booked · {int(a.won)} won{Object.entries(a.wonValue).map(([cur, v]) => ` · ${money(v, cur)}`).join('')}. These can differ from the cohort above by design.</p>
        </Card>
      </section>

      {/* drill-down */}
      <section aria-labelledby="drill-h" className="space-y-3">
        <h2 id="drill-h" className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {report.level === 'campaign' ? 'Campaigns' : report.level === 'adset' ? 'Ad sets' : report.level === 'ad' ? 'Ads' : 'HQN leads from this ad'}
        </h2>
        {report.level === 'lead' ? (
          report.leads.length === 0 ? <p className="text-sm text-muted-foreground">No HQN leads are attributed to this ad in this period.</p> : (
            <ul className="divide-y rounded-lg border bg-card">
              {report.leads.map((l) => (
                <li key={l.id}>
                  <Link href={`/app/leads/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                    <span className="text-sm">{when(l.created_at)}</span>
                    <Badge variant={l.qualification_status === 'qualified' ? 'success' : 'muted'}>{QUALIFICATION_STATUS_LABELS[(l.qualification_status ?? 'needs_qualification') as keyof typeof QUALIFICATION_STATUS_LABELS] ?? l.qualification_status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : report.rows.length === 0 ? (
          <EmptyState icon={Megaphone} title="Nothing here for these filters" description="Try a wider date range, or a different contractor or campaign." />
        ) : (
          <EntityList rows={report.rows} level={report.level} href={href} showSpend={showSpend} />
        )}
      </section>

      {/* reconciliation */}
      <Card>
        <CardHeader><CardTitle className="text-base">Why Meta and HQN lead counts differ</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Meta reported <b>{int(report.reconciliation.metaReported)}</b> lead(s); HQN attributed <b>{int(report.reconciliation.hqnAttributed)}</b>
            {' '}(difference {report.reconciliation.difference > 0 ? '+' : ''}{report.reconciliation.difference}). They are measured independently and are not forced to match.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{report.reconciliation.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </CardContent>
      </Card>

      <details className="rounded-lg border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">Metric definitions</summary>
        <dl className="mt-3 space-y-2 text-muted-foreground">
          <div><dt className="font-medium text-foreground">Leads (Meta)</dt><dd>Meta&rsquo;s <code>lead</code> action: Instant Form, on-Facebook and Pixel/server Lead events, under each ad set&rsquo;s attribution setting. Counted by the date of the ad interaction in the ad account&rsquo;s timezone.</dd></div>
          <div><dt className="font-medium text-foreground">Leads received (HQN)</dt><dd>HQN lead records created in the period (reporting timezone) whose stored ad/campaign id matches the ads shown.</dd></div>
          <div><dt className="font-medium text-foreground">Qualified</dt><dd>A person confirmed the lead meets the qualification criteria. A form submission is never qualified automatically.</dd></div>
          <div><dt className="font-medium text-foreground">Appointments</dt><dd>Leads with a recorded booking (an appointment record exists). An AI call summary alone does not count.</dd></div>
          <div><dt className="font-medium text-foreground">Won jobs / value</dt><dd>Leads with a recorded sale that wasn&rsquo;t later refunded or cancelled; value is the recorded amount, per currency.</dd></div>
          <div><dt className="font-medium text-foreground">Cohort vs. occurred-in-period</dt><dd>Cohort follows the leads acquired in the dates chosen to wherever they are now. “Occurred” counts outcomes dated inside the range for any lead.</dd></div>
        </dl>
      </details>
    </>
  );
}

function Banner({ tone, title, body }: { tone: 'danger' | 'warning' | 'info'; title: string; body: string }) {
  const cls = tone === 'danger' ? 'border-red-300 bg-red-50 text-red-900' : tone === 'warning' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-border bg-muted/50';
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-2 rounded-lg border p-3 text-sm ${cls}`}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div><p className="font-medium">{title}</p><p>{body}</p></div>
    </div>
  );
}
