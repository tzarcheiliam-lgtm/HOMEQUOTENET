import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSiteUrl } from '@/lib/auth/site-url';
import { funnelSchema, type FunnelConfig } from '@/lib/funnels/schema';
import { GraphError } from '@/lib/meta/marketing-api';
import type { Profile } from '@/lib/types';
import { canSetUpMeta, connectionOwner, getConnection, logSetup, markNeedsReconnect, tokenFor } from './connections';
import { getPixel, listAccounts, listPixels, pixelEventCounts, type AssetAccount, type AssetPixel, type FetchLike } from './graph';
import { evaluate, type Check, type TrackingLevel } from './verify';

export interface FunnelForMeta { id: string; slug: string; status: string; contractorId: string | null; isDemo: boolean; clientName: string; config: FunnelConfig; url: string }
export interface Deps { admin: SupabaseClient; profile: Profile; fetchImpl?: FetchLike }

export const funnelUrl = (slug: string) => `${publicSiteUrl()}/estimate/${slug}`;

/** A funnel this person may set up tracking for: admins any; contractor owners only their own company's. */
export async function loadFunnelForActor(admin: SupabaseClient, profile: Profile, funnelId: string): Promise<FunnelForMeta | null> {
  if (!canSetUpMeta(profile) || !/^[0-9a-f-]{36}$/i.test(funnelId)) return null;
  const { data } = await admin.from('funnels').select('id, slug, status, contractor_id, is_demo, config').eq('id', funnelId).maybeSingle();
  if (!data) return null;
  const f = data as { id: string; slug: string; status: string; contractor_id: string | null; is_demo: boolean; config: unknown };
  const owner = connectionOwner(profile);
  if (owner && f.contractor_id !== owner) return null;
  const parsed = funnelSchema.safeParse(f.config);
  if (!parsed.success) return null;
  return { id: f.id, slug: f.slug, status: f.status, contractorId: f.contractor_id, isDemo: f.is_demo, clientName: parsed.data.clientName, config: parsed.data, url: funnelUrl(f.slug) };
}

export async function listFunnelsForActor(admin: SupabaseClient, profile: Profile, limit = 12) {
  if (!canSetUpMeta(profile)) return [];
  let q = admin.from('funnels').select('id, slug, status, contractor_id, is_demo, config').neq('status', 'archived').order('created_at', { ascending: false }).limit(limit);
  const owner = connectionOwner(profile);
  if (owner) q = q.eq('contractor_id', owner);
  const { data } = await q;
  const ids = ((data ?? []) as { id: string }[]).map(f => f.id);
  const { data: tracking } = ids.length ? await admin.from('meta_funnel_tracking').select('funnel_id, dataset_id').in('funnel_id', ids) : { data: [] };
  const byFunnel = new Map(((tracking ?? []) as { funnel_id: string; dataset_id: string }[]).map(t => [t.funnel_id, t.dataset_id]));
  return ((data ?? []) as { id: string; slug: string; status: string; is_demo: boolean; config: { clientName?: string; trackingPixels?: { metaPixelId?: string } } }[]).map(f => ({
    id: f.id, slug: f.slug, status: f.status, isDemo: f.is_demo, name: f.config?.clientName ?? f.slug, pixelId: f.config?.trackingPixels?.metaPixelId ?? null, connected: byFunnel.has(f.id),
  }));
}

type Authorized = { token: string; connectionId: string };
async function authorize(d: Deps): Promise<Authorized | { error: 'not_connected' | 'needs_reconnect' }> {
  const conn = await getConnection(d.admin, d.profile);
  if (!conn) return { error: 'not_connected' };
  const token = conn.status === 'active' ? await tokenFor(d.admin, d.profile, conn.id) : null;
  return token ? { token, connectionId: conn.id } : { error: 'needs_reconnect' };
}

export type AssetResult<T> = { ok: true; items: T[] } | { ok: false; error: 'not_connected' | 'needs_reconnect' | 'permission' | 'failed'; message?: string };

async function guarded<T>(d: Deps, auth: Authorized, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: 'needs_reconnect' | 'permission' | 'failed'; message: string }> {
  try { return { ok: true, value: await fn() }; } catch (e) {
    if (e instanceof GraphError) {
      if (e.failure.kind === 'auth') { await markNeedsReconnect(d.admin, auth.connectionId, e.failure.message); return { ok: false, error: 'needs_reconnect', message: 'Meta no longer accepts this authorization. Reconnect Meta.' }; }
      if (e.failure.kind === 'permission') return { ok: false, error: 'permission', message: `Meta did not allow this (${e.failure.message}). This usually means the Meta app does not yet have the needed access level, or your account does not have access.` };
      return { ok: false, error: 'failed', message: 'Meta did not respond as expected. Try again shortly.' };
    }
    return { ok: false, error: 'failed', message: 'Something went wrong reading Meta.' };
  }
}

