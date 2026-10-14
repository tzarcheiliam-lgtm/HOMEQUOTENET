import 'server-only';
import { createHash } from 'node:crypto';
import { googleCalendarConfig } from './config';

/** Thrown when Google says the grant is gone (revoked/expired): the connection must be re-authorized. */
export class CalendarAuthError extends Error {}
export class CalendarApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type Fetch = typeof fetch;

export function buildAuthUrl(input: { state: string; codeChallenge: string; loginHint?: string | null; scopes: string[] }): string {
  const config = googleCalendarConfig();
  if (!config) throw new Error('Google Calendar is not configured');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', input.scopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account consent');
  url.searchParams.set('include_granted_scopes', 'false');
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (input.loginHint) url.searchParams.set('login_hint', input.loginHint);
  return url.toString();
}

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
}

export async function exchangeCode(code: string, codeVerifier: string, request: Fetch = fetch): Promise<TokenResponse> {
  const config = googleCalendarConfig();
  if (!config) throw new Error('Google Calendar is not configured');
  const response = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as TokenResponse;
  return response.ok ? json : { error: json.error ?? `http_${response.status}` };
}

export async function refreshAccessToken(refreshToken: string, request: Fetch = fetch): Promise<string> {
  const config = googleCalendarConfig();
  if (!config) throw new Error('Google Calendar is not configured');
  const response = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !json.access_token) {
    if (json.error === 'invalid_grant' || json.error === 'unauthorized_client') {
      throw new CalendarAuthError('Google access was revoked or expired');
    }
    throw new CalendarApiError(`Could not refresh Google access (${json.error ?? response.status})`, response.status);
  }
  return json.access_token;
}

export async function revokeToken(token: string, request: Fetch = fetch): Promise<void> {
  try {
    await request(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    /* best effort: the local credentials are deleted regardless */
  }
}

export async function fetchAccountEmail(accessToken: string, request: Fetch = fetch): Promise<string | null> {
  const response = await request('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const json = (await response.json().catch(() => ({}))) as { email?: string };
  return json.email?.trim() || null;
}

async function api(accessToken: string, url: string, init: RequestInit, request: Fetch): Promise<Response> {
  const response = await request(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (response.status === 401) throw new CalendarAuthError('Google rejected the access token');
  return response;
}

/** Busy intervals only (start/end) — event titles and details are never requested. */
export async function queryFreeBusy(
  accessToken: string,
  calendarId: string,
  fromMs: number,
  toMs: number,
  request: Fetch = fetch
): Promise<{ startMs: number; endMs: number }[]> {
  const response = await api(
    accessToken,
    'https://www.googleapis.com/calendar/v3/freeBusy',
    {
      method: 'POST',
      body: JSON.stringify({
        timeMin: new Date(fromMs).toISOString(),
        timeMax: new Date(toMs).toISOString(),
        items: [{ id: calendarId }],
      }),
    },
    request
  );
  if (!response.ok) throw new CalendarApiError(`Google free/busy failed (${response.status})`, response.status);
  const json = (await response.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  const busy = json.calendars?.[calendarId]?.busy ?? Object.values(json.calendars ?? {})[0]?.busy ?? [];
  return busy
    .map((b) => ({ startMs: new Date(b.start).getTime(), endMs: new Date(b.end).getTime() }))
    .filter((b) => Number.isFinite(b.startMs) && Number.isFinite(b.endMs) && b.endMs > b.startMs);
}

/**
 * Deterministic Google event id for an appointment + connection: base32hex-safe
 * (0-9a-v), so a retried create returns 409 instead of making a duplicate.
 */
export function googleEventId(appointmentId: string, connectionId: string): string {
  return 'hqn' + createHash('sha1').update(`${appointmentId}:${connectionId}`).digest('hex');
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  location?: string | null;
  startIso: string;
  endIso: string;
  url?: string;
}

function eventBody(id: string, event: CalendarEventInput) {
  return {
    id,
    summary: event.summary,
    description: event.description,
    location: event.location ?? undefined,
    start: { dateTime: event.startIso },
    end: { dateTime: event.endIso },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }, { method: 'popup', minutes: 15 }] },
    source: event.url ? { title: 'HomeQuote', url: event.url } : undefined,
  };
}

/** Create the event, or update it when it already exists (idempotent on retries). */
export async function upsertEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEventInput,
  request: Fetch = fetch
): Promise<void> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const body = eventBody(eventId, event);
  const created = await api(accessToken, base, { method: 'POST', body: JSON.stringify(body) }, request);
  if (created.ok) return;
  if (created.status === 409 || created.status === 400) {
    // Already exists (or was deleted: Google keeps cancelled ids around) — patch it back to confirmed.
    const patch: Partial<typeof body> = { ...body };
    delete patch.id;
    const patched = await api(
      accessToken,
      `${base}/${eventId}`,
      { method: 'PATCH', body: JSON.stringify({ ...patch, status: 'confirmed' }) },
      request
    );
    if (patched.ok) return;
    throw new CalendarApiError(`Google event update failed (${patched.status})`, patched.status);
  }
  throw new CalendarApiError(`Google event create failed (${created.status})`, created.status);
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string, request: Fetch = fetch): Promise<void> {
  const response = await api(
    accessToken,
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE' },
    request
  );
  if (response.ok || response.status === 404 || response.status === 410) return;
  throw new CalendarApiError(`Google event delete failed (${response.status})`, response.status);
}
