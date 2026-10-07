/**
 * Certificate of completion / audit record, as a separate PDF.
 * States plainly what was and was not verified; it does NOT claim a certificate-based digital signature.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import { IDENTITY_STATEMENT, LEGAL_REVIEW_NOTE, LIMITS, SIGNATURE_STATEMENT } from '@/lib/signing/constants';
import { describeUserAgent, formatUtc } from '@/lib/signing/format';
import { prepareFonts } from '@/lib/signing/stamp';

export interface CertificateRecipient {
  name: string; email: string; order: number; status: string;
  invitedAt: string | null; firstViewedAt: string | null; consentAt: string | null; signedAt: string | null; declinedAt: string | null;
  ip: string | null; userAgent: string | null; timezone: string | null; authMethod: string; signatureMethods: string[];
}
export interface CertificateInput {
  documentTitle: string; documentId: string; versionId: string; versionNo: number; pageCount: number;
  originalSha256: string; finalSha256: string;
  sender: { name: string | null; email: string | null; business: string | null };
  sentAt: string | null; completedAt: string | null; expiresAt: string | null; signingOrder: string; retentionUntil: string | null;
  recipients: CertificateRecipient[];
  consent: { version: string; sha256: string; text: string[] };
  events: { at: string; type: string; who: string; ip: string | null }[];
  chainHead: string | null; chainValid: boolean;
}

const MARGIN = 48;
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.4, 0.4, 0.45);
const RULE = rgb(0.85, 0.85, 0.88);

export async function buildCertificate(input: CertificateInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate of completion – ${input.documentTitle}`.slice(0, 200));
  doc.setProducer('HomeQuote Network');
  const fonts = await prepareFonts(doc);
  const body: PDFFont = await fonts.unicode();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 612, H = 792;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - MARGIN;
  const width = W - MARGIN * 2;

  const header = (p: PDFPage) => {
    p.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: rgb(0.06, 0.09, 0.16) });
    p.drawText('HomeQuote Network', { x: MARGIN, y: H - 30, size: 11, font: bold, color: INK });
    p.drawText('Certificate of completion', { x: W - MARGIN - bold.widthOfTextAtSize('Certificate of completion', 9), y: H - 29, size: 9, font: bold, color: MUTED });
  };
  header(page);
  y = H - 62;
  const ensure = (need: number) => {
    if (y - need < MARGIN + 18) { page = doc.addPage([W, H]); header(page); y = H - 62; }
  };
  const wrap = (text: string, font: PDFFont, size: number, maxW: number): string[] => {
    const out: string[] = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        let w = word;
        while (font.widthOfTextAtSize(w, size) > maxW) { // break very long tokens (hashes, urls)
          let cut = w.length;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) cut--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, cut)); w = w.slice(cut);
        }
        const next = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) <= maxW) line = next; else { out.push(line); line = w; }
      }
      out.push(line);
    }
    return out;
  };
  const para = (text: string, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number; w?: number; gap?: number } = {}) => {
    const size = o.size ?? 9; const font = o.font ?? body; const x = o.x ?? MARGIN; const w = o.w ?? width;
    for (const line of wrap(text, font, size, w)) { ensure(size + 3); page.drawText(line, { x, y: y - size, size, font, color: o.color ?? INK }); y -= size + 3; }
    y -= o.gap ?? 0;
  };
  const h2 = (text: string) => { ensure(34); y -= 8; page.drawText(text, { x: MARGIN, y: y - 12, size: 12, font: bold, color: INK }); y -= 16; page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.6, color: RULE }); y -= 8; };
  const kv = (k: string, v: string) => {
    const lines = wrap(v || '—', body, 9, width - 150);
    ensure(lines.length * 12 + 2);
    page.drawText(k, { x: MARGIN, y: y - 9, size: 8.5, font: bold, color: MUTED });
    lines.forEach((l, i) => page.drawText(l, { x: MARGIN + 150, y: y - 9 - i * 12, size: 9, font: body, color: INK }));
    y -= lines.length * 12 + 2;
  };

  page.drawText('Certificate of completion', { x: MARGIN, y: y - 18, size: 20, font: bold, color: INK }); y -= 28;
  para('Audit record for an electronically signed document, issued by HomeQuote Network.', { color: MUTED, gap: 4 });

  h2('Document');
  kv('Title', input.documentTitle);
  kv('Document ID', `${input.documentId}`);
  kv('Version', `${input.versionNo} (request ${input.versionId})`);
  kv('Pages', String(input.pageCount));
  kv('Original file SHA-256', input.originalSha256);
  kv('Signed file SHA-256', input.finalSha256);
  kv('Sent by', [input.sender.name, input.sender.email].filter(Boolean).join(' • ') + (input.sender.business ? ` • ${input.sender.business}` : ''));
  kv('Signing order', input.signingOrder === 'sequential' ? 'In sequence' : 'Any order');
  kv('Sent', formatUtc(input.sentAt));
  kv('Completed', formatUtc(input.completedAt));
  kv('Link expiry', formatUtc(input.expiresAt));
  kv('Record retention', input.retentionUntil ? `Kept until at least ${formatUtc(input.retentionUntil).slice(0, 10)} (${LIMITS.retentionYears}-year default policy)` : `${LIMITS.retentionYears}-year default policy`);

  h2('Signers');
  for (const r of input.recipients) {
    ensure(120);
    para(`${r.order}. ${r.name}  <${r.email}>`, { font: bold, size: 10, gap: 1 });
    kv('Status', r.status);
    kv('Invited', formatUtc(r.invitedAt));
    kv('First opened', formatUtc(r.firstViewedAt));
    kv('Agreed to e-sign', formatUtc(r.consentAt));
    kv(r.declinedAt ? 'Declined' : 'Signed', formatUtc(r.declinedAt ?? r.signedAt));
    kv('Signature method', r.signatureMethods.length ? r.signatureMethods.join(', ') : '—');
    kv('Identification', r.authMethod === 'email_link' ? 'Unique emailed link only (no independent identity verification)' : r.authMethod);
    kv('IP address', r.ip ?? '—');
    kv('Device', describeUserAgent(r.userAgent));
    kv('Time zone reported', r.timezone ?? '—');
    y -= 4;
  }

  h2('Electronic signing consent');
  kv('Consent text version', input.consent.version);
  kv('Consent text SHA-256', input.consent.sha256);
  for (const t of input.consent.text) para(`• ${t}`, { size: 8.5, color: MUTED, x: MARGIN + 6, w: width - 6 });

  h2('Event history (UTC)');
  for (const e of input.events) {
    const line = `${formatUtc(e.at)}   ${e.type}   ${e.who}${e.ip ? `   ${e.ip}` : ''}`;
    para(line, { size: 8, gap: 0 });
  }
  y -= 4;
  kv('Audit chain', input.chainValid ? 'Verified: every event’s hash links to the one before it.' : 'NOT VERIFIED: the stored event hashes do not match. Treat this record with caution.');
  kv('Chain head SHA-256', input.chainHead ?? '—');

  h2('What this record does and does not show');
  para(IDENTITY_STATEMENT, { size: 8.5, gap: 3 });
  para(SIGNATURE_STATEMENT, { size: 8.5, gap: 3 });
  para('The hash above identifies the signed PDF delivered with this certificate. Any later change to that PDF changes its hash.', { size: 8.5, gap: 3 });
  para(LEGAL_REVIEW_NOTE, { size: 8.5, color: MUTED });

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${pages.length}  •  ${input.documentId.slice(0, 8)}`;
    p.drawText(label, { x: W - MARGIN - body.widthOfTextAtSize(label, 7.5), y: 24, size: 7.5, font: body, color: MUTED });
  });
  return doc.save();
}
