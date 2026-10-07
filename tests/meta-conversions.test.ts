/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildPayload, decide, identifierSummary, interpretResponse, backoffMinutes, websiteOutcomeActionSource, type EligibilityInput, type LeadForMeta, type Plan, type SessionForMeta } from '@/lib/meta/conversions';
import { dispatchBatch, feedFromLedger, type ClaimedEvent, type FinishPatch, type LedgerRow, type LoadedLead, type NewEvent, type QueueStore, type Settings } from '@/lib/meta/queue';

const NOW = Date.parse('2026-10-07T12:00:00Z');
const webLead: LeadForMeta = { id: 'L1', source: 'website', external_lead_id: 'sess-1', created_at: '2026-10-05T10:00:00Z', email: 'Jordan@Example.com', phone: '+18185550142', first_name: 'Jordan', last_name: 'Lee', zip: '90210', fbp: 'fb.1.1.2', fbc: 'fb.1.2.abc', fbclid: 'abc', ad_id: '123', landing_page_url: 'https://pool.example/estimate/x' };
const session: SessionForMeta = { id: 'sess-1', createdAt: '2026-10-05T09:59:00Z', measurementAllowed: true, consentMode: 'opt_in', pixelId: '933962709362966', isDemo: false, slug: 'x' };
const igLead: LeadForMeta = { ...webLead, id: 'L2', source: 'meta', external_lead_id: '123456789012345', fbp: null, fbc: null, fbclid: null };
const base = (o: Partial<EligibilityInput> = {}): EligibilityInput => ({ stage: 'qualified', occurredAt: '2026-10-06T10:00:00Z', now: NOW, lead: webLead, session, datasetId: '555000111', ...o });

