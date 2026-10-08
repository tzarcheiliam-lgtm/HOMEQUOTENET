'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runMetaSync } from '@/lib/meta/sync';
import { LIVE_CONFIRMATION, META_MAX_EVENT_AGE_MS } from '@/lib/meta/conversions';
import { deliveryModePatch } from '@/lib/meta/settings';
import { requeueFailedEvent } from '@/lib/meta/audit.server';

export type MetaActionState = { error?: string; success?: string } | undefined;

const uuidOrNull = z.string().uuid().nullable();
const str = (fd: FormData, k: string) => { const v = fd.get(k); const s = v === null ? '' : String(v).trim(); return s === '' ? null : s; };

/** Manual "Sync now". Read-only against Meta; writes only the HQN mirror tables. */
export async function syncMetaNow(): Promise<MetaActionState> {
  await requireRole(['admin']);
  const token = process.env.META_MARKETING_ACCESS_TOKEN;
  if (!token) return { error: 'META_MARKETING_ACCESS_TOKEN is not set on the server, so there is nothing to sync from. See Meta Ads > Setup.' };
  const db = createAdminClient();
  const { data: s } = await db.from('meta_settings').select('insights_days').eq('id', true).maybeSingle();
  const r = await runMetaSync(db, { token }, { trigger: 'manual', days: s?.insights_days ?? 30 });
  revalidatePath('/app/meta-ads');
  if (r.status === 'failed') return { error: `Sync failed: ${r.errors[0]?.message ?? 'unknown error'} (${r.errors[0]?.code ?? 'error'})` };
  return { success: `Synced ${r.accounts} account(s), ${r.campaigns} campaigns, ${r.ads} ads, ${r.insightRows} daily rows${r.status === 'partial' ? ` - with ${r.errors.length} error(s)` : ''}.` };
}

/** Explicit, admin-controlled mapping of a Meta ad account to a contractor (or to HQN network level). */
export async function saveAccountMapping(_prev: MetaActionState, fd: FormData): Promise<MetaActionState> {
  await requireRole(['admin']);
  const accountId = str(fd, 'account_id');
  const contractor = uuidOrNull.safeParse(str(fd, 'contractor_id'));
  if (!accountId || !contractor.success) return { error: 'Invalid account or contractor' };
  const { error } = await createAdminClient().from('meta_ad_accounts').update({
    contractor_id: contractor.data, show_spend_to_contractor: fd.get('show_spend_to_contractor') === 'on', sync_enabled: fd.get('sync_enabled') === 'on',
  }).eq('id', accountId);
  if (error) return { error: 'Could not save the mapping' };
  revalidatePath('/app/meta-ads'); revalidatePath('/app/meta-ads/setup');
  return { success: 'Saved.' };
}

export async function saveCampaignMapping(_prev: MetaActionState, fd: FormData): Promise<MetaActionState> {
  await requireRole(['admin']);
  const campaignId = str(fd, 'campaign_id');
  const contractor = uuidOrNull.safeParse(str(fd, 'contractor_id'));
  if (!campaignId || !contractor.success) return { error: 'Invalid campaign or contractor' };
  const { error } = await createAdminClient().from('meta_campaigns').update({ contractor_id: contractor.data }).eq('id', campaignId);
  if (error) return { error: 'Could not save the mapping' };
  revalidatePath('/app/meta-ads'); revalidatePath('/app/meta-ads/setup');
  return { success: 'Saved.' };
}

const settingsSchema = z.object({
  mode: z.enum(['off', 'test', 'live']),
  test_event_code: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/).nullable(),
  dataset_id: z.string().regex(/^[0-9]{5,20}$/).nullable(),
  test_dataset_id: z.string().regex(/^[0-9]{5,20}$/).nullable(),
  insights_days: z.coerce.number().int().min(1).max(90),
});

/**
 * Switch conversion delivery. 'off' is the default. Leaving 'off' (or going test -> live) moves the ledger
 * cursor to NOW, so only outcomes recorded AFTER the switch are ever queued: nothing historical is swept in.
 */
export async function saveDeliverySettings(_prev: MetaActionState, fd: FormData): Promise<MetaActionState> {
  const { profile } = await requireAdminProfile();
  const parsed = settingsSchema.safeParse({
    mode: str(fd, 'mode') ?? 'off', test_event_code: str(fd, 'test_event_code'), dataset_id: str(fd, 'dataset_id'), test_dataset_id: str(fd, 'test_dataset_id'), insights_days: str(fd, 'insights_days') ?? '30',
  });
  if (!parsed.success) return { error: 'Check the test event code (letters/numbers), dataset id (digits) and days (1-90)' };
  const v = parsed.data;
  if (v.mode === 'test' && !v.test_event_code) return { error: 'Test mode needs the Test Events code from Events Manager (e.g. TEST12345)' };
  if (v.mode === 'test' && !v.test_dataset_id) return { error: 'Test mode needs a SEPARATE test dataset ID. Meta does not sandbox test events: they still feed the dataset they are sent to.' };
  if (v.mode === 'live' && str(fd, 'confirm_live') !== LIVE_CONFIRMATION) return { error: `Type ${LIVE_CONFIRMATION} to confirm that real conversions will be sent to Meta` };
  if (v.mode !== 'off' && !process.env.META_CONVERSIONS_API_TOKEN) return { error: 'META_CONVERSIONS_API_TOKEN is not set on the server' };
  const db = createAdminClient();
  if (v.test_dataset_id) {
    // Refuse a test dataset that is a dataset real events go to (the CRM dataset or any funnel's Pixel).
    const { data: fs } = await db.from('funnels').select('config').eq('is_demo', false);
    const real = new Set([v.dataset_id, ...((fs ?? []) as { config: { trackingPixels?: { metaPixelId?: string } } | null }[]).map((f) => f.config?.trackingPixels?.metaPixelId)].filter(Boolean));
    if (real.has(v.test_dataset_id)) return { error: 'That test dataset is also used for real events (the CRM dataset or a funnel Pixel). Create a separate dataset for testing.' };
  }
  const { data: cur } = await db.from('meta_settings').select('delivery_mode').eq('id', true).maybeSingle();
  const patch: Record<string, unknown> = {
    ...deliveryModePatch(cur?.delivery_mode, v.mode, fd.get('restore_legacy') === 'on'),
    test_event_code: v.test_event_code, test_dataset_id: v.test_dataset_id, dataset_id: v.dataset_id, insights_days: v.insights_days,
    updated_at: new Date().toISOString(), updated_by: profile.id,
  };
  const { error } = await db.from('meta_settings').update(patch).eq('id', true);
  if (error) return { error: 'Could not save settings' };
  revalidatePath('/app/meta-ads/setup');
  return { success: v.mode === 'off' ? 'Conversion delivery is OFF.' : v.mode === 'test' ? 'Test mode: events go to your separate test dataset only.' : 'LIVE: new outcomes recorded from now on will be sent to Meta.' };
}

