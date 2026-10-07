import { validPhone } from './eligibility';

/** "(310) 555-0123", "310-555-0123", "1 310 555 0123", "+13105550123" -> "+13105550123"; null if not a valid US/Canada number. */
export function normalizeUsPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null;
  return validPhone(e164) ? e164 : null;
}

export const maskPhone = (p: string | null | undefined) => (p && p.length >= 4 ? `••• ••• ${p.slice(-4)}` : '—');
