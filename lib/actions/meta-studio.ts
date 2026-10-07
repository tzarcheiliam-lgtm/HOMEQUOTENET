'use server';

import { revalidatePath } from 'next/cache';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import {
  admin, accountGate, discoverAssets, loadStudioSettings, logActivity, proposalStore, readOptions, syncObjectState, writerOrNull,
} from '@/lib/meta/studio/server';
import { applyProposal, type ProposalRow } from '@/lib/meta/studio/proposals';
import { CREATIVE_BUCKET, confirmDraft, createPausedObjects, newIdempotencyKey, refreshDraftStatus, reviewDraft, voidConfirmationOnEdit, type DraftRow } from '@/lib/meta/studio/drafts.server';
import { draftConfigSchema } from '@/lib/meta/studio/draft';
import { cleanCreativeName, cleanTags, reconcileDeclared, validateCreative } from '@/lib/meta/studio/creative-specs';
import { probeImage, probeVideoParts } from '@/lib/meta/studio/media-probe';
import { runAndStoreAudit, proposalFromFinding } from '@/lib/meta/studio/audits.server';
import { findRuleConflicts, validateRuleDef, type RuleDef } from '@/lib/meta/studio/rules-engine';
import { runRulesTick } from '@/lib/meta/studio/rules.server';
import { redactSecrets } from '@/lib/meta/marketing-api';

export type StudioState = { error?: string; success?: string; id?: string; data?: unknown } | undefined;

const ENABLE_WRITES = 'ENABLE META WRITES';
const START_AUTOMATION = 'START AUTOMATION';
const ENABLE_AUTO_RULE = 'ENABLE AUTO';
const str = (fd: FormData, k: string) => { const v = fd.get(k); const s = v === null ? '' : String(v).trim(); return s === '' ? null : s; };
const uuid = z.string().uuid();
const touch = () => { for (const p of ['', '/creatives', '/create', '/audits', '/rules', '/settings']) revalidatePath(`/app/meta-ads${p}`); };

// ---- switches + settings ---------------------------------------------------------------------------------------
/** Master write switch. Turning ON needs a typed confirmation; turning OFF is always immediate. */
export async function setLiveWrites(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const on = fd.get('enabled') === 'on';
  if (on && str(fd, 'confirm') !== ENABLE_WRITES) return { error: `Type ${ENABLE_WRITES} to confirm that HQN may create and change objects in Meta.` };
  if (on && !process.env.META_ADS_WRITE_TOKEN) return { error: 'Setup required: META_ADS_WRITE_TOKEN is not set on the server.' };
  const db = admin();
  await db.from('meta_studio_settings').update({ live_writes_enabled: on, updated_at: new Date().toISOString(), updated_by: me.id }).eq('id', true);
  await logActivity(db, { actor_id: me.id, action: on ? 'writes.enabled' : 'writes.disabled' });
  touch();
  return { success: on ? 'Live writes are ON. Each ad account still needs its own switch.' : 'Live writes are OFF. Nothing in HQN can change Meta.' };
}

/** Global automation stop. This stops HQN's automatic actions only; it never pauses ads already running in Meta. */
export async function setAutomation(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const on = fd.get('enabled') === 'on';
  if (on && str(fd, 'confirm') !== START_AUTOMATION) return { error: `Type ${START_AUTOMATION} to release the global automation stop.` };
  const db = admin();
  await db.from('meta_studio_settings').update({ automation_enabled: on, updated_at: new Date().toISOString(), updated_by: me.id }).eq('id', true);
  await logActivity(db, { actor_id: me.id, action: on ? 'automation.started' : 'automation.stopped', detail: { note: 'Stopping HQN automation does not pause ads running in Meta.' } });
  touch();
  return { success: on ? 'Global automation stop released. Rules still need per-account and per-rule enablement.' : 'HQN automation is STOPPED. Ads already running in Meta are not affected.' };
}