/**
 * Safe retry of a FAILED event, always with the SAME stable event_id so Meta can de-duplicate a resend of an event that
 * actually landed. A failed queue row is re-armed in place; a failed direct-send row is retried through a new queue row
 * (retry_of). Accepted, in-flight and older-than-7-day events are refused; a failed row never blocks its own retry.
 */
export async function retryConversionEvent(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = str(fd, 'id');
  if (!id || !z.string().uuid().safeParse(id).success) return;
  const db = createAdminClient();
  const { data: ev } = await db.from('meta_conversion_events').select('status, event_time, origin').eq('id', id).maybeSingle();
  if (!ev || ev.status !== 'failed') return;
  if (Date.now() - new Date(ev.event_time).getTime() > META_MAX_EVENT_AGE_MS) return; // too old for Meta; never re-dated
  if (ev.origin === 'legacy_direct') await requeueFailedEvent(db, id);
  else await db.from('meta_conversion_events').update({
    status: 'pending', attempt_count: 0, next_attempt_at: new Date().toISOString(), permanent_failure: false, last_error_code: null, last_error_message: null,
  }).eq('id', id).eq('status', 'failed');
  revalidatePath('/app/meta-ads/events');
}

/**
 * Read-only access diagnostic for the configured System User token: can it reach the ad account and datasets, does the app
 * hold the needed permission, and who must do what if not (see lib/meta/access-check.ts). GET requests only; no event is
 * sent; the token never leaves the server or appears in the result.
 */
export async function checkMetaConnection(_prev: unknown, fd: FormData): Promise<{ error?: string; result?: import('@/lib/meta/access-check').AccessResult }> {
  await requireRole(['admin']);
  const token = process.env.META_MARKETING_ACCESS_TOKEN;
  if (!token) return { error: 'META_MARKETING_ACCESS_TOKEN is not set on the server. Add it in the Vercel environment settings, redeploy, then check again.' };
  const account = str(fd, 'account');
  if (account && !/^(act_)?\d{5,25}$/.test(account)) return { error: 'The ad account id should look like act_1234567890' };
  const business = str(fd, 'business');
  if (business && !/^\d{5,25}$/.test(business)) return { error: 'The Business id should be digits only' };
  const { runAccessCheck } = await import('@/lib/meta/access-check');
  const { graphGet, graphGetAll, redactSecrets } = await import('@/lib/meta/marketing-api');
  const db = createAdminClient();
  const { data: cfg } = await db.from('meta_settings').select('dataset_id, test_dataset_id').eq('id', true).maybeSingle();
  const { data: funnels } = await db.from('funnels').select('slug, config').eq('is_demo', false).eq('published', true);
  const datasets = new Map<string, string>();
  for (const f of (funnels ?? []) as { slug: string; config: { trackingPixels?: { metaPixelId?: string } } | null }[]) {
    const px = f.config?.trackingPixels?.metaPixelId; if (px) datasets.set(px, `funnel ${f.slug}`);
  }
  if (cfg?.dataset_id) datasets.set(cfg.dataset_id, 'CRM (Instant Form) dataset');
  if (cfg?.test_dataset_id) datasets.set(cfg.test_dataset_id, 'test dataset');
  try {
    const result = await runAccessCheck(
      (path, params = {}, override) => {
        const p = { ...params };
        if (p.input_token === '__SELF__') { p.input_token = token; if (override) p.access_token = override; }
        return graphGet(path, p, { token: override ?? token });
      },
      (path, params = {}) => graphGetAll(path, params, { token }),
      { appId: process.env.META_APP_ID, appSecret: process.env.META_APP_SECRET, targetAccountId: account, hqnBusinessId: business,
        datasets: [...datasets].map(([id, role]) => ({ id, role })), readDatasetWithToken: process.env.META_CONVERSIONS_API_TOKEN ?? null },
    );
    // Defence in depth: no check text may contain a token.
    const scrub = (t: string) => redactSecrets([token, process.env.META_APP_SECRET, process.env.META_CONVERSIONS_API_TOKEN].filter(Boolean).reduce<string>((x, secret) => x.split(secret as string).join('[redacted]'), t));
    return { result: { ...result, checks: result.checks.map((c) => ({ ...c, detail: scrub(c.detail) })) } };
  } catch { return { error: 'The check could not run. Try again.' }; }
}

async function requireAdminProfile() {
  const profile = await requireRole(['admin']);
  return { profile: profile as { id: string } };
}
