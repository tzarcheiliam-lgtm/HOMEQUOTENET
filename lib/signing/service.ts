/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { canManageSigning, isHqnAdministrator } from '@/lib/permissions';
import { SIGNING_BUCKET } from '@/lib/signing/constants';
import { ownerKey, loadVersionForActor, type VersionRow } from '@/lib/signing/access';
import { detectFields } from '@/lib/signing/detect';
import { inviteEmail, voidedEmail } from '@/lib/signing/email';
import { SigningError, messageFor } from '@/lib/signing/errors';
import { finalizeVersion } from '@/lib/signing/finalize';
import { inspectPdf, PdfRejected } from '@/lib/signing/pdf-validate';
import { draftSchema, type DraftInput } from '@/lib/signing/schemas';
import { downloadObject, downloadVerified, removeObject, signedUrl } from '@/lib/signing/storage';
import { generateToken, hashToken } from '@/lib/signing/tokens';
import type { Profile } from '@/lib/types';

const errText = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 300);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireManager(actor: Profile) {
  if (!canManageSigning(actor)) throw new SigningError('forbidden', messageFor('forbidden'));
}
async function log(versionId: string, type: string, actor: Profile | null, meta: Record<string, unknown> = {}, recipientId: string | null = null) {
  await createAdminClient().rpc('signing_log_event', { p_version: versionId, p_recipient: recipientId, p_type: type, p_actor: actor?.id ?? null, p_ip: null, p_ua: null, p_meta: meta });
}
function unwrap(res: { data: any; error: { message: string } | null }) {
  if (res.error) {
    const m = /signing:(\w+)/.exec(res.error.message);
    throw new SigningError(m?.[1] ?? 'server', messageFor(m?.[1] ?? 'server'));
  }
  if (res.data && res.data.ok === false) throw new SigningError(res.data.error, messageFor(res.data.error), res.data);
  return res.data;
}

