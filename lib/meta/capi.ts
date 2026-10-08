import 'server-only';
import { redactSecrets } from './marketing-api';
import { createHash } from 'node:crypto';
import { normalizeEmail, normalizePhone } from '@/lib/leads/normalize';

/**
 * Meta Conversions API (server-side event) — paired with the existing browser
 * Pixel in lib/funnels/tracking.ts via a shared event_id so Meta deduplicates
 * instead of double-counting. No access token ever reaches the browser: this
 * file is server-only and reads META_CONVERSIONS_API_TOKEN from process.env.
 *
 * Degrades gracefully, like the rest of this app's optional integrations
 * (e.g. GOOGLE_PLACES_API_KEY): with no token configured, sendMetaEvent is a
 * silent no-op rather than a thrown error — a funnel submission must never
 * fail because ad tracking isn't configured.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Meta requires lower-cased, trimmed input before hashing user-matching fields. */
function hashed(value: string | null | undefined): string | undefined {
  const v = (value ?? '').trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

export type MetaUserData = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  // Known to be California for every event this app sends today (the only
  // state the Pool Masters service-area gate currently accepts); kept as a
  // parameter rather than hardcoded so a future funnel/state isn't silently wrong.
  state?: string | null;
  zip?: string | null;
  // Sent raw per Meta's spec — never hashed.
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type MetaLeadEvent = {
  pixelId: string;
  eventName: 'Lead' | 'Schedule' | 'QualifiedLead' | 'ViewContent' | 'PageView';
  eventId: string;
  eventSourceUrl: string;
  eventTime?: number; // unix seconds; defaults to now
  user: MetaUserData;
};

/** Builds the Conversions API user_data object: hashed PII, raw IP/UA/fbp/fbc. */
export function buildUserData(user: MetaUserData): Record<string, string> {
  const data: Record<string, string> = {};
  const em = hashed(normalizeEmail(user.email));
  const ph = hashed(normalizePhone(user.phone)?.replace(/^\+/, ''));
  const fn = hashed(user.firstName);
  const ln = hashed(user.lastName);
  const st = hashed(user.state);
  const zp = hashed(user.zip);
  const country = hashed('us');
  if (em) data.em = em;
  if (ph) data.ph = ph;
  if (fn) data.fn = fn;
  if (ln) data.ln = ln;
  if (st) data.st = st;
  if (zp) data.zp = zp;
  if (country) data.country = country;
  // Raw, not hashed — Meta's spec requires these as-is.
  if (user.clientIpAddress) data.client_ip_address = user.clientIpAddress;
  if (user.clientUserAgent) data.client_user_agent = user.clientUserAgent;
  if (user.fbp) data.fbp = user.fbp;
  if (user.fbc) data.fbc = user.fbc;
  return data;
}

/**
 * Meta's documented _fbc format: fb.1.<creationTimeMs>.<fbclid>. Only ever
 * built from a real fbclid this visitor arrived with — never invented.
 */
export function buildFbc(fbclid: string | null | undefined, creationTimeMs: number): string | null {
  return fbclid ? `fb.1.${creationTimeMs}.${fbclid}` : null;
}

/**
 * Optional Events Manager "Test events" code (e.g. TEST12345). While META_TEST_EVENT_CODE is set,
 * every server event carries test_event_code, so it ALSO appears under Test Events. IMPORTANT: Meta's documentation says events
 * sent with test_event_code "are not dropped. They flow into Events Manager and are used for targeting and ads measurement
 * purposes" - it is NOT a sandbox. Do not leave it set in production, and do not use it as protection against real counting.
 * Use a separate test dataset for experiments. Malformed values are ignored.
 */
export function testEventCode(env: string | undefined = process.env.META_TEST_EVENT_CODE): string | undefined {
  const code = (env ?? '').trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code : undefined;
}

/** The exact JSON body POSTed to /{dataset}/events (token excluded from the exported builder). */
export function buildEventsPayload(event: MetaLeadEvent, testCode?: string) {
  return {
    data: [{
      event_name: event.eventName,
      event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: event.eventId,
      event_source_url: event.eventSourceUrl,
      action_source: 'website',
      user_data: buildUserData(event.user),
    }],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

let warnedTestMode = false;

export type DirectSendResult = { status: 'accepted' | 'failed' | 'skipped'; httpStatus: number | null; code: string | null; message: string | null; fbtraceId: string | null; eventsReceived: number | null; testMode: boolean };
/**
 * reserve(): written BEFORE the request. 'duplicate' = a live/accepted row already exists for this event id (the queue, or
 * another request, owns it) so this sender must NOT send. finish(): records what happened. An audit failure never blocks a send.
 */
export type DirectSendAudit = {
  reserve(event: MetaLeadEvent): Promise<'ok' | 'duplicate'>;
  finish(event: MetaLeadEvent, result: DirectSendResult): Promise<void>;
};

/**
 * Fire-and-forget: errors are logged (no PII, no token) and swallowed so a
 * funnel submission is never blocked or failed by an ad-tracking hiccup.
 * `audit` (optional) records the outcome in meta_conversion_events (origin 'legacy_direct') so a directly-sent event
 * is visible in the delivery view and the queue can never re-send the same event id.
 */
export async function sendMetaEvent(event: MetaLeadEvent, audit?: DirectSendAudit): Promise<DirectSendResult> {
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  const testCode = testEventCode();
  const base = { httpStatus: null, code: null, message: null, fbtraceId: null, eventsReceived: null, testMode: !!testCode };
  if (!token || !event.pixelId) return { ...base, status: 'skipped', code: !token ? 'no_token' : 'no_pixel' };
  if (testCode && !warnedTestMode) {
    warnedTestMode = true;
    console.warn('[meta-capi] META_TEST_EVENT_CODE is set: events also appear in Test Events but STILL feed the dataset (Meta does not sandbox test events). Remove it from production.');
  }
  if (audit) {
    let reserved: 'ok' | 'duplicate' = 'ok';
    try { reserved = await audit.reserve(event); } catch { /* fail open: losing the audit row is better than losing the event */ }
    if (reserved === 'duplicate') return { ...base, status: 'skipped', code: 'duplicate' };
  }
  let result: DirectSendResult;
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${event.pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ access_token: token, ...buildEventsPayload(event, testCode) }),
    });
    // Meta's success body is { events_received, messages, fbtrace_id }; errors carry error.message/fbtrace_id.
    // Logged without PII or the token so an accepted-vs-dropped event is visible in the server logs.
    const body = await res.json().catch(() => ({})) as { events_received?: number; fbtrace_id?: string; error?: { message?: string; code?: number; fbtrace_id?: string } };
    if (!res.ok || body.error) {
      console.error(`[meta-capi] ${event.eventName} rejected: HTTP ${res.status} code=${body.error?.code ?? 'n/a'} ${redactSecrets(body.error?.message)} trace=${body.error?.fbtrace_id ?? 'n/a'}`);
      result = { ...base, status: 'failed', httpStatus: res.status, code: `graph:${body.error?.code ?? res.status}`, message: (body.error?.message ?? '').slice(0, 300), fbtraceId: body.error?.fbtrace_id ?? null };
    } else {
      console.info(`[meta-capi] ${event.eventName} pixel=${event.pixelId} events_received=${body.events_received ?? 'n/a'} trace=${body.fbtrace_id ?? 'n/a'}`);
      result = { ...base, status: (body.events_received ?? 0) >= 1 ? 'accepted' : 'failed', httpStatus: res.status, code: (body.events_received ?? 0) >= 1 ? null : 'not_received', fbtraceId: body.fbtrace_id ?? null, eventsReceived: body.events_received ?? null };
    }
  } catch (error) {
    console.error(`[meta-capi] ${event.eventName} failed`, error instanceof Error ? error.name : 'unknown');
    result = { ...base, status: 'failed', code: 'network', message: error instanceof Error ? error.name : 'unknown' };
  }
  try { await audit?.finish(event, result); } catch { /* auditing must never break a funnel request */ }
  return result;
}