export async function saveAccountControls(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const accountId = str(fd, 'account_id');
  if (!accountId || !/^act_[0-9]+$/.test(accountId)) return { error: 'Invalid ad account.' };
  const db = admin();
  const { error } = await db.from('meta_account_controls').upsert({
    account_id: accountId, writes_enabled: fd.get('writes_enabled') === 'on', automation_enabled: fd.get('automation_enabled') === 'on',
    note: str(fd, 'note')?.slice(0, 300) ?? null, updated_at: new Date().toISOString(), updated_by: me.id,
  }, { onConflict: 'account_id' });
  if (error) return { error: 'Could not save. Has this account been imported by a sync?' };
  await logActivity(db, { actor_id: me.id, action: 'account.controls', target_type: 'account', target_id: accountId, account_id: accountId, after: { writes: fd.get('writes_enabled') === 'on', automation: fd.get('automation_enabled') === 'on' } });
  touch();
  return { success: 'Saved.' };
}

const thresholdsSchema = z.object({
  max_data_age_hours: z.coerce.number().min(1).max(168).optional(),
  min_attribution_coverage_pct: z.coerce.number().min(0).max(100).optional(),
  min_spend_for_judgement: z.coerce.number().min(0).max(1_000_000).optional(),
  target_cost_per_lead: z.coerce.number().min(0).max(100_000).optional(),
  min_qualified_rate_pct: z.coerce.number().min(0).max(100).optional(),
  min_leads_for_comparison: z.coerce.number().int().min(1).max(10_000).optional(),
  min_ads_per_adset: z.coerce.number().int().min(1).max(50).optional(),
  max_top_campaign_spend_share_pct: z.coerce.number().min(1).max(100).optional(),
  lead_maturity_days: z.coerce.number().int().min(0).max(60).optional(),
});
export async function saveThresholds(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const raw: Record<string, string> = {};
  for (const k of Object.keys(thresholdsSchema.shape)) { const v = str(fd, k); if (v != null) raw[k] = v; }
  const parsed = thresholdsSchema.safeParse(raw);
  if (!parsed.success) return { error: 'One of the thresholds is out of range.' };
  const db = admin();
  const cur = await loadStudioSettings(db);
  // Preserve the tracking verification stamp stored alongside the thresholds.
  const keep = (cur.thresholds as { tracking_verified_at?: string }).tracking_verified_at;
  await db.from('meta_studio_settings').update({ audit_thresholds: { ...parsed.data, ...(keep ? { tracking_verified_at: keep } : {}) }, updated_by: me.id, updated_at: new Date().toISOString() }).eq('id', true);
  await logActivity(db, { actor_id: me.id, action: 'thresholds.saved', after: parsed.data });
  touch();
  return { success: 'Saved. Blank fields mean "not set": the related checks stay Not assessed.' };
}

export async function verifyTracking(): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  const cur = await loadStudioSettings(db);
  await db.from('meta_studio_settings').update({ audit_thresholds: { ...cur.thresholds, tracking_verified_at: new Date().toISOString() }, updated_by: me.id }).eq('id', true);
  await logActivity(db, { actor_id: me.id, action: 'tracking.verified' });
  touch();
  return { success: 'Recorded. Rules that depend on conversion data may run for the next 30 days while delivery stays healthy.' };
}

export async function runDiscovery(): Promise<StudioState> {
  await requireRole(['admin']);
  const g = readOptions();
  if (!g) return { error: 'Setup required: META_MARKETING_ACCESS_TOKEN is not set on the server.' };
  const db = admin();
  const r = await discoverAssets(db, g);
  const s = await syncObjectState(db, g);
  touch();
  const errs = [...r.errors, ...s.errors];
  return { success: `Found ${r.pages} Page(s), ${r.instagram} Instagram account(s), ${r.datasets} dataset(s), ${r.leadForms} Instant Form(s); read live state for ${s.objects} object(s).${errs.length ? ` ${errs.length} problem(s): ${errs.slice(0, 3).join(' | ')}` : ''}` };
}

