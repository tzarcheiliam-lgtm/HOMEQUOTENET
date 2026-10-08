/* eslint-disable @typescript-eslint/no-explicit-any */
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fakeSupabase } from './helpers/pglite-supabase';
import { fullSchema } from './helpers/full-migrations';
import { deliveryModePatch, type DeliveryMode } from '@/lib/meta/settings';
import { sendQualifiedLeadEvent } from '@/lib/meta/qualified';
import { directSendAudit, requeueFailedEvent, sweepStaleDirectSends } from '@/lib/meta/audit.server';
import { sendMetaEvent } from '@/lib/meta/capi';
import { dispatchBatch, feedFromLedger, type ClaimedEvent, type LedgerRow, type LoadedLead, type QueueStore, type SendFn, type Settings } from '@/lib/meta/queue';
import { graphSend } from '@/lib/meta/queue.server';

/**
 * Proof of the direct-sender <-> queue handoff on a disposable database built from every real migration:
 * Off -> Test -> Live -> Off, retries, in-flight direct requests, and events the direct sender already attempted.
 * Meta is a stubbed fetch that records every request. This demonstrates OUR bookkeeping, not anything at Meta.
 */
let db: PGlite; let sb: any;
const q = async <T = any>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const PIXEL = '933962709362966';
const TEST_DATASET = '777000123';
let contractor: string; let staff: string;
const sent: { event_id: string; test: boolean; name: string; dataset: string }[] = [];
let failNext: 'none' | 'http500' | 'graph190' | 'hang' = 'none';

function stubMeta() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const ev = body.data[0];
    if (failNext === 'http500') { failNext = 'none'; return new Response(JSON.stringify({ error: { code: 2, message: 'oops' } }), { status: 500 }); }
    if (failNext === 'graph190') { failNext = 'none'; return new Response(JSON.stringify({ error: { code: 190, message: 'expired' } }), { status: 400 }); }
    sent.push({ event_id: ev.event_id, test: !!body.test_event_code, name: ev.event_name, dataset: (String(url).match(/\/(\d+)\/events/) ?? [])[1] });
    expect(String(url)).not.toContain('tok'); // the token never appears in a URL
    return new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'T' }), { status: 200 });
  }));
}

