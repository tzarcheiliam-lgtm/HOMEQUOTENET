/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { localParts } from '@/lib/availability/time';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * The public booking API (app/api/booking/**) end to end on the REAL migration
 * chain in PGlite: grants (booking ticket, contractor-funnel submission token,
 * manage token), same-origin, rate limits, the funnel / estimator / sales
 * booking paths with their side effects, the race for one slot, callback
 * requests, and the manage link (read, reschedule, cancel, .ics).
 * No network: Google busy reads no connections, Meta and push are stubbed.
 */
const h = vi.hoisted(() => ({ db: null as any, meta: [] as any[], notices: [] as any[] }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.db }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: () => undefined }));
vi.mock('@/lib/meta/capi', () => ({ sendMetaEvent: async (e: any) => { h.meta.push(e); return { status: 'sent' }; } }));
vi.mock('@/lib/meta/audit.server', () => ({ directSendAudit: () => undefined }));
// The notices themselves are tested in booking-notify; here only that each change asks for them.
vi.mock('@/lib/booking/notify.server', async (orig) => ({
  ...(await orig<typeof import('@/lib/booking/notify.server')>()),
  notifyBookingSoon: (e: any) => { h.notices.push(e); },
}));

process.env.BOOKING_TICKET_SECRET = 'test-booking-secret';
process.env.BOOKING_LINK_SECRET = 'test-link-secret';

import { GET as slotsGET } from '@/app/api/booking/slots/route';
import { POST as bookPOST } from '@/app/api/booking/book/route';
import { POST as callbackPOST } from '@/app/api/booking/callback/route';
import { GET as manageGET, POST as managePOST } from '@/app/api/booking/manage/[token]/route';
import { GET as manageSlotsGET } from '@/app/api/booking/manage/[token]/slots/route';
import { GET as icsGET } from '@/app/(booking)/booking/manage/[token]/calendar.ics/route';
import { manageTokenFor } from '@/lib/booking/notify.server';
import { parseGrant, signBookingTicket } from '@/app/api/booking/_lib/grant';
import { resetRateLimits } from '@/app/api/booking/_lib/http';
import { contractorFunnelGrant } from '@/components/booking/types';

let db: PGlite;
const TZ = 'America/Los_Angeles';
const ORIGIN = 'https://homequote.test';
const ids = { admin: randomUUID(), house: randomUUID(), pool: randomUUID(), poolCo: randomUUID() };
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const one = async (sql: string, p?: unknown[]) => (await q(sql, p))[0];
const sha = (v: string) => createHash('sha256').update(v).digest('hex');

let ip = 0;
/** A fresh client IP per call unless pinned, so the per-IP limits only bite where a test means them to. */
function req(path: string, init: { method?: string; body?: unknown; grant?: string; origin?: string | null; ip?: string } = {}) {
  const headers: Record<string, string> = { 'x-forwarded-for': init.ip ?? `10.0.0.${++ip % 250}` };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.grant) headers['x-booking-grant'] = init.grant;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`${ORIGIN}${path}`, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}
const ctx = (token: string) => ({ params: Promise.resolve({ token }) });

async function lead(first: string) {
  return (await one(`insert into public.leads(first_name,last_name,phone,email) values ($1,'Doe','+13105550123',$2) returning id`,
    [first, `${first.toLowerCase()}-${randomUUID().slice(0, 6)}@example.test`])).id as string;
}
async function session(funnelId: string, opts: { qualified?: boolean; submitted?: boolean; first?: string } = {}) {
  const first = opts.first ?? 'Sam';
  const leadId = opts.submitted === false ? null : await lead(first);
  const contact = { firstName: first, lastName: 'Doe', email: `${first.toLowerCase()}@example.test`, phone: '(310) 555-0123' };
  const s = await one(
    `insert into public.funnel_sessions(funnel_id, token_hash, rate_key, config_snapshot, current_step, lead_id, contact_submitted_at, qualified, contact, measurement_allowed)
     values ($1,$2,'t','{}','calendar',$3,$4,$5,$6,true) returning id`,
    [funnelId, sha(randomUUID()), leadId, opts.submitted === false ? null : new Date().toISOString(), opts.qualified ?? true, JSON.stringify(contact)]);
  return { id: s.id as string, leadId, ticket: signBookingTicket(s.id, 'funnel')! };
}
async function slotsFor(grant: string) {
  const res = await slotsGET(req('/api/booking/slots', { grant }));
  return { status: res.status, body: (await res.json()) as any };
}
const book = (grant: string, startsAt: string, extra: Record<string, unknown> = {}) =>
  bookPOST(req('/api/booking/book', { method: 'POST', body: { grant, startsAt, timeZone: 'America/New_York', ...extra } }));
