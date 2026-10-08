import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { actionsToMap, rangeBoundsUtc, reportedLeads, rollup, type ActionMap, type DateRange, type InsightRow, type Rollup } from '@/lib/meta/metrics';
import { activityCounts, cohortCounts, costsFromCohort, reconcile, sumCounts, type CostPer, type HqnCounts, type LeadFact, type OutcomeFact, type Reconciliation } from '@/lib/meta/hqn-metrics';

/** HQN's own reporting timezone (lead created_at day boundaries). Meta numbers use each account's timezone. */
export const HQN_TIMEZONE = process.env.HQN_REPORTING_TIMEZONE || 'America/Los_Angeles';

export type Level = 'campaign' | 'adset' | 'ad' | 'lead';
export type MetaFilters = { range: DateRange; contractorId?: string | null; campaignId?: string | null; adsetId?: string | null; adId?: string | null };

export type AccountInfo = {
  id: string; name: string | null; currency: string | null; timezone_name: string | null; contractor_id: string | null;
  show_spend_to_contractor: boolean; sync_enabled: boolean; last_synced_at: string | null; last_sync_error: string | null;
};
export type EntityRow = {
  id: string; name: string; status: string | null; effectiveStatus: string | null; accountId: string; currency: string | null;
  attributionSpec?: unknown; optimizationGoal?: string | null; objective?: string | null;
  meta: Rollup | null; metaLeads: number;
  hqn: HqnCounts; costs: CostPer | null;
};
export type LeadLink = { id: string; created_at: string; qualification_status: string | null; ad_id: string | null };

export type MetaReport = {
  level: Level;
  accounts: AccountInfo[];
  rows: EntityRow[];
  totals: { meta: Rollup[]; metaLeadsByCurrency: Record<string, number>; hqnCohort: HqnCounts; activity: ReturnType<typeof activityCounts>; costs: { currency: string; costs: CostPer }[] };
  reconciliation: Reconciliation;
  leads: LeadLink[];
  spendHidden: boolean;
  lastSyncedAt: string | null;
  breadcrumbs: { campaign?: string; adset?: string; ad?: string };
};

async function pageAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

type CampaignRow = { id: string; account_id: string; name: string | null; objective: string | null; status: string | null; effective_status: string | null; contractor_id: string | null };
type AdsetRow = { id: string; account_id: string; campaign_id: string; name: string | null; status: string | null; effective_status: string | null; optimization_goal: string | null; attribution_spec: unknown };
type AdRow = { id: string; account_id: string; campaign_id: string; adset_id: string; name: string | null; status: string | null; effective_status: string | null };
type InsightDb = { ad_id: string; date: string; account_id: string; campaign_id: string; adset_id: string; spend: string | number; impressions: number | string; reach: number | string | null; inline_link_clicks: number | string; actions: ActionMap };