/** Only accounts the connected user can actually see in Meta. */
export async function accountsFor(d: Deps): Promise<AssetResult<AssetAccount>> {
  const auth = await authorize(d);
  if ('error' in auth) return { ok: false, error: auth.error };
  const r = await guarded(d, auth, () => listAccounts({ token: auth.token, fetchImpl: d.fetchImpl }));
  return r.ok ? { ok: true, items: r.value } : { ok: false, error: r.error, message: r.message };
}

export async function datasetsFor(d: Deps, adAccountId: string): Promise<AssetResult<AssetPixel>> {
  const auth = await authorize(d);
  if ('error' in auth) return { ok: false, error: auth.error };
  const r = await guarded(d, auth, async () => {
    // The account must be in the user's own authorized list; an id from the model or client is never trusted on its own.
    const accounts = await listAccounts({ token: auth.token, fetchImpl: d.fetchImpl });
    if (!accounts.some(a => a.id === adAccountId)) return null;
    return listPixels({ token: auth.token, fetchImpl: d.fetchImpl }, adAccountId);
  });
  if (!r.ok) return { ok: false, error: r.error, message: r.message };
  if (r.value === null) return { ok: false, error: 'permission', message: 'That ad account is not available to your connected Meta login.' };
  return { ok: true, items: r.value };
}

export interface ConfigureInput { funnelId: string; adAccountId: string; datasetId: string }
export type ConfigureResult =
  | { ok: true; funnelSlug: string; previousDatasetId: string | null; datasetName: string; accountName: string; unchanged: boolean }
  | { ok: false; error: string };

/** Attaches an existing dataset to a funnel. Re-checks everything at execution time; never trusts ids from the model/client. */
export async function configureFunnelTracking(d: Deps, input: ConfigureInput, actionId: string): Promise<ConfigureResult> {
  const funnel = await loadFunnelForActor(d.admin, d.profile, input.funnelId);
  if (!funnel) return { ok: false, error: 'Funnel not found or access denied.' };
  const auth = await authorize(d);
  if ('error' in auth) return { ok: false, error: auth.error === 'not_connected' ? 'Meta is not connected.' : 'Meta needs to be reconnected.' };

  const checked = await guarded(d, auth, async () => {
    const accounts = await listAccounts({ token: auth.token, fetchImpl: d.fetchImpl });
    const account = accounts.find(a => a.id === input.adAccountId);
    if (!account) return { account: null, pixel: null } as const;
    const pixels = await listPixels({ token: auth.token, fetchImpl: d.fetchImpl }, account.id);
    return { account, pixel: pixels.find(p => p.id === input.datasetId) ?? null } as const;
  });
  if (!checked.ok) return { ok: false, error: checked.message };
  if (!checked.value.account || !checked.value.pixel) return { ok: false, error: 'That ad account or dataset is not available to your connected Meta login.' };
  const { account, pixel } = checked.value;
  if (pixel.unavailable) return { ok: false, error: 'Meta reports that dataset as unavailable.' };

  const previous = funnel.config.trackingPixels.metaPixelId ?? null;
  const next = funnelSchema.safeParse({ ...funnel.config, trackingPixels: { ...funnel.config.trackingPixels, metaPixelId: pixel.id } });
  if (!next.success) return { ok: false, error: 'The funnel settings could not be updated safely.' };
  if (previous !== pixel.id) {
    const { error } = await d.admin.from('funnels').update({ config: next.data }).eq('id', funnel.id);
    if (error) return { ok: false, error: 'The funnel could not be updated.' };
  }
  const row = {
    funnel_id: funnel.id, contractor_id: funnel.contractorId, connection_id: auth.connectionId, business_id: account.business?.id ?? null, business_name: account.business?.name ?? null,
    ad_account_id: account.id, ad_account_name: account.name, dataset_id: pixel.id, dataset_name: pixel.name, configured_by: d.profile.id, configured_at: new Date().toISOString(),
  };
  const { data: existing } = await d.admin.from('meta_funnel_tracking').select('dataset_id').eq('funnel_id', funnel.id).maybeSingle();
  const same = (existing as { dataset_id?: string } | null)?.dataset_id === pixel.id;
  // A different dataset starts a fresh verification record: old evidence must not carry over.
  // Re-confirming the same dataset keeps the original configured_at and its verification record.
  const { configured_at: keepOriginalTime, ...withoutTime } = row;
  void keepOriginalTime;
  const record: Record<string, unknown> = same ? withoutTime : { ...row, verification: {}, verified_at: null };
  const { error: upErr } = await d.admin.from('meta_funnel_tracking').upsert(record, { onConflict: 'funnel_id' });
  if (upErr) return { ok: false, error: 'The tracking record could not be saved.' };
  await logSetup(d.admin, { actor: d.profile.id, contractorId: funnel.contractorId, funnelId: funnel.id, connectionId: auth.connectionId, action: 'funnel_tracking_configured', metadata: { dataset_id: pixel.id, ad_account_id: account.id, previous_dataset_id: previous, assistant_action_id: actionId, approved_by: d.profile.id } });
  return { ok: true, funnelSlug: funnel.slug, previousDatasetId: previous, datasetName: pixel.name, accountName: account.name, unchanged: previous === pixel.id && same };
}

