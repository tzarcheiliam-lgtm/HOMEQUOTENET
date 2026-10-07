import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { CONSENT_TEXT_SHA256 } from '@/lib/signing/consent-hash';
import { AUTH_METHOD, AUTH_METHOD_CODE, CONSENT_TEXT, CONSENT_VERSION, IDENTITY_STATEMENT, IDENTITY_STATEMENT_CODE, type DateFormat } from '@/lib/signing/constants';
import { declinedEmail, inviteEmail, siteUrl } from '@/lib/signing/email';
import { SigningError, messageFor } from '@/lib/signing/errors';
import { finalizeVersion } from '@/lib/signing/finalize';
import { formatSigningDate, safeTimeZone } from '@/lib/signing/format';
import { inspectPngBase64, submitSchema } from '@/lib/signing/schemas';
import { textFits } from '@/lib/signing/stamp';
import { downloadVerified, signedUrl } from '@/lib/signing/storage';
import { generateToken, hashToken, looksLikeToken, safeEqualHex } from '@/lib/signing/tokens';
import { MAX_CODE_ATTEMPTS, normalizeCodeInput } from '@/lib/signing/access-code';
import type { VersionRow } from '@/lib/signing/access';

export interface RequestContext { ip: string | null; userAgent: string | null }
const errText = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 300);

type OpenState = 'ok' | 'signed' | 'declined' | 'voided' | 'expired' | 'invalid' | 'not_your_turn' | 'code_required';

/** Generic, content-free outcome for dead links. Reveals nothing about the document. */
async function describeDead(versionId: string | undefined) {
  if (!versionId) return {};
  const admin = createAdminClient();
  const { data: v } = await admin.from('signing_versions').select('document_id,sender_business_name,sender_name').eq('id', versionId).maybeSingle();
  if (!v) return {};
  const { data: d } = await admin.from('signing_documents').select('title').eq('id', v.document_id).maybeSingle();
  return { documentTitle: d?.title ?? null, sender: v.sender_business_name ?? v.sender_name ?? null };
}


/**
 * Access-code gate. When the request requires a code, every signer action must carry the session secret minted by
 * a successful code check (bound to this signing link, 4 h, hash-only in the database). A forwarded link alone is
 * therefore not enough. The database separately refuses to mark anyone signed without a verified code.
 */
async function accessGate(tokenHash: string, session: unknown) {
  const admin = createAdminClient();
  const { data: rec } = await admin.from('signing_recipients')
    .select('id,version_id,status,access_session_hash,access_session_expires_at,access_code_hash,access_code_attempts,access_code_locked_at').eq('token_hash', tokenHash).maybeSingle();
  if (!rec) return null;
  const { data: v } = await admin.from('signing_versions').select('require_access_code').eq('id', rec.version_id).single();
  const required = !!v?.require_access_code;
  const sessionOk = !required || (looksLikeToken(session) && !!rec.access_session_hash && safeEqualHex(hashToken(session), rec.access_session_hash)
    && !!rec.access_session_expires_at && new Date(rec.access_session_expires_at) > new Date());
  return { rec, required, sessionOk, locked: !!rec.access_code_locked_at, hasCode: !!rec.access_code_hash, remaining: Math.max(0, MAX_CODE_ATTEMPTS - (rec.access_code_attempts ?? 0)) };
}
async function requireAccess(tokenHash: string, session: unknown) {
  const g = await accessGate(tokenHash, session);
  if (g && g.required && !g.sessionOk) throw new SigningError('code_required', messageFor('code_required'));
}