describe('website events (standard Pixel dataset)', () => {
  it('maps a qualified lead to the CUSTOM QualifiedLead event with the browser-style event_id', () => {
    const d = decide(base());
    expect(d).toMatchObject({ ok: true, plan: { eventName: 'QualifiedLead', actionSource: 'other', eventId: 'sess-1:QualifiedLead', datasetId: '933962709362966', sourceKind: 'website_pixel' } });
  });
  it('maps won to the custom WonJob event, not Purchase, with value only when the real amount and currency exist', () => {
    const w = decide(base({ stage: 'won', value: 18500, currency: 'USD', ref: { saleId: 's1' } }));
    expect(w).toMatchObject({ ok: true, plan: { eventName: 'WonJob', value: 18500, currency: 'USD' } });
    expect(decide(base({ stage: 'won', value: null, currency: null, ref: { saleId: 's1' } }))).toMatchObject({ ok: true, plan: { eventName: 'WonJob', value: null, currency: null } });
    expect(decide(base({ stage: 'won', value: 100, currency: 'dollars', ref: { saleId: 's1' } }))).toMatchObject({ ok: true, plan: { value: null } });
  });
  it('never duplicates what the funnel already sends directly (Lead; Schedule for a Calendly booking)', () => {
    expect(decide(base({ stage: 'lead' }))).toMatchObject({ ok: false, reason: 'sent_directly_by_funnel' });
    expect(decide(base({ stage: 'appointment', ref: { appointmentId: 'ap1', funnelBooking: 'calendly' } }))).toMatchObject({ ok: false, reason: 'sent_directly_by_funnel' });
  });
  it('separate appointments and sales on one lead are separate events; qualification is once per lead', () => {
    const a1 = decide(base({ stage: 'appointment', ref: { appointmentId: 'ap1' } })), a2 = decide(base({ stage: 'appointment', ref: { appointmentId: 'ap2' } }));
    if (!a1.ok || !a2.ok) throw new Error('x');
    expect(a1.plan.eventId).toBe('sess-1:Schedule:ap1'); expect(a2.plan.eventId).toBe('sess-1:Schedule:ap2');
    const w1 = decide(base({ stage: 'won', ref: { saleId: 's1' } })), w2 = decide(base({ stage: 'won', ref: { saleId: 's2' } }));
    if (!w1.ok || !w2.ok) throw new Error('x');
    expect(w1.plan.eventId).not.toBe(w2.plan.eventId);
    expect((decide(base({ stage: 'qualified' })) as { plan: Plan }).plan.eventId).toBe('sess-1:QualifiedLead');
    expect(decide(base({ stage: 'won' }))).toMatchObject({ ok: false, reason: 'missing_reference' });
  });
  it('labels the REAL event source: staff-recorded outcomes are not website conversions', () => {
    expect(websiteOutcomeActionSource('qualified')).toBe('other');
    expect(websiteOutcomeActionSource('won', { saleId: 's' })).toBe('other');
    expect(websiteOutcomeActionSource('appointment', { appointmentId: 'a', actorKind: 'user' })).toBe('other');
    expect(websiteOutcomeActionSource('appointment', { appointmentId: 'a', actorKind: 'ai' })).toBe('phone_call');
  });
  it('covers a visitor booking through the GHL calendar (browser fires Schedule, no server event existed) with the browser event id and website source', () => {
    expect(decide(base({ stage: 'appointment', ref: { appointmentId: 'ap9', funnelBooking: 'other' } })))
      .toMatchObject({ ok: true, plan: { eventName: 'Schedule', eventId: 'sess-1:Schedule', actionSource: 'website' } });
  });
  it('a portal-created appointment after a Calendly booking is NOT suppressed', () => {
    expect(decide(base({ stage: 'appointment', ref: { appointmentId: 'portal-2', funnelBooking: null } }))).toMatchObject({ ok: true, plan: { eventId: 'sess-1:Schedule:portal-2', actionSource: 'other' } });
  });
  it('respects the stored advertising-measurement choice and the consent-mode default', () => {
    expect(decide(base({ session: { ...session, measurementAllowed: false } }))).toMatchObject({ ok: false, reason: 'measurement_not_allowed' });
    expect(decide(base({ session: { ...session, measurementAllowed: null, consentMode: 'opt_in' } }))).toMatchObject({ ok: false, reason: 'measurement_not_allowed' });
    expect(decide(base({ session: { ...session, measurementAllowed: null, consentMode: 'opt_out' } })).ok).toBe(true);
  });
  it('does not touch demo funnels, leads without any Meta signal, or leads with no pixel', () => {
    expect(decide(base({ session: { ...session, isDemo: true } }))).toMatchObject({ ok: false, reason: 'demo' });
    expect(decide(base({ lead: { ...webLead, fbc: null, fbp: null, fbclid: null, ad_id: null } }))).toMatchObject({ ok: false, reason: 'not_meta_lead' });
    expect(decide(base({ session: { ...session, pixelId: undefined } }))).toMatchObject({ ok: false, reason: 'no_pixel' });
    expect(decide(base({ lead: { ...webLead, source: 'referral' } }))).toMatchObject({ ok: false, reason: 'not_meta_lead' });
  });
  it('refuses events older than Meta\'s 7 days or earlier than the lead, and never re-dates them', () => {
    expect(decide(base({ occurredAt: '2026-09-29T00:00:00Z' }))).toMatchObject({ ok: false, reason: 'too_old' });
    expect(decide(base({ occurredAt: '2026-10-05T09:00:00Z' }))).toMatchObject({ ok: false, reason: 'before_lead_created' });
    expect(decide(base({ occurredAt: 'garbage' }))).toMatchObject({ ok: false, reason: 'invalid_event_time' });
  });
  it('builds a web payload with the real event time, hashed PII, raw fbp/fbc, and no free text', () => {
    const d = decide(base({ stage: 'won', value: 500, currency: 'USD', ref: { saleId: 's1' } })); if (!d.ok) throw new Error('x');
    const p = buildPayload({ event_name: d.plan.eventName, event_id: d.plan.eventId, event_time: '2026-10-06T10:00:00Z', action_source: d.plan.actionSource, value: 500, currency: 'USD', source_kind: 'website_pixel' }, webLead, { eventSourceUrl: webLead.landing_page_url, testEventCode: 'TEST123' });
    const ev = p.data[0] as Record<string, any>;
    expect(ev.event_time).toBe(Date.parse('2026-10-06T10:00:00Z') / 1000);
    expect(ev.user_data.em).toMatch(/^[a-f0-9]{64}$/); expect(ev.user_data.fbp).toBe('fb.1.1.2');
    expect(ev.user_data.client_ip_address).toBeUndefined();
    expect(ev.custom_data).toEqual({ value: 500, currency: 'USD' });
    expect(ev.action_source).toBe('other'); expect(ev.event_source_url).toBeUndefined(); // only website events carry a source URL
    const web = buildPayload({ event_name: 'Schedule', event_id: 'x', event_time: '2026-10-06T10:00:00Z', action_source: 'website', value: null, currency: null, source_kind: 'website_pixel' }, webLead, { eventSourceUrl: 'https://pool.example/estimate/x' });
    expect((web.data[0] as Record<string, unknown>).event_source_url).toBe('https://pool.example/estimate/x');
    expect(p.test_event_code).toBe('TEST123');
    expect(JSON.stringify(p)).not.toMatch(/Jordan@|8185550142|notes|transcript/i);
  });
});