export type CreateDatasetResult = { ok: true; datasetId: string; created: boolean } | { ok: false; error: string };

/** Find-before-create: an ad account normally holds one pixel (Meta error 6200), so an existing one is reused. */
export async function createDataset(d: Deps, input: { adAccountId: string; name: string }, actionId: string): Promise<CreateDatasetResult> {
  const conn = await getConnection(d.admin, d.profile);
  if (!conn) return { ok: false, error: 'Meta is not connected.' };
  if (!conn.canCreateDataset) return { ok: false, error: 'The connected Meta login did not grant permission to create datasets (ads_management).' };
  const auth = await authorize(d);
  if ('error' in auth) return { ok: false, error: 'Meta needs to be reconnected.' };
  const { createPixel } = await import('./graph');
  const r = await guarded(d, auth, async () => {
    const accounts = await listAccounts({ token: auth.token, fetchImpl: d.fetchImpl });
    if (!accounts.some(a => a.id === input.adAccountId)) return { kind: 'denied' } as const;
    const existing = await listPixels({ token: auth.token, fetchImpl: d.fetchImpl }, input.adAccountId);
    if (existing.length) return { kind: 'reuse', id: existing[0].id } as const;
    const made = await createPixel({ token: auth.token, fetchImpl: d.fetchImpl }, input.adAccountId, input.name);
    if ('id' in made) return { kind: 'created', id: made.id } as const;
    if ('exists' in made) { const again = await listPixels({ token: auth.token, fetchImpl: d.fetchImpl }, input.adAccountId); return again.length ? { kind: 'reuse', id: again[0].id } as const : { kind: 'failed' } as const; }
    return { kind: made.error === 'permission' ? 'permission' : 'failed' } as const;
  });
  if (!r.ok) return { ok: false, error: r.message };
  const v = r.value;
  if (v.kind === 'denied') return { ok: false, error: 'That ad account is not available to your connected Meta login.' };
  if (v.kind === 'permission') return { ok: false, error: 'Meta refused to create the dataset with the granted permissions. The Meta app may need Advanced access for ads_management (App Review).' };
  if (v.kind === 'failed') return { ok: false, error: 'Meta did not create the dataset.' };
  const datasetId = (v as { id: string }).id;
  await logSetup(d.admin, { actor: d.profile.id, contractorId: connectionOwner(d.profile), connectionId: auth.connectionId, action: v.kind === 'created' ? 'dataset_created' : 'dataset_reused', metadata: { ad_account_id: input.adAccountId, dataset_id: datasetId, assistant_action_id: actionId, approved_by: d.profile.id } });
  return { ok: true, datasetId, created: v.kind === 'created' };
}

export interface TrackingStatus {
  funnel: { id: string; name: string; slug: string; status: string; url: string; published: boolean; isDemo: boolean };
  connection: { connected: boolean; status: string | null; user: string | null; canCreateDataset: boolean; expiresAt: string | null };
  tracking: null | { businessName: string | null; adAccountName: string | null; adAccountId: string; datasetId: string; datasetName: string | null; events: string[]; configuredAt: string };
  consentMode: 'opt_in' | 'opt_out';
  browser: 'on' | 'needs_dataset';
  server: 'on' | 'off_no_token' | 'needs_dataset';
  level: TrackingLevel;
  checks: Check[];
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  mismatch: string | null;
}