export async function mapAsset(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const id = uuid.safeParse(str(fd, 'asset_id'));
  const contractor = z.string().uuid().nullable().safeParse(str(fd, 'contractor_id'));
  if (!id.success || !contractor.success) return { error: 'Invalid asset or contractor.' };
  const db = admin();
  const { error } = await db.from('meta_assets').update({ contractor_id: contractor.data }).eq('id', id.data);
  if (error) return { error: 'Could not save the mapping.' };
  await logActivity(db, { actor_id: me.id, action: 'asset.mapped', target_type: 'asset', target_id: id.data, after: { contractor_id: contractor.data } });
  touch();
  return { success: 'Saved.' };
}

// ---- creatives -----------------------------------------------------------------------------------------------------------
const extFor = (mime: string) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/quicktime': 'mov' } as Record<string, string>)[mime] ?? 'bin';
const MAX_SIGNED_UPLOAD = 50 * 1024 * 1024 * 1024;

/** Step 1: register the upload and hand the browser a one-time signed URL. The server never trusts the declared facts. */
export async function startCreativeUpload(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const schema = z.object({
    name: z.string().min(1), kind: z.enum(['image', 'video']), mime: z.string().max(100), bytes: z.coerce.number().int().positive().max(MAX_SIGNED_UPLOAD),
    contractor_id: z.string().uuid().nullable(), campaign_label: z.string().max(120).nullable(), tags: z.string().max(400).nullable(), with_thumbnail: z.string().nullable(),
  });
  const p = schema.safeParse({ name: str(fd, 'name'), kind: str(fd, 'kind'), mime: str(fd, 'mime') ?? '', bytes: str(fd, 'bytes'), contractor_id: str(fd, 'contractor_id'), campaign_label: str(fd, 'campaign_label'), tags: str(fd, 'tags'), with_thumbnail: str(fd, 'with_thumbnail') });
  if (!p.success) return { error: 'Check the name, file and contractor.' };
  const v = p.data;
  const pre = validateCreative({ kind: v.kind, mime: v.mime, bytes: v.bytes, width: null, height: null, durationSeconds: v.kind === 'video' ? 1 : null });
  const early = pre.errors.filter((e) => ['image_type', 'video_type', 'image_size', 'video_size', 'empty'].includes(e.code));
  if (early.length) return { error: early.map((e) => e.message).join(' ') };
  const db = admin();
  const folder = `${v.contractor_id ?? 'network'}/${crypto.randomUUID()}`;
  const path = `${folder}/original.${extFor(v.mime)}`;
  const thumb = v.with_thumbnail ? `${folder}/thumb.jpg` : null;
  const { data: row, error } = await db.from('meta_creatives').insert({
    contractor_id: v.contractor_id, campaign_label: v.campaign_label, name: cleanCreativeName(v.name), tags: cleanTags((v.tags ?? '').split(',')), kind: v.kind, mime_type: v.mime, bytes: v.bytes,
    storage_path: path, thumbnail_path: thumb, status: 'uploaded', created_by: me.id, duration_seconds: v.kind === 'video' ? 0 : null,
  }).select('id').single();
  if (error || !row) return { error: 'Could not register the upload.' };
  const storage = db.storage.from(CREATIVE_BUCKET);
  const [main, th] = await Promise.all([storage.createSignedUploadUrl(path), thumb ? storage.createSignedUploadUrl(thumb) : Promise.resolve({ data: null, error: null })]);
  if (main.error || !main.data) { await db.from('meta_creatives').delete().eq('id', row.id); return { error: 'Setup required: the "meta-creatives" storage bucket is missing (apply migration 0043 to Supabase).' }; }
  return { id: row.id, data: { path, token: main.data.token, thumb: th.data ? { path: thumb, token: th.data.token } : null } };
}