describe('Instant Form leads (Conversions API for CRM)', () => {
  it('uses system_generated + the Meta lead id + crm custom_data, and sends no customer PII', () => {
    const d = decide(base({ lead: igLead, session: null })); if (!d.ok) throw new Error(JSON.stringify(d));
    expect(d.plan).toMatchObject({ sourceKind: 'instant_form_crm', eventName: 'qualified', actionSource: 'system_generated', eventId: 'crm:123456789012345:qualified', datasetId: '555000111' });
    const p = buildPayload({ event_name: 'qualified', event_id: d.plan.eventId, event_time: '2026-10-06T10:00:00Z', action_source: 'system_generated', value: null, currency: null, source_kind: 'instant_form_crm' }, igLead, {});
    expect(p.data[0]).toMatchObject({ action_source: 'system_generated', user_data: { lead_id: '123456789012345' }, custom_data: { event_source: 'crm', lead_event_source: 'HomeQuote Network' } });
    expect(identifierSummary(p)).toEqual(['lead_id']);
    expect(JSON.stringify(p)).not.toMatch(/example\.com|8185550142|em"|ph"/);
  });
  it('needs a valid 15-17 digit lead id and a configured dataset', () => {
    expect(decide(base({ lead: { ...igLead, external_lead_id: 'abc' }, session: null }))).toMatchObject({ ok: false, reason: 'missing_meta_lead_id' });
    expect(decide(base({ lead: igLead, session: null, datasetId: null }))).toMatchObject({ ok: false, reason: 'no_dataset' });
  });
  it('does not need browser-measurement consent (no browser data is used) but still enforces the 7-day window', () => {
    expect(decide(base({ lead: igLead, session: null })).ok).toBe(true);
    expect(decide(base({ lead: igLead, session: null, occurredAt: '2026-09-20T00:00:00Z' }))).toMatchObject({ ok: false, reason: 'too_old' });
  });
});

