import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  GraphError, listAdAccounts, listAdSets, listAds, listCampaigns, listDailyInsights, redactSecrets,
  type GraphOptions, type MetaInsightRow,
} from './marketing-api';
import { actionsToMap, addDays, zonedDate } from './metrics';

/**
 * Read-only import of Meta ad accounts, campaigns, ad sets, ads and daily ad-level insights into the HQN
 * mirror tables. Only metadata columns are written, so the admin's contractor mapping is never overwritten.
 * The trailing window is re-imported every run because Meta revises recent numbers (attribution windows).
 */

export function toInsightDbRow(r: MetaInsightRow, accountId: string) {
  const reach = r.reach != null && r.reach !== '' ? Number(r.reach) : null;
  return {
    ad_id: r.ad_id, date: r.date_start, account_id: accountId, campaign_id: r.campaign_id, adset_id: r.adset_id,
    spend: Number(r.spend ?? 0) || 0,
    impressions: Math.trunc(Number(r.impressions ?? 0)) || 0,
    reach: reach != null && Number.isFinite(reach) ? Math.trunc(reach) : null,
    inline_link_clicks: Math.trunc(Number(r.inline_link_clicks ?? 0)) || 0,
    actions: actionsToMap(r.actions),
    // use_unified_attribution_setting=true: each row follows its ad set's own attribution setting.
    attribution_setting: 'ad set setting (unified)',
    synced_at: new Date().toISOString(),
  };
}

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export type SyncSummary = { status: 'ok' | 'partial' | 'failed'; accounts: number; campaigns: number; adsets: number; ads: number; insightRows: number; errors: { account: string | null; code: string; message: string }[] };

export async function runMetaSync(db: SupabaseClient, graph: GraphOptions, opts: { trigger: 'manual' | 'cron'; days?: number; now?: Date }): Promise<SyncSummary> {
  const now = opts.now ?? new Date();
  const days = opts.days ?? 30;
  const sum: SyncSummary = { status: 'ok', accounts: 0, campaigns: 0, adsets: 0, ads: 0, insightRows: 0, errors: [] };
  const { data: run } = await db.from('meta_sync_runs').insert({ trigger: opts.trigger }).select('id').single();
  const fail = (account: string | null, e: unknown) => {
    const f = e instanceof GraphError ? e.failure : null;
    sum.errors.push({ account, code: f ? `${f.kind}${f.code != null ? `:${f.code}` : ''}` : 'error', message: redactSecrets(f?.message ?? (e instanceof Error ? e.message : 'sync error')) });
  };

  try {
    const accounts = await listAdAccounts(graph);
    for (const batch of chunk(accounts, 100)) {
      await db.from('meta_ad_accounts').upsert(batch.map((a) => ({
        id: a.id, name: a.name ?? null, currency: a.currency ?? null, timezone_name: a.timezone_name ?? null, account_status: a.account_status ?? null,
      })), { onConflict: 'id' });
    }
    const { data: enabled } = await db.from('meta_ad_accounts').select('id, timezone_name').eq('sync_enabled', true);
    for (const acct of (enabled ?? []) as { id: string; timezone_name: string | null }[]) {
      try {
        const [campaigns, adsets, ads] = await Promise.all([listCampaigns(acct.id, graph), listAdSets(acct.id, graph), listAds(acct.id, graph)]);
        const stamp = new Date().toISOString();
        // Campaign upsert omits contractor_id so an admin's per-campaign override survives re-syncs.
        for (const b of chunk(campaigns, 200)) await db.from('meta_campaigns').upsert(b.map((c) => ({ id: c.id, account_id: acct.id, name: c.name ?? null, objective: c.objective ?? null, status: c.status ?? null, effective_status: c.effective_status ?? null, synced_at: stamp })), { onConflict: 'id' });
        for (const b of chunk(adsets, 200)) await db.from('meta_adsets').upsert(b.map((s) => ({ id: s.id, account_id: acct.id, campaign_id: s.campaign_id, name: s.name ?? null, status: s.status ?? null, effective_status: s.effective_status ?? null, optimization_goal: s.optimization_goal ?? null, attribution_spec: s.attribution_spec ?? null, synced_at: stamp })), { onConflict: 'id' });
        for (const b of chunk(ads, 200)) await db.from('meta_ads').upsert(b.map((a) => ({ id: a.id, account_id: acct.id, campaign_id: a.campaign_id, adset_id: a.adset_id, name: a.name ?? null, status: a.status ?? null, effective_status: a.effective_status ?? null, synced_at: stamp })), { onConflict: 'id' });
        const until = zonedDate(now, acct.timezone_name || 'UTC');
        const since = addDays(until, -(days - 1));
        const insights = await listDailyInsights(acct.id, since, until, graph);
        for (const b of chunk(insights, 500)) await db.from('meta_insights_daily').upsert(b.map((r) => toInsightDbRow(r, acct.id)), { onConflict: 'ad_id,date' });
        sum.accounts++; sum.campaigns += campaigns.length; sum.adsets += adsets.length; sum.ads += ads.length; sum.insightRows += insights.length;
        await db.from('meta_ad_accounts').update({ last_synced_at: new Date().toISOString(), last_sync_error: null }).eq('id', acct.id);
      } catch (e) {
        fail(acct.id, e);
        await db.from('meta_ad_accounts').update({ last_sync_error: sum.errors.at(-1)!.message }).eq('id', acct.id);
      }
    }
  } catch (e) { fail(null, e); }

  sum.status = sum.errors.length === 0 ? 'ok' : sum.accounts > 0 ? 'partial' : 'failed';
  if (run?.id) {
    await db.from('meta_sync_runs').update({
      status: sum.status, finished_at: new Date().toISOString(), counts: { accounts: sum.accounts, campaigns: sum.campaigns, adsets: sum.adsets, ads: sum.ads, insight_rows: sum.insightRows },
      error_code: sum.errors[0]?.code ?? null, error_message: sum.errors[0]?.message ?? null,
    }).eq('id', run.id);
  }
  return sum;
}
