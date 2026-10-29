import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Who may use the public booking API. A request carries one "grant" string:
 *
 *   hqb1.<f|e>.<sessionId>.<exp>.<sig>  booking ticket for a funnel / estimator
 *                                       session, signed here (HMAC-SHA256). The
 *                                       funnel cookie is scoped to
 *                                       /api/funnels/<slug> and the estimator
 *                                       never hands its session token to the
 *                                       browser, so their routes issue this
 *                                       ticket once the lead is saved.
 *   hqc1.<submissionId>.<token>         contractor sales funnel: the per-
 *                                       submission token the inquiry route
 *                                       returns (only its SHA-256 is stored).
 *   hqr1.<appointmentId>.<exp>.<sig>    "pick a new time" after a no-show or a
 *                                       missed call (lib/booking/recovery.server.ts,
 *                                       sent by email only): books the same lead
 *                                       a new call on that call's calendar.
 *
 * The manage link's own token (/booking/manage/<token>) is the third gate; it
 * is handled by lib/booking findByManageToken. Nothing here is stored.
 * Secret: BOOKING_TICKET_SECRET, else SUPABASE_SERVICE_ROLE_KEY (as render tokens).
 */

export type SessionSource = 'funnel' | 'estimator';

export type Grant =
  | { kind: 'session'; sessionId: string; source: SessionSource }
  | { kind: 'submission'; submissionId: string; token: string }
  | { kind: 'rebook'; appointmentId: string };

/** A week: longer than any funnel visit; the session's own expiry still applies. */
export const TICKET_TTL_SECONDS = 7 * 86_400;
/** A "pick a new time" link stays good for two weeks (the booking API re-checks the lead every time). */
export const REBOOK_TTL_SECONDS = 14 * 86_400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SUB_TOKEN = /^[0-9a-f]{20,200}$/;

let warnedFallback = false;
function key(): Buffer | null {
  const own = process.env.BOOKING_TICKET_SECRET?.trim();
  if (!own && process.env.NODE_ENV === 'production' && !warnedFallback) {
    warnedFallback = true;
    console.warn('[booking] BOOKING_TICKET_SECRET is not set: booking tickets fall back to the service role key (rotating it ends open tickets).');
  }
  const secret = own || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHmac('sha256', secret).update('hqn-booking-ticket-v1').digest() : null;
}

function sign(message: string): string | null {
  const k = key();
  return k ? createHmac('sha256', k).update(message).digest('base64url') : null;
}

/**
 * Ticket for a saved funnel / estimator session. Returned to the browser by
 * the route that saved the lead; null when no secret is configured.
 */
export function signBookingTicket(sessionId: string, source: SessionSource = 'funnel', now = Date.now()): string | null {
  if (!UUID.test(sessionId)) return null;
  const exp = Math.floor(now / 1000) + TICKET_TTL_SECONDS;
  const message = `hqb1.${source === 'estimator' ? 'e' : 'f'}.${sessionId}.${exp}`;
  const sig = sign(message);
  return sig ? `${message}.${sig}` : null;
}

/** "Pick a new time" grant for a missed / no-show call (lib/booking/recovery.server.ts). Null without a secret. */
export function signRebookGrant(appointmentId: string, now = Date.now()): string | null {
  if (!UUID.test(appointmentId)) return null;
  const message = `hqr1.${appointmentId}.${Math.floor(now / 1000) + REBOOK_TTL_SECONDS}`;
  const sig = sign(message);
  return sig ? `${message}.${sig}` : null;
}

function verifySigned(message: string, sig: string): boolean {
  const expected = sign(message);
  if (!expected) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyRebook(raw: string, now: number): Grant | null {
  const parts = raw.split('.');
  if (parts.length !== 4) return null;
  const [, appointmentId, expText, sig] = parts;
  if (!UUID.test(appointmentId) || !/^\d{9,11}$/.test(expText) || Number(expText) * 1000 < now) return null;
  return verifySigned(parts.slice(0, 3).join('.'), sig) ? { kind: 'rebook', appointmentId } : null;
}

function verifyTicket(raw: string, now: number): Grant | null {
  const parts = raw.split('.');
  if (parts.length !== 5) return null;
  const [, src, sessionId, expText, sig] = parts;
  if ((src !== 'f' && src !== 'e') || !UUID.test(sessionId) || !/^\d{9,11}$/.test(expText)) return null;
  if (Number(expText) * 1000 < now) return null;
  const expected = sign(parts.slice(0, 4).join('.'));
  if (!expected) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { kind: 'session', sessionId, source: src === 'e' ? 'estimator' : 'funnel' };
}

/** Parse + verify a grant string. Null for anything malformed, expired or forged. */
export function parseGrant(raw: unknown, now = Date.now()): Grant | null {
  if (typeof raw !== 'string' || raw.length > 400) return null;
  if (raw.startsWith('hqb1.')) return verifyTicket(raw, now);
  if (raw.startsWith('hqr1.')) return verifyRebook(raw, now);
  if (raw.startsWith('hqc1.')) {
    const [, submissionId, token, ...rest] = raw.split('.');
    if (rest.length || !UUID.test(submissionId ?? '') || !SUB_TOKEN.test(token ?? '')) return null;
    return { kind: 'submission', submissionId, token };
  }
  return null;
}

/** Constant-time check of a raw submission token against its stored SHA-256 hex. */
export function submissionTokenMatches(token: string, storedHex: string | null | undefined): boolean {
  if (!storedHex || !/^[0-9a-f]{64}$/.test(storedHex)) return false;
  const given = createHash('sha256').update(token).digest();
  const stored = Buffer.from(storedHex, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}