export async function trackingStatus(d: Deps, funnelId: string): Promise<TrackingStatus | null> {
  const funnel = await loadFunnelForActor(d.admin, d.profile, funnelId);
  if (!funnel) return null;
  const conn = await getConnection(d.admin, d.profile);
  const { data } = await d.admin.from('meta_funnel_tracking').select('*').eq('funnel_id', funnel.id).maybeSingle();
  const t = data as null | { business_name: string | null; ad_account_name: string | null; ad_account_id: string; dataset_id: string; dataset_name: string | null; events: string[]; configured_at: string; verification: { level?: TrackingLevel; checks?: Check[]; checkedAt?: string }; verified_at: string | null };
  const configured = funnel.config.trackingPixels.metaPixelId ?? null;
  const serverToken = !!process.env.META_CONVERSIONS_API_TOKEN?.trim();
  return {
    funnel: { id: funnel.id, name: funnel.clientName, slug: funnel.slug, status: funnel.status, url: funnel.url, published: funnel.status === 'published', isDemo: funnel.isDemo },
    connection: { connected: !!conn && conn.status !== 'revoked', status: conn?.status ?? null, user: conn?.metaUserName ?? null, canCreateDataset: !!conn?.canCreateDataset, expiresAt: conn?.expiresAt ?? null },
    tracking: t ? { businessName: t.business_name, adAccountName: t.ad_account_name, adAccountId: t.ad_account_id, datasetId: t.dataset_id, datasetName: t.dataset_name, events: t.events, configuredAt: t.configured_at } : null,
    consentMode: funnel.config.trackingPixels.consentMode,
    browser: configured ? 'on' : 'needs_dataset',
    server: !configured ? 'needs_dataset' : serverToken ? 'on' : 'off_no_token',
    level: t && configured === t.dataset_id ? (t.verification.level ?? 'installed') : configured ? 'installed' : 'not_configured',
    checks: t?.verification.checks ?? [],
    verifiedAt: t?.verified_at ?? null,
    lastCheckedAt: t?.verification.checkedAt ?? null,
    mismatch: t && configured && configured !== t.dataset_id ? 'The funnel now uses a different pixel than the one connected here. Re-run the connection.' : null,
  };
}

/** Read-only check. Sends nothing to Meta that could count as a conversion. */
export async function verifyFunnelTracking(d: Deps, funnelId: string, now = new Date()) {
  const funnel = await loadFunnelForActor(d.admin, d.profile, funnelId);
  if (!funnel) return null;
  const { data } = await d.admin.from('meta_funnel_tracking').select('*').eq('funnel_id', funnel.id).maybeSingle();
  const t = data as null | { dataset_id: string; configured_at: string };
  if (!t || funnel.config.trackingPixels.metaPixelId !== t.dataset_id) return { level: 'not_configured' as TrackingLevel, checks: [] as Check[], reason: 'No dataset is connected to this funnel.' };

  const serverToken = !!process.env.META_CONVERSIONS_API_TOKEN?.trim();
  const auth = await authorize(d);
  let pixel: AssetPixel | null = null;
  let browser: Record<string, number> | null = null;
  let server: Record<string, number> | null = null;
  let metaReadError: string | null = null;
  if ('error' in auth) metaReadError = auth.error === 'not_connected' ? 'Meta is not connected, so Meta’s own data could not be read.' : 'Meta needs to be reconnected, so Meta’s own data could not be read.';
  else {
    const since = Math.floor(Math.max(new Date(t.configured_at).getTime(), now.getTime() - 6 * 24 * 3_600_000) / 1000);
    const g = { token: auth.token, fetchImpl: d.fetchImpl };
    const read = await guarded(d, auth, async () => ({
      pixel: await getPixel(g, t.dataset_id),
      browser: await pixelEventCounts(g, t.dataset_id, since, 'WEB_ONLY').catch(() => null),
      server: serverToken ? await pixelEventCounts(g, t.dataset_id, since, 'SERVER_ONLY').catch(() => null) : null,
    }));
    if (read.ok) { pixel = read.value.pixel; browser = read.value.browser; server = read.value.server; } else metaReadError = read.message;
  }
  const { count } = await d.admin.from('meta_conversion_events').select('id', { count: 'exact', head: true })
    .eq('dataset_id', t.dataset_id).eq('stage', 'lead').eq('status', 'accepted').eq('test_mode', false).gte('event_time', t.configured_at);

  const checkedAt = now.toISOString();
  const result = evaluate({
    configuredAt: t.configured_at, funnelPublished: funnel.status === 'published', isDemo: funnel.isDemo, consentMode: funnel.config.trackingPixels.consentMode, serverTokenPresent: serverToken,
    pixelUnavailable: !!pixel?.unavailable, pixelLastFiredAt: pixel?.lastFiredAt ?? null, browserCounts: browser, serverCounts: server, ledgerAcceptedLeads: count ?? 0, checkedAt,
  });
  const verifiedAt = result.level === 'verified' ? checkedAt : null;
  await d.admin.from('meta_funnel_tracking').update({
    verification: { level: result.level, checks: result.checks, checkedAt, pixelLastFiredAt: pixel?.lastFiredAt ?? null, ledgerAcceptedLeads: count ?? 0 },
    verified_at: verifiedAt,
  }).eq('funnel_id', funnel.id);
  await logSetup(d.admin, { actor: d.profile.id, contractorId: funnel.contractorId, funnelId: funnel.id, action: 'tracking_checked', metadata: { level: result.level } });
  return { ...result, checkedAt, metaReadError };
}
