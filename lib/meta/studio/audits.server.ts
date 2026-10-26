import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rangeBoundsUtc } from '@/lib/meta/metrics';
import type { LeadFact, OutcomeFact } from '@/lib/meta/hqn-metrics';
import { runAudit, type AuditInput, type ObjState } from './audit';
import { loadStudioSettings, logActivity } from './server';
import { proposalKey } from './proposals';

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

/**
 * Loads one account's data and runs the versioned audit. "Meta-signalled" leads (an ad/campaign id, an fbclid
 * or source=meta) are used because HQN leads are not stored per ad account; if the account is mapped to a
 * contractor, only that contractor's assigned leads are included. This scoping is stated in the findings'
 * limitations rather than hidden.
 */
export async function loadAuditInput(db: SupabaseClient, accountId: string, range: { since: string; until: string }, now = new Date()): Promise<AuditInput | null> {
  const { data: acct } = await db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id, last_synced_at').eq('id', accountId).maybeSingle();
  if (!acct) return null;
  const tz = acct.timezone_name || 'UTC';
  const settings = await loadStudioSettings(db);
  const { startIso, endIso } = rangeBoundsUtc(range, tz);

  const [campaigns, adsets, ads, stateRows, insights] = await Promise.all([
    pageAll<{ id: string; name: string | null; objective: string | null; effective_status: string | null }>((a, b) => db.from('meta_campaigns').select('id, name, objective, effective_status').eq('account_id', accountId).range(a, b)),
    pageAll<{ id: string; campaign_id: string; effective_status: string | null }>((a, b) => db.from('meta_adsets').select('id, campaign_id, effective_status').eq('account_id', accountId).range(a, b)),
    pageAll<{ id: string; adset_id: string; effective_status: string | null }>((a, b) => db.from('meta_ads').select('id, adset_id, effective_status').eq('account_id', accountId).range(a, b)),
    pageAll<{ object_id: string; object_type: 'campaign' | 'adset'; daily_budget_minor: number | null; lifetime_budget_minor: number | null; learning_stage: string | null; external_change_at: string | null }>((a, b) => db.from('meta_object_state').select('object_id, object_type, daily_budget_minor, lifetime_budget_minor, learning_stage, external_change_at').eq('account_id', accountId).range(a, b)),
    pageAll<{ ad_id: string; campaign_id: string; date: string; spend: string | number; impressions: number | string; inline_link_clicks: number | string; actions: Record<string, number> }>((a, b) => db.from('meta_insights_daily').select('ad_id, campaign_id, date, spend, impressions, inline_link_clicks, actions').eq('account_id', accountId).gte('date', range.since).lte('date', range.until).range(a, b)),
  ]);

  const leadQuery = (a: number, b: number) => db.from('leads').select('id, created_at, qualification_status, campaign_id, ad_set_id, ad_id').gte('created_at', startIso).lt('created_at', endIso).is('archived_at', null).or('ad_id.not.is.null,campaign_id.not.is.null,fbclid.not.is.null,source.eq.meta').order('created_at').range(a, b);
  let leads = await pageAll<LeadFact>((a, b) => leadQuery(a, b));
  if (acct.contractor_id) {
    const { data: asg } = await db.from('lead_assignments').select('lead_id').eq('contractor_id', acct.contractor_id).limit(50000);
    const mine = new Set(((asg ?? []) as { lead_id: string }[]).map((x) => x.lead_id));
    leads = leads.filter((l) => mine.has(l.id));
  }

  const outcomes: OutcomeFact[] = [];
  for (let i = 0; i < leads.length; i += 200) {
    const ids = leads.slice(i, i + 200).map((l) => l.id);
    const { data } = await db.from('lead_outcome_events').select('id, lead_id, outcome, occurred_at, amount, currency, corrects_id').in('lead_id', ids);
    outcomes.push(...((data ?? []) as (Omit<OutcomeFact, 'amount'> & { amount: string | number | null })[]).map((o) => ({ ...o, amount: o.amount == null ? null : Number(o.amount) })));
  }

  const { data: ms } = await db.from('meta_settings').select('delivery_mode, dataset_id').eq('id', true).maybeSingle();
  const { data: ev } = await db.from('meta_conversion_events').select('status, test_mode').order('created_at', { ascending: false }).limit(2000);
  const tally = { accepted: 0, failed: 0, pending: 0, skipped: 0 };
  for (const e of (ev ?? []) as { status: string; test_mode: boolean }[]) {
    if (e.test_mode) continue;
    if (e.status === 'accepted') tally.accepted++; else if (e.status === 'failed') tally.failed++; else if (e.status === 'pending' || e.status === 'processing') tally.pending++; else if (e.status === 'skipped') tally.skipped++;
  }

  return {
    now, range, tz, accountId, accountName: acct.name, currency: acct.currency, lastSyncAt: acct.last_synced_at ? new Date(acct.last_synced_at) : null,
    delivery: { mode: (ms?.delivery_mode ?? 'off') as 'off' | 'test' | 'live', datasetId: ms?.dataset_id ?? null, ...tally },
    campaigns, adsets, ads, state: new Map(stateRows.map((s) => [s.object_id, s as ObjState])),
    insights: insights.map((r) => ({ ...r, spend: Number(r.spend), impressions: Number(r.impressions), inline_link_clicks: Number(r.inline_link_clicks) })),
    leads, outcomes, thresholds: settings.thresholds,
  };
}

