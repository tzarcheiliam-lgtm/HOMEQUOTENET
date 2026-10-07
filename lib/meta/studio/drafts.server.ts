import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { buildDestination } from './url-params';
import { confirmationSummary, draftConfigSchema, validateDraft, type DraftConfig, type DraftContext, type Issue } from './draft';
import { executeDraft, type CreatedObjects } from './create-ad';
import { accountGate, logActivity, writerOrNull } from './server';
import { redactSecrets } from '@/lib/meta/marketing-api';

export const CREATIVE_BUCKET = 'meta-creatives';

export type DraftRow = {
  id: string; contractor_id: string | null; account_id: string; creative_id: string | null; name: string; config: unknown; status: string; idempotency_key: string;
  created_objects: CreatedObjects; confirmed_at: string | null; confirmed_summary: unknown;
};
type AssetRow = { kind: string; meta_id: string; parent_meta_id: string | null; contractor_id: string | null; account_id: string | null };

/**
 * Tenant isolation for drafts: a contractor's ad may only use (a) an ad account mapped to that contractor,
 * (b) Pages explicitly mapped to that contractor (their Instagram accounts and Instant Forms follow the Page),
 * (c) datasets on that ad account, and (d) a creative owned by that contractor. Network-level drafts
 * (contractor_id null) can only use unmapped network-level assets. Everything is re-checked on the server.
 */