/** Step 2: after the browser finished uploading, inspect the REAL bytes and validate. The original is never modified. */
export async function finalizeCreativeUpload(creativeId: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  if (!uuid.safeParse(creativeId).success) return { error: 'Invalid creative.' };
  const db = admin();
  const { data: c } = await db.from('meta_creatives').select('*').eq('id', creativeId).maybeSingle();
  if (!c || c.status === 'ready') return { error: 'Creative not found or already finalized.' };
  await db.from('meta_creatives').update({ status: 'processing' }).eq('id', creativeId);
  const storage = db.storage.from(CREATIVE_BUCKET);
  const signed = await storage.createSignedUrl(c.storage_path, 600);
  if (!signed.data?.signedUrl) { await db.from('meta_creatives').update({ status: 'rejected', validation: { errors: [{ code: 'missing', message: 'The file did not arrive in storage.' }], warnings: [] } }).eq('id', creativeId); return { error: 'The upload did not complete.' }; }
  const range = async (r: string) => { const res = await fetch(signed.data!.signedUrl, { headers: { Range: r } }); return res.ok || res.status === 206 ? Buffer.from(await res.arrayBuffer()) : null; };
  let width: number | null = null, height: number | null = null, duration: number | null = null, probedMime: string | null = null, sha: string | null = null;
  if (c.kind === 'image') {
    const whole = await range('bytes=0-' + (31 * 1024 * 1024));
    const img = whole ? probeImage(whole) : null;
    if (img) { width = img.width; height = img.height; probedMime = img.mime; }
    if (whole && whole.length === Number(c.bytes)) sha = createHash('sha256').update(whole).digest('hex');
  } else {
    const head = await range('bytes=0-2097151');
    const tail = Number(c.bytes) > 2097152 ? await range('bytes=-2097152') : null;
    const vid = head ? probeVideoParts(head, tail) : null;
    if (vid) { width = vid.width; height = vid.height; duration = vid.durationSeconds; probedMime = vid.mime; }
  }
  const mismatch = reconcileDeclared({ mime: c.mime_type, width: null, height: null }, { mime: probedMime, width, height });
  const v = validateCreative({ kind: c.kind, mime: probedMime ?? c.mime_type, bytes: Number(c.bytes), width, height, durationSeconds: duration });
  const errors = [...mismatch.filter((m) => m.code !== 'dimension_mismatch'), ...v.errors];
  const status = errors.length ? 'rejected' : 'ready';
  const { error } = await db.from('meta_creatives').update({ status, width, height, duration_seconds: duration, sha256: sha, mime_type: probedMime ?? c.mime_type, validation: { errors, warnings: v.warnings } }).eq('id', creativeId);
  if (error) {
    // The only unique constraint that can fire here is the exact-duplicate check (same file already in the library).
    await db.from('meta_creatives').update({ status: 'rejected', sha256: null, validation: { errors: [{ code: 'duplicate', message: 'This exact file is already in the library for this contractor.' }], warnings: [] } }).eq('id', creativeId);
    return { error: 'This exact file is already in the library.' };
  }
  await logActivity(db, { actor_id: me.id, action: `creative.${status}`, target_type: 'creative', target_id: creativeId, detail: { errors: errors.map((e) => e.code), warnings: v.warnings.map((w) => w.code) } });
  touch();
  return status === 'ready' ? { success: v.warnings.length ? `Ready, with ${v.warnings.length} warning(s).` : 'Ready.', id: creativeId } : { error: errors.map((e) => e.message).join(' ') };
}

export async function updateCreative(_p: StudioState, fd: FormData): Promise<StudioState> {
  await requireRole(['admin']);
  const id = uuid.safeParse(str(fd, 'id'));
  if (!id.success) return { error: 'Invalid creative.' };
  const name = str(fd, 'name');
  if (!name) return { error: 'Name is required.' };
  await admin().from('meta_creatives').update({ name: cleanCreativeName(name), campaign_label: str(fd, 'campaign_label')?.slice(0, 120) ?? null, tags: cleanTags((str(fd, 'tags') ?? '').split(',')) }).eq('id', id.data);
  touch();
  return { success: 'Saved.' };
}