/** Checks the access code. On success returns the session secret the page must send with later actions. */
export async function signerVerifyCode(token: unknown, code: unknown, ctx: RequestContext): Promise<{ session: string | null }> {
  if (!looksLikeToken(token)) throw new SigningError('invalid', messageFor('invalid'));
  const normalized = normalizeCodeInput(code);
  // Not a 6-digit code: tell the signer without costing them an attempt.
  if (!normalized) throw new SigningError('bad_code_format', 'Enter the 6-digit code.');
  const session = generateToken();
  const { data, error } = await createAdminClient().rpc('signing_verify_code', { p_token_hash: hashToken(token), p_code: normalized, p_session_hash: hashToken(session), p_ip: ctx.ip, p_ua: ctx.userAgent });
  if (error) throw new SigningError('server', 'Please try again in a moment.');
  if (!data?.ok) throw new SigningError(data?.error ?? 'server', messageFor(data?.error ?? 'server'), { remaining: data?.remaining });
  return { session: data.not_required ? null : session };
}

export async function signerOpen(token: unknown, ctx: RequestContext, session?: unknown) {
  if (!looksLikeToken(token)) return { state: 'invalid' as OpenState };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('signing_open', { p_token_hash: hashToken(token), p_ip: ctx.ip, p_ua: ctx.userAgent });
  if (error) throw new SigningError('server', 'Please try again in a moment.');
  const state = data.state as OpenState;
  if (state !== 'ok') return { state, ...(state === 'invalid' ? {} : await describeDead(data.version_id)) };

  const gate = await accessGate(hashToken(token), session);
  if (gate?.required && !gate.sessionOk) {
    // Nothing about the document is revealed until the code is entered (only the title and sender, as for a dead link).
    return { state: 'code_required' as const, locked: gate.locked, hasCode: gate.hasCode, remaining: gate.remaining, ...(await describeDead(data.version_id)) };
  }
  await admin.from('signing_recipients').update({ last_viewed_at: new Date().toISOString() }).eq('id', data.recipient_id);

  const [{ data: version }, { data: recipient }] = await Promise.all([
    admin.from('signing_versions').select('*').eq('id', data.version_id).single(),
    admin.from('signing_recipients').select('id,name,email,order_index,consent_at').eq('id', data.recipient_id).single(),
  ]);
  const v = version as VersionRow;
  const [{ data: doc }, { data: fields }, { data: recs }, { data: values }] = await Promise.all([
    admin.from('signing_documents').select('title').eq('id', v.document_id).single(),
    admin.from('signing_fields').select('id,recipient_id,type,page,x,y,w,h,required,label,group_key,prefill_value,date_format').eq('version_id', v.id).order('sort_order'),
    admin.from('signing_recipients').select('id,name,order_index,status').eq('version_id', v.id).order('order_index'),
    admin.from('signing_field_values').select('field_id,value,sig_method,typed_text,image_png').eq('version_id', v.id),
  ]);
  const valueByField = new Map((values ?? []).map((x) => [x.field_id, x]));
  const myId = recipient!.id;
  return {
    state: 'ok' as const,
    documentTitle: doc!.title,
    subject: v.subject,
    message: v.message,
    sender: { business: v.sender_business_name, name: v.sender_name, email: v.sender_email },
    expiresAt: v.expires_at,
    pages: v.pages,
    signingOrder: v.signing_order,
    me: { id: myId, name: recipient!.name, email: recipient!.email, consented: !!recipient!.consent_at },
    signers: (recs ?? []).map((r) => ({ name: r.name, order: r.order_index, status: r.status, isMe: r.id === myId })),
    fields: (fields ?? []).map((f) => {
      const mine = f.recipient_id === myId;
      const val = valueByField.get(f.id);
      return {
        id: f.id, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label, group_key: f.group_key,
        date_format: f.date_format, mine, locked: !!f.prefill_value, prefill_value: f.prefill_value,
        // other signers' completed content is shown read-only
        done: !mine && val ? { value: val.value, image_png: val.image_png, typed_text: val.typed_text } : null,
      };
    }),
    consent: { version: CONSENT_VERSION, text: CONSENT_TEXT, identity: v.require_access_code ? IDENTITY_STATEMENT_CODE : IDENTITY_STATEMENT, method: v.require_access_code ? AUTH_METHOD_CODE : AUTH_METHOD },
    pdfUrl: await signedUrl(v.original_path, 900),
  };
}

