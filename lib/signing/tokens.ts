import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256-bit URL-safe random token. Plaintext only ever goes into the email link. */
export const generateToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');
export const looksLikeToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);
export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
