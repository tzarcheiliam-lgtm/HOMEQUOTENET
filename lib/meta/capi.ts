import 'server-only';
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

const GRAPH_VERSION = 'v21.0';

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
  eventName: 'Lead' | 'Schedule' | 'ViewContent' | 'PageView';
  eventId: string;
  eventSourceUrl: string;
  eventTime?: number; // unix seconds; defaults to now
  user: MetaUserData;
};

/** Builds the Conversions API user_data object: hashed PII, raw IP/UA/fbp/fbc. */
function buildUserData(user: MetaUserData): Record<string, string> {
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
 * every server event carries test_event_code, so Meta shows it only under Test Events and keeps it
 * out of reporting and ad optimization — which also means REAL conversions stop counting. Set it
 * only for a verification session and remove it afterwards. Malformed values are ignored.
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

/**
 * Fire-and-forget: errors are logged (no PII, no token) and swallowed so a
 * funnel submission is never blocked or failed by an ad-tracking hiccup.
 */
export async function sendMetaEvent(event: MetaLeadEvent): Promise<void> {
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  if (!token || !event.pixelId) return;
  const testCode = testEventCode();
  if (testCode && !warnedTestMode) {
    warnedTestMode = true;
    console.warn('[meta-capi] META_TEST_EVENT_CODE is set: events are sent as TEST events and will not count toward reporting');
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${event.pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ access_token: token, ...buildEventsPayload(event, testCode) }),
    });
    if (!res.ok) console.error(`[meta-capi] ${event.eventName} rejected: HTTP ${res.status}`);
  } catch (error) {
    console.error(`[meta-capi] ${event.eventName} failed`, error instanceof Error ? error.name : 'unknown');
  }
}