const tokenOf = (manageUrl: string) => decodeURIComponent(manageUrl.replace(/\/calendar\.ics$/, '').split('/').pop()!);

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  h.db = fakeSupabase(db);
  await q(`insert into public.contractors(id,name) values ($1,'Pool Masters LA')`, [ids.poolCo]);
  await q(`insert into auth.users(id,email) values ($1,'admin@t.test')`, [ids.admin]);
  await q(`update public.profiles set role='admin', is_active=true, account_status='active' where id=$1`, [ids.admin]);
  // The real client funnel config (Meta pixel, opt-out measurement) on the contractor funnel.
  const poolConfig = { ...JSON.parse(readFileSync('content/funnels/clients/pool-masters-la.json', 'utf8')), calendarProvider: 'calendly' };
  await q(`insert into public.funnels(id,slug,contractor_id,published,config) values ($1,'bathroom-remodel-api',null,true,'{}'),($2,'pool-masters-la',$3,true,$4)`,
    [ids.house, ids.pool, ids.poolCo, JSON.stringify(poolConfig)]);
  // Re-run 0068 so the seeds see the admin (team / sales hosts) and Pool Masters (its calendar).
  await db.exec(readFileSync('supabase/migrations/0068_native_booking_calendars.sql', 'utf8'));
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { resetRateLimits(); h.meta = []; h.notices = []; });

describe('grants', () => {
  it('signs and verifies booking tickets; forged, expired and malformed grants are refused', () => {
    const sid = randomUUID();
    const t = signBookingTicket(sid, 'estimator')!;
    expect(parseGrant(t)).toEqual({ kind: 'session', sessionId: sid, source: 'estimator' });
    expect(parseGrant(t.slice(0, -2) + (t.endsWith('A') ? 'BB' : 'AA'))).toBeNull();
    expect(parseGrant(t.replace('.e.', '.f.'))).toBeNull();
    expect(parseGrant(signBookingTicket(sid, 'funnel', Date.now() - 8 * 86_400_000))).toBeNull();
    expect(parseGrant('nonsense')).toBeNull();
    expect(parseGrant(contractorFunnelGrant(sid, 'a'.repeat(48)))).toEqual({ kind: 'submission', submissionId: sid, token: 'a'.repeat(48) });
    expect(parseGrant(contractorFunnelGrant('x', 'a'.repeat(48)))).toBeNull();
  });

  it('refuses cross-site requests and unknown grants', async () => {
    const s = await session(ids.house, { first: 'Origin' });
    expect((await slotsGET(req('/api/booking/slots', { grant: s.ticket, origin: 'https://evil.test' }))).status).toBe(403);
    expect((await slotsGET(req('/api/booking/slots', { grant: s.ticket, origin: null }))).status).toBe(403);
    expect((await slotsGET(req('/api/booking/slots', { grant: signBookingTicket(randomUUID())! }))).status).toBe(401);
    const forged = await slotsGET(req('/api/booking/slots', { grant: 'hqb1.f.' + s.id + '.9999999999.forged' }));
    expect(forged.status).toBe(401);
    expect(((await forged.json()) as any).message).toMatch(/session has expired/);
  });
});

