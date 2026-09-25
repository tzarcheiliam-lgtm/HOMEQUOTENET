import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Provider-neutral webhook helpers. Each adapter verifies with its provider's
 * own scheme (Telnyx: Ed25519 over `${timestamp}|${rawBody}`; Twilio:
 * HMAC-SHA1 of URL + params), but every scheme gets the same replay window
 * and constant-time comparison. Verification always runs on the RAW body,
 * before JSON parsing, like lib/integrations/meta.ts.
 */

/** Signed timestamps older/newer than this are rejected as replays. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

/** `timestamp` is epoch seconds (string or number) from the signed header. */
export function isFreshTimestamp(timestamp: string | number | null | undefined, now: Date, toleranceSeconds = WEBHOOK_TOLERANCE_SECONDS): boolean {
  const seconds = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  return Math.abs(now.getTime() / 1000 - seconds) <= toleranceSeconds;
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** HMAC-SHA256 hex of `${timestamp}.${rawBody}` — used by the mock provider and tests. */
export function hmacSignature(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
}

/** Lower-cases header names so adapters can read them uniformly. */
export function lowerHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const entries = headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
  for (const [k, v] of entries) out[k.toLowerCase()] = v;
  return out;
}
