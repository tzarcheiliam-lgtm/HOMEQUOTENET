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

/** Normalize an email to a comparable form. Returns null if empty. */
export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const e = String(input).trim().toLowerCase();
  return e === '' ? null : e;
}
