/** Types + pure helpers shared by the signing UI (safe for client components). */
import type { FieldType, SigningStatus } from '@/lib/signing/constants';

export interface UiPage { w: number; h: number; rotation: number }
export interface UiRecipient { key: string; name: string; email: string }
export interface UiField {
  key: string;
  recipient_index: number | null; // 1-based into recipients
  type: FieldType;
  page: number;
  x: number; y: number; w: number; h: number;
  required: boolean;
  label: string | null;
  group_key: string | null;
  prefill_value: string | null;
  date_format: string | null;
  source: 'acroform' | 'text' | 'ocr' | 'manual';
  confidence: number | null;
  needs_review: boolean;
  reviewed: boolean;
  role_hint: string | null;
  detection_note: string | null;
  source_ref: string | null;
}

/** Colours per signer (outline + tint). Index 0 = first signer. */
export const SIGNER_COLORS = [
  { name: 'blue', stroke: '#2563eb', fill: 'rgba(37,99,235,0.12)', chip: 'bg-blue-100 text-blue-800' },
  { name: 'violet', stroke: '#7c3aed', fill: 'rgba(124,58,237,0.12)', chip: 'bg-violet-100 text-violet-800' },
  { name: 'orange', stroke: '#ea580c', fill: 'rgba(234,88,12,0.12)', chip: 'bg-orange-100 text-orange-800' },
  { name: 'teal', stroke: '#0d9488', fill: 'rgba(13,148,136,0.12)', chip: 'bg-teal-100 text-teal-800' },
  { name: 'pink', stroke: '#db2777', fill: 'rgba(219,39,119,0.12)', chip: 'bg-pink-100 text-pink-800' },
  { name: 'slate', stroke: '#475569', fill: 'rgba(71,85,105,0.12)', chip: 'bg-slate-200 text-slate-800' },
];
export const colorFor = (recipientIndex: number | null) =>
  recipientIndex ? SIGNER_COLORS[(recipientIndex - 1) % SIGNER_COLORS.length] : { name: 'none', stroke: '#a1a1aa', fill: 'rgba(161,161,170,0.15)', chip: 'bg-zinc-100 text-zinc-700' };

export const STATUS_VARIANT: Record<SigningStatus, 'success' | 'warning' | 'muted' | 'secondary' | 'outline' | 'default'> = {
  draft: 'muted', awaiting_signature: 'warning', partially_signed: 'warning', completed: 'success', declined: 'secondary', voided: 'muted', expired: 'muted',
};

/** A status that accounts for lazily-expired requests. */
export function effectiveStatus(status: string, expiresAt: string | null | undefined, now = Date.now()): SigningStatus {
  if ((status === 'awaiting_signature' || status === 'partially_signed') && expiresAt && new Date(expiresAt).getTime() <= now) return 'expired';
  return status as SigningStatus;
}

/** Mirrors the server's pre-send checks so the sender sees problems early (the server re-checks everything). */
export function sendProblems(opts: { subject: string; recipients: UiRecipient[]; fields: UiField[]; order: string }): string[] {
  const out: string[] = [];
  if (!opts.subject.trim()) out.push('Add an email subject.');
  if (!opts.recipients.length) out.push('Add at least one signer.');
  opts.recipients.forEach((r, i) => {
    if (!r.name.trim()) out.push(`Signer ${i + 1} needs a name.`);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email.trim())) out.push(`Signer ${i + 1} needs a valid email.`);
    if (!opts.fields.some((f) => f.recipient_index === i + 1 && f.type === 'signature')) out.push(`${r.name || `Signer ${i + 1}`} has no signature field.`);
  });
  const unassigned = opts.fields.filter((f) => f.recipient_index === null && !f.prefill_value).length;
  if (unassigned) out.push(`${unassigned} field${unassigned > 1 ? 's are' : ' is'} not assigned to a signer.`);
  const unreviewed = opts.fields.filter((f) => f.needs_review && !f.reviewed).length;
  if (unreviewed) out.push(`${unreviewed} suggested field${unreviewed > 1 ? 's' : ''} still need${unreviewed > 1 ? '' : 's'} review.`);
  return out;
}

/** Suggest signers for unassigned fields from detected role words (buyer/seller/...). */
export function autoAssign(fields: UiField[], signerCount: number): UiField[] {
  if (signerCount < 1) return fields;
  const roles: string[] = [];
  for (const f of fields) if (f.role_hint && !roles.includes(f.role_hint)) roles.push(f.role_hint);
  const first = fields.map((f) => {
    if (f.recipient_index !== null || f.prefill_value) return f;
    if (signerCount === 1) return { ...f, recipient_index: 1 };
    const idx = f.role_hint ? roles.indexOf(f.role_hint) + 1 : 0;
    return idx >= 1 && idx <= signerCount ? { ...f, recipient_index: idx } : f;
  });
  // Fields with no role words (a bare "Date:" or "Initials:") go to whoever owns the closest assigned field on that page.
  return first.map((f) => {
    if (f.recipient_index !== null || f.prefill_value) return f;
    let best: UiField | null = null, bestD = Infinity;
    for (const o of first) {
      if (o.recipient_index === null || o.page !== f.page) continue;
      const d = Math.hypot(o.x - f.x, (o.y - f.y) * 1.4);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best && bestD < 0.55 ? { ...f, recipient_index: best.recipient_index } : f;
  });
}
