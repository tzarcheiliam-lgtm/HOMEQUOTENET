import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  CalendarAuthError,
  deleteEvent,
  googleEventId,
  pkceChallenge,
  queryFreeBusy,
  refreshAccessToken,
  upsertEvent,
} from '@/lib/calendar/google';
import { decryptCalendarSecret, encryptCalendarSecret, googleCalendarReady } from '@/lib/calendar/config';

const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const event = { summary: 's', description: 'd', startIso: '2026-10-20T16:00:00.000Z', endIso: '2026-10-20T17:00:00.000Z' };

beforeEach(() => {
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'cid';
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret';
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://x.test/cb';
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('google calendar client', () => {
  it('derives a deterministic, Google-legal event id per appointment+connection', () => {
    const id = googleEventId('appt-1', 'conn-1');
    expect(id).toBe(googleEventId('appt-1', 'conn-1'));
    expect(id).not.toBe(googleEventId('appt-1', 'conn-2'));
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/);
  });

  it('computes an S256 PKCE challenge', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('creates the event once, then patches on a 409 retry (no duplicate)', async () => {
    const calls: { url: string; method: string }[] = [];
    const request = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET' });
      return init.method === 'POST' ? json(409) : json(200);
    });
    await upsertEvent('tok', 'primary', 'hqnabc', event, request as unknown as typeof fetch);
    expect(calls.map((c) => c.method)).toEqual(['POST', 'PATCH']);
    expect(calls[1].url).toContain('/events/hqnabc');
    const created = vi.fn(async () => json(200));
    await upsertEvent('tok', 'primary', 'hqnabc', event, created as unknown as typeof fetch);
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('throws on a real create failure and on a 401', async () => {
    await expect(upsertEvent('t', 'primary', 'id', event, (async () => json(500)) as unknown as typeof fetch)).rejects.toThrow(/create failed/);
    await expect(upsertEvent('t', 'primary', 'id', event, (async () => json(401)) as unknown as typeof fetch)).rejects.toBeInstanceOf(CalendarAuthError);
  });

  it('treats delete of a missing event as success', async () => {
    await expect(deleteEvent('t', 'primary', 'id', (async () => json(404)) as unknown as typeof fetch)).resolves.toBeUndefined();
    await expect(deleteEvent('t', 'primary', 'id', (async () => json(410)) as unknown as typeof fetch)).resolves.toBeUndefined();
    await expect(deleteEvent('t', 'primary', 'id', (async () => json(500)) as unknown as typeof fetch)).rejects.toThrow();
  });

  it('maps invalid_grant on refresh to CalendarAuthError', async () => {
    await expect(refreshAccessToken('r', (async () => json(400, { error: 'invalid_grant' })) as unknown as typeof fetch)).rejects.toBeInstanceOf(CalendarAuthError);
    await expect(refreshAccessToken('r', (async () => json(200, { access_token: 'a' })) as unknown as typeof fetch)).resolves.toBe('a');
    await expect(refreshAccessToken('r', (async () => json(503, { error: 'backend' })) as unknown as typeof fetch)).rejects.not.toBeInstanceOf(CalendarAuthError);
  });

  it('returns only start/end busy intervals and never asks for event details', async () => {
    let body = '';
    const request = vi.fn(async (_u: string, init: RequestInit) => {
      body = String(init.body);
      return json(200, { calendars: { primary: { busy: [{ start: '2026-10-20T16:00:00Z', end: '2026-10-20T17:00:00Z' }, { start: 'bad', end: 'bad' }] } } });
    });
    const busy = await queryFreeBusy('t', 'primary', Date.UTC(2026, 9, 20), Date.UTC(2026, 9, 21), request as unknown as typeof fetch);
    expect(busy).toEqual([{ startMs: Date.UTC(2026, 9, 20, 16), endMs: Date.UTC(2026, 9, 20, 17) }]);
    expect(JSON.parse(body)).toMatchObject({ items: [{ id: 'primary' }] });
  });

  it('encrypts stored credentials and degrades when unconfigured', () => {
    const enc = encryptCalendarSecret('refresh-token');
    expect(enc).not.toContain('refresh-token');
    expect(decryptCalendarSecret(enc)).toBe('refresh-token');
    expect(googleCalendarReady()).toBe(true);
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    expect(googleCalendarReady()).toBe(false);
  });
});
