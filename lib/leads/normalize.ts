// Contact normalization shared by the intake pipeline and dedupe. Mirrors the
// SQL `to_e164` / lower(trim(email)) logic in migration 0005 so app-side lookups
// match the stored normalized columns.

/** Normalize a phone number to E.164 (US default). Returns null if empty. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`; // best effort for international / other lengths
}

export type UsPhoneParseFailure =
  | 'empty'
  | 'not_us'
  | 'invalid_length'
  | 'invalid_area_code'
  | 'invalid_exchange'
  | 'fictional';

export type UsPhoneParseResult = { ok: true; e164: string } | { ok: false; reason: UsPhoneParseFailure };

/**
 * Strict US (NANP) parse for numbers we may actually text or call. Where
 * normalizePhone is best-effort for matching, this refuses anything that is
 * not a real-looking US number. A successful result always equals
 * normalizePhone(input), so it matches leads.phone_e164 / public.to_e164.
 */
export function parseUsPhone(input: string | null | undefined): UsPhoneParseResult {
  const raw = String(input ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return { ok: false, reason: 'empty' };
  if (raw.startsWith('+') && !digits.startsWith('1')) return { ok: false, reason: 'not_us' };
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (ten.length !== 10) return { ok: false, reason: 'invalid_length' };
  // NANP: area code and exchange start 2-9; N11 codes are service codes, not areas.
  if (!/^[2-9]/.test(ten) || /^[2-9]11/.test(ten)) return { ok: false, reason: 'invalid_area_code' };
  if (!/^[2-9]/.test(ten.slice(3))) return { ok: false, reason: 'invalid_exchange' };
  if (ten.slice(3, 6) === '555' && ten.slice(6, 8) === '01') return { ok: false, reason: 'fictional' };
  return { ok: true, e164: `+1${ten}` };
}

/** Normalize an email to a comparable form. Returns null if empty. */
export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const e = String(input).trim().toLowerCase();
  return e === '' ? null : e;
}
