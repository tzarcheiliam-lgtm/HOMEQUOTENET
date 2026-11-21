import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { publicSiteUrl } from '@/lib/auth/site-url';

/**
 * The visit booking link texted after the voice note: /booking/visit/<grant>.
 *
 *   hqv1.<conversationId>.<exp>.<sig>   HMAC-SHA256, 14 days. Nothing personal in it.
 *
 * The grant names the text conversation; the page re-checks the conversation and the lead on every request (opted
 * out, archived, already booked). Secret: BOOKING_TICKET_SECRET, else SUPABASE_SERVICE_ROLE_KEY (as the booking
 * tickets), under its own label so a visit link is never a valid booking ticket and the other way round.
 */
export const VISIT_LINK_TTL_SECONDS = 14 * 86_400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function key(): Buffer | null {
  const secret = process.env.BOOKING_TICKET_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHmac('sha256', secret).update('hqn-visit-link-v1').digest() : null;
}
const sign = (message: string) => {
  const k = key();
  return k ? createHmac('sha256', k).update(message).digest('base64url') : null;
};

export function signVisitGrant(conversationId: string, now = Date.now()): string | null {
  if (!UUID.test(conversationId)) return null;
  const message = `hqv1.${conversationId}.${Math.floor(now / 1000) + VISIT_LINK_TTL_SECONDS}`;
  const sig = sign(message);
  return sig ? `${message}.${sig}` : null;
}

/** The conversation id, or null for anything malformed, expired or forged. */
export function parseVisitGrant(raw: unknown, now = Date.now()): string | null {
  if (typeof raw !== 'string' || raw.length > 200 || !raw.startsWith('hqv1.')) return null;
  const parts = raw.split('.');
  if (parts.length !== 4) return null;
  const [, id, expText, sig] = parts;
  if (!UUID.test(id) || !/^\d{9,11}$/.test(expText) || Number(expText) * 1000 < now) return null;
  const expected = sign(parts.slice(0, 3).join('.'));
  if (!expected) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export const visitPath = (grant: string) => `/booking/visit/${encodeURIComponent(grant)}`;
export const visitUrl = (grant: string) => `${publicSiteUrl()}${visitPath(grant)}`;
