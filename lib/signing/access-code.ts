import { createHash, randomBytes, randomInt } from 'node:crypto';

/**
 * Access codes: a short numeric code the sender shares with a signer OUTSIDE the signing email (phone, text,
 * in person). Only a salted SHA-256 is stored; the SQL function signing_verify_code uses the same formula
 * (sha256(salt || ':' || code)) so the two must stay in step.
 */
export const CODE_LENGTH = 6;
export const MAX_CODE_ATTEMPTS = 5;

export const hashAccessCode = (salt: string, code: string) => createHash('sha256').update(`${salt}:${code}`, 'utf8').digest('hex');

/** A fresh code, with the salt + hash to store. The plaintext is shown to the sender once and never persisted. */
export function newAccessCode(): { code: string; salt: string; hash: string } {
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
  const salt = randomBytes(16).toString('hex');
  return { code, salt, hash: hashAccessCode(salt, code) };
}

/** Accepts "123456", "123 456", "123-456"; returns the 6 digits or null (not a candidate, so it costs no attempt). */
export function normalizeCodeInput(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(digits) ? digits : null;
}

export const formatCodeForDisplay = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
