import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { GraphError, graphGetAll, type GraphOptions} from '@/lib/meta/marketing-api';
import { redact } from './redact';
import { checkAutomationGate, checkWriteGate, type GateResult } from './gate';
import { budgetUnitGate } from './money';
import { driftBetween, type ProposalStore } from './proposals';
import { createMetaWriter, type MetaWriter } from './write-api';
import type { Thresholds } from './audit';

/** Server-only plumbing shared by the Studio actions, pages and scheduler. Always uses the service role. */

export const admin = () => createAdminClient();

export type StudioSettings = { liveWritesEnabled: boolean; automationEnabled: boolean; thresholds: Thresholds; rulesLockUntil: string | null };

export async function loadStudioSettings(db: SupabaseClient): Promise<StudioSettings> {
  const { data } = await db.from('meta_studio_settings').select('live_writes_enabled, automation_enabled, audit_thresholds, rules_lock_until').eq('id', true).maybeSingle();
  return {
    liveWritesEnabled: data?.live_writes_enabled ?? false,
    automationEnabled: data?.automation_enabled ?? false,
    thresholds: (data?.audit_thresholds ?? {}) as Thresholds,
    rulesLockUntil: data?.rules_lock_until ?? null,
  };
}

export const readToken = () => process.env.META_MARKETING_ACCESS_TOKEN || null;
export const writeToken = () => process.env.META_ADS_WRITE_TOKEN || null;
export const readOptions = (): GraphOptions | null => { const t = readToken(); return t ? { token: t } : null; };
export const writerOrNull = (): MetaWriter | null => { const t = writeToken(); return t ? createMetaWriter({ token: t }) : null; };

export async function accountGate(db: SupabaseClient, accountId: string, opts: { automation?: boolean } = {}): Promise<GateResult> {
  const [s, { data: acct }, { data: ctl }] = await Promise.all([
    loadStudioSettings(db),
    db.from('meta_ad_accounts').select('id').eq('id', accountId).maybeSingle(),
    db.from('meta_account_controls').select('writes_enabled, automation_enabled').eq('account_id', accountId).maybeSingle(),
  ]);
  const base = { writeTokenPresent: !!writeToken(), liveWritesEnabled: s.liveWritesEnabled, accountWritesEnabled: ctl?.writes_enabled ?? false, accountKnown: !!acct };
  return opts.automation
    ? checkAutomationGate({ ...base, globalAutomationEnabled: s.automationEnabled, accountAutomationEnabled: ctl?.automation_enabled ?? false })
    : checkWriteGate(base);
}

export type ActivityEntry = {
  actor_id?: string | null; actor_kind?: 'user' | 'system' | 'rule'; action: string; target_type?: string | null; target_id?: string | null; account_id?: string | null;
  before?: unknown; after?: unknown; version_ref?: string | null; provider_result?: unknown; detail?: unknown;
};
/** Append-only audit trail. Callers must never put tokens or customer PII in here. */
export async function logActivity(db: SupabaseClient, e: ActivityEntry) {
  await db.from('meta_activity_log').insert({
    actor_id: e.actor_id ?? null, actor_kind: e.actor_kind ?? 'user', action: e.action, target_type: e.target_type ?? null, target_id: e.target_id ?? null,
    account_id: e.account_id ?? null, before_state: e.before ?? null, after_state: e.after ?? null, version_ref: e.version_ref ?? null,
    provider_result: e.provider_result ?? null, detail: e.detail ?? {},
  });
}

export function proposalStore(db: SupabaseClient, actor: { id: string | null; kind: 'user' | 'system' | 'rule' }): ProposalStore {
  return {
    async claim(id) {
      const { data } = await db.rpc('claim_meta_proposal', { p_id: id });
      return Array.isArray(data) ? data.length === 1 : !!data;
    },
    async release(id) {
      await db.from('meta_change_proposals').update({ status: 'approved' }).eq('id', id).eq('status', 'applying');
    },
    async finish(id, patch) {
      await db.from('meta_change_proposals').update({
        status: patch.status, previous_state: patch.previous_state ?? null, provider_result: patch.provider_result ?? null, error_message: patch.error_message ?? null,
        applied_at: patch.status === 'applied' ? new Date().toISOString() : null,
      }).eq('id', id);
    },
    async recordExpected(target, fields) {
      const { data } = await db.from('meta_object_state').select('hqn_expected').eq('object_id', target.id).maybeSingle();
      await db.from('meta_object_state').update({ hqn_expected: { ...(data?.hqn_expected ?? {}), ...fields }, external_change_at: null, external_change: null }).eq('object_id', target.id);
    },
    async log(e) {
      await logActivity(db, { actor_id: actor.id, actor_kind: actor.kind, action: e.action, target_type: e.target_type, target_id: e.target_id, account_id: e.account_id, before: e.before, after: e.after, provider_result: e.provider_result, detail: e.detail });
    },
  };
}