/** Runs and stores an audit. Stored findings keep the audit version so old reports stay interpretable. */
export async function runAndStoreAudit(db: SupabaseClient, accountId: string, range: { since: string; until: string }, actorId: string | null): Promise<{ id: string } | { error: string }> {
  const input = await loadAuditInput(db, accountId, range);
  if (!input) return { error: 'Ad account not found. Run a Meta sync first.' };
  const result = runAudit(input);
  const { data: audit, error } = await db.from('meta_audits').insert({ audit_version: result.version, account_id: accountId, range_start: range.since, range_end: range.until, summary: result.summary, created_by: actorId }).select('id').single();
  if (error || !audit) return { error: 'Could not save the audit.' };
  await db.from('meta_audit_findings').insert(result.findings.map((f, i) => ({
    audit_id: audit.id, control_id: f.control_id, status: f.status, severity: f.severity, kind: f.kind, title: f.title, observation: f.observation,
    data: { ...f.data, ...(f.proposal ? { proposal: f.proposal } : {}) }, why_it_matters: f.why_it_matters, proposed_action: f.proposed_action, confidence: f.confidence,
    limitations: f.limitations, evaluation: f.evaluation, rank: i,
  })));
  await logActivity(db, { actor_id: actorId, action: 'audit.run', target_type: 'audit', target_id: audit.id, account_id: accountId, version_ref: result.version, detail: { range, counts: result.summary.counts } });
  return { id: audit.id };
}

/** Turns an audit finding's machine-readable hint into a reviewable (never applied) proposal. */
export async function proposalFromFinding(db: SupabaseClient, findingId: string, actorId: string): Promise<{ id?: string; error?: string }> {
  const { data: f } = await db.from('meta_audit_findings').select('id, audit_id, data, observation, proposed_action').eq('id', findingId).maybeSingle();
  const hint = (f?.data as { proposal?: { change_type: 'pause'; target_type: 'campaign'; target_id: string; evidence: Record<string, unknown> } } | undefined)?.proposal;
  if (!f || !hint) return { error: 'This finding has no change that can be proposed.' };
  const { data: audit } = await db.from('meta_audits').select('account_id, audit_version').eq('id', f.audit_id).maybeSingle();
  const { data: st } = await db.from('meta_object_state').select('status').eq('object_id', hint.target_id).maybeSingle();
  if (!st?.status) return { error: 'Live campaign state has not been imported (Settings > Sync live state). A proposal needs the current value to compare against.' };
  const { data, error } = await db.from('meta_change_proposals').insert({
    account_id: audit!.account_id, target_type: hint.target_type, target_id: hint.target_id, change_type: hint.change_type, current_value: { status: st.status }, proposed_value: { status: 'PAUSED' },
    evidence: hint.evidence, rationale: f.observation.slice(0, 500), source_kind: 'audit', source_id: f.audit_id, source_version: audit!.audit_version,
    idempotency_key: proposalKey(['audit', f.id, hint.target_id]), proposed_by: actorId, proposed_kind: 'user',
  }).select('id').single();
  if (error) return { error: error.code === '23505' ? 'A proposal for this campaign is already open or was already created from this finding.' : 'Could not create the proposal.' };
  await logActivity(db, { actor_id: actorId, action: 'proposal.created', target_type: 'proposal', target_id: data.id, account_id: audit!.account_id, version_ref: audit!.audit_version, after: { status: 'PAUSED' } });
  return { id: data.id };
}