describe('response handling', () => {
  it('"accepted" requires success AND events_received >= 1', () => {
    expect(interpretResponse(1, 5, { ok: true, body: { events_received: 1, fbtrace_id: 'T' } })).toMatchObject({ kind: 'accepted', fbtraceId: 'T' });
    expect(interpretResponse(1, 5, { ok: true, body: { events_received: 0 } })).toMatchObject({ kind: 'permanent', code: 'not_received' });
  });
  const f = (kind: string, retryable: boolean, code: number | null = null) => ({ ok: false as const, failure: { kind, retryable, code, message: 'm', httpStatus: 400, fbtraceId: null } });
  it('retries rate limits/transients with backoff, then fails permanently when exhausted', () => {
    expect(interpretResponse(1, 5, f('rate_limit', true, 17))).toMatchObject({ kind: 'retry', minutes: 5 });
    expect(interpretResponse(3, 5, f('transient', true))).toMatchObject({ kind: 'retry', minutes: 4 });
    expect(interpretResponse(5, 5, f('rate_limit', true, 17))).toMatchObject({ kind: 'permanent', code: 'rate_limit:17:retries_exhausted' });
  });
  it('fails auth/permission/invalid immediately', () => {
    for (const k of ['auth', 'permission', 'invalid']) expect(interpretResponse(1, 5, f(k, false))).toMatchObject({ kind: 'permanent' });
    expect(backoffMinutes(20, 'rate_limit')).toBe(360);
  });
});

// ------------------------------------------------------------------------------------------------
// Queue orchestration with an in-memory store
// ------------------------------------------------------------------------------------------------
const bookings: Record<string, 'calendly' | 'other'> = {};
function memStore(settings: Partial<Settings>, leads: Record<string, LoadedLead>, ledger: LedgerRow[]) {
  const s: Settings = { deliveryMode: 'live', testEventCode: null, datasetId: '555000111', cursorAt: '2026-10-01T00:00:00Z', cursorId: null, ...settings };
  const events: (NewEvent & { id: string; attempt_count: number; max_attempts: number; status: string; next_attempt_at: string; finished?: FinishPatch })[] = [];
  const store: QueueStore = {
    settings: async () => s,
    ledgerAfter: async (at) => ledger.filter((r) => !at || r.recorded_at > at),
    advanceCursor: async (r) => { s.cursorAt = r.recorded_at; s.cursorId = r.id; },
    loadLead: async (id) => leads[id] ?? null,
    funnelBooking: async (id) => bookings[id] ?? null,
    insertEvent: async (e) => {
      if (events.some((x) => x.dataset_id === e.dataset_id && x.event_id === e.event_id && x.test_mode === e.test_mode)) return 'duplicate';
      events.push({ ...e, id: `ev${events.length + 1}`, attempt_count: 0, max_attempts: 5, next_attempt_at: new Date(0).toISOString() }); return 'inserted';
    },
    claim: async (limit) => events.filter((e) => e.status === 'pending' && e.next_attempt_at <= new Date(NOW).toISOString()).slice(0, limit).map((e) => { e.attempt_count++; Object.assign(e, { status: 'processing' }); return e as unknown as ClaimedEvent; }),
    finish: async (id, p) => { const e = events.find((x) => x.id === id)!; Object.assign(e, p, { status: p.status }); },
  };
  return { store, events, s };
}
const lrow = (id: string, outcome: string, at: string, over: Partial<LedgerRow> = {}): LedgerRow => ({ id, lead_id: 'L1', outcome, occurred_at: at, recorded_at: at, actor_kind: 'user', amount: null, currency: null, appointment_id: null, sale_id: null, ...over });
const ok = { ok: true as const, body: { events_received: 1, fbtrace_id: 'TR' } };