export async function deleteCreative(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const id = uuid.safeParse(str(fd, 'id'));
  if (!id.success) return { error: 'Invalid creative.' };
  const db = admin();
  const { count } = await db.from('meta_ad_drafts').select('id', { count: 'exact', head: true }).eq('creative_id', id.data);
  if (count) return { error: 'This creative is used by an ad draft and cannot be deleted.' };
  const { data: c } = await db.from('meta_creatives').select('storage_path, thumbnail_path').eq('id', id.data).maybeSingle();
  if (c) await db.storage.from(CREATIVE_BUCKET).remove([c.storage_path, ...(c.thumbnail_path ? [c.thumbnail_path] : [])]);
  await db.from('meta_creatives').delete().eq('id', id.data);
  await logActivity(db, { actor_id: me.id, action: 'creative.deleted', target_type: 'creative', target_id: id.data });
  touch();
  return { success: 'Deleted from HQN. Copies already uploaded to Meta are not removed.' };
}

// ---- ad drafts -------------------------------------------------------------------------------------------------------------
export async function saveDraft(input: { id?: string; name: string; contractor_id: string | null; account_id: string; creative_id: string | null; config: unknown }): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const meta = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(120), contractor_id: z.string().uuid().nullable(), account_id: z.string().regex(/^act_[0-9]+$/), creative_id: z.string().uuid().nullable() }).safeParse(input);
  const cfg = draftConfigSchema.safeParse(input.config);
  if (!meta.success) return { error: 'Check the ad name and account.' };
  if (!cfg.success) return { error: `Some settings are invalid: ${cfg.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` };
  const db = admin();
  const m = meta.data;
  if (m.id) {
    const { data: cur } = await db.from('meta_ad_drafts').select('status').eq('id', m.id).maybeSingle();
    if (!cur || ['creating', 'created_paused', 'partial'].includes(cur.status)) return { error: 'This draft has already been sent to Meta and can no longer be edited here.' };
    await db.from('meta_ad_drafts').update({ name: m.name, contractor_id: m.contractor_id, account_id: m.account_id, creative_id: m.creative_id, config: cfg.data }).eq('id', m.id);
    await voidConfirmationOnEdit(db, m.id);
    await logActivity(db, { actor_id: me.id, action: 'draft.saved', target_type: 'draft', target_id: m.id, account_id: m.account_id });
    touch();
    return { success: 'Draft saved. Any earlier confirmation was cleared.', id: m.id };
  }
  const { data, error } = await db.from('meta_ad_drafts').insert({ name: m.name, contractor_id: m.contractor_id, account_id: m.account_id, creative_id: m.creative_id, config: cfg.data, idempotency_key: newIdempotencyKey(), created_by: me.id }).select('id').single();
  if (error || !data) return { error: 'Could not save the draft. Has the ad account been imported?' };
  await logActivity(db, { actor_id: me.id, action: 'draft.created', target_type: 'draft', target_id: data.id, account_id: m.account_id });
  touch();
  return { success: 'Draft saved.', id: data.id };
}

async function loadDraft(id: string): Promise<DraftRow | null> {
  if (!uuid.safeParse(id).success) return null;
  const { data } = await admin().from('meta_ad_drafts').select('*').eq('id', id).maybeSingle();
  return (data as DraftRow) ?? null;
}

export async function confirmDraftAction(draftId: string, typed: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const d = await loadDraft(draftId);
  if (!d) return { error: 'Draft not found.' };
  if (typed.trim().toUpperCase() !== 'CONFIRM') return { error: 'Type CONFIRM to approve exactly what is shown.' };
  const r = await confirmDraft(admin(), d, me.id);
  touch();
  return r.ok ? { success: 'Confirmed. Nothing has been sent to Meta yet.' } : { error: r.error };
}

export async function createPausedAction(draftId: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const r = await createPausedObjects(admin(), draftId, me.id);
  touch();
  return r.ok ? { success: r.message } : { error: r.message };
}

export async function refreshDraftStatusAction(draftId: string): Promise<StudioState> {
  await requireRole(['admin']);
  const r = await refreshDraftStatus(admin(), draftId);
  touch();
  return r.ok ? { success: r.message } : { error: r.message };
}

