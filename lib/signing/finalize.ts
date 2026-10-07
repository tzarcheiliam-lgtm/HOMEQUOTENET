import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { CONSENT_TEXT_SHA256 } from '@/lib/signing/consent-hash';
import { CONSENT_TEXT, CONSENT_VERSION, LIMITS, SIGNING_EVENT_LABELS } from '@/lib/signing/constants';
import { buildCertificate } from '@/lib/signing/certificate';
import { completedEmail } from '@/lib/signing/email';
import { sha256Hex } from '@/lib/signing/pdf-validate';
import { stampPdf, type StampField, type StampValue } from '@/lib/signing/stamp';
import { downloadVerified, uploadObject } from '@/lib/signing/storage';
import { generateToken, hashToken } from '@/lib/signing/tokens';
import type { VersionRow } from '@/lib/signing/access';

const errText = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 300);

async function logEvent(versionId: string, recipientId: string | null, type: string, meta: Record<string, unknown> = {}) {
  await createAdminClient().rpc('signing_log_event', { p_version: versionId, p_recipient: recipientId, p_type: type, p_actor: null, p_ip: null, p_ua: null, p_meta: meta });
}

/**
 * Builds the signed PDF + certificate once. Single-flight (DB lease), idempotent, and failure-safe:
 * if anything throws, the version stays "completed" with no final file and can be retried.
 */
export async function finalizeVersion(versionId: string): Promise<{ status: 'finalized' | 'busy' | 'already' | 'failed'; error?: string }> {
  const admin = createAdminClient();
  const { data: v0 } = await admin.from('signing_versions').select('*').eq('id', versionId).maybeSingle();
  if (!v0 || v0.status !== 'completed') return { status: 'failed', error: 'not completed' };
  if (v0.final_sha256) return { status: 'already' };
  const claim = await admin.rpc('signing_claim_finalize', { p_version: versionId });
  if (!claim.data) return { status: 'busy' };
  try {
    const version = v0 as VersionRow;
    const [{ data: doc }, { data: recs }, { data: fields }, { data: values }, { data: events }] = await Promise.all([
      admin.from('signing_documents').select('*').eq('id', version.document_id).single(),
      admin.from('signing_recipients').select('*').eq('version_id', versionId).order('order_index'),
      admin.from('signing_fields').select('*').eq('version_id', versionId),
      admin.from('signing_field_values').select('*').eq('version_id', versionId),
      admin.from('signing_events').select('*').eq('version_id', versionId).order('id'),
    ]);
    const original = await downloadVerified(version.original_path, version.original_sha256);
    const final = await stampPdf(original, (fields ?? []) as StampField[], (values ?? []) as StampValue[]);
    const finalSha = sha256Hex(final);
    const base = version.original_path.replace(/\/[^/]+$/, '');
    const finalPath = `${base}/${versionId}-signed.pdf`;
    const certPath = `${base}/${versionId}-certificate.pdf`;

    const chain = await admin.rpc('signing_verify_chain', { p_version: versionId });
    const evs = events ?? [];
    const nameById = new Map((recs ?? []).map((r) => [r.id, r.name]));
    const fieldType = new Map((fields ?? []).map((f) => [f.id, f.type]));
    const cert = await buildCertificate({
      documentTitle: doc!.title, documentId: doc!.id, versionId, versionNo: version.version_no, pageCount: version.page_count,
      originalSha256: version.original_sha256, finalSha256: finalSha,
      sender: { name: version.sender_name, email: version.sender_email, business: version.sender_business_name },
      sentAt: version.sent_at, completedAt: version.completed_at, expiresAt: version.expires_at, signingOrder: version.signing_order, retentionUntil: version.retention_until,
      recipients: (recs ?? []).map((r) => ({
        name: r.name, email: r.email, order: r.order_index, status: r.status, invitedAt: r.invited_at, firstViewedAt: r.first_viewed_at, consentAt: r.consent_at,
        signedAt: r.signed_at, declinedAt: r.declined_at, ip: r.sign_ip, userAgent: r.sign_user_agent, timezone: r.sign_timezone, authMethod: r.auth_method,
        signatureMethods: (values ?? []).filter((x) => x.recipient_id === r.id && x.sig_method).map((x) => `${fieldType.get(x.field_id)}: ${x.sig_method}`),
      })),
      consent: { version: CONSENT_VERSION, sha256: CONSENT_TEXT_SHA256, text: CONSENT_TEXT },
      events: evs.map((e) => ({ at: e.created_at, type: SIGNING_EVENT_LABELS[e.event_type] ?? e.event_type, who: e.recipient_id ? (nameById.get(e.recipient_id) ?? 'Signer') : e.actor_user_id ? 'Sender' : 'System', ip: e.ip })),
      chainHead: evs.length ? evs[evs.length - 1].event_hash : null, chainValid: chain.data === true,
    });
    const certSha = sha256Hex(cert);
    await uploadObject(finalPath, final, true);
    await uploadObject(certPath, cert, true);
    const rec = await admin.rpc('signing_record_final', { p_version: versionId, p_final_path: finalPath, p_final_sha: finalSha, p_cert_path: certPath, p_cert_sha: certSha });
    if (rec.error) throw new Error(rec.error.message);
    if (!rec.data?.already) await sendCompletionEmails(version, doc!.title, recs ?? []);
    return { status: 'finalized' };
  } catch (e) {
    const message = errText(e);
    await admin.from('signing_versions').update({ finalize_error: message, finalize_claimed_until: null }).eq('id', versionId);
    await logEvent(versionId, null, 'finalize_failed', { error: message }).catch(() => undefined);
    return { status: 'failed', error: message };
  }
}

async function sendCompletionEmails(version: VersionRow, title: string, recipients: { id: string; name: string; email: string }[]) {
  const admin = createAdminClient();
  for (const r of recipients) {
    const token = generateToken();
    const issued = await admin.rpc('signing_issue_download_token', { p_recipient: r.id, p_token_hash: hashToken(token), p_days: LIMITS.downloadLinkDays });
    if (issued.error || !issued.data?.ok) continue;
    try {
      const m = completedEmail({ recipientName: r.name, documentTitle: title, business: version.sender_business_name, token });
      await sendGmailMessage({ toEmail: r.email, subject: m.subject, message: m.message, html: m.html, text: m.text, replyTo: version.sender_email ?? undefined });
      await logEvent(version.id, r.id, 'completion_emailed');
    } catch (e) {
      await logEvent(version.id, r.id, 'completion_email_failed', { error: errText(e) }).catch(() => undefined);
    }
  }
  if (version.sender_email) {
    try {
      const m = completedEmail({ recipientName: version.sender_name || 'there', documentTitle: title, business: version.sender_business_name, token: null, viewUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/app/documents/${version.id}` });
      await sendGmailMessage({ toEmail: version.sender_email, subject: m.subject, message: m.message, html: m.html, text: m.text });
    } catch { /* sender can always download from the app */ }
  }
}