export async function loadDraftContext(db: SupabaseClient, d: { account_id: string; contractor_id: string | null; creative_id: string | null }, config: DraftConfig): Promise<{ ctx: DraftContext; accountName: string | null; timezone: string | null; pageName: string | null; accountOk: boolean }> {
  const [{ data: acct }, { data: assets }, { data: camps }, { data: sets }, creativeRes] = await Promise.all([
    db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id').eq('id', d.account_id).maybeSingle(),
    db.from('meta_assets').select('kind, meta_id, parent_meta_id, contractor_id, account_id'),
    db.from('meta_campaigns').select('id').eq('account_id', d.account_id),
    db.from('meta_adsets').select('id, campaign_id').eq('account_id', d.account_id),
    d.creative_id ? db.from('meta_creatives').select('kind, status, contractor_id').eq('id', d.creative_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const all = (assets ?? []) as AssetRow[];
  const mine = (a: AssetRow) => a.contractor_id === d.contractor_id; // null === null → network-level
  const pages = all.filter((a) => a.kind === 'page' && mine(a));
  const pageIds = new Set(pages.map((p) => p.meta_id));
  const creative = (creativeRes as { data: { kind: 'image' | 'video'; status: string; contractor_id: string | null } | null }).data;
  const accountOk = !!acct && acct.contractor_id === d.contractor_id;
  const ctx: DraftContext = {
    currency: acct?.currency ?? null,
    accountSyncedCampaignIds: new Set(((camps ?? []) as { id: string }[]).map((c) => c.id)),
    accountSyncedAdsetIds: new Map(((sets ?? []) as { id: string; campaign_id: string }[]).map((s) => [s.id, s.campaign_id])),
    creativeReady: !!creative && creative.status === 'ready' && creative.contractor_id === d.contractor_id,
    creativeKind: creative?.kind ?? null,
    allowedPageIds: pageIds,
    allowedInstagramIds: new Set(all.filter((a) => a.kind === 'instagram' && a.parent_meta_id && pageIds.has(a.parent_meta_id)).map((a) => a.meta_id)),
    allowedDatasetIds: new Set(all.filter((a) => a.kind === 'dataset' && a.account_id === d.account_id).map((a) => a.meta_id)),
    allowedLeadFormIds: new Set(all.filter((a) => a.kind === 'lead_form' && a.parent_meta_id === config.page_id && pageIds.has(config.page_id)).map((a) => a.meta_id)),
    now: new Date(),
  };
  return { ctx, accountName: acct?.name ?? null, timezone: acct?.timezone_name ?? null, pageName: null, accountOk };
}

export type ReviewResult = { ok: boolean; errors: Issue[]; warnings: Issue[]; summary?: ReturnType<typeof confirmationSummary>; config?: DraftConfig };

export async function reviewDraft(db: SupabaseClient, d: DraftRow): Promise<ReviewResult> {
  const parsed = draftConfigSchema.safeParse(d.config);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => ({ code: 'schema', message: `${i.path.join('.')}: ${i.message}` })), warnings: [] };
  const config = parsed.data;
  const { ctx, accountName, timezone, accountOk } = await loadDraftContext(db, d, config);
  const { errors, warnings } = validateDraft(config, ctx);
  if (!accountOk) errors.push({ code: 'account_not_mapped', message: 'This ad account is not mapped to the selected contractor.' });
  const summary = confirmationSummary({ accountName, accountId: d.account_id, currency: ctx.currency ?? '', pageName: null, config, timezone });
  return { ok: errors.length === 0, errors, warnings, summary, config };
}

/** Records the human confirmation, bound to exactly what was shown. Nothing is sent to Meta by this call. */
export async function confirmDraft(db: SupabaseClient, d: DraftRow, actorId: string): Promise<{ ok: boolean; error?: string }> {
  const review = await reviewDraft(db, d);
  if (!review.ok) return { ok: false, error: review.errors[0]?.message ?? 'The draft has errors.' };
  const { error } = await db.from('meta_ad_drafts').update({ status: 'ready', confirmed_by: actorId, confirmed_at: new Date().toISOString(), confirmed_summary: review.summary }).eq('id', d.id).in('status', ['draft', 'ready']);
  if (error) return { ok: false, error: 'Could not record the confirmation.' };
  await logActivity(db, { actor_id: actorId, action: 'draft.confirmed', target_type: 'draft', target_id: d.id, account_id: d.account_id, after: review.summary });
  return { ok: true };
}

/** Editing a draft after confirmation voids the confirmation: the human must confirm what will actually be sent. */
export async function voidConfirmationOnEdit(db: SupabaseClient, draftId: string) {
  await db.from('meta_ad_drafts').update({ status: 'draft', confirmed_at: null, confirmed_by: null, confirmed_summary: null }).eq('id', draftId).in('status', ['ready']);
}

export type CreateOutcome = { ok: boolean; status: string; message: string; objects?: CreatedObjects };

/**
 * Creates the PAUSED objects in Meta for a confirmed draft. Safe to call repeatedly: the atomic claim allows
 * one runner at a time, ids are persisted per step, and each step adopts existing tagged objects.
 */
export async function createPausedObjects(db: SupabaseClient, draftId: string, actorId: string | null): Promise<CreateOutcome> {
  const { data: d } = await db.from('meta_ad_drafts').select('*').eq('id', draftId).maybeSingle();
  if (!d) return { ok: false, status: 'missing', message: 'Draft not found.' };
  const draft = d as DraftRow;
  const gate = await accountGate(db, draft.account_id);
  if (!gate.allowed) return { ok: false, status: 'blocked', message: gate.reasons.join(' ') };
  const writer = writerOrNull();
  if (!writer) return { ok: false, status: 'blocked', message: 'Setup required: META_ADS_WRITE_TOKEN is not set.' };

  const review = await reviewDraft(db, draft); // re-validate against CURRENT mappings and sync, not what was true at confirmation
  if (!review.ok || !review.config) return { ok: false, status: 'invalid', message: review.errors[0]?.message ?? 'The draft no longer passes validation.' };

  const { data: claimed } = await db.rpc('claim_meta_draft', { p_id: draftId });
  const row = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!row) return { ok: false, status: 'not_claimable', message: 'This draft is already being created, was already created, or has not been confirmed.' };

  const { data: cr } = await db.from('meta_creatives').select('kind, storage_path, thumbnail_path, meta_account_id, meta_image_hash, meta_video_id').eq('id', draft.creative_id).maybeSingle();
  if (!cr) return finish(db, draft, actorId, { ok: false, status: 'failed', message: 'The creative is missing.' });
  const c = review.config;
  const dest = c.conversion_location === 'website' && c.ad.destination_url ? buildDestination(c.ad.destination_url) : null;
  if (c.conversion_location === 'website' && !dest?.ok) return finish(db, draft, actorId, { ok: false, status: 'failed', message: 'The destination is invalid.' });
  const destination = dest?.ok ? { url: dest.url, urlTags: dest.urlTags } : null;
  // Instant-form ads send people to the form, but HQN parameters still apply to the creative's tracking tags.
  const reuse: CreatedObjects = { ...(draft.created_objects ?? {}) };
  if (cr.meta_account_id === draft.account_id) { if (cr.meta_image_hash && !reuse.image_hash) reuse.image_hash = cr.meta_image_hash; if (cr.meta_video_id && !reuse.video_id) reuse.video_id = cr.meta_video_id; }

  const storage = db.storage.from(CREATIVE_BUCKET);
  const result = await executeDraft({
    accountId: draft.account_id, name: draft.name, idempotencyKey: draft.idempotency_key, config: c, currency: review.summary ? (await currencyOf(db, draft.account_id)) : 'USD',
    destination, existing: reuse, writer,
    media: cr.kind === 'video'
      ? { kind: 'video', signedUrl: async () => { const { data } = await storage.createSignedUrl(cr.storage_path, 3600); if (!data?.signedUrl) throw new Error('could not sign creative URL'); return data.signedUrl; } }
      : { kind: 'image', bytesBase64: async () => { const { data, error } = await storage.download(cr.storage_path); if (error || !data) throw new Error('could not read creative'); return Buffer.from(await data.arrayBuffer()).toString('base64'); } },
    thumbnailUrl: null,
    store: { saveObjects: async (patch) => { const cur = (await db.from('meta_ad_drafts').select('created_objects').eq('id', draftId).maybeSingle()).data?.created_objects ?? {}; await db.from('meta_ad_drafts').update({ created_objects: { ...cur, ...patch } }).eq('id', draftId); } },
  });

  // Remember media uploaded to this account so the library can reuse it.
  if (result.objects.image_hash || result.objects.video_id) await db.from('meta_creatives').update({ meta_account_id: draft.account_id, meta_image_hash: result.objects.image_hash ?? cr.meta_image_hash ?? null, meta_video_id: result.objects.video_id ?? cr.meta_video_id ?? null }).eq('id', draft.creative_id);

  if (result.status === 'created_paused') {
    await db.from('meta_ad_drafts').update({ status: 'created_paused', created_objects: result.objects, last_error_class: null, last_error_message: null, meta_effective_status: result.adStatus?.effective_status ?? null, meta_review_feedback: result.adStatus?.review_feedback ?? null, meta_status_checked_at: new Date().toISOString() }).eq('id', draftId);
    await logActivity(db, { actor_id: actorId, action: 'draft.created_paused', target_type: 'draft', target_id: draftId, account_id: draft.account_id, after: result.objects, provider_result: { effective_status: result.adStatus?.effective_status ?? null } });
    return { ok: true, status: 'created_paused', message: 'Created in Meta as PAUSED. Nothing is delivering.', objects: result.objects };
  }
  await db.from('meta_ad_drafts').update({ status: result.status, created_objects: result.objects, last_error_class: result.failure.kind, last_error_message: redactSecrets(result.message) }).eq('id', draftId);
  await logActivity(db, { actor_id: actorId, action: `draft.${result.status}`, target_type: 'draft', target_id: draftId, account_id: draft.account_id, after: result.objects, detail: { failed_step: result.failedStep, class: result.failure.kind } });
  return { ok: false, status: result.status, message: `Stopped at "${result.failedStep}": ${redactSecrets(result.message)}. Objects already created remain in Meta (paused) and a retry will resume.`, objects: result.objects };
}

