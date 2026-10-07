import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Read helpers for the Studio pages. They take the caller's RLS client (admin session), never the service role. */

export type Readiness = { key: string; label: string; ok: boolean; detail: string; required: boolean };

/** Which prerequisites exist. Only presence is reported - values are never read out. */
export function studioReadiness(s: { liveWritesEnabled: boolean; automationEnabled: boolean }, hasAccounts: boolean): Readiness[] {
  const has = (k: string) => !!process.env[k];
  return [
    { key: 'read', label: 'Reporting token', ok: has('META_MARKETING_ACCESS_TOKEN'), required: true, detail: 'META_MARKETING_ACCESS_TOKEN (read-only, ads_read). Needed to import accounts, Pages, datasets and live state.' },
    { key: 'sync', label: 'Ad accounts imported', ok: hasAccounts, required: true, detail: 'Run Sync now on Meta Ads > Setup after the reporting token is set.' },
    { key: 'write', label: 'Write token', ok: has('META_ADS_WRITE_TOKEN'), required: false, detail: 'META_ADS_WRITE_TOKEN (System User token with ads_management). Needed only to create paused ads or apply approved changes.' },
    { key: 'live', label: 'Live writes switch', ok: s.liveWritesEnabled, required: false, detail: 'Off by default. While off, HQN cannot create or change anything in Meta.' },
    { key: 'auto', label: 'Automation', ok: s.automationEnabled, required: false, detail: 'Stopped by default. Stopping HQN automation never pauses ads already running in Meta.' },
    { key: 'tick', label: 'Scheduler secret', ok: has('META_TICK_SECRET'), required: false, detail: 'META_TICK_SECRET plus the META_STUDIO_TICK_URL GitHub secret run the hourly rule/state job.' },
  ];
}

export async function loadAssets(db: SupabaseClient) {
  const { data } = await db.from('meta_assets').select('id, kind, meta_id, name, parent_meta_id, account_id, contractor_id, last_seen_at, last_error').order('kind').order('name');
  return (data ?? []) as { id: string; kind: 'page' | 'instagram' | 'dataset' | 'lead_form'; meta_id: string; name: string | null; parent_meta_id: string | null; account_id: string | null; contractor_id: string | null; last_seen_at: string; last_error: string | null }[];
}

export async function loadAccountsWithControls(db: SupabaseClient) {
  const [{ data: accts }, { data: ctl }] = await Promise.all([
    db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id, last_synced_at, last_sync_error').order('name'),
    db.from('meta_account_controls').select('account_id, writes_enabled, automation_enabled, note'),
  ]);
  const c = new Map(((ctl ?? []) as { account_id: string; writes_enabled: boolean; automation_enabled: boolean; note: string | null }[]).map((x) => [x.account_id, x]));
  return ((accts ?? []) as { id: string; name: string | null; currency: string | null; timezone_name: string | null; contractor_id: string | null; last_synced_at: string | null; last_sync_error: string | null }[])
    .map((a) => ({ ...a, writes_enabled: c.get(a.id)?.writes_enabled ?? false, automation_enabled: c.get(a.id)?.automation_enabled ?? false, note: c.get(a.id)?.note ?? null }));
}