/** Runs under the caller's own RLS client: a contractor only receives rows mapped to them. */
export async function loadMetaReport(db: SupabaseClient, f: MetaFilters): Promise<MetaReport> {
  const level: Level = f.adId ? 'lead' : f.adsetId ? 'ad' : f.campaignId ? 'adset' : 'campaign';

  const accounts = (await pageAll<AccountInfo>((a, b) => db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id, show_spend_to_contractor, sync_enabled, last_synced_at, last_sync_error').range(a, b)));
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency ?? 'USD']));
  const campaigns = await pageAll<CampaignRow>((a, b) => db.from('meta_campaigns').select('id, account_id, name, objective, status, effective_status, contractor_id').range(a, b));
  const adsets = await pageAll<AdsetRow>((a, b) => db.from('meta_adsets').select('id, account_id, campaign_id, name, status, effective_status, optimization_goal, attribution_spec').range(a, b));
  const ads = await pageAll<AdRow>((a, b) => db.from('meta_ads').select('id, account_id, campaign_id, adset_id, name, status, effective_status').range(a, b));

  // Contractor filter (admins only; RLS already narrows a contractor's own view): effective mapping = campaign override else account.
  const accountContractor = new Map(accounts.map((a) => [a.id, a.contractor_id]));
  const campaignOk = (c: CampaignRow) => !f.contractorId || (c.contractor_id ?? accountContractor.get(c.account_id)) === f.contractorId;
  const visibleCampaigns = campaigns.filter(campaignOk);
  const campaignIds = new Set(visibleCampaigns.map((c) => c.id));

  const insightsDb = await pageAll<InsightDb>((a, b) => {
    let q = db.from('meta_insights_daily').select('ad_id, date, account_id, campaign_id, adset_id, spend, impressions, reach, inline_link_clicks, actions')
      .gte('date', f.range.since).lte('date', f.range.until).order('date').order('ad_id').range(a, b);
    if (f.campaignId) q = q.eq('campaign_id', f.campaignId);
    if (f.adsetId) q = q.eq('adset_id', f.adsetId);
    if (f.adId) q = q.eq('ad_id', f.adId);
    return q;
  });
  const insights = insightsDb.filter((r) => campaignIds.has(r.campaign_id));
  const toRow = (r: InsightDb): InsightRow => ({
    date: r.date, currency: currencyOf.get(r.account_id) ?? 'USD', spend: Number(r.spend), impressions: Number(r.impressions),
    inline_link_clicks: Number(r.inline_link_clicks), reach: r.reach == null ? null : Number(r.reach), actions: actionsToMap(Object.entries(r.actions ?? {}).map(([action_type, value]) => ({ action_type, value: value as number }))),
  });

  // --- HQN first-party data (RLS applies to leads and outcome events too) --------------------------------
  const { startIso, endIso } = rangeBoundsUtc(f.range, HQN_TIMEZONE);
  const leadSel = 'id, created_at, qualification_status, campaign_id, ad_set_id, ad_id, source, fbclid';
  type LeadDb = LeadFact & { source: string | null; fbclid: string | null };
  const allLeads = await pageAll<LeadDb>((a, b) => db.from('leads').select(leadSel).gte('created_at', startIso).lt('created_at', endIso).is('archived_at', null).order('created_at').range(a, b));
  const inFilter = (l: LeadDb) => (!f.campaignId || l.campaign_id === f.campaignId) && (!f.adsetId || l.ad_set_id === f.adsetId) && (!f.adId || l.ad_id === f.adId);
  const attributedToVisible = (l: LeadDb) => l.campaign_id != null && campaignIds.has(l.campaign_id);
  const cohortLeads = allLeads.filter((l) => attributedToVisible(l) && inFilter(l));
  const metaSignalNoAd = allLeads.filter((l) => !l.ad_id && (l.source === 'meta' || l.fbclid)).length;

  const cohortIds = cohortLeads.map((l) => l.id);
  const cohortEvents: OutcomeFact[] = [];
  for (const ids of chunk(cohortIds, 200)) {
    const { data } = await db.from('lead_outcome_events').select('id, lead_id, outcome, occurred_at, amount, currency, corrects_id').in('lead_id', ids);
    cohortEvents.push(...((data ?? []) as OutcomeFact[]).map((e) => ({ ...e, amount: e.amount == null ? null : Number(e.amount) })));
  }
  const activityEventsRaw = await pageAll<OutcomeFact>((a, b) => db.from('lead_outcome_events').select('id, lead_id, outcome, occurred_at, amount, currency, corrects_id').gte('occurred_at', startIso).lt('occurred_at', endIso).range(a, b));
  // Activity basis: outcomes that occurred in the period for ANY lead matching the filters, including leads
  // acquired before the period - so fetch those leads' attribution and status too.
  const known = new Map(cohortLeads.map((l) => [l.id, l]));
  const extraIds = [...new Set(activityEventsRaw.map((e) => e.lead_id))].filter((id) => !known.has(id));
  for (const ids of chunk(extraIds, 200)) {
    const { data } = await db.from('leads').select(leadSel).in('id', ids);
    for (const l of (data ?? []) as LeadDb[]) if (attributedToVisible(l) && inFilter(l)) known.set(l.id, l);
  }
  const activityEvents = activityEventsRaw.filter((e) => known.has(e.lead_id)).map((e) => ({ ...e, amount: e.amount == null ? null : Number(e.amount) }));

  // --- rows for the current drill level -----------------------------------------------------------------
  const groupKey = level === 'campaign' ? 'campaign_id' : level === 'adset' ? 'ad_set_id' : 'ad_id';
  const cohort = cohortCounts(cohortLeads, cohortEvents, groupKey);
  const insightsBy = (key: 'campaign_id' | 'adset_id' | 'ad_id') => {
    const m = new Map<string, InsightRow[]>();
    for (const r of insights) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])!).push(toRow(r));
    return m;
  };
  const build = (id: string, name: string | null, status: string | null, eff: string | null, accountId: string, by: Map<string, InsightRow[]>, extra: Partial<EntityRow> = {}): EntityRow => {
    const rows = by.get(id) ?? [];
    const r = rollup(rows, { singleAd: level === 'ad' })[0] ?? null;
    const hqn = cohort.get(id) ?? sumCounts([]);
    return { id, name: name ?? id, status, effectiveStatus: eff, accountId, currency: currencyOf.get(accountId) ?? null, meta: r, metaLeads: r ? reportedLeads(r.actions) : 0, hqn, costs: r ? costsFromCohort(r.spend, hqn) : null, ...extra };
  };
  let rows: EntityRow[] = [];
  if (level === 'campaign') {
    const by = insightsBy('campaign_id');
    rows = visibleCampaigns.map((c) => build(c.id, c.name, c.status, c.effective_status, c.account_id, by, { objective: c.objective }));
  } else if (level === 'adset') {
    const by = insightsBy('adset_id');
    rows = adsets.filter((s) => s.campaign_id === f.campaignId && campaignIds.has(s.campaign_id)).map((s) => build(s.id, s.name, s.status, s.effective_status, s.account_id, by, { attributionSpec: s.attribution_spec, optimizationGoal: s.optimization_goal }));
  } else {
    const by = insightsBy('ad_id');
    rows = ads.filter((a) => (!f.adsetId || a.adset_id === f.adsetId) && campaignIds.has(a.campaign_id) && (!f.adId || a.id === f.adId)).map((a) => build(a.id, a.name, a.status, a.effective_status, a.account_id, by));
  }
  rows.sort((a, b) => (b.meta?.spend ?? 0) - (a.meta?.spend ?? 0) || b.hqn.leads - a.hqn.leads);

  const meta = rollup(insights.map(toRow));
  const metaLeadsByCurrency: Record<string, number> = {};
  for (const r of meta) metaLeadsByCurrency[r.currency] = reportedLeads(r.actions);
  const hqnCohort = sumCounts(cohort.values());
  const costs = meta.map((r) => ({ currency: r.currency, costs: costsFromCohort(r.spend, hqnCohort) }));
  const metaLeadTotal = Object.values(metaLeadsByCurrency).reduce((a, b) => a + b, 0);

  const spendHidden = accounts.length > 0 && insightsDb.length === 0 && accounts.some((a) => !a.show_spend_to_contractor) && (await roleIsContractor(db));
  const lastSyncedAt = accounts.map((a) => a.last_synced_at).filter(Boolean).sort().at(0) ?? null; // oldest = most conservative
  const names = {
    campaign: f.campaignId ? campaigns.find((c) => c.id === f.campaignId)?.name ?? f.campaignId : undefined,
    adset: f.adsetId ? adsets.find((s) => s.id === f.adsetId)?.name ?? f.adsetId : undefined,
    ad: f.adId ? ads.find((a) => a.id === f.adId)?.name ?? f.adId : undefined,
  };

  return {
    level, accounts, rows,
    totals: { meta, metaLeadsByCurrency, hqnCohort, activity: activityCounts([...known.values()], activityEvents, startIso, endIso), costs },
    reconciliation: reconcile(metaLeadTotal, cohortLeads.length, metaSignalNoAd),
    leads: level === 'lead' ? cohortLeads.map((l) => ({ id: l.id, created_at: l.created_at, qualification_status: l.qualification_status, ad_id: l.ad_id })) : [],
    spendHidden, lastSyncedAt, breadcrumbs: names,
  };
}

async function roleIsContractor(db: SupabaseClient): Promise<boolean> {
  const { data } = await db.rpc('auth_role');
  return data === 'contractor';
}
