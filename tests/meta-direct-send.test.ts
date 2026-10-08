import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { sendMetaEvent } from '@/lib/meta/capi';
import { directSendAudit } from '@/lib/meta/audit.server';
import { sendQualifiedLeadEvent } from '@/lib/meta/qualified';

const event = { pixelId: '933962709362966', eventName: 'Lead' as const, eventId: 's1:Lead', eventSourceUrl: 'https://x.test/e', eventTime: 1_790_000_000, user: { email: 'a@b.co' } };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('direct sends are observable', () => {
  it('reports accepted only when Meta counted the event, and calls the audit hook', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TOKEN', 't'); vi.stubEnv('META_TEST_EVENT_CODE', '');
    vi.stubGlobal('fetch', vi.fn(async () => json(200, { events_received: 1, fbtrace_id: 'TR1' })));
    const audit = { reserve: vi.fn(async () => 'ok' as const), finish: vi.fn(async () => undefined) };
    const r = await sendMetaEvent(event, audit);
    expect(r).toMatchObject({ status: 'accepted', eventsReceived: 1, fbtraceId: 'TR1', testMode: false });
    expect(audit.reserve).toHaveBeenCalledWith(event);
    expect(audit.finish).toHaveBeenCalledWith(event, expect.objectContaining({ status: 'accepted' }));
  });
  it('success with 0 events received is a failure, a Graph error carries its code, a network error is recorded', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TOKEN', 't'); vi.stubEnv('META_TEST_EVENT_CODE', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(200, { events_received: 0 })).mockResolvedValueOnce(json(400, { error: { code: 190, message: 'expired', fbtrace_id: 'E1' } })).mockRejectedValueOnce(new Error('x')));
    expect(await sendMetaEvent(event)).toMatchObject({ status: 'failed', code: 'not_received' });
    expect(await sendMetaEvent(event)).toMatchObject({ status: 'failed', code: 'graph:190', fbtraceId: 'E1' });
    expect(await sendMetaEvent(event)).toMatchObject({ status: 'failed', code: 'network' });
  });
  it('does nothing without a token and does not audit a non-attempt', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TOKEN', '');
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    expect(await sendMetaEvent(event)).toMatchObject({ status: 'skipped', code: 'no_token' });
    expect(f).not.toHaveBeenCalled();
  });
  it('a failing audit never breaks the send', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TOKEN', 't'); vi.stubEnv('META_TEST_EVENT_CODE', '');
    vi.stubGlobal('fetch', vi.fn(async () => json(200, { events_received: 1 })));
    const f = vi.fn(async () => json(200, { events_received: 1 })); vi.stubGlobal('fetch', f);
    await expect(sendMetaEvent(event, { reserve: async () => { throw new Error('db down'); }, finish: async () => { throw new Error('db down'); } })).resolves.toMatchObject({ status: 'accepted' });
    expect(f).toHaveBeenCalledTimes(1); // a failing audit fails OPEN: the event is still sent
  });
  it('when the queue (or another request) already owns the event, the direct sender does NOT send', async () => {
    vi.stubEnv('META_CONVERSIONS_API_TOKEN', 't'); vi.stubEnv('META_TEST_EVENT_CODE', '');
    const f = vi.fn(); vi.stubGlobal('fetch', f);
    const finish = vi.fn();
    expect(await sendMetaEvent(event, { reserve: async () => 'duplicate', finish })).toMatchObject({ status: 'skipped', code: 'duplicate' });
    expect(f).not.toHaveBeenCalled(); expect(finish).not.toHaveBeenCalled();
  });
  it('the reservation row records origin legacy_direct, the real event time and no PII or token', async () => {
    const inserts: Record<string, unknown>[] = [];
    const db = { from: () => ({ insert: async (r: Record<string, unknown>) => { inserts.push(r); return { error: null }; } }) };
    await directSendAudit(db as never, { leadId: 'L1', stage: 'lead' }).reserve(event);
    expect(inserts[0]).toMatchObject({ origin: 'legacy_direct', event_id: 's1:Lead', status: 'processing', dataset_id: '933962709362966', action_source: 'website', event_time: new Date(1_790_000_000_000).toISOString() });
    expect(JSON.stringify(inserts[0])).not.toMatch(/a@b\.co|token/i);
  });
});

describe('legacy QualifiedLead sender hands over to the queue', () => {
  const dbWith = (cfg: Record<string, unknown> | null) => {
    const calls: string[] = [];
    const chain = (table: string): unknown => new Proxy({}, { get: (_t, prop) => {
      if (prop === 'maybeSingle') return async () => { calls.push(table); return { data: table === 'meta_settings' ? cfg : null }; };
      return () => chain(table);
    } });
    return { db: { from: (t: string) => chain(t) } as never, calls };
  };
  it('does not even look at the lead when the legacy flag is off', async () => {
    for (const cfg of [{ delivery_mode: 'live', legacy_direct_qualified: false }, { delivery_mode: 'test', legacy_direct_qualified: false }, { delivery_mode: 'off', legacy_direct_qualified: false }]) {
      const { db, calls } = dbWith(cfg);
      await sendQualifiedLeadEvent(db, 'L1');
      expect(calls).toEqual(['meta_settings']);
    }
  });
  it('runs as before while the flag is on (queue off OR in test mode), or before migration 0042 exists', async () => {
    for (const cfg of [{ delivery_mode: 'off', legacy_direct_qualified: true }, { delivery_mode: 'test', legacy_direct_qualified: true }, null]) {
      const { db, calls } = dbWith(cfg);
      await sendQualifiedLeadEvent(db, 'L1');
      expect(calls).toEqual(['meta_settings', 'leads']);
    }
  });
});
