import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildEventsPayload, sendMetaEvent, testEventCode } from '@/lib/meta/capi';
import { loadLeadMetaIds, rememberLeadMetaIds } from '@/lib/meta/lead-ids';

const event = {
  pixelId: '933962709362966', eventName: 'Schedule' as const, eventId: 'sess-1:Schedule', eventSourceUrl: 'https://pool.example/estimate',
  user: { email: 'Jordan@Example.com', phone: '(818) 555-0142', fbp: 'fb.1.1.111', fbc: 'fb.1.2.abc', clientIpAddress: '203.0.113.9', clientUserAgent: 'UA' },
};

describe('Meta test_event_code', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it('accepts well-formed codes only', () => {
    expect(testEventCode('TEST12345')).toBe('TEST12345');
    expect(testEventCode(' TEST12345 ')).toBe('TEST12345');
    expect(testEventCode('')).toBeUndefined();
    expect(testEventCode(undefined)).toBeUndefined();
    expect(testEventCode('bad code;drop')).toBeUndefined();
  });
  it('adds test_event_code to the payload only when a code is given', () => {
    expect(buildEventsPayload(event)).not.toHaveProperty('test_event_code');
    expect(buildEventsPayload(event, 'TEST12345')).toMatchObject({ test_event_code: 'TEST12345' });
  });
  it('keeps the shared event_id, web action source and raw fbp/fbc, with PII hashed', () => {
    const [data] = buildEventsPayload(event, 'TEST12345').data;
    expect(data).toMatchObject({ event_name: 'Schedule', event_id: 'sess-1:Schedule', action_source: 'website' });
    expect(data.user_data).toMatchObject({ fbp: 'fb.1.1.111', fbc: 'fb.1.2.abc', client_ip_address: '203.0.113.9' });
    expect(data.user_data.em).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(data)).not.toContain('Jordan@Example.com');
  });
  it('sends no test_event_code in normal operation and the env code when verifying', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TOKEN', 'tok');
    const send = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', send);
    await sendMetaEvent(event);
    expect(JSON.parse(send.mock.calls[0][1].body)).not.toHaveProperty('test_event_code');
    vi.stubEnv('META_TEST_EVENT_CODE', 'TEST777'); vi.spyOn(console, 'warn').mockImplementation(() => {});
    await sendMetaEvent(event);
    expect(JSON.parse(send.mock.calls[1][1].body)).toMatchObject({ test_event_code: 'TEST777', data: [{ event_id: 'sess-1:Schedule' }] });
  });
});

type Update = { values: Record<string, unknown>; filters: unknown[][] };
function fakeDb(row: Record<string, unknown> | null = null) {
  const updates: Update[] = [];
  return {
    updates,
    db: {
      from: () => ({
        update: (values: Record<string, unknown>) => {
          const u: Update = { values, filters: [] }; updates.push(u);
          const chain = { eq: (c: string, v: unknown) => { u.filters.push(['eq', c, v]); return chain; }, is: (c: string, v: unknown) => { u.filters.push(['is', c, v]); return Promise.resolve({ error: null }); } };
          return chain;
        },
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }),
      }),
    } as never,
  };
}

describe('lead fbp/fbc storage', () => {
  it('stores each identifier write-once (only where the column is still null)', async () => {
    const { db, updates } = fakeDb();
    await rememberLeadMetaIds(db, 'lead-1', { fbp: 'fb.1.1.111', fbc: 'fb.1.2.abc' });
    expect(updates.map(u => u.values)).toEqual([{ fbp: 'fb.1.1.111' }, { fbc: 'fb.1.2.abc' }]);
    expect(updates[0].filters).toEqual([['eq', 'id', 'lead-1'], ['is', 'fbp', null]]);
  });
  it('skips missing identifiers and loads them back', async () => {
    const { db, updates } = fakeDb({ fbp: 'fb.1.1.111', fbc: null });
    await rememberLeadMetaIds(db, 'lead-1', { fbp: '  ', fbc: undefined });
    expect(updates).toHaveLength(0);
    expect(await loadLeadMetaIds(db, 'lead-1')).toEqual({ fbp: 'fb.1.1.111', fbc: undefined });
    expect(await loadLeadMetaIds(db, null)).toEqual({});
  });
});