// ---------------------------------------------------------------------------
// Upload -> document + draft version + suggested fields
// ---------------------------------------------------------------------------
export async function prepareUpload(actor: Profile, requestedContractorId: string | null) {
  requireManager(actor);
  const contractorId = isHqnAdministrator(actor) ? requestedContractorId : actor.contractor_id;
  if (contractorId && !UUID.test(contractorId)) throw new SigningError('bad_request', 'Invalid company.');
  const docId = randomUUID(), versionId = randomUUID();
  const path = `${ownerKey(contractorId)}/${docId}/${versionId}.pdf`;
  const { data, error } = await createAdminClient().storage.from(SIGNING_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new SigningError('storage', 'Could not start the upload.');
  return { docId, versionId, path, token: data.token, contractorId };
}

export async function registerUpload(actor: Profile, input: { docId: string; versionId: string; contractorId: string | null; title: string; leadId: string | null }) {
  requireManager(actor);
  const contractorId = isHqnAdministrator(actor) ? input.contractorId : actor.contractor_id;
  if (!UUID.test(input.docId) || !UUID.test(input.versionId)) throw new SigningError('bad_request', 'Invalid upload.');
  const path = `${ownerKey(contractorId)}/${input.docId}/${input.versionId}.pdf`;
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new SigningError('bad_request', 'Give the document a title.');
  const admin = createAdminClient();

  if (input.leadId) {
    // RLS-scoped lookup: a contractor can only attach leads they can already see.
    const supabase = await createClient();
    const { data: lead } = await supabase.from('leads').select('id').eq('id', input.leadId).maybeSingle();
    if (!lead) throw new SigningError('forbidden', 'That lead is not available to you.');
  }
  if (contractorId) {
    const { data: c } = await admin.from('contractors').select('id').eq('id', contractorId).maybeSingle();
    if (!c) throw new SigningError('bad_request', 'Unknown company.');
  }

  let bytes: Uint8Array;
  try { bytes = await downloadObject(path); } catch { throw new SigningError('bad_request', 'The upload did not arrive. Please try again.'); }
  let inspected;
  try {
    inspected = await inspectPdf(bytes);
  } catch (e) {
    await removeObject(path);
    if (e instanceof PdfRejected) throw new SigningError(e.code, e.message);
    throw new SigningError('unreadable', 'This PDF could not be read.');
  }
  const detection = await detectFields(bytes, inspected.geoms).catch(() => null);

  const ins = await admin.from('signing_documents').insert({ id: input.docId, contractor_id: contractorId, lead_id: input.leadId, title, created_by: actor.id });
  if (ins.error) { await removeObject(path); throw new SigningError('server', 'The document could not be created.'); }
  const vIns = await admin.from('signing_versions').insert({
    id: input.versionId, document_id: input.docId, version_no: 1, original_path: path, original_sha256: inspected.sha256, original_size: inspected.size,
    page_count: inspected.pageCount, pages: inspected.pages, detection: detection?.info ?? { methods: [], notes: ['Automatic detection was unavailable; place fields manually.'], processing: 'local' },
    created_by: actor.id,
  });
  if (vIns.error) { await admin.from('signing_documents').delete().eq('id', input.docId); await removeObject(path); throw new SigningError('server', 'The document could not be created.'); }
  if (detection?.fields.length) {
    const rows = detection.fields.map((f, i) => ({
      version_id: input.versionId, recipient_id: null, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required,
      label: f.label, group_key: f.group_key, source: f.source, confidence: f.confidence, needs_review: f.needs_review, role_hint: f.role_hint,
      detection_note: f.detection_note, source_ref: f.source_ref, sort_order: i,
    }));
    await admin.from('signing_fields').insert(rows);
  }
  await admin.from('signing_documents').update({ current_version_id: input.versionId }).eq('id', input.docId);
  await log(input.versionId, 'version_created', actor, { version_no: 1, original_sha256: inspected.sha256, pages: inspected.pageCount });
  return { documentId: input.docId, versionId: input.versionId, suggested: detection?.fields.length ?? 0 };
}

// ---------------------------------------------------------------------------
// Editor data + saving
// ---------------------------------------------------------------------------
export async function getEditorBundle(actor: Profile, versionId: string) {
  const { version, doc } = await loadVersionForActor(actor, versionId);
  const admin = createAdminClient();
  const [recs, fields, events, vals] = await Promise.all([
    admin.from('signing_recipients').select('id,name,email,order_index,status,invited_at,last_sent_at,send_count,last_email_status,last_email_error,last_reminded_at,first_viewed_at,consent_at,signed_at,declined_at,decline_reason').eq('version_id', versionId).order('order_index'),
    admin.from('signing_fields').select('*').eq('version_id', versionId).order('sort_order'),
    admin.from('signing_events').select('id,recipient_id,event_type,ip,metadata,created_at,actor_user_id').eq('version_id', versionId).order('id'),
    admin.from('signing_field_values').select('field_id,recipient_id,value,sig_method,typed_text').eq('version_id', versionId),
  ]);
  const { data: siblings } = await admin.from('signing_versions').select('id,version_no,status,created_at').eq('document_id', doc.id).order('version_no', { ascending: false });
  let lead: { id: string; name: string } | null = null;
  if (doc.lead_id) {
    const { data: l } = await admin.from('leads').select('id,first_name,last_name').eq('id', doc.lead_id).maybeSingle();
    if (l) lead = { id: l.id, name: [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead' };
  }
  let contractorName: string | null = null;
  if (doc.contractor_id) contractorName = (await admin.from('contractors').select('name').eq('id', doc.contractor_id).maybeSingle()).data?.name ?? null;
  const expiredNow = ['awaiting_signature', 'partially_signed'].includes(version.status) && version.expires_at && new Date(version.expires_at) <= new Date();
  return {
    document: doc, version: { ...version, status: expiredNow ? 'expired' : version.status }, recipients: recs.data ?? [], fields: fields.data ?? [],
    events: events.data ?? [], values: vals.data ?? [], versions: siblings ?? [], lead, contractorName,
  };
}

export async function saveDraft(actor: Profile, versionId: string, raw: unknown) {
  const { version } = await loadVersionForActor(actor, versionId);
  if (version.status !== 'draft') throw new SigningError('locked', messageFor('locked'));
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) throw new SigningError('bad_request', 'Some values are invalid: ' + parsed.error.issues.slice(0, 2).map((i) => i.path.join('.') + ' ' + i.message).join('; '));
  const d: DraftInput = parsed.data;
  for (const f of d.fields) if (f.page > version.page_count) throw new SigningError('bad_request', 'A field is on a page that does not exist.');
  const res = await createAdminClient().rpc('signing_save_draft', {
    p_version: versionId, p_subject: d.subject, p_message: d.message, p_order: d.signing_order, p_expiry_days: d.expiry_days,
    p_recipients: d.recipients, p_fields: d.fields,
  });
  unwrap(res);
}

export async function markReviewed(actor: Profile, versionId: string) {
  await loadVersionForActor(actor, versionId);
  unwrap(await createAdminClient().rpc('signing_mark_reviewed', { p_version: versionId, p_actor: actor.id }));
}

export async function deleteDraft(actor: Profile, versionId: string) {
  const { version, doc } = await loadVersionForActor(actor, versionId);
  if (version.status !== 'draft') throw new SigningError('locked', messageFor('locked'));
  const admin = createAdminClient();
  const { count } = await admin.from('signing_versions').select('id', { count: 'exact', head: true }).eq('document_id', doc.id);
  await admin.from('signing_documents').update({ current_version_id: null }).eq('id', doc.id);
  const del = await admin.from('signing_versions').delete().eq('id', versionId);
  if (del.error) throw new SigningError('server', 'Could not delete the draft.');
  if ((count ?? 0) <= 1) await admin.from('signing_documents').delete().eq('id', doc.id);
  else {
    const { data: prev } = await admin.from('signing_versions').select('id').eq('document_id', doc.id).order('version_no', { ascending: false }).limit(1).maybeSingle();
    await admin.from('signing_documents').update({ current_version_id: prev?.id ?? null }).eq('id', doc.id);
  }
  // keep the stored file only if another version still references it
  const { count: refs } = await admin.from('signing_versions').select('id', { count: 'exact', head: true }).eq('original_path', version.original_path);
  if (!refs) await removeObject(version.original_path);
}

// ---------------------------------------------------------------------------
// Sending, reminders, voiding
// ---------------------------------------------------------------------------
export interface InviteResult { recipientId: string; name: string; email: string; sent: boolean; error?: string }

async function inviteRecipient(version: VersionRow, title: string, recipient: { id: string; name: string; email: string }, kind: 'invited' | 'reminded', actor: Profile | null): Promise<InviteResult> {
  const admin = createAdminClient();
  const token = generateToken();
  const issued = await admin.rpc('signing_issue_token', { p_recipient: recipient.id, p_token_hash: hashToken(token) });
  if (issued.error || !issued.data?.ok) return { recipientId: recipient.id, name: recipient.name, email: recipient.email, sent: false, error: messageFor(issued.data?.error ?? 'server') };
  try {
    const m = inviteEmail({ recipientName: recipient.name, senderName: version.sender_name, business: version.sender_business_name, documentTitle: title, message: version.message, expiresAt: new Date(issued.data.expires_at), token, reminder: kind === 'reminded', subject: version.subject, senderEmail: version.sender_email });
    await sendGmailMessage({ toEmail: recipient.email, subject: m.subject, message: m.message, html: m.html, text: m.text, replyTo: version.sender_email ?? undefined });
    const { data: cur } = await admin.from('signing_recipients').select('send_count').eq('id', recipient.id).single();
    await admin.from('signing_recipients').update({ last_sent_at: new Date().toISOString(), send_count: (cur?.send_count ?? 0) + 1, last_email_status: 'sent', last_email_error: null, ...(kind === 'reminded' ? { last_reminded_at: new Date().toISOString() } : {}) }).eq('id', recipient.id);
    await log(version.id, kind === 'reminded' ? 'reminded' : 'invited', actor, {}, recipient.id);
    return { recipientId: recipient.id, name: recipient.name, email: recipient.email, sent: true };
  } catch (e) {
    const error = errText(e);
    await admin.from('signing_recipients').update({ last_email_status: 'failed', last_email_error: error }).eq('id', recipient.id);
    await log(version.id, 'invite_failed', actor, { error }, recipient.id).catch(() => undefined);
    return { recipientId: recipient.id, name: recipient.name, email: recipient.email, sent: false, error };
  }
}

export async function sendForSignature(actor: Profile, versionId: string): Promise<InviteResult[]> {
  const { version, doc } = await loadVersionForActor(actor, versionId);
  const admin = createAdminClient();
  let business: string | null = 'HomeQuote Network';
  if (doc.contractor_id) business = (await admin.from('contractors').select('name').eq('id', doc.contractor_id).maybeSingle()).data?.name ?? null;
  unwrap(await admin.rpc('signing_send', { p_version: versionId, p_actor: actor.id, p_sender_name: actor.full_name ?? actor.email, p_sender_email: actor.email, p_business: business }));
  const { data: fresh } = await admin.from('signing_versions').select('*').eq('id', versionId).single();
  const { data: recs } = await admin.from('signing_recipients').select('id,name,email,order_index').eq('version_id', versionId).order('order_index');
  const targets = version.signing_order === 'sequential' ? (recs ?? []).slice(0, 1) : (recs ?? []);
  const results: InviteResult[] = [];
  for (const r of targets) results.push(await inviteRecipient(fresh as VersionRow, doc.title, r, 'invited', actor));
  return results;
}

async function activeRecipient(actor: Profile, versionId: string, recipientId: string) {
  const { version, doc } = await loadVersionForActor(actor, versionId);
  if (!['awaiting_signature', 'partially_signed'].includes(version.status)) throw new SigningError('not_open', messageFor('not_open'));
  if (version.expires_at && new Date(version.expires_at) <= new Date()) throw new SigningError('expired', 'This request has expired. Create a new version to send it again.');
  const { data: r } = await createAdminClient().from('signing_recipients').select('id,name,email,status').eq('id', recipientId).eq('version_id', versionId).maybeSingle();
  if (!r) throw new SigningError('not_found', 'not found');
  if (r.status === 'signed') throw new SigningError('not_open', 'This signer has already signed.');
  return { version, doc, r };
}

/** Re-sends the invitation with a FRESH link (the previous link stops working). */
export async function resendInvitation(actor: Profile, versionId: string, recipientId: string) {
  const { version, doc, r } = await activeRecipient(actor, versionId, recipientId);
  return inviteRecipient(version, doc.title, r, 'invited', actor);
}
export async function remindRecipient(actor: Profile, versionId: string, recipientId: string) {
  const { version, doc, r } = await activeRecipient(actor, versionId, recipientId);
  return inviteRecipient(version, doc.title, r, 'reminded', actor);
}

export async function voidRequest(actor: Profile, versionId: string, reason: string) {
  const { version, doc } = await loadVersionForActor(actor, versionId);
  const admin = createAdminClient();
  const { data: before } = await admin.from('signing_recipients').select('id,name,email,status,invited_at').eq('version_id', versionId);
  unwrap(await admin.rpc('signing_void', { p_version: versionId, p_actor: actor.id, p_reason: reason.slice(0, 500) }));
  for (const r of before ?? []) {
    if (r.status === 'signed' || !r.invited_at) continue;
    try {
      const m = voidedEmail({ recipientName: r.name, documentTitle: doc.title, business: version.sender_business_name });
      await sendGmailMessage({ toEmail: r.email, subject: m.subject, message: m.message, html: m.html, text: m.text, replyTo: version.sender_email ?? undefined });
    } catch { /* the link is already dead; the notice is a courtesy */ }
  }
}

export async function createNewVersion(actor: Profile, versionId: string) {
  await loadVersionForActor(actor, versionId);
  const r = unwrap(await createAdminClient().rpc('signing_new_version', { p_version: versionId, p_actor: actor.id }));
  return { versionId: r.version_id as string, versionNo: r.version_no as number };
}

// ---------------------------------------------------------------------------
// Downloads (authorized senders)
// ---------------------------------------------------------------------------
export async function senderFileUrl(actor: Profile, versionId: string, kind: 'original' | 'final' | 'certificate') {
  const { version, doc } = await loadVersionForActor(actor, versionId);
  const safeTitle = doc.title.replace(/[^\w .()-]+/g, '_').slice(0, 80) || 'document';
  if (kind === 'original') {
    // Original is returned unmodified, integrity-checked.
    await downloadVerified(version.original_path, version.original_sha256);
    return signedUrl(version.original_path, 60, `${safeTitle}.pdf`);
  }
  const path = kind === 'final' ? version.final_path : version.certificate_path;
  const sha = kind === 'final' ? version.final_sha256 : version.certificate_sha256;
  if (!path || !sha) throw new SigningError('not_ready', 'The completed file is not ready yet.');
  await downloadVerified(path, sha);
  await log(versionId, 'downloaded', actor, { kind });
  return signedUrl(path, 60, kind === 'final' ? `${safeTitle} - signed.pdf` : `${safeTitle} - certificate.pdf`);
}

/** For the preview/editor viewer (original only, short-lived). */
export async function previewUrl(actor: Profile, versionId: string) {
  const { version } = await loadVersionForActor(actor, versionId);
  return signedUrl(version.original_path, 600);
}

export async function retryFinalize(actor: Profile, versionId: string) {
  await loadVersionForActor(actor, versionId);
  return finalizeVersion(versionId);
}

/** Scheduler hook: expire overdue requests and retry stuck finalizations. Never throws. */
export async function signingMaintenance() {
  const admin = createAdminClient();
  const out = { expired: 0, finalized: 0 };
  try {
    const r = await admin.rpc('signing_expire_due');
    out.expired = typeof r.data === 'number' ? r.data : 0;
    const { data: stuck } = await admin.from('signing_versions').select('id').eq('status', 'completed').is('final_sha256', null).limit(5);
    for (const s of stuck ?? []) if ((await finalizeVersion(s.id)).status === 'finalized') out.finalized++;
  } catch { /* maintenance is best-effort */ }
  return out;
}