export async function cancelDraft(draftId: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  const { data } = await db.from('meta_ad_drafts').update({ status: 'cancelled' }).eq('id', draftId).in('status', ['draft', 'ready', 'failed']).select('id');
  if (!data?.length) return { error: 'Only drafts that have not been created in Meta can be cancelled.' };
  await logActivity(db, { actor_id: me.id, action: 'draft.cancelled', target_type: 'draft', target_id: draftId });
  touch();
  return { success: 'Cancelled.' };
}

export async function reviewDraftAction(draftId: string) {
  await requireRole(['admin']);
  const d = await loadDraft(draftId);
  if (!d) return null;
  return reviewDraft(admin(), d);
}

// ---- audits + proposals ------------------------------------------------------------------------------------------------------
export async function runAuditAction(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const parsed = z.object({ account: z.string().regex(/^act_[0-9]+$/), since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ account: str(fd, 'account'), since: str(fd, 'since'), until: str(fd, 'until') });
  if (!parsed.success || parsed.data.since > parsed.data.until) return { error: 'Choose an ad account and a valid date range.' };
  const r = await runAndStoreAudit(admin(), parsed.data.account, { since: parsed.data.since, until: parsed.data.until }, me.id);
  touch();
  return 'error' in r ? { error: r.error } : { success: 'Audit complete.', id: r.id };
}

export async function proposeFromFindingAction(findingId: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const r = await proposalFromFinding(admin(), findingId, me.id);
  touch();
  return r.error ? { error: r.error } : { success: 'Proposal created. Review and approve it under Audits & Recommendations.', id: r.id };
}

export async function approveProposal(id: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  const { data } = await db.from('meta_change_proposals').update({ status: 'approved', approved_by: me.id, approved_at: new Date().toISOString() }).eq('id', id).eq('status', 'proposed').gt('expires_at', new Date().toISOString()).select('account_id');
  if (!data?.length) return { error: 'This proposal can no longer be approved (already decided, stale or expired).' };
  await logActivity(db, { actor_id: me.id, action: 'proposal.approved', target_type: 'proposal', target_id: id, account_id: data[0].account_id });
  touch();
  return { success: 'Approved. It has not been applied yet.' };
}

export async function rejectProposal(id: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  const { data } = await db.from('meta_change_proposals').update({ status: 'rejected' }).eq('id', id).in('status', ['proposed', 'approved']).select('account_id');
  if (!data?.length) return { error: 'Nothing to reject.' };
  await logActivity(db, { actor_id: me.id, action: 'proposal.rejected', target_type: 'proposal', target_id: id, account_id: data[0].account_id });
  touch();
  return { success: 'Rejected.' };
}

export async function applyProposalAction(id: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  const { data: p } = await db.from('meta_change_proposals').select('*').eq('id', id).maybeSingle();
  if (!p) return { error: 'Proposal not found.' };
  const gate = await accountGate(db, p.account_id);
  if (!gate.allowed) return { error: gate.reasons.join(' ') };
  const writer = writerOrNull();
  if (!writer) return { error: 'Setup required: META_ADS_WRITE_TOKEN is not set.' };
  const r = await applyProposal(p as ProposalRow, { writer, store: proposalStore(db, { id: me.id, kind: 'user' }) });
  touch();
  switch (r.outcome) {
    case 'applied': return { success: 'Applied in Meta. The previous values were saved; reversing is a new proposal that needs approval, and spend or delivery already caused cannot be undone.' };
    case 'stale': return { error: `Not applied: this changed in Meta after the proposal was made (${r.drift.map((d) => d.field).join(', ')}). Create a new proposal from the current state.` };
    case 'failed': return { error: `Meta did not apply it: ${redactSecrets(r.message)}` };
    case 'expired': return { error: 'This proposal expired.' };
    case 'not_approved': return { error: 'This change needs a person\'s approval first.' };
    case 'not_claimable': return { error: 'This proposal is already being applied or was already applied.' };
    default: return { error: 'Nothing to apply.' };
  }
}