describe('feedFromLedger / dispatchBatch', () => {
  const leads = { L1: { lead: webLead, session, contractorId: 'c1' }, L2: { lead: igLead, session: null, contractorId: null } };

  it('does nothing while delivery is off or never activated (no backfill)', async () => {
    for (const s of [{ deliveryMode: 'off' as const }, { cursorAt: null }]) {
      const m = memStore(s, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
      expect(await feedFromLedger(m.store, { now: NOW })).toMatchObject({ examined: 0, enqueued: 0 });
      expect(m.events).toHaveLength(0);
    }
  });
  it('ignores AI/system qualification and outcomes Meta has no stage for', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z', { actor_kind: 'ai' }), lrow('o2', 'not_qualified', '2026-10-06T11:00:00Z'), lrow('o3', 'lost', '2026-10-06T12:00:00Z')]);
    expect(await feedFromLedger(m.store, { now: NOW })).toMatchObject({ examined: 3, ignored: 3, enqueued: 0 });
  });
  it('is idempotent: repeated feeds and a repeated ledger row create one event', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    m.s.cursorAt = '2026-10-01T00:00:00Z'; // simulate a replay (cursor lost / two workers)
    const again = await feedFromLedger(m.store, { now: NOW });
    expect(m.events).toHaveLength(1); expect(again.duplicates).toBe(1);
  });
  it('queues the initial lead stage before later stages for Instant Form leads', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z', { lead_id: 'L2' })]);
    await feedFromLedger(m.store, { now: NOW });
    expect(m.events.map((e) => e.event_name)).toEqual(['lead_received', 'qualified']);
    expect(m.events[0].event_time).toBe(igLead.created_at); // the real lead time, not "now"
  });
  it('records an ineligible-but-Meta lead as a visible skipped row; ignores non-Meta leads silently', async () => {
    const m = memStore({}, { L1: { lead: webLead, session: { ...session, measurementAllowed: false }, contractorId: null } }, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    expect(await feedFromLedger(m.store, { now: NOW })).toMatchObject({ skipped: 1, enqueued: 0 });
    expect(m.events[0]).toMatchObject({ status: 'skipped', skip_reason: 'measurement_not_allowed' });
  });
  it('holds everything in off mode and in test mode without a test code', async () => {
    const m = memStore({ deliveryMode: 'test', testEventCode: null }, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    const send = vi.fn(async () => ok);
    expect(await dispatchBatch(m.store, send, { now: NOW })).toMatchObject({ held: 'test_mode_needs_test_event_code' });
    expect(send).not.toHaveBeenCalled();
  });
  it('test mode sends with test_event_code and marks rows test_mode', async () => {
    const m = memStore({ deliveryMode: 'test', testEventCode: 'TEST42' }, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    const send = vi.fn(async () => ok);
    await dispatchBatch(m.store, send, { now: NOW });
    expect((send.mock.calls[0] as any)[0].payload.test_event_code).toBe('TEST42');
    expect(m.events[0]).toMatchObject({ test_mode: true, status: 'accepted' });
  });
  it('accepts, retries rate limits with backoff, and fails permanently on auth errors', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z'), lrow('o2', 'won', '2026-10-06T11:00:00Z', { amount: 900, currency: 'USD', sale_id: 'sale-1' }), lrow('o3', 'appointment_booked', '2026-10-06T12:00:00Z', { appointment_id: 'ap-1' })]);
    await feedFromLedger(m.store, { now: NOW });
    const fail = (kind: string, retryable: boolean, code: number) => ({ ok: false as const, failure: { kind, retryable, code, message: 'm', httpStatus: 400, fbtraceId: null } });
    const send = vi.fn().mockResolvedValueOnce(ok).mockResolvedValueOnce(fail('rate_limit', true, 17)).mockResolvedValueOnce(fail('auth', false, 190));
    const r = await dispatchBatch(m.store, send, { now: NOW });
    expect(r).toMatchObject({ claimed: 3, accepted: 1, retried: 1, failed: 1 });
    const by = Object.fromEntries(m.events.map((e) => [e.event_name, e]));
    expect(by.QualifiedLead.status).toBe('accepted');
    expect(by.WonJob).toMatchObject({ status: 'pending', last_error_code: 'rate_limit:17' });
    expect(by.WonJob.next_attempt_at > new Date(NOW).toISOString()).toBe(true);
    expect(by.Schedule).toMatchObject({ status: 'failed', permanent_failure: true, last_error_code: 'auth:190' });
  });
  it('a send that throws is retried, never lost', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    await dispatchBatch(m.store, async () => { throw new Error('boom'); }, { now: NOW });
    expect(m.events[0].status).toBe('pending');
  });
  it('fails events that aged past 7 days while waiting, without re-dating them', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    const send = vi.fn(async () => ok);
    await dispatchBatch(m.store, send, { now: NOW + 8 * 24 * 3600_000 });
    expect(send).not.toHaveBeenCalled();
    expect(m.events[0]).toMatchObject({ status: 'failed', last_error_code: 'event_too_old', event_time: '2026-10-06T10:00:00Z' });
  });
  it('re-checks consent at send time: a later opt-out stops queued events', async () => {
    const m = memStore({}, leads, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    leads.L1 = { ...leads.L1, session: { ...session, measurementAllowed: false } };
    const send = vi.fn(async () => ok);
    await dispatchBatch(m.store, send, { now: NOW });
    expect(send).not.toHaveBeenCalled();
    expect(m.events[0]).toMatchObject({ status: 'skipped', skip_reason: 'measurement_not_allowed' });
  });
  it('a locally corrected status does not unsend: an accepted event stays accepted', async () => {
    const m = memStore({}, { L1: { lead: webLead, session, contractorId: null } }, [lrow('o1', 'qualified', '2026-10-06T10:00:00Z'), lrow('o2', 'not_qualified', '2026-10-06T14:00:00Z')]);
    await feedFromLedger(m.store, { now: NOW });
    await dispatchBatch(m.store, async () => ok, { now: NOW });
    expect(m.events).toHaveLength(1); expect(m.events[0].status).toBe('accepted');
  });
});