export async function signerConsent(token: unknown, ctx: RequestContext, session?: unknown) {
  if (!looksLikeToken(token)) throw new SigningError('invalid', messageFor('invalid'));
  await requireAccess(hashToken(token), session);
  const { data, error } = await createAdminClient().rpc('signing_record_consent', { p_token_hash: hashToken(token), p_consent_version: CONSENT_VERSION, p_consent_sha256: CONSENT_TEXT_SHA256, p_ip: ctx.ip, p_ua: ctx.userAgent });
  if (error || !data?.ok) throw new SigningError(data?.error ?? 'server', messageFor(data?.error ?? 'server'));
}

export async function signerSubmit(token: unknown, raw: unknown, ctx: RequestContext, session?: unknown) {
  if (!looksLikeToken(token)) throw new SigningError('invalid', messageFor('invalid'));
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) throw new SigningError('bad_request', 'Some values are invalid.');
  const tz = safeTimeZone(parsed.data.timezone);
  const admin = createAdminClient();
  const hash = hashToken(token);
  const { data: rec } = await admin.from('signing_recipients').select('id,version_id,status').eq('token_hash', hash).maybeSingle();
  if (!rec) throw new SigningError('invalid', messageFor('invalid'));
  if (rec.status !== 'signed') await requireAccess(hash, session);
  if (rec.status === 'signed') {
    // idempotent retry: nothing to validate, the SQL function returns {already:true}
    const again = await admin.rpc('signing_submit', { p_token_hash: hash, p_values: [], p_ctx: { ip: ctx.ip, user_agent: ctx.userAgent, timezone: tz } });
    return afterSubmit(again.data, rec.version_id);
  }
  const { data: version } = await admin.from('signing_versions').select('pages').eq('id', rec.version_id).single();
  const { data: myFields } = await admin.from('signing_fields').select('id,type,page,w,h,date_format,prefill_value').eq('version_id', rec.version_id).eq('recipient_id', rec.id);
  const byId = new Map((myFields ?? []).map((f) => [f.id, f]));
  const values: Record<string, unknown>[] = [];
  const submitted = new Set<string>();
  for (const v of parsed.data.values) {
    const f = byId.get(v.field_id);
    if (!f || f.prefill_value) throw new SigningError('bad_field', messageFor('bad_field'));
    submitted.add(f.id);
    if (f.type === 'date') continue; // the server stamps the signing date itself
    if (f.type === 'signature' || f.type === 'initials') {
      if (!v.image_png || !inspectPngBase64(v.image_png)) throw new SigningError('bad_value', 'The signature image was not accepted. Please redraw it.');
      values.push({ field_id: f.id, sig_method: v.sig_method, typed_text: v.typed_text ?? null, image_png: v.image_png, value: null });
    } else if (f.type === 'checkbox') {
      values.push({ field_id: f.id, value: v.value === 'true' ? 'true' : 'false' });
    } else {
      const text = (v.value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
      const page = (version!.pages as { w: number; h: number }[])[f.page - 1];
      if (text && page && !(await textFits(text, f.w * page.w, f.h * page.h))) {
        throw new SigningError('too_long', 'That text is too long to fit in its box on the document. Please shorten it.', { field_id: f.id });
      }
      values.push({ field_id: f.id, value: text });
    }
  }
  const now = new Date();
  for (const f of myFields ?? []) {
    if (f.type === 'date' && !f.prefill_value) values.push({ field_id: f.id, value: formatSigningDate(now, f.date_format as DateFormat, tz) });
  }
  const res = await admin.rpc('signing_submit', { p_token_hash: hash, p_values: values, p_ctx: { ip: ctx.ip, user_agent: ctx.userAgent, timezone: tz } });
  if (res.error) throw new SigningError('server', 'Please try again in a moment.');
  if (!res.data.ok) throw new SigningError(res.data.error, messageFor(res.data.error), res.data);
  return afterSubmit(res.data, rec.version_id);
}