/** QueueStore backed by the real tables (the same SQL the Supabase store issues). */
function pgStore(): QueueStore {
  return {
    settings: async (): Promise<Settings> => {
      const r = (await q(`select * from meta_settings`))[0];
      return { deliveryMode: r.delivery_mode, testEventCode: r.test_event_code, testDatasetId: r.test_dataset_id, datasetId: r.dataset_id, cursorAt: r.ledger_cursor_at?.toISOString?.() ?? r.ledger_cursor_at, cursorId: r.ledger_cursor_id };
    },
    ledgerAfter: async (at, id, limit) => (await q(`select id, lead_id, outcome, occurred_at, recorded_at, actor_kind, amount::float, currency, appointment_id, sale_id, reason_code from lead_outcome_events
      where $1::timestamptz is null or recorded_at > $1::timestamptz or (recorded_at = $1::timestamptz and ($2::uuid is null or id > $2::uuid)) order by recorded_at, id limit $3`, [at, id, limit]))
      .map((r: any) => ({ ...r, occurred_at: new Date(r.occurred_at).toISOString(), recorded_at: new Date(r.recorded_at).toISOString() })) as LedgerRow[],
    advanceCursor: async (r) => { await db.query(`update meta_settings set ledger_cursor_at=$1, ledger_cursor_id=$2`, [r.recorded_at, r.id]); },
    loadLead: async (id): Promise<LoadedLead | null> => {
      const l = (await q(`select id, source, external_lead_id, created_at, email, phone, first_name, last_name, zip, fbp, fbc, fbclid, ad_id, landing_page_url from leads where id=$1`, [id]))[0];
      if (!l) return null;
      const s = (await q(`select id, created_at, measurement_allowed, config_snapshot from funnel_sessions where lead_id=$1 order by created_at limit 1`, [id]))[0];
      return { lead: { ...l, created_at: new Date(l.created_at).toISOString() }, contractorId: contractor, session: s ? { id: s.id, createdAt: new Date(s.created_at).toISOString(), measurementAllowed: s.measurement_allowed, consentMode: 'opt_in', pixelId: s.config_snapshot.trackingPixels.metaPixelId, isDemo: false, slug: 'pm' } : null };
    },
    bookingProvenance: async () => ({ funnelBooking: null }),
    insertEvent: async (e) => { try { await db.query(`insert into meta_conversion_events(lead_id,contractor_id,outcome_event_id,stage,source_kind,event_name,action_source,appointment_id,sale_id,dataset_id,event_id,event_time,value,currency,test_mode,status,skip_reason)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, [e.lead_id, e.contractor_id, e.outcome_event_id, e.stage, e.source_kind, e.event_name, e.action_source, e.appointment_id, e.sale_id, e.dataset_id, e.event_id, e.event_time, e.value, e.currency, e.test_mode, e.status, e.skip_reason]); return 'inserted'; }
      catch (err: any) { if (err.code === '23505') return 'duplicate'; throw err; } },
    claim: async (limit, worker) => (await q(`select *, value::float as value from claim_meta_conversion_events($1,$2,120)`, [limit, worker])).map((r: any) => ({ ...r, event_time: new Date(r.event_time).toISOString() })) as ClaimedEvent[],
    finish: async (id, p) => { const cols = Object.keys(p); await db.query(`update meta_conversion_events set ${cols.map((c, i) => `${c}=$${i + 2}`).join(',')}, locked_by=null, locked_until=null where id=$1`, [id, ...cols.map((c) => (p as any)[c])]); },
  };
}
// Built per call so it uses the stubbed fetch of the current test (never the real network).
const send: SendFn = (args) => graphSend('tok', globalThis.fetch)(args);
const events = (id?: string) => q<any>(`select event_id, status, origin, test_mode, retry_of, last_error_code from meta_conversion_events ${id ? `where event_id=$1` : ''} order by created_at`, id ? [id] : []);
const realAccepted = async (eventId: string) => (await q(`select 1 from meta_conversion_events where event_id=$1 and status='accepted' and test_mode=false`, [eventId])).length;

async function setMode(mode: DeliveryMode, restore = false, code: string | null = null) {
  const prev = (await q(`select delivery_mode from meta_settings`))[0].delivery_mode;
  const patch: any = deliveryModePatch(prev, mode, restore);
  const cols = Object.keys(patch);
  await db.query(`update meta_settings set ${cols.map((c, i) => `${c}=$${i + 1}`).join(',')}, test_event_code=$${cols.length + 1}, dataset_id=$${cols.length + 2}, test_dataset_id=$${cols.length + 3}`, [...cols.map((c) => patch[c]), code, '555000111', code ? TEST_DATASET : null]);
}
let n = 0;
async function newLead(): Promise<{ lead: string; session: string }> {
  n++;
  const lead = (await q<{ id: string }>(`insert into leads(first_name,last_name,email,source,platform,fbp,fbc,landing_page_url) values ('A','B',$1,'website','web','fb.1.1.2','fb.1.2.c','https://pm.test/e') returning id`, [`l${n}@x.test`]))[0].id;
  const funnel = (await q<{ id: string }>(`insert into funnels(slug, contractor_id, published, config) values ($1,$2,true,'{}') returning id`, [`f${n}`, contractor]))[0].id;
  const session = (await q<{ id: string }>(`insert into funnel_sessions(funnel_id, token_hash, rate_key, config_snapshot, current_step, lead_id, measurement_allowed, expires_at, created_at)
    values ($1,$2,'r',$3::jsonb,'x',$4,true, now() + interval '1 day', now() - interval '1 hour') returning id`, [funnel, `h${n}`, JSON.stringify({ trackingPixels: { metaPixelId: PIXEL, consentMode: 'opt_in' } }), lead]))[0].id;
  await db.query(`update leads set created_at = now() - interval '1 hour' where id=$1`, [lead]);
  return { lead, session };
}
/** A person qualifies the lead: ledger row + the same two senders updateQualification runs. */
async function markQualified(leadId: string) {
  await db.query(`select set_config('app.uid', $1, false)`, [staff]); // acting as a signed-in staff member (ledger actor = user)
  await db.query(`update leads set qualification_status='qualified', qualification_reason='confirmed_by_call', qualification_source='human', qualified_at=now(), qualified_by=$2 where id=$1`, [leadId, staff]);
  await db.query(`select set_config('app.uid', '', false)`);
}
async function qualify(leadId: string) {
  await markQualified(leadId);
  await sendQualifiedLeadEvent(sb, leadId);       // direct sender (self-gates on legacy_direct_qualified)
  const store = pgStore(); const fr = await feedFromLedger(store); const dr = await dispatchBatch(store, send);  // queue (self-gates on delivery_mode)
  if (process.env.DBG) console.log('DBG', JSON.stringify({ fr, dr, st: await store.settings(), ev: await q('select event_id,status,skip_reason,test_mode,last_error_code from meta_conversion_events') }));
}
const eid = (s: string) => `${s}:QualifiedLead`;

beforeAll(async () => {
  db = await fullSchema(); sb = fakeSupabase(db);
  contractor = (await q<{ id: string }>(`insert into contractors(name) values ('Pool Masters') returning id`))[0].id;
  staff = (await q<{ id: string }>(`insert into auth.users(email) values ('staff@x.test') returning id`))[0].id;
  await db.query(`update profiles set role='admin', is_active=true, account_status='active' where id=$1`, [staff]);
}, 120_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { sent.length = 0; failNext = 'none'; stubMeta(); vi.stubEnv('META_CONVERSIONS_API_TOKEN', 'tok'); vi.stubEnv('META_TEST_EVENT_CODE', ''); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Off -> Test -> Live -> Off handoff', () => {
  it('OFF (default): the original direct sender keeps working, the queue sends nothing', async () => {
    const a = await newLead(); await qualify(a.lead);
    expect(sent).toEqual([{ event_id: eid(a.session), test: false, name: 'QualifiedLead', dataset: PIXEL }]);
    expect((await events()).map((e) => [e.origin, e.status])).toEqual([['legacy_direct', 'accepted']]);
  });

  it('TEST: real sending continues via the direct sender to the real dataset; the queue copy goes ONLY to the separate test dataset', async () => {
    await setMode('test', false, 'TEST777');
    expect((await q(`select legacy_direct_qualified from meta_settings`))[0].legacy_direct_qualified).toBe(true);
    const b = await newLead(); await qualify(b.lead);
    expect(sent.map((s) => [s.event_id, s.test, s.dataset]).sort()).toEqual([[eid(b.session), false, PIXEL], [eid(b.session), true, TEST_DATASET]].sort());
    expect(sent.filter((s) => s.test && s.dataset !== TEST_DATASET)).toEqual([]); // no test event ever reaches a production dataset
    expect(await realAccepted(eid(b.session))).toBe(1);
  });

  it('a direct send that FAILED earlier does not block its own retry, and the retry is not a duplicate', async () => {
    const c = await newLead();
    failNext = 'http500';
    await qualify(c.lead);                       // direct attempt fails (500) in Test mode; the queue's test copy goes through
    const failed = (await events(eid(c.session))).find((e) => e.origin === 'legacy_direct');
    expect(failed).toMatchObject({ status: 'failed', test_mode: false });
    expect(await realAccepted(eid(c.session))).toBe(0);
    await setMode('live');                       // cutover: queue is live, direct sender retired, cursor moved past this lead
    const row = (await q<{ id: string }>(`select id from meta_conversion_events where event_id=$1 and origin='legacy_direct'`, [eid(c.session)]))[0];
    expect(await requeueFailedEvent(sb, row.id)).toMatchObject({ ok: true });
    await dispatchBatch(pgStore(), send);
    expect(await realAccepted(eid(c.session))).toBe(1);
    expect(await requeueFailedEvent(sb, row.id)).toEqual({ ok: false, reason: 'already_in_flight_or_accepted' }); // cannot create a second conversion
    expect(sent.filter((s) => s.event_id === eid(c.session) && !s.test)).toHaveLength(1);
  });

  it('LIVE: the direct sender is retired; the queue sends exactly one real event and does not re-send on replays', async () => {
    expect((await q(`select legacy_direct_qualified from meta_settings`))[0].legacy_direct_qualified).toBe(false);
    const d = await newLead(); await qualify(d.lead);
    expect(sent.filter((s) => s.event_id === eid(d.session))).toEqual([{ event_id: eid(d.session), test: false, name: 'QualifiedLead', dataset: PIXEL }]);
    await db.query(`update meta_settings set ledger_cursor_at = now() - interval '1 day', ledger_cursor_id = null`); // simulate a lost cursor / second worker
    await feedFromLedger(pgStore()); await dispatchBatch(pgStore(), send);
    expect(sent.filter((s) => s.event_id === eid(d.session) && !s.test)).toHaveLength(1);
  });

  it('IN FLIGHT at cutover: a direct request that already reserved the event blocks a queue send, and a later failure stays retryable', async () => {
    const e = await newLead();
    await setMode('off', true);                  // back to the legacy sender for this part
    const reserve = directSendAudit(sb, { leadId: e.lead, stage: 'qualified' });
    const ev = { pixelId: PIXEL, eventName: 'QualifiedLead' as const, eventId: eid(e.session), eventSourceUrl: 'https://pm.test/e', eventTime: Math.floor(Date.now() / 1000), user: { email: 'l@x.test' } };
    expect(await reserve.reserve(ev)).toBe('ok');          // direct request is now "in flight" (row = processing)
    await setMode('live');
    await markQualified(e.lead);
    const store = pgStore(); const feed = await feedFromLedger(store); await dispatchBatch(store, send);
    expect(feed.duplicates).toBe(1); expect(sent.filter((s) => s.event_id === eid(e.session))).toHaveLength(0);   // queue did not double-send
    await reserve.finish(ev, { status: 'failed', httpStatus: 500, code: 'graph:2', message: 'x', fbtraceId: null, eventsReceived: null, testMode: false }); // the in-flight request then fails
    const failed = (await q<{ id: string }>(`select id from meta_conversion_events where event_id=$1 and status='failed'`, [eid(e.session)]))[0];
    expect(await requeueFailedEvent(sb, failed.id)).toMatchObject({ ok: true });                                  // ...and the event is NOT lost
    await dispatchBatch(pgStore(), send);
    expect(await realAccepted(eid(e.session))).toBe(1);
  });

  it('the other direction: a queue-owned event stops a direct sender from sending', async () => {
    const f = await newLead();
    await setMode('live');
    await markQualified(f.lead);
    const store = pgStore(); await feedFromLedger(store);        // queue row pending (not sent yet)
    const r = await sendMetaEvent({ pixelId: PIXEL, eventName: 'QualifiedLead', eventId: eid(f.session), eventSourceUrl: 'https://pm.test/e', user: {} }, directSendAudit(sb, { leadId: f.lead, stage: 'qualified' }));
    expect(r).toMatchObject({ status: 'skipped', code: 'duplicate' });
    await dispatchBatch(store, send);
    expect(sent.filter((s) => s.event_id === eid(f.session))).toHaveLength(1);
  });

  it('a crashed direct send is swept to failed (ambiguous) and becomes retryable', async () => {
    const g = await newLead();
    const audit = directSendAudit(sb, { leadId: g.lead, stage: 'qualified' });
    const ev = { pixelId: PIXEL, eventName: 'QualifiedLead' as const, eventId: eid(g.session), eventSourceUrl: 'x', user: {} };
    await audit.reserve(ev);
    await db.query(`update meta_conversion_events set locked_until = now() - interval '1 minute' where event_id=$1`, [eid(g.session)]);
    expect(await sweepStaleDirectSends(sb)).toBe(1);
    expect((await events(eid(g.session)))[0]).toMatchObject({ status: 'failed', last_error_code: 'interrupted_ambiguous' });
    const id = (await q<{ id: string }>(`select id from meta_conversion_events where event_id=$1`, [eid(g.session)]))[0].id;
    expect(await requeueFailedEvent(sb, id)).toMatchObject({ ok: true });
  });

  it('OFF again with rollback ticked: the direct sender resumes and the queue is silent; nothing is lost or duplicated', async () => {
    await setMode('off', true);
    expect((await q(`select legacy_direct_qualified from meta_settings`))[0].legacy_direct_qualified).toBe(true);
    const h = await newLead(); await qualify(h.lead);
    expect((await events(eid(h.session))).map((e) => [e.origin, e.status])).toEqual([['legacy_direct', 'accepted']]);
    // no event id was ever accepted twice as a real conversion
    const dupes = await q(`select event_id, count(*) n from meta_conversion_events where status='accepted' and test_mode=false group by event_id having count(*) > 1`);
    expect(dupes).toEqual([]);
  });

  it('OFF without the rollback tick: nothing is sent at all (explicit, visible choice)', async () => {
    await setMode('off', false);
    const i = await newLead(); await qualify(i.lead);
    expect(sent).toHaveLength(0);
  });
});

describe('invariants', () => {
  it('no real event id has more than one accepted row, ever', async () => {
    expect(await q(`select event_id from meta_conversion_events where status='accepted' and test_mode=false group by event_id having count(*) > 1`)).toEqual([]);
  });
});