describe('queue coverage of every appointment path', () => {
  const leads = { L1: { lead: webLead, session, contractorId: null } };
  it('Calendly: skipped (funnel sent it); GHL: queued with the browser id; portal/AI after a Calendly booking: queued separately', async () => {
    bookings['cal'] = 'calendly'; bookings['ghl'] = 'other';
    const m = memStore({}, leads, ['cal', 'ghl', 'portal'].map((a, i) => lrow(`o${i}`, 'appointment_booked', `2026-10-06T1${i}:00:00Z`, { appointment_id: a })));
    await feedFromLedger(m.store, { now: NOW });
    expect(m.events.filter((e) => e.status === 'pending').map((e) => [e.event_id, e.action_source])).toEqual([['sess-1:Schedule', 'website'], ['sess-1:Schedule:portal', 'other']]);
    expect(m.events.find((e) => e.status === 'skipped')?.skip_reason).toBe('sent_directly_by_funnel');
  });
  it('two sales on one lead produce two website events; the same sale replayed produces one', async () => {
    const m = memStore({}, leads, [lrow('o1', 'won', '2026-10-06T10:00:00Z', { sale_id: 's1', amount: 100, currency: 'USD' }), lrow('o2', 'won', '2026-10-06T11:00:00Z', { sale_id: 's2', amount: 200, currency: 'USD' })]);
    await feedFromLedger(m.store, { now: NOW });
    m.s.cursorAt = '2026-10-01T00:00:00Z';
    await feedFromLedger(m.store, { now: NOW });
    expect(m.events.map((e) => e.event_id)).toEqual(['sess-1:WonJob:s1', 'sess-1:WonJob:s2']);
  });
  it('Instant Form: one event per stage even with several appointments or sales', async () => {
    const igLeads = { L2: { lead: igLead, session: null, contractorId: null } };
    const m = memStore({}, igLeads, [lrow('a', 'appointment_booked', '2026-10-06T10:00:00Z', { lead_id: 'L2', appointment_id: 'x1' }), lrow('b', 'appointment_booked', '2026-10-06T11:00:00Z', { lead_id: 'L2', appointment_id: 'x2' })]);
    await feedFromLedger(m.store, { now: NOW });
    expect(m.events.map((e) => e.event_id)).toEqual(['crm:123456789012345:lead', 'crm:123456789012345:appointment']);
  });
});