async function afterSubmit(data: { ok: boolean; completed?: boolean; already?: boolean }, versionId: string) {
  const admin = createAdminClient();
  let downloadReady = false;
  if (data.completed) {
    const f = await finalizeVersion(versionId);
    downloadReady = f.status === 'finalized' || f.status === 'already';
  } else {
    await inviteNextSigner(versionId).catch(() => undefined);
  }
  const { data: v } = await admin.from('signing_versions').select('status,final_sha256').eq('id', versionId).single();
  return { ok: true as const, completed: v?.status === 'completed', finalized: !!v?.final_sha256 || downloadReady };
}

/** Sequential requests: when someone signs, invite whoever is next. Parallel requests already invited everyone. */
async function inviteNextSigner(versionId: string) {
  const admin = createAdminClient();
  const { data: v } = await admin.from('signing_versions').select('*').eq('id', versionId).single();
  if (!v || v.signing_order !== 'sequential' || !['awaiting_signature', 'partially_signed'].includes(v.status)) return;
  const { data: recs } = await admin.from('signing_recipients').select('id,name,email,status,invited_at').eq('version_id', versionId).order('order_index');
  const next = (recs ?? []).find((r) => r.status !== 'signed');
  if (!next || next.invited_at) return;
  const token = generateToken();
  const issued = await admin.rpc('signing_issue_token', { p_recipient: next.id, p_token_hash: hashToken(token) });
  if (!issued.data?.ok) return;
  const { data: doc } = await admin.from('signing_documents').select('title').eq('id', v.document_id).single();
  try {
    const m = inviteEmail({ recipientName: next.name, senderName: v.sender_name, business: v.sender_business_name, documentTitle: doc!.title, message: v.message, expiresAt: new Date(v.expires_at), token, subject: v.subject, senderEmail: v.sender_email, requiresCode: v.require_access_code });
    await sendGmailMessage({ toEmail: next.email, subject: m.subject, message: m.message, html: m.html, text: m.text, replyTo: v.sender_email ?? undefined });
    await admin.from('signing_recipients').update({ last_sent_at: new Date().toISOString(), send_count: 1, last_email_status: 'sent', last_email_error: null }).eq('id', next.id);
    await admin.rpc('signing_log_event', { p_version: versionId, p_recipient: next.id, p_type: 'invited', p_actor: null, p_ip: null, p_ua: null, p_meta: {} });
  } catch (e) {
    const error = errText(e);
    await admin.from('signing_recipients').update({ last_email_status: 'failed', last_email_error: error }).eq('id', next.id);
    await admin.rpc('signing_log_event', { p_version: versionId, p_recipient: next.id, p_type: 'invite_failed', p_actor: null, p_ip: null, p_ua: null, p_meta: { error } });
  }
}

export async function signerDecline(token: unknown, reason: string, ctx: RequestContext, session?: unknown) {
  if (!looksLikeToken(token)) throw new SigningError('invalid', messageFor('invalid'));
  await requireAccess(hashToken(token), session);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('signing_decline', { p_token_hash: hashToken(token), p_reason: reason.slice(0, 1000), p_ip: ctx.ip, p_ua: ctx.userAgent });
  if (error || !data?.ok) throw new SigningError(data?.error ?? 'server', messageFor(data?.error ?? 'server'));
  if (data.already) return;
  const { data: v } = await admin.from('signing_versions').select('id,document_id,sender_email,sender_name').eq('id', data.version_id).single();
  const { data: r } = await admin.from('signing_recipients').select('name').eq('token_hash', hashToken(token)).single();
  const { data: d } = await admin.from('signing_documents').select('title').eq('id', v!.document_id).single();
  if (v?.sender_email) {
    try {
      const m = declinedEmail({ senderName: v.sender_name, documentTitle: d!.title, signerName: r?.name ?? 'A signer', reason: reason || null, viewUrl: `${siteUrl()}/app/documents/${v.id}` });
      await sendGmailMessage({ toEmail: v.sender_email, subject: m.subject, message: m.message, html: m.html, text: m.text });
    } catch { /* visible in the app regardless */ }
  }
}