describe('homeowner booking (network funnel -> HomeQuote team calendar)', () => {
  let s: Awaited<ReturnType<typeof session>>;
  let slot: string;
  let manage: string;

  it('lists 9:00–17:00 Los Angeles weekday times for the team calendar, with the contact hint', async () => {
    s = await session(ids.house);
    const { status, body } = await slotsFor(s.ticket);
    expect(status).toBe(200);
    expect(body.calendar).toEqual({ hostName: 'a HomeQuote project specialist', kind: 'team', timeZone: TZ, durationMinutes: 30, meetingType: 'phone' });
    expect(body.contact).toEqual({ firstName: 'Sam', phoneHint: '0123' });
    expect(body.booked).toBeNull();
    expect(body.slots.length).toBeGreaterThan(10);
    for (const x of body.slots) {
      const p = localParts(Date.parse(x.start), TZ);
      expect(p.minuteOfDay).toBeGreaterThanOrEqual(540);
      expect(p.minuteOfDay + 30).toBeLessThanOrEqual(1020);
      expect(Date.parse(x.end) - Date.parse(x.start)).toBe(30 * 60_000);
      expect(Date.parse(x.start)).toBeGreaterThanOrEqual(Date.now() + 2 * 3_600_000 - 5_000);
    }
    slot = body.slots[0].start;
  });

  it('books it with every funnel side effect and returns the manage links once', async () => {
    const res = await book(s.ticket, slot);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.booking).toMatchObject({ status: 'scheduled', startsAt: slot, timeZone: TZ, inviteeTimeZone: 'America/New_York', meetingType: 'phone',
      hostName: 'a HomeQuote project specialist', durationMinutes: 30, firstName: 'Sam', phoneHint: '0123', canChange: true });
    expect(body.booking.manageUrl).toMatch(/^\/booking\/manage\/[A-Za-z0-9_-]{43}$/);
    expect(body.booking.icsUrl).toBe(`${body.booking.manageUrl}/calendar.ics`);
    expect(body.metaEventId).toBeNull(); // house funnel config has no pixel
    manage = tokenOf(body.booking.manageUrl);
    // The same link the confirmation / reminder texts and emails carry, and their notices were requested.
    expect(h.notices).toEqual([{ kind: 'appointment', id: expect.any(String), change: 'booked', actorKind: 'homeowner' }]);
    expect(manage).toBe(manageTokenFor('appointment', h.notices[0].id));

    const ap = await one(`select * from public.appointments where lead_id=$1`, [s.leadId]);
    expect(ap).toMatchObject({ status: 'scheduled', source: 'funnel', booked_via: 'website', invitee_time_zone: 'America/New_York', manage_token_hash: sha(manage) });
    expect(new Date(ap.scheduled_at).toISOString()).toBe(slot);
    expect((await one(`select booked_at from public.funnel_sessions where id=$1`, [s.id])).booked_at).not.toBeNull();
    expect(await one(`select provider, verified, appointment_id from public.funnel_bookings where session_id=$1`, [s.id])).toEqual({ provider: 'homequote', verified: true, appointment_id: ap.id });
    expect((await q(`select 1 from public.funnel_events where session_id=$1 and event='appointment_booked'`, [s.id])).length).toBe(1);
    expect((await one(`select status from public.leads where id=$1`, [s.leadId])).status).toBe('appointment_set');
    expect(await one(`select actor_type from public.workflow_events where type='appointment.booked' and entity_id=$1`, [ap.id])).toEqual({ actor_type: 'contact' });
    expect((await q(`select 1 from public.notification_events where type='appointment_booked' and entity_id=$1`, [ap.id])).length).toBe(1);
  });

  it('a second try or a refresh gets the existing booking back (no manage link), never a second one', async () => {
    const again = await book(s.ticket, slot);
    expect(again.status).toBe(409);
    const body = (await again.json()) as any;
    expect(body).toMatchObject({ ok: false, error: 'already_booked' });
    expect(body.booking).toMatchObject({ startsAt: slot, manageUrl: null, icsUrl: null });
    const refresh = await slotsFor(s.ticket);
    expect(refresh.body.booked).toMatchObject({ startsAt: slot, status: 'scheduled' });
    expect(refresh.body.slots).toEqual([]);
    expect((await q(`select 1 from public.appointments where lead_id=$1`, [s.leadId])).length).toBe(1);
  });

  it('the manage link reads, reschedules and cancels', async () => {
    const got = (await (await manageGET(req(`/api/booking/manage/${manage}`), ctx(manage))).json()) as any;
    expect(got.booking).toMatchObject({ startsAt: slot, canChange: true, status: 'scheduled' });

    const ms = (await (await manageSlotsGET(req(`/api/booking/manage/${manage}/slots`), ctx(manage))).json()) as any;
    expect(ms.ok).toBe(true);
    expect(ms.current).toBe(slot);
    const target = ms.slots.find((x: any) => Date.parse(x.start) >= Date.parse(slot) + 3 * 3_600_000)?.start ?? ms.slots.at(-1).start;

    const moved = await managePOST(req(`/api/booking/manage/${manage}`, { method: 'POST', body: { action: 'reschedule', startsAt: target } }), ctx(manage));
    expect(moved.status).toBe(200);
    expect(((await moved.json()) as any).booking.startsAt).toBe(target);
    expect(h.notices.at(-1)).toMatchObject({ change: 'rescheduled', previousStartsAt: slot, actorKind: 'homeowner' });
    const ap = await one(`select scheduled_at, reschedule_count from public.appointments where manage_token_hash=$1`, [sha(manage)]);
    expect(new Date(ap.scheduled_at).toISOString()).toBe(target);
    expect(ap.reschedule_count).toBe(1);
    expect((await one(`select body from public.lead_activities where lead_id=$1 and body like 'Homeowner rescheduled%'`, [s.leadId]))).toBeTruthy();

    const ics = await icsGET(req(`/api/booking/manage/${manage}/ics`, { origin: null }), ctx(manage));
    expect(ics.headers.get('content-type')).toMatch(/text\/calendar/);
    const text = await ics.text();
    expect(text).toMatch(/SUMMARY:Phone call with /);
    expect(text).toMatch(/UID:\S+/);
    expect(text).toContain('STATUS:CONFIRMED');

    const cancelled = await managePOST(req(`/api/booking/manage/${manage}`, { method: 'POST', body: { action: 'cancel', reason: 'Found a contractor' } }), ctx(manage));
    expect(((await cancelled.json()) as any).booking).toMatchObject({ status: 'cancelled', canChange: false });
    expect(h.notices.at(-1)).toMatchObject({ change: 'cancelled', actorKind: 'homeowner' });
    expect(await one(`select status, cancel_reason from public.appointments where manage_token_hash=$1`, [sha(manage)])).toEqual({ status: 'cancelled', cancel_reason: 'Found a contractor' });
    // Cancelling twice is fine (and sends nothing new); moving a cancelled call is not.
    const sent = h.notices.length;
    expect((await managePOST(req(`/api/booking/manage/${manage}`, { method: 'POST', body: { action: 'cancel' } }), ctx(manage))).status).toBe(200);
    expect(h.notices).toHaveLength(sent);
    const late = await managePOST(req(`/api/booking/manage/${manage}`, { method: 'POST', body: { action: 'reschedule', startsAt: target } }), ctx(manage));
    expect(late.status).toBe(409);
    expect(((await late.json()) as any).error).toBe('not_active');
    expect((await manageSlotsGET(req(`/api/booking/manage/${manage}/slots`), ctx(manage))).status).toBe(409);
    expect(await (await icsGET(req(`/api/booking/manage/${manage}/ics`, { origin: null }), ctx(manage))).text()).toContain('STATUS:CANCELLED');
  });

  it('unknown or malformed manage tokens are not found', async () => {
    const fake = randomBytes(32).toString('base64url');
    expect((await manageGET(req(`/api/booking/manage/${fake}`), ctx(fake))).status).toBe(404);
    expect((await manageGET(req('/api/booking/manage/short'), ctx('short'))).status).toBe(404);
    expect((await icsGET(req(`/api/booking/manage/${fake}/ics`), ctx(fake))).status).toBe(404);
    expect((await manageGET(req(`/api/booking/manage/${fake}`, { origin: 'https://evil.test' }), ctx(fake))).status).toBe(403);
  });
});

