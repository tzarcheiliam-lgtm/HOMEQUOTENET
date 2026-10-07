/**
 * Facebook (Meta) customer-list export: pure formatting, no I/O.
 *
 * Columns follow Meta's customer-file layout for Custom Audience uploads: email, phone, fn, ln, zip, ct, st, country.
 * Values are normalised the way Meta asks before it hashes them (lowercase, no punctuation, phone with country code and
 * digits only, 5-digit US ZIP, 2-letter lowercase state, 2-letter lowercase country). The Ads Manager uploader hashes the
 * file in the browser, so raw values are what it expects. Check the column mapping step when you upload.
 */
export interface ExportableLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  email_normalized?: string | null;
  phone: string | null;
  phone_e164?: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  external_lead_id: string | null;
}

export const FACEBOOK_COLUMNS = ['email', 'phone', 'fn', 'ln', 'zip', 'ct', 'st', 'country'] as const;
export type FacebookRow = Record<(typeof FACEBOOK_COLUMNS)[number], string>;

/** Lowercase letters/digits only (any language), no spaces or punctuation. */
const lettersOnly = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '');
/** Names keep letters only (digits make no sense in a name). */
const nameOnly = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFC').replace(/[^\p{L}]+/gu, '');

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function metaEmail(lead: Pick<ExportableLead, 'email' | 'email_normalized'>): string {
  const e = (lead.email_normalized || lead.email || '').trim().toLowerCase();
  return EMAIL.test(e) ? e : '';
}

/** Country code + number, digits only. US/Canada 10-digit numbers get "1". Anything we cannot trust is dropped. */
export function metaPhone(lead: Pick<ExportableLead, 'phone' | 'phone_e164'>): string {
  const e164 = (lead.phone_e164 ?? '').replace(/\D/g, '');
  if (/^1[2-9]\d{9}$/.test(e164)) return e164;
  const digits = (lead.phone ?? '').replace(/\D/g, '');
  if (/^[2-9]\d{9}$/.test(digits)) return `1${digits}`;
  if (/^1[2-9]\d{9}$/.test(digits)) return digits;
  return '';
}

export const metaZip = (zip: string | null | undefined) => /^(\d{5})(-\d{4})?$/.exec((zip ?? '').trim())?.[1] ?? '';
export const metaState = (st: string | null | undefined) => { const s = (st ?? '').trim().toLowerCase(); return /^[a-z]{2}$/.test(s) ? s : ''; };

export function toFacebookRow(lead: ExportableLead): FacebookRow {
  return {
    email: metaEmail(lead), phone: metaPhone(lead), fn: nameOnly(lead.first_name), ln: nameOnly(lead.last_name),
    zip: metaZip(lead.zip), ct: lettersOnly(lead.city), st: metaState(lead.state), country: 'us',
  };
}

/** RFC 4180 cell. Cells that would start a spreadsheet formula are defused (none of our normalised values should). */
export function csvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export interface FacebookExportResult {
  csv: string;
  counts: { considered: number; exported: number; noContact: number; duplicates: number; optedOut: number };
}

/**
 * Builds the CSV. A lead needs an email or a phone to be useful for matching; people already in the file (same email or
 * same phone) are listed once; leads whose funnel session recorded an advertising-measurement opt-out are left out.
 */
export function buildFacebookExport(leads: ExportableLead[], optedOutLeadIds: ReadonlySet<string> = new Set()): FacebookExportResult {
  const counts = { considered: leads.length, exported: 0, noContact: 0, duplicates: 0, optedOut: 0 };
  const seen = new Set<string>();
  const lines: string[] = [FACEBOOK_COLUMNS.join(',')];
  for (const lead of leads) {
    if (optedOutLeadIds.has(lead.id)) { counts.optedOut++; continue; }
    const row = toFacebookRow(lead);
    if (!row.email && !row.phone) { counts.noContact++; continue; }
    const keys = [row.email && `e:${row.email}`, row.phone && `p:${row.phone}`].filter(Boolean) as string[];
    // Same email OR same phone means the same person; a repeat's other identifiers join the set too, so a later entry
    // that shares only that identifier is recognised as the same person as well.
    const repeat = keys.some((k) => seen.has(k));
    keys.forEach((k) => seen.add(k));
    if (repeat) { counts.duplicates++; continue; }
    lines.push(FACEBOOK_COLUMNS.map((c) => csvCell(row[c])).join(','));
    counts.exported++;
  }
  return { csv: lines.join('\r\n') + '\r\n', counts };
}
