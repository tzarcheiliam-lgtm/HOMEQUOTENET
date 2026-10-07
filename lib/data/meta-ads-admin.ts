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
    { key: 'META_GRAPH_VERSION', label: 'Graph API version', set: has('META_GRAPH_VERSION'), required: false, purpose: `Defaults to v26.0 when unset` },
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