describe('contractor funnel (Pool Masters calendar) and the race for one time', () => {
  it('books the contractor calendar and sends Meta Schedule with the session event id', async () => {
    const s = await session(ids.pool, { first: 'Pia' });
    const { body } = await slotsFor(s.ticket);
    expect(body.calendar).toMatchObject({ hostName: 'Pool Masters LA', kind: 'contractor' });
    const res = await book(s.ticket, body.slots[1].start);
    const out = (await res.json()) as any;
    expect(out.ok).toBe(true);
    expect(out.metaEventId).toBe(`${s.id}:Schedule`);
    await vi.waitFor(() => expect(h.meta).toHaveLength(1));
    expect(h.meta[0]).toMatchObject({ eventName: 'Schedule', eventId: `${s.id}:Schedule`, pixelId: '933962709362966' });
    expect(h.meta[0].user).toMatchObject({ firstName: 'Pia', email: 'pia@example.test' });
  });

  it('two homeowners racing for one time: one booking, one "pick another time"', async () => {
    const a = await session(ids.pool, { first: 'Ann' });
    const b = await session(ids.pool, { first: 'Ben' });
    const { body } = await slotsFor(a.ticket);
    const t = body.slots.at(-1).start;
    const [ra, rb] = await Promise.all([book(a.ticket, t), book(b.ticket, t)]);
    const results = [(await ra.json()) as any, (await rb.json()) as any];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok);
    expect(loser).toMatchObject({ error: 'slot_taken', pickAnother: true });
    expect(loser.message).toMatch(/someone just booked that time/);
    expect([ra.status, rb.status].sort()).toEqual([200, 409]);
    // The taken time is gone from the loser's next list.
    expect((await slotsFor(b.ticket)).body.slots.map((x: any) => x.start)).not.toContain(t);
  });

  it('refuses times the calendar does not offer', async () => {
    const s = await session(ids.pool, { first: 'Odd' });
    const soon = new Date(Date.now() + 30 * 60_000).toISOString();
    const r = (await (await book(s.ticket, soon)).json()) as any;
    expect(r).toMatchObject({ ok: false, error: 'too_soon', pickAnother: true });
    expect((await (await book(s.ticket, 'not a date')).json()) as any).toMatchObject({ error: 'invalid_request' });
  });
});