// ---- rules ------------------------------------------------------------------------------------------------------------------------
const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  account_id: z.string().regex(/^act_[0-9]+$/),
  scope_type: z.enum(['account', 'campaign', 'adset']),
  scope_id: z.string().regex(/^[0-9]{5,25}$/).nullable(),
  mode: z.enum(['recommend', 'approval', 'auto']),
  action_type: z.enum(['notify', 'pause', 'budget_decrease', 'budget_increase']),
  metric: z.enum(['cost_per_meta_lead', 'cost_per_qualified_lead', 'spend_without_meta_leads', 'link_ctr']),
  op: z.enum(['gt', 'lt']),
  threshold: z.coerce.number().min(0).max(1_000_000),
  eval_window_days: z.coerce.number().int().min(1).max(30),
  min_spend: z.coerce.number().min(0),
  min_impressions: z.coerce.number().int().min(0),
  min_leads: z.coerce.number().int().min(0).optional(),
  max_data_age_hours: z.coerce.number().int().min(1).max(72),
  conversion_lag_days: z.coerce.number().int().min(0).max(28),
  cooldown_hours: z.coerce.number().int().min(1).max(720),
  max_adjust_pct: z.coerce.number().int().min(1).max(50).nullable(),
  max_changes_per_day: z.coerce.number().int().min(1).max(10),
  budget_floor: z.coerce.number().min(0).nullable(),
  budget_ceiling: z.coerce.number().min(0).nullable(),
  review_at: z.string().nullable(),
  expires_at: z.string().nullable(),
});

export async function saveRule(_p: StudioState, fd: FormData): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const num = (k: string) => { const v = str(fd, k); return v == null ? null : v; };
  const p = ruleSchema.safeParse({
    id: str(fd, 'id') ?? undefined, name: str(fd, 'name'), account_id: str(fd, 'account_id'), scope_type: str(fd, 'scope_type'), scope_id: str(fd, 'scope_id'), mode: str(fd, 'mode') ?? 'recommend',
    action_type: str(fd, 'action_type'), metric: str(fd, 'metric'), op: str(fd, 'op') ?? 'gt', threshold: str(fd, 'threshold'), eval_window_days: str(fd, 'eval_window_days') ?? '7',
    min_spend: str(fd, 'min_spend'), min_impressions: str(fd, 'min_impressions'), min_leads: num('min_leads') ?? undefined, max_data_age_hours: str(fd, 'max_data_age_hours') ?? '12',
    conversion_lag_days: str(fd, 'conversion_lag_days') ?? '2', cooldown_hours: str(fd, 'cooldown_hours') ?? '72', max_adjust_pct: num('max_adjust_pct'),
    max_changes_per_day: str(fd, 'max_changes_per_day') ?? '1', budget_floor: num('budget_floor'), budget_ceiling: num('budget_ceiling'), review_at: str(fd, 'review_at'), expires_at: str(fd, 'expires_at'),
  });
  if (!p.success) return { error: `Check the rule settings: ${p.error.issues.slice(0, 3).map((i) => i.path.join('.')).join(', ')}` };
  const v = p.data;
  const problems = validateRuleDef({ mode: v.mode, action_type: v.action_type, expires_at: v.expires_at, max_adjust_pct: v.max_adjust_pct, budget_ceiling: v.budget_ceiling, scope_type: v.scope_type, scope_id: v.scope_id, condition: { metric: v.metric, op: v.op, threshold: v.threshold }, min_evidence: { min_spend: v.min_spend, min_impressions: v.min_impressions } });
  if (problems.length) return { error: problems.join(' ') };
  const row = {
    name: v.name, account_id: v.account_id, scope_type: v.scope_type, scope_id: v.scope_id, mode: v.mode, action_type: v.action_type,
    condition: { metric: v.metric, op: v.op, threshold: v.threshold }, eval_window_days: v.eval_window_days,
    min_evidence: { min_spend: v.min_spend, min_impressions: v.min_impressions, ...(v.min_leads != null ? { min_leads: v.min_leads } : {}) },
    max_data_age_hours: v.max_data_age_hours, conversion_lag_days: v.conversion_lag_days, cooldown_hours: v.cooldown_hours, max_adjust_pct: v.max_adjust_pct,
    max_changes_per_day: v.max_changes_per_day, budget_floor: v.budget_floor, budget_ceiling: v.budget_ceiling, review_at: v.review_at, expires_at: v.expires_at,
  };
  const db = admin();
  if (v.id) await db.from('meta_rules').update(row).eq('id', v.id); // DB trigger bumps the version and disables the rule if its behaviour changed
  else { const { data, error } = await db.from('meta_rules').insert({ ...row, owner_id: me.id, enabled: false }).select('id').single(); if (error || !data) return { error: 'Could not save the rule.' }; await logActivity(db, { actor_id: me.id, action: 'rule.created', target_type: 'rule', target_id: data.id, account_id: v.account_id }); touch(); return { success: 'Rule saved. It is OFF until you enable it.', id: data.id }; }
  await logActivity(db, { actor_id: me.id, action: 'rule.updated', target_type: 'rule', target_id: v.id, account_id: v.account_id });
  touch();
  return { success: 'Saved. If its behaviour changed it was switched off; re-enable it deliberately.', id: v.id };
}