/**
 * Resolves a recipient for READ-ONLY access to the finished files: either the emailed download token, or the
 * (now spent) signing token of someone who has signed, so the page they just signed on can offer the download.
 * Neither can change anything.
 */
async function findDownloadRecipient(token: string) {
  const admin = createAdminClient();
  const h = hashToken(token);
  const { data: a } = await admin.from('signing_recipients').select('id,name,version_id,download_token_expires_at').eq('download_token_hash', h).maybeSingle();
  if (a?.download_token_expires_at && new Date(a.download_token_expires_at) > new Date()) return { id: a.id, name: a.name, version_id: a.version_id, download_token_expires_at: a.download_token_expires_at };
  const { data: b } = await admin.from('signing_recipients').select('id,name,version_id,status').eq('token_hash', h).eq('status', 'signed').maybeSingle();
  if (!b) return null;
  const { data: v } = await admin.from('signing_versions').select('status,completed_at').eq('id', b.version_id).single();
  if (v?.status !== 'completed' || !v.completed_at) return null;
  const until = new Date(new Date(v.completed_at).getTime() + 30 * 86400_000);
  return until > new Date() ? { id: b.id, name: b.name, version_id: b.version_id, download_token_expires_at: until.toISOString() } : null;
}

/** Read-only access to the finished files with the emailed download token. */
export async function downloadWithToken(token: unknown, kind: 'final' | 'certificate') {
  if (!looksLikeToken(token)) throw new SigningError('invalid', messageFor('invalid'));
  const admin = createAdminClient();
  const r = await findDownloadRecipient(token);
  if (!r) throw new SigningError('invalid', 'This download link is not valid or has expired.');
  const { data: v } = await admin.from('signing_versions').select('id,document_id,final_path,final_sha256,certificate_path,certificate_sha256,status').eq('id', r.version_id).single();
  const path = kind === 'final' ? v?.final_path : v?.certificate_path;
  const sha = kind === 'final' ? v?.final_sha256 : v?.certificate_sha256;
  if (!v || v.status !== 'completed' || !path || !sha) throw new SigningError('not_ready', 'The completed document is not ready yet.');
  await downloadVerified(path, sha);
  const { data: d } = await admin.from('signing_documents').select('title').eq('id', v.document_id).single();
  const base = (d?.title ?? 'document').replace(/[^\w .()-]+/g, '_').slice(0, 80);
  await admin.rpc('signing_log_event', { p_version: v.id, p_recipient: r.id, p_type: 'downloaded', p_actor: null, p_ip: null, p_ua: null, p_meta: { kind } });
  return signedUrl(path, 60, kind === 'final' ? `${base} - signed.pdf` : `${base} - certificate.pdf`);
}

/** Status of a download token (to render the "completed" screen). */
export async function downloadSession(token: unknown) {
  if (!looksLikeToken(token)) return { state: 'invalid' as const };
  const admin = createAdminClient();
  const r = await findDownloadRecipient(token);
  if (!r) return { state: 'invalid' as const };
  const { data: v } = await admin.from('signing_versions').select('document_id,sender_business_name,final_sha256').eq('id', r.version_id).single();
  const { data: d } = await admin.from('signing_documents').select('title').eq('id', v!.document_id).single();
  return { state: 'ready' as const, name: r.name, documentTitle: d?.title ?? '', sender: v?.sender_business_name ?? null, ready: !!v?.final_sha256, expiresAt: r.download_token_expires_at };
}