describe('who may book', () => {
  it('an unqualified or unfinished session cannot see times or book', async () => {
    const u = await session(ids.house, { qualified: false, first: 'Una' });
    expect((await slotsFor(u.ticket)).body).toMatchObject({ ok: false, error: 'not_qualified' });
    const x = await session(ids.house, { submitted: false });
    expect((await slotsFor(x.ticket)).body).toMatchObject({ ok: false, error: 'session_incomplete' });
    const anyTime = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect((await (await book(u.ticket, anyTime)).json()) as any).toMatchObject({ error: 'not_qualified' });
  });
});

describe('callback requests', () => {
  it('records one flagged timeline entry and says so on the next load', async () => {
    const s = await session(ids.pool, { first: 'Cal' });
    const send = (note?: string) => callbackPOST(req('/api/booking/callback', { method: 'POST', body: { grant: s.ticket, note } }));
    expect((await (await send('  weekday   evenings ')).json()) as any).toEqual({ ok: true, already: false });
    expect((await (await send()).json()) as any).toEqual({ ok: true, already: true });
    const rows = await q(`select type, body, metadata from public.lead_activities where lead_id=$1 and metadata->>'callback_requested'='true'`, [s.leadId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('contact_attempt');
    expect(rows[0].body).toContain('Best time: weekday evenings');
    expect(rows[0].metadata).toMatchObject({ session_id: s.id, contractor_id: ids.poolCo, note: 'weekday evenings' });
    expect((await slotsFor(s.ticket)).body.callbackRequested).toBe(true);
  });

  it('is rate limited per client', async () => {
    const s = await session(ids.house, { first: 'Rae' });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await callbackPOST(req('/api/booking/callback', { method: 'POST', body: { grant: s.ticket }, ip: '10.9.9.9' }))).status);
    }
    expect(statuses.slice(0, 5).every((x) => x === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe('contractor sales funnel (HomeQuote sales calendar)', () => {
  async function submission(qualified = true) {
    const submissionId = randomUUID();
    const token = randomBytes(24).toString('hex');
    await q(`insert into public.contractor_funnel_submissions(submission_id, access_token_hash, service_area, role, project_value, appointment_capacity,
               start_timeline, name, company, email, phone, qualification_status)
             values ($1,$2,'Los Angeles','owner','50k+','5-10','now','Dana Builder','Dana Pools','dana@example.test','(213) 555-0199',$3)`,
      [submissionId, sha(token), qualified ? 'qualified' : 'needs_review']);
    return { submissionId, token, grant: contractorFunnelGrant(submissionId, token) };
  }

  it('books a sales call with only the submission token, and links the submission', async () => {
    const sub = await submission();
    const { body } = await slotsFor(sub.grant);
    expect(body.calendar).toMatchObject({ hostName: 'HomeQuote', kind: 'sales' });
    expect(body.contact).toEqual({ firstName: 'Dana', phoneHint: '0199' });
    const out = (await (await book(sub.grant, body.slots[0].start)).json()) as any;
    expect(out.ok).toBe(true);
    expect(out.booking).toMatchObject({ hostName: 'HomeQuote', firstName: 'Dana', canChange: true });
    const row = await one(`select booking_status, sales_appointment_id from public.contractor_funnel_submissions where submission_id=$1`, [sub.submissionId]);
    expect(row.booking_status).toBe('confirmed');
    const sa = await one(`select partner_id, source, manage_token_hash from public.prospect_sales_appointments where id=$1`, [row.sales_appointment_id]);
    expect(sa).toEqual({ partner_id: null, source: 'sales_funnel', manage_token_hash: sha(tokenOf(out.booking.manageUrl)) });
    // The prospect's manage link works the same way.
    const m = tokenOf(out.booking.manageUrl);
    expect(((await (await manageGET(req(`/api/booking/manage/${m}`), ctx(m))).json()) as any).booking).toMatchObject({ hostName: 'HomeQuote', canChange: true });
    const refresh = await slotsFor(sub.grant);
    expect(refresh.body.booked).toMatchObject({ startsAt: body.slots[0].start });
  });

  it('a wrong token is refused; a submission held for review cannot book but may ask for a callback', async () => {
    const sub = await submission(false);
    expect((await slotsFor(contractorFunnelGrant(sub.submissionId, 'b'.repeat(48)))).status).toBe(401);
    expect((await slotsFor(sub.grant)).body).toMatchObject({ ok: false, error: 'not_qualified' });
    const cb = await callbackPOST(req('/api/booking/callback', { method: 'POST', body: { grant: sub.grant, note: 'mornings' } }));
    expect(((await cb.json()) as any).ok).toBe(true);
    expect((await one(`select review_notes from public.contractor_funnel_submissions where submission_id=$1`, [sub.submissionId])).review_notes)
      .toMatch(/Asked for a callback: none of the offered call times worked\. Best time: mornings/);
  });
});