async function currencyOf(db: SupabaseClient, accountId: string) { return (await db.from('meta_ad_accounts').select('currency').eq('id', accountId).maybeSingle()).data?.currency ?? 'USD'; }
async function finish(db: SupabaseClient, d: DraftRow, actorId: string | null, o: CreateOutcome): Promise<CreateOutcome> {
  await db.from('meta_ad_drafts').update({ status: 'failed', last_error_message: o.message }).eq('id', d.id);
  await logActivity(db, { actor_id: actorId, action: 'draft.failed', target_type: 'draft', target_id: d.id, account_id: d.account_id, detail: { message: o.message } });
  return o;
}

/** Re-reads what Meta says about a created ad. Never infers "approved" or "delivering". */
export async function refreshDraftStatus(db: SupabaseClient, draftId: string): Promise<{ ok: boolean; message: string }> {
  const { data: d } = await db.from('meta_ad_drafts').select('created_objects').eq('id', draftId).maybeSingle();
  const adId = (d?.created_objects as CreatedObjects | undefined)?.ad_id;
  const writer = writerOrNull();
  if (!adId) return { ok: false, message: 'No ad has been created for this draft yet.' };
  if (!writer) return { ok: false, message: 'Setup required: META_ADS_WRITE_TOKEN is not set (it is also used to read ad status).' };
  const r = await writer.get<{ status?: string; effective_status?: string; ad_review_feedback?: unknown }>(adId, { fields: 'status,effective_status,ad_review_feedback' });
  if (!r.ok) return { ok: false, message: redactSecrets(r.failure.message) };
  await db.from('meta_ad_drafts').update({ meta_effective_status: r.data.effective_status ?? r.data.status ?? null, meta_review_feedback: r.data.ad_review_feedback ?? null, meta_status_checked_at: new Date().toISOString() }).eq('id', draftId);
  return { ok: true, message: `Meta reports: ${r.data.effective_status ?? r.data.status ?? 'unknown'}.` };
}

export const newIdempotencyKey = () => randomUUID();