export async function setRuleEnabled(ruleId: string, enabled: boolean, typed?: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  const { data: r } = await db.from('meta_rules').select('*').eq('id', ruleId).maybeSingle();
  if (!r) return { error: 'Rule not found.' };
  if (!enabled) { await db.from('meta_rules').update({ enabled: false }).eq('id', ruleId); await logActivity(db, { actor_id: me.id, action: 'rule.disabled', target_type: 'rule', target_id: ruleId, account_id: r.account_id, version_ref: `rule@${r.version}` }); touch(); return { success: 'Rule disabled.' }; }
  if (r.expires_at && new Date(r.expires_at) <= new Date()) return { error: 'This rule has expired; extend its expiry date first.' };
  if (r.mode === 'auto' && (typed ?? '').trim() !== ENABLE_AUTO_RULE) return { error: `Type ${ENABLE_AUTO_RULE} to allow this rule to act without a per-change approval.` };
  const [{ data: others }, { data: adsets }] = await Promise.all([db.from('meta_rules').select('*').eq('enabled', true).eq('account_id', r.account_id), db.from('meta_adsets').select('id, campaign_id').eq('account_id', r.account_id)]);
  const conflicts = findRuleConflicts([...((others ?? []) as RuleDef[]).filter((o) => o.id !== r.id), { ...(r as RuleDef), enabled: true }], { adsetToCampaign: new Map(((adsets ?? []) as { id: string; campaign_id: string }[]).map((a) => [a.id, a.campaign_id])) }).filter((c) => c.a === r.id || c.b === r.id);
  if (conflicts.length) return { error: `Conflicts with another enabled rule: ${conflicts[0].reason} Disable or narrow one of them first.` };
  await db.from('meta_rules').update({ enabled: true }).eq('id', ruleId);
  await logActivity(db, { actor_id: me.id, action: 'rule.enabled', target_type: 'rule', target_id: ruleId, account_id: r.account_id, version_ref: `rule@${r.version}`, detail: { mode: r.mode } });
  touch();
  return { success: r.mode === 'auto' ? 'Enabled. It can act only while the global stop is released, the account switch is on, and data is fresh.' : 'Enabled.' };
}

export async function deleteRule(ruleId: string): Promise<StudioState> {
  const me = await requireRole(['admin']);
  const db = admin();
  await db.from('meta_rules').delete().eq('id', ruleId);
  await logActivity(db, { actor_id: me.id, action: 'rule.deleted', target_type: 'rule', target_id: ruleId });
  touch();
  return { success: 'Deleted.' };
}

/** Manual "evaluate now" - same code path as the scheduler, same gates. */
export async function evaluateRulesNow(): Promise<StudioState> {
  await requireRole(['admin']);
  const r = await runRulesTick(admin());
  touch();
  return r.skipped ? { success: `Nothing evaluated: ${r.skipped}.` } : { success: `Evaluated ${r.evaluated} rule(s): ${Object.entries(r.byOutcome).map(([k, n]) => `${n} ${k}`).join(', ') || 'none'}. ${r.proposals} proposal(s), ${r.applied} applied.` };
}
