/** Branded transactional emails for signing. Plain inline-styled HTML + a text alternative. */
import { LIMITS } from '@/lib/signing/constants';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const signLink = (token: string) => `${siteUrl()}/sign#t=${token}`;
export const downloadLink = (token: string) => `${siteUrl()}/sign#d=${token}`;

function shell(title: string, bodyHtml: string, button?: { label: string; href: string }, footer?: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
<tr><td style="background:#0f172a;padding:16px 24px;color:#fff;font-weight:600;letter-spacing:.2px">HomeQuote<span style="opacity:.65"> Network</span> <span style="float:right;font-weight:400;opacity:.65;font-size:12px">Documents &amp; Signing</span></td></tr>
<tr><td style="padding:28px 24px 8px"><h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${esc(title)}</h1>${bodyHtml}</td></tr>
${button ? `<tr><td style="padding:8px 24px 24px"><a href="${esc(button.href)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${esc(button.label)}</a></td></tr>` : ''}
<tr><td style="padding:16px 24px 24px;border-top:1px solid #f4f4f5;font-size:12px;line-height:1.5;color:#71717a">${footer ?? ''}</td></tr>
</table></td></tr></table></body></html>`;
}
const p = (s: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${s}</p>`;
const quote = (s: string) => `<blockquote style="margin:0 0 14px;padding:10px 14px;border-left:3px solid #d4d4d8;background:#fafafa;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(s)}</blockquote>`;

const PERSONAL_NOTE =
  'This link is personal to you — please do not forward it. Anyone who has it can open this document, because the link is the only thing that identifies the signer. HomeQuote Network does not independently verify who you are.';

export interface InviteInput {
  recipientName: string; senderName: string | null; business: string | null; documentTitle: string;
  message: string | null; expiresAt: Date; token: string; reminder?: boolean; subject?: string | null; senderEmail?: string | null;
  /** The signer must also enter an access code the sender gives them separately (never put in this email). */
  requiresCode?: boolean;
}
export function inviteEmail(i: InviteInput) {
  const who = i.business || i.senderName || 'A HomeQuote Network contractor';
  const subject = i.reminder ? `Reminder: ${i.subject || `Please sign ${i.documentTitle}`}` : i.subject || `Please sign ${i.documentTitle}`;
  const html = shell(
    i.reminder ? 'Reminder: a document is waiting for your signature' : 'You have a document to sign',
    p(`Hi ${esc(i.recipientName)},`) +
      p(`<strong>${esc(who)}</strong> sent you <strong>${esc(i.documentTitle)}</strong> to review and sign electronically.`) +
      (i.message ? quote(i.message) : '') +
      (i.requiresCode ? p(`You will also need a <strong>6-digit access code</strong>. ${esc(who)} will give it to you separately (for example by phone or text). It is not in this email.`) : '') +
      p(`The link works until <strong>${esc(i.expiresAt.toUTCString().replace(' GMT', ' UTC'))}</strong>.`),
    { label: 'Review and sign', href: signLink(i.token) },
    `${esc(PERSONAL_NOTE)}<br><br>Sent through HomeQuote Network on behalf of ${esc(who)}${i.senderEmail ? `. Questions? Reply to this email to reach ${esc(i.senderEmail)}` : ''}.`
  );
  const text = [
    `Hi ${i.recipientName},`, '',
    `${who} sent you "${i.documentTitle}" to review and sign electronically.`,
    i.message ? `\n${i.message}\n` : '',
    `Review and sign: ${signLink(i.token)}`, '',
    i.requiresCode ? `You will also need a 6-digit access code. ${who} will give it to you separately (for example by phone or text); it is not in this email.\n` : '',
    `This link works until ${i.expiresAt.toUTCString()}.`, PERSONAL_NOTE,
  ].join('\n');
  return { subject, html, text, message: text };
}

export interface CompletedInput { recipientName: string; documentTitle: string; business: string | null; token: string | null; viewUrl?: string }
export function completedEmail(i: CompletedInput) {
  const subject = `Completed: ${i.documentTitle}`;
  const href = i.token ? downloadLink(i.token) : i.viewUrl || siteUrl();
  const html = shell(
    'Everyone has signed',
    p(`Hi ${esc(i.recipientName)},`) +
      p(`<strong>${esc(i.documentTitle)}</strong>${i.business ? ` (from ${esc(i.business)})` : ''} has been signed by all parties. You can download the signed PDF and the completion certificate (audit record) with the button below.`) +
      p(i.token ? `This download link works for ${LIMITS.downloadLinkDays} days. Keep your own copy of the files.` : 'Sign in to HomeQuote Network to download the signed PDF and certificate.'),
    { label: i.token ? 'Download signed document' : 'Open in HomeQuote Network', href },
    i.token ? esc('This link is personal to you — please do not forward it.') : ''
  );
  const text = `Hi ${i.recipientName},\n\n"${i.documentTitle}" has been signed by all parties.\n\nDownload: ${href}\n`;
  return { subject, html, text, message: text };
}

export function declinedEmail(i: { senderName: string | null; documentTitle: string; signerName: string; reason: string | null; viewUrl: string }) {
  const subject = `Declined: ${i.documentTitle}`;
  const html = shell('A signer declined',
    p(`Hi ${esc(i.senderName || 'there')},`) + p(`<strong>${esc(i.signerName)}</strong> declined to sign <strong>${esc(i.documentTitle)}</strong>. The request is closed.`) + (i.reason ? quote(i.reason) : ''),
    { label: 'Open document', href: i.viewUrl });
  const text = `${i.signerName} declined to sign "${i.documentTitle}".${i.reason ? `\nReason: ${i.reason}` : ''}\n${i.viewUrl}`;
  return { subject, html, text, message: text };
}

export function voidedEmail(i: { recipientName: string; documentTitle: string; business: string | null }) {
  const subject = `Cancelled: ${i.documentTitle}`;
  const html = shell('This signing request was cancelled',
    p(`Hi ${esc(i.recipientName)},`) + p(`${esc(i.business || 'The sender')} cancelled the request to sign <strong>${esc(i.documentTitle)}</strong>. The link you received no longer works. If a corrected version is needed you will get a new email.`));
  const text = `${i.business || 'The sender'} cancelled the request to sign "${i.documentTitle}". The link no longer works.`;
  return { subject, html, text, message: text };
}