// ---- live object state + Ads Manager reconciliation -------------------------------------------------------------------
type RawState = {
  id: string; campaign_id?: string; name?: string; status?: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string;
  bid_strategy?: string; spend_cap?: string; stop_time?: string; end_time?: string; updated_time?: string; learning_stage_info?: { status?: string };
};

export const liveFieldsOf = (r: RawState): Record<string, unknown> => ({ status: r.status, daily_budget: r.daily_budget, lifetime_budget: r.lifetime_budget });

/** Differences between what HQN last wrote and what Meta shows now. Empty when HQN has written nothing. */
export const externalChange = (expected: Record<string, unknown>, live: Record<string, unknown>) =>
  Object.keys(expected).length ? driftBetween(expected, live) : [];

export type StateSyncResult = { accounts: number; objects: number; externalChanges: number; errors: string[] };

export async function syncObjectState(db: SupabaseClient, graph: GraphOptions, accountIds?: string[]): Promise<StateSyncResult> {
  const out: StateSyncResult = { accounts: 0, objects: 0, externalChanges: 0, errors: [] };
  let q = db.from('meta_ad_accounts').select('id').eq('sync_enabled', true);
  if (accountIds?.length) q = q.in('id', accountIds);
  const { data: accounts } = await q;
  for (const a of (accounts ?? []) as { id: string }[]) {
    try {
      const camps = await graphGetAll<RawState>(`${a.id}/campaigns`, { fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,bid_strategy,spend_cap,stop_time,updated_time' }, graph);
      const sets = await graphGetAll<RawState>(`${a.id}/adsets`, { fields: 'id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,bid_strategy,learning_stage_info,end_time,updated_time' }, graph);
      const { data: existing } = await db.from('meta_object_state').select('object_id, hqn_expected').eq('account_id', a.id);
      const expected = new Map(((existing ?? []) as { object_id: string; hqn_expected: Record<string, unknown> }[]).map((e) => [e.object_id, e.hqn_expected ?? {}]));
      const rows = [...camps.map((c) => ({ r: c, type: 'campaign' as const })), ...sets.map((s) => ({ r: s, type: 'adset' as const }))].map(({ r, type }) => {
        const diff = externalChange(expected.get(r.id) ?? {}, liveFieldsOf(r));
        if (diff.length) out.externalChanges++;
        const num = (v?: string) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
        return {
          object_id: r.id, object_type: type, account_id: a.id, campaign_id: type === 'campaign' ? r.id : (r.campaign_id ?? null), name: r.name ?? null, status: r.status ?? null,
          effective_status: r.effective_status ?? null, daily_budget_minor: num(r.daily_budget), lifetime_budget_minor: num(r.lifetime_budget), bid_strategy: r.bid_strategy ?? null,
          spend_cap_minor: num(r.spend_cap), learning_stage: r.learning_stage_info?.status ?? null, stop_time: r.stop_time ?? r.end_time ?? null, meta_updated_time: r.updated_time ?? null,
          synced_at: new Date().toISOString(),
          // A detected difference is reported once and the expectation cleared, so HQN never "fixes" it back.
          ...(diff.length ? { hqn_expected: {}, external_change_at: new Date().toISOString(), external_change: diff } : {}),
        };
      });
      for (let i = 0; i < rows.length; i += 200) await db.from('meta_object_state').upsert(rows.slice(i, i + 200), { onConflict: 'object_id' });
      // Open proposals whose target changed externally are no longer safe to apply.
      const changedIds = rows.filter((r) => 'external_change_at' in r).map((r) => r.object_id);
      if (changedIds.length) {
        await db.from('meta_change_proposals').update({ status: 'stale', error_message: 'The object changed in Meta after this proposal was made.' }).in('target_id', changedIds).in('status', ['proposed', 'approved']);
        for (const id of changedIds) await logActivity(db, { actor_kind: 'system', action: 'object.external_change', target_id: id, account_id: a.id, detail: { note: 'Changed in Meta since HQN last wrote it; HQN did not overwrite.' } });
      }
      out.accounts++; out.objects += rows.length;
    } catch (e) {
      out.errors.push(`${a.id}: ${redact(e instanceof GraphError ? e.failure.message : e instanceof Error ? e.message : 'error')}`);
    }
  }
  return out;
}

// ---- asset discovery (pages, Instagram identities, datasets, lead forms) -------------------------------------------------
type RawPage = { id: string; name?: string; instagram_business_account?: { id: string; username?: string } };
export type DiscoverResult = { pages: number; instagram: number; datasets: number; leadForms: number; errors: string[] };

export async function discoverAssets(db: SupabaseClient, graph: GraphOptions): Promise<DiscoverResult> {
  const out: DiscoverResult = { pages: 0, instagram: 0, datasets: 0, leadForms: 0, errors: [] };
  const now = new Date().toISOString();
  // Upserts omit contractor_id so an admin's explicit mapping survives re-discovery.
  const upsert = (rows: Record<string, unknown>[]) => db.from('meta_assets').upsert(rows, { onConflict: 'kind,meta_id' });
  try {
    const pages = await graphGetAll<RawPage>('me/accounts', { fields: 'id,name,instagram_business_account{id,username}' }, graph);
    await upsert(pages.map((p) => ({ kind: 'page', meta_id: p.id, name: p.name ?? null, last_seen_at: now, last_error: null })));
    out.pages = pages.length;
    const ig = pages.filter((p) => p.instagram_business_account?.id).map((p) => ({ kind: 'instagram', meta_id: p.instagram_business_account!.id, name: p.instagram_business_account!.username ?? null, parent_meta_id: p.id, last_seen_at: now, last_error: null }));
    if (ig.length) await upsert(ig);
    out.instagram = ig.length;
    for (const p of pages) {
      try {
        const forms = await graphGetAll<{ id: string; name?: string; status?: string }>(`${p.id}/leadgen_forms`, { fields: 'id,name,status' }, graph);
        if (forms.length) await upsert(forms.map((f) => ({ kind: 'lead_form', meta_id: f.id, name: f.name ?? null, parent_meta_id: p.id, details: { status: f.status ?? null }, last_seen_at: now, last_error: null })));
        out.leadForms += forms.length;
      } catch (e) {
        const msg = redact(e instanceof GraphError ? `${e.failure.kind}: ${e.failure.message}` : 'error');
        out.errors.push(`Lead forms for page ${p.id}: ${msg}`);
        await db.from('meta_assets').update({ last_error: `Lead forms: ${msg}` }).eq('kind', 'page').eq('meta_id', p.id);
      }
    }
  } catch (e) {
    out.errors.push(`Pages: ${redact(e instanceof GraphError ? `${e.failure.kind}: ${e.failure.message}` : 'error')}`);
  }
  const { data: accounts } = await db.from('meta_ad_accounts').select('id').eq('sync_enabled', true);
  for (const a of (accounts ?? []) as { id: string }[]) {
    try {
      const px = await graphGetAll<{ id: string; name?: string }>(`${a.id}/adspixels`, { fields: 'id,name' }, graph);
      if (px.length) await upsert(px.map((x) => ({ kind: 'dataset', meta_id: x.id, name: x.name ?? null, account_id: a.id, last_seen_at: now, last_error: null })));
      out.datasets += px.length;
    } catch (e) {
      out.errors.push(`Datasets for ${a.id}: ${redact(e instanceof GraphError ? `${e.failure.kind}: ${e.failure.message}` : 'error')}`);
    }
  }
  return out;
}

/**
 * The gate evaluated at the moment a proposal is about to be written. Unattended (rule-approved) proposals need the
 * automation gate; person-approved ones need the write gate. Budget changes additionally need the account's budget-unit
 * check. Reads fresh state every call - nothing is cached between queueing and execution.
 */
export async function proposalGate(db: SupabaseClient, p: { account_id: string; change_type: string; approved_by: string | null; auto_approved_by_rule: string | null }): Promise<GateResult> {
  const unattended = !p.approved_by && !!p.auto_approved_by_rule;
  const base = await accountGate(db, p.account_id, { automation: unattended });
  const reasons = [...base.reasons];
  if (p.change_type === 'budget') {
    const [{ data: acct }, { data: ctl }] = await Promise.all([
      db.from('meta_ad_accounts').select('currency').eq('id', p.account_id).maybeSingle(),
      db.from('meta_account_controls').select('budget_unit_currency, budget_unit_verified_at').eq('account_id', p.account_id).maybeSingle(),
    ]);
    reasons.push(...budgetUnitGate({ accountCurrency: acct?.currency ?? null, verifiedCurrency: ctl?.budget_unit_currency ?? null, verifiedAt: ctl?.budget_unit_verified_at ?? null, isProbe: false }).reasons);
  }
  return { allowed: reasons.length === 0, reasons };
}
