import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { META_MAX_EVENT_AGE_MS, OUTCOME_TO_STAGE, isLeadgenId } from '@/lib/meta/conversions';

export type EnvStatus = { key: string; label: string; set: boolean; required: boolean; purpose: string };

/** Which server env vars are present. Values are never read out - only whether they exist. */
export function envStatus(): EnvStatus[] {
  const has = (k: string) => !!process.env[k];
  return [
    { key: 'META_MARKETING_ACCESS_TOKEN', label: 'Marketing API token', set: has('META_MARKETING_ACCESS_TOKEN'), required: true, purpose: 'Read-only (ads_read) System User token for the reporting import' },
    { key: 'META_CONVERSIONS_API_TOKEN', label: 'Conversions API token', set: has('META_CONVERSIONS_API_TOKEN'), required: true, purpose: 'Sends outcome events to your dataset (already used by the funnel Lead/Schedule events)' },
    { key: 'META_TICK_SECRET', label: 'Scheduler secret', set: has('META_TICK_SECRET'), required: true, purpose: 'Authorizes the 5-minute worker (.github/workflows/meta-tick.yml)' },
    { key: 'META_APP_ID', label: 'App ID', set: has('META_APP_ID'), required: false, purpose: 'Optional: lets the health check show token expiry' },
    { key: 'META_APP_SECRET', label: 'App secret', set: has('META_APP_SECRET'), required: false, purpose: 'Optional: token expiry check; also verifies the Instant Form webhook signature' },
    { key: 'META_GRAPH_VERSION', label: 'Conversions API version', set: has('META_GRAPH_VERSION'), required: false, purpose: 'Defaults to v26.0 (newest Graph version) when unset' },
    { key: 'META_MARKETING_API_VERSION', label: 'Marketing API version', set: has('META_MARKETING_API_VERSION'), required: false, purpose: 'Reporting reads; defaults to v25.0 (the Marketing API changelog’s current version)' },
  ];
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export type BackfillBucket = { total: number; sendableNow: number; tooOld: number; noIdentifier: number; noConsent: number; aiOrSystem: number };
export type BackfillReport = { generatedAt: string; windowDays: number; byStage: Record<'qualified' | 'appointment' | 'won', { instantForm: BackfillBucket; website: BackfillBucket }>; note: string };

const emptyBucket = (): BackfillBucket => ({ total: 0, sendableNow: 0, tooOld: 0, noIdentifier: 0, noConsent: 0, aiOrSystem: 0 });

/**
 * READ-ONLY eligibility report for historical outcomes. It queues nothing and sends nothing: it tells you which
 * recorded outcomes still have a matching identifier, consent, and a timestamp inside Meta's 7-day window.
 * Because Meta rejects events older than 7 days, almost every historical outcome is ineligible and cannot be
 * backfilled without altering its time - which this system will not do.
 */
export async function backfillReport(db: SupabaseClient, now = Date.now()): Promise<BackfillReport> {
  const { data: ledger } = await db.from('lead_outcome_events').select('lead_id, outcome, occurred_at, actor_kind').in('outcome', ['qualified', 'appointment_booked', 'won']).limit(20000);
  const rows = (ledger ?? []) as { lead_id: string; outcome: string; occurred_at: string; actor_kind: string }[];
  const ids = [...new Set(rows.map((r) => r.lead_id))];
  const leads = new Map<string, { source: string | null; external_lead_id: string | null; fbc: string | null; fbp: string | null; fbclid: string | null; ad_id: string | null }>();
  const allowed = new Map<string, boolean>();
  for (const part of chunk(ids, 200)) {
    const { data: l } = await db.from('leads').select('id, source, external_lead_id, fbc, fbp, fbclid, ad_id').in('id', part);
    for (const x of (l ?? []) as (typeof leads extends Map<string, infer V> ? V & { id: string } : never)[]) leads.set(x.id, x);
    const { data: s } = await db.from('funnel_sessions').select('lead_id, measurement_allowed, config_snapshot').in('lead_id', part);
    for (const x of (s ?? []) as { lead_id: string; measurement_allowed: boolean | null; config_snapshot: { trackingPixels?: { consentMode?: string } } | null }[]) {
      allowed.set(x.lead_id, x.measurement_allowed ?? x.config_snapshot?.trackingPixels?.consentMode === 'opt_out');
    }
  }
  const out: BackfillReport['byStage'] = {
    qualified: { instantForm: emptyBucket(), website: emptyBucket() },
    appointment: { instantForm: emptyBucket(), website: emptyBucket() },
    won: { instantForm: emptyBucket(), website: emptyBucket() },
  };
  for (const r of rows) {
    const stage = OUTCOME_TO_STAGE[r.outcome] as 'qualified' | 'appointment' | 'won' | undefined;
    const lead = leads.get(r.lead_id);
    if (!stage || !lead) continue;
    const isForm = lead.source === 'meta';
    const isWeb = lead.source === 'website' && !!(lead.fbc || lead.fbp || lead.fbclid || lead.ad_id);
    if (!isForm && !isWeb) continue;
    const b = out[stage][isForm ? 'instantForm' : 'website'];
    b.total++;
    if (stage === 'qualified' && r.actor_kind !== 'user') { b.aiOrSystem++; continue; }
    if (isForm && !isLeadgenId(lead.external_lead_id)) { b.noIdentifier++; continue; }
    if (isWeb && !(lead.fbc || lead.fbp)) { b.noIdentifier++; continue; }
    if (isWeb && allowed.get(r.lead_id) !== true) { b.noConsent++; continue; }
    if (now - new Date(r.occurred_at).getTime() > META_MAX_EVENT_AGE_MS) { b.tooOld++; continue; }
    b.sendableNow++;
  }
  return {
    generatedAt: new Date(now).toISOString(), windowDays: 7, byStage: out,
    note: 'Meta rejects any event older than 7 days, and this system never changes an event\'s time. Outcomes outside that window cannot be backfilled. Nothing has been queued or sent; approval is required before any backfill.',
  };
}

// --------------------------------------------------------------------------------------------------
// Dataset consistency + Conversion Leads readiness (read-only)
// --------------------------------------------------------------------------------------------------
import { checkDatasets, crmReadiness, pixelIdFromPromotedObject, type DatasetFinding, type Readiness } from '@/lib/meta/datasets';

export type DatasetReport = {
  findings: DatasetFinding[];
  funnelPixels: { slug: string; pixelId: string | null; published: boolean; sessionPixels: string[] }[];
  adsetPixels: { pixelId: string; adsets: number }[];
};

export async function datasetReport(db: SupabaseClient, crmDatasetId: string | null): Promise<DatasetReport> {
  const { data: funnels } = await db.from('funnels').select('slug, contractor_id, published, is_demo, config').eq('is_demo', false);
  const fp = ((funnels ?? []) as { slug: string; contractor_id: string | null; published: boolean; config: { trackingPixels?: { metaPixelId?: string } } | null }[])
    .map((f) => ({ slug: f.slug, contractorId: f.contractor_id, published: f.published, pixelId: f.config?.trackingPixels?.metaPixelId ?? null }));
  // The pixel each recent session actually carried (its config snapshot), which can differ from today's funnel config.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: sess } = await db.from('funnel_sessions').select('config_snapshot, funnels(slug)').gte('created_at', since).limit(5000);
  const used = new Map<string, Set<string>>();
  for (const s of (sess ?? []) as { config_snapshot: { trackingPixels?: { metaPixelId?: string } } | null; funnels: { slug: string } | { slug: string }[] | null }[]) {
    const slug = (Array.isArray(s.funnels) ? s.funnels[0] : s.funnels)?.slug; const px = s.config_snapshot?.trackingPixels?.metaPixelId;
    if (slug && px) (used.get(slug) ?? used.set(slug, new Set()).get(slug)!).add(px);
  }
  const { data: camps } = await db.from('meta_campaigns').select('id, name, contractor_id, account_id');
  const campById = new Map(((camps ?? []) as { id: string; name: string | null }[]).map((c) => [c.id, c.name ?? c.id]));
  const { data: sets } = await db.from('meta_adsets').select('id, name, campaign_id, effective_status, optimization_goal, promoted_object');
  const { data: ads } = await db.from('meta_ads').select('id, name, adset_id, effective_status, tracking_pixel_ids');
  const adsets = ((sets ?? []) as { id: string; name: string | null; campaign_id: string; effective_status: string | null; optimization_goal: string | null; promoted_object: unknown }[])
    .map((a) => ({ id: a.id, name: a.name ?? a.id, campaignName: campById.get(a.campaign_id) ?? a.campaign_id, effectiveStatus: a.effective_status, pixelId: pixelIdFromPromotedObject(a.promoted_object), optimizationGoal: a.optimization_goal, contractorId: null }));
  const adRows = ((ads ?? []) as { id: string; name: string | null; adset_id: string; effective_status: string | null; tracking_pixel_ids: string[] | null }[])
    .map((a) => ({ id: a.id, name: a.name ?? a.id, adsetId: a.adset_id, effectiveStatus: a.effective_status, trackingPixelIds: a.tracking_pixel_ids ?? [] }));
  const findings = checkDatasets({ funnels: fp, adsets, ads: adRows, crmDatasetId });
  // A funnel whose recent sessions carried a pixel different from its current config is worth surfacing too.
  for (const f of fp) {
    const seen = [...(used.get(f.slug) ?? [])];
    if (f.pixelId && seen.some((p) => p !== f.pixelId)) findings.push({ severity: 'warning', code: 'funnel_pixel_changed', message: `Funnel ${f.slug} is configured for dataset ${f.pixelId} but sessions in the last 30 days carried ${seen.join(', ')}. The funnel config was changed recently.` });
  }
  const counts = new Map<string, number>();
  for (const a of adsets) if (a.pixelId) counts.set(a.pixelId, (counts.get(a.pixelId) ?? 0) + 1);
  return { findings, funnelPixels: fp.map((f) => ({ slug: f.slug, pixelId: f.pixelId, published: f.published, sessionPixels: [...(used.get(f.slug) ?? [])] })), adsetPixels: [...counts].map(([pixelId, adsets]) => ({ pixelId, adsets })) };
}

/** Meta's documented Conversion Leads fit guidelines, measured on HQN's own Instant Form leads (last 30 days). */
export async function crmReadinessReport(db: SupabaseClient): Promise<Readiness> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: leads } = await db.from('leads').select('id, created_at, qualification_status, qualified_at').eq('source', 'meta').gte('created_at', since).limit(20000);
  const L = (leads ?? []) as { id: string; created_at: string; qualification_status: string; qualified_at: string | null }[];
  const created = new Map(L.map((l) => [l.id, new Date(l.created_at).getTime()]));
  const reached = { qualified: { count: 0, within28d: 0 }, appointment: { count: 0, within28d: 0 }, won: { count: 0, within28d: 0 } };
  const first = new Map<string, number>();
  for (const part of chunk([...created.keys()], 200)) {
    const { data: ev } = await db.from('lead_outcome_events').select('lead_id, outcome, occurred_at').in('lead_id', part).in('outcome', ['qualified', 'appointment_booked', 'won']);
    for (const e of (ev ?? []) as { lead_id: string; outcome: string; occurred_at: string }[]) {
      const k = `${e.lead_id}:${e.outcome}`; const t = new Date(e.occurred_at).getTime();
      if (!first.has(k) || t < first.get(k)!) first.set(k, t);
    }
  }
  const stageOf: Record<string, 'qualified' | 'appointment' | 'won'> = { qualified: 'qualified', appointment_booked: 'appointment', won: 'won' };
  for (const [k, t] of first) {
    const [id, outcome] = k.split(':'); const stage = stageOf[outcome];
    reached[stage].count++;
    if (t - (created.get(id) ?? t) <= 28 * 86_400_000) reached[stage].within28d++;
  }
  return crmReadiness(L.length, reached);
}
