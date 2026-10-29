import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/funnels/server';
import { originAllowed } from '@/lib/estimator/lead';
import { BOOKING_ERROR_MESSAGES, PICK_ANOTHER_TIME, type BookingError } from '@/lib/booking/types';
import type { ApiFailure } from '@/components/booking/types';

/** JSON reply that is never cached and never leaks the page URL (manage tokens live in paths). */
export function reply(data: unknown, status = 200, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...headers } });
}

const STATUS: Partial<Record<ApiFailure['error'], number>> = {
  rate_limited: 429,
  invalid_request: 422,
  forbidden: 403,
  session_invalid: 401,
  submission_invalid: 401,
  not_found: 404,
  unavailable: 503,
  already_booked: 409,
  not_active: 409,
  not_bookable: 409,
  calendar_inactive: 409,
  calendar_not_found: 409,
};

const EXTRA_MESSAGES: Record<'rate_limited' | 'invalid_request' | 'forbidden', string> = {
  rate_limited: 'Too many tries in a short time. Please wait a minute and try again.',
  invalid_request: 'Please pick a time and try again.',
  forbidden: 'This page’s address doesn’t match our site. Reload the page and try again.',
};

/** `{ ok: false, error, message }` with a homeowner-safe message and a fitting status. */
export function fail(error: ApiFailure['error'], extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): NextResponse {
  const message = error in EXTRA_MESSAGES ? EXTRA_MESSAGES[error as keyof typeof EXTRA_MESSAGES] : BOOKING_ERROR_MESSAGES[error as BookingError];
  const pickAnother = PICK_ANOTHER_TIME.has(error as BookingError);
  return reply({ ok: false, error, message, ...(pickAnother ? { pickAnother } : {}), ...extra }, STATUS[error] ?? (pickAnother ? 409 : 422), headers);
}

/** Same site only: the strict Origin match, then the www/apex twin / proxied host / site URL. */
export function originOk(request: Request): boolean {
  return sameOrigin(request) || originAllowed(request);
}

/** A short hash of the client IP (Vercel overwrites x-forwarded-for). Never stored or logged raw. */
export function clientKey(request: Request): string {
  const header = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'local';
  return createHash('sha256').update(`booking:${header.split(',')[0]?.trim() ?? 'local'}`).digest('hex').slice(0, 24);
}

/** The real client IP for Meta's user_data (never logged or stored). */
export function clientIp(request: Request): string | undefined {
  const header = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
  return header?.split(',')[0]?.trim() || undefined;
}

/**
 * Fixed-window counters, per server instance. Best effort against hammering
 * (slot lookups read Google free/busy): the hard guarantees are in SQL (one
 * booking per session / submission, the per-calendar lock). Tokens are 256-bit,
 * so these limits are not what stops guessing.
 */
const windows = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const hit = windows.get(key);
  if (!hit || hit.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
      if (windows.size >= MAX_KEYS) windows.delete(windows.keys().next().value as string);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  hit.count += 1;
  return hit.count > limit;
}

/** Tests only. */
export function resetRateLimits(): void {
  windows.clear();
}

/** Limits per client (IP hash), per window. */
export const LIMITS = {
  slots: { limit: 60, windowMs: 10 * 60_000 },
  book: { limit: 12, windowMs: 10 * 60_000 },
  callback: { limit: 5, windowMs: 60 * 60_000 },
  manageRead: { limit: 60, windowMs: 10 * 60_000 },
  manageWrite: { limit: 10, windowMs: 10 * 60_000 },
} as const;

export function limited(request: Request, bucket: keyof typeof LIMITS, extraKey?: string): boolean {
  const { limit, windowMs } = LIMITS[bucket];
  if (rateLimited(`${bucket}:${clientKey(request)}`, limit, windowMs)) return true;
  return !!extraKey && rateLimited(`${bucket}:k:${extraKey}`, limit, windowMs);
}

/** JSON body, 20 KB cap (same reader as the funnel routes). Null when unreadable. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 20_000) return null;
    const text = await request.text();
    if (text.length > 20_000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Grant from the `X-Booking-Grant` header (GET) — kept out of URLs so it never lands in logs. */
export function grantHeader(request: Request): string | null {
  return request.headers.get('x-booking-grant');
}
