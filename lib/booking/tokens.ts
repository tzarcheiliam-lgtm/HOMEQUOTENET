/**
 * Self-service manage links for booked calls ("reschedule / cancel" in the
 * confirmation and reminders). The token is 32 random bytes (base64url, 43
 * chars) shown only in the link; the database stores only its SHA-256 hex in
 * appointments.manage_token_hash / prospect_sales_appointments.manage_token_hash.
 */
import { createHash, randomBytes } from 'node:crypto';

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function hashManageToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newManageToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashManageToken(token) };
}

/** Cheap shape check before any database lookup (rejects junk from the URL). */
export function isManageTokenShape(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

/**
 * Path of the homeowner's manage page (app/(booking)/booking/manage/[token]).
 * Older links of the form /book/manage/<token> redirect there.
 */
export function managePath(token: string): string {
  return `/booking/manage/${encodeURIComponent(token)}`;
}
