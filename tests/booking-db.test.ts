/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { addDays, localParts, weekdayOfDate, zonedToUtc } from '@/lib/availability/time';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { throw new Error('tests pass their own db'); } }));

/**
 * Migration 0070 (native booking calendars) on the REAL migration chain in
 * PGlite: seeds, RLS, the booking RPCs (re-check + lock), funnel side effects,
 * reschedule / cancel, the sales path, reminders, and lib/booking on top.
 * Times are computed from the real clock (the RPCs use now()).
 */
let db: PGlite;
const TZ = 'America/Los_Angeles';
const id = Object.fromEntries(
  ['admin', 'setter', 'ownerA', 'staffA', 'ownerB', 'companyA', 'companyB', 'houseFunnel', 'funnelA'].map((k) => [k, randomUUID()])
) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const one = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await q<T>(sql, p))[0];

async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(userId ? `set role authenticated; select set_config('app.uid','${userId}', false)` : `set role anon; select set_config('app.uid','', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('app.uid','', false)`); }
}

/** A weekday (Tue–Thu) a few days out, as a LA date, so notice and horizon are comfortable. */
function bookableDate(offsetDays = 3): string {
  let d = addDays(localParts(Date.now(), TZ).date, offsetDays);
  while (![2, 3, 4].includes(weekdayOfDate(d))) d = addDays(d, 1);
  return d;
}
const la = (date: string, hh: number, mm = 0) => new Date(zonedToUtc(date, hh * 60 + mm, TZ)).toISOString();
const DAY = bookableDate();
const DAY2 = bookableDate(4) === DAY ? addDays(DAY, 1) : bookableDate(4);

let team: string;
let sales: string;
let calA: string;

async function lead(first = 'Pat'): Promise<string> {
  return (await one<{ id: string }>(`insert into public.leads(first_name, last_name, phone, email) values ($1,'Doe','+13105550100',$2) returning id`,
    [first, `${first.toLowerCase()}-${randomUUID().slice(0, 6)}@example.test`])).id;
}
async function session(funnelId: string, leadId: string, assignmentId: string | null = null, qualified = true): Promise<{ id: string; hash: string }> {
  const hash = randomUUID();
  const s = await one<{ id: string }>(
    `insert into public.funnel_sessions(funnel_id, token_hash, rate_key, config_snapshot, current_step, lead_id, assignment_id, contact_submitted_at, qualified)
     values ($1,$2,'t','{}','calendar',$3,$4,now(),$5) returning id`, [funnelId, hash, leadId, assignmentId, qualified]);
  return { id: s.id, hash };
}
const hashOf = () => randomUUID().replace(/-/g, '').padEnd(64, '0');
async function book(args: Record<string, unknown>) {
  const names = Object.keys(args);
  const sql = `select public.book_appointment(${names.map((n, i) => `${n} := $${i + 1}`).join(', ')}) as r`;
  return (await one<{ r: any }>(sql, names.map((n) => (n === 'p_contact' ? JSON.stringify(args[n]) : args[n])))).r;
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  await q(`insert into public.contractors(id,name) values ($1,'Pool Masters LA'),($2,'Other Pools')`, [id.companyA, id.companyB]);
  for (const [uid, role, company, crole] of [
    [id.admin, 'admin', null, null],
    [id.setter, 'setter', null, null],
    [id.ownerA, 'contractor', id.companyA, 'owner'],
    [id.staffA, 'contractor', id.companyA, 'staff'],
    [id.ownerB, 'contractor', id.companyB, 'owner'],
  ] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active' where id=$1`, [uid, role, company, crole]);
  }
  await q(`insert into public.funnels(id,slug,contractor_id,published,config) values ($1,'bathroom-remodel-t',null,true,'{}'),($2,'pool-masters-la',$3,true,'{}')`,
    [id.houseFunnel, id.funnelA, id.companyA]);
  // Re-running 0070 is safe (idempotent) and now seeds Pool Masters, found by its client funnel.
  await db.exec(readFileSync('supabase/migrations/0070_native_booking_calendars.sql', 'utf8'));
  team = (await one(`select id from public.booking_calendars where kind='team'`)).id;
  sales = (await one(`select id from public.booking_calendars where kind='sales'`)).id;
  calA = (await one(`select id from public.booking_calendars where kind='contractor' and contractor_id=$1`, [id.companyA])).id;
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('0070 schema + seeds', () => {
  it('seeds team, sales and Pool Masters with 9–5 Mon–Fri Los Angeles: 10-minute homeowner calls every 15 minutes, 30-minute sales calls', async () => {
    const cals = await q(`select kind, name, timezone, duration_minutes, slot_step_minutes, buffer_minutes, min_notice_minutes, horizon_days, max_per_day, meeting_type, active,
                                 host_display_name, host_first_name, host_org, host_phone, host_email, host_photo_path, host_note
                            from public.booking_calendars order by kind`);
    expect(cals.map((c) => c.kind)).toEqual(['contractor', 'sales', 'team']);
    for (const c of cals) {
      expect(c).toMatchObject({ timezone: TZ, min_notice_minutes: 120, horizon_days: 14, max_per_day: null, meeting_type: 'phone', active: true, host_first_name: 'Liam', host_phone: '+17472175713', host_email: null });
    }
    const by = Object.fromEntries(cals.map((c) => [c.kind, c]));
    // Homeowner calls (Liam qualifies and books the on-site visit): 10 min, starts every 15 (9:00, 9:15 …), 5 min buffer.
    for (const k of ['team', 'contractor']) expect(by[k]).toMatchObject({ duration_minutes: 10, slot_step_minutes: 15, buffer_minutes: 5 });
    // Contractor prospects keep the 30-minute call.
    expect(by.sales).toMatchObject({ duration_minutes: 30, slot_step_minutes: 30, buffer_minutes: 15 });
    expect(by.contractor).toMatchObject({ name: 'Pool Masters LA', host_display_name: 'Liam from Pool Masters', host_org: 'Pool Masters LA', host_photo_path: '/images/brand/poolmasters-logo.png' });
    expect(by.contractor.host_note).toContain('pool design call');
    for (const k of ['team', 'sales']) {
      expect(by[k]).toMatchObject({ host_display_name: 'Liam from HomeQuote', host_org: 'HomeQuote Network', host_photo_path: '/images/brand/homequote-network-logo.webp' });
    }
    for (const cal of [team, sales, calA]) {
      const rules = await q(`select weekday, start_minute, end_minute from public.booking_calendar_rules where calendar_id=$1 order by weekday`, [cal]);
      expect(rules).toEqual([1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_minute: 540, end_minute: 1020 })));
    }
    // Hosts: admins on team/sales, the company owner on its own calendar.
    expect((await q(`select user_id from public.booking_calendar_members where calendar_id=$1`, [calA])).map((r) => r.user_id)).toEqual([id.ownerA]);
  });

  it('creates a contractor calendar on demand, once', async () => {
    const a = (await one(`select public.ensure_contractor_booking_calendar($1) as id`, [id.companyB])).id;
    const b = (await one(`select public.ensure_contractor_booking_calendar($1) as id`, [id.companyB])).id;
    expect(a).toBe(b);
    expect((await one(`select public.ensure_contractor_booking_calendar($1) as id`, [randomUUID()])).id).toBeNull();
    await expect(q(`insert into public.booking_calendars(kind,name) values ('team','Second team')`)).rejects.toThrow();
    await expect(q(`insert into public.booking_calendars(kind,name,timezone) values ('contractor','x','UTC')`)).rejects.toThrow();
    await expect(q(`update public.booking_calendars set timezone='Mars/Base' where id=$1`, [team])).rejects.toThrow();
  });

  it('keeps old appointment inserts working and fills lead_id from the assignment', async () => {
    const l = await lead('Old');
    const asg = (await one(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [l, id.companyB])).id;
    const ap = await one(`insert into public.appointments(assignment_id, scheduled_at) values ($1, now() + interval '3 days') returning lead_id, calendar_id`, [asg]);
    expect(ap).toEqual({ lead_id: l, calendar_id: null });
    await expect(q(`insert into public.appointments(assignment_id, lead_id, scheduled_at) values ($1,$2,now())`, [asg, await lead('Other')])).rejects.toThrow(/does not match/);
    await expect(q(`insert into public.appointments(scheduled_at) values (now())`)).rejects.toThrow(/appointments_has_owner/);
  });
});

describe('book_appointment: team calendar from a network funnel', () => {
  let leadId: string;
  let s: { id: string; hash: string };
  let apptId: string;
  const token = hashOf();

  it('books, with every funnel side effect, and stores only the token hash', async () => {
    leadId = await lead('Team');
    s = await session(id.houseFunnel, leadId);
    const r = await book({ p_calendar: team, p_starts_at: la(DAY, 10), p_session: s.id, p_session_hash: s.hash, p_source: 'funnel',
      p_manage_token_hash: token, p_actor_kind: 'homeowner', p_invitee_time_zone: 'America/New_York' });
    expect(r).toMatchObject({ ok: true, calendar_id: team, time_zone: TZ });
    apptId = r.appointment_id;
    const ap = await one(`select * from public.appointments where id=$1`, [apptId]);
    expect(ap).toMatchObject({ assignment_id: null, lead_id: leadId, calendar_id: team, status: 'scheduled', source: 'funnel', meeting_type: 'phone',
      booked_via: 'website', manage_token_hash: token, time_zone: TZ, invitee_time_zone: 'America/New_York', contact_name: 'Team Doe', contact_phone: '+13105550100' });
    expect(new Date(ap.ends_at).getTime() - new Date(ap.scheduled_at).getTime()).toBe(10 * 60_000);
    expect((await one(`select booked_at from public.funnel_sessions where id=$1`, [s.id])).booked_at).toBeTruthy();
    expect(await one(`select provider, verified, external_id from public.funnel_bookings where session_id=$1`, [s.id])).toEqual({ provider: 'homequote', verified: true, external_id: apptId });
    expect(await q(`select 1 from public.funnel_events where session_id=$1 and event='appointment_booked'`, [s.id])).toHaveLength(1);
    expect((await one(`select status from public.leads where id=$1`, [leadId])).status).toBe('appointment_set');
    const act = await one(`select body, metadata from public.lead_activities where lead_id=$1 and type='appointment'`, [leadId]);
    expect(act.body).toBe('Call booked with the HomeQuote team');
    expect(act.metadata).toMatchObject({ appointment_id: apptId, calendar_id: team, provider: 'homequote' });
    expect(act.metadata.contractor_id).toBeUndefined();
    const ev = await one(`select actor_type, contractor_id, lead_id, payload from public.workflow_events where type='appointment.booked' and entity_id=$1`, [apptId]);
    expect(ev).toMatchObject({ actor_type: 'contact', contractor_id: null, lead_id: leadId });
    expect(ev.payload).toMatchObject({ leadId, calendarId: team, source: 'funnel', assignmentId: null });
    expect(await q(`select 1 from public.notification_events where type='appointment_booked' and entity_id=$1`, [apptId])).toHaveLength(1);
    expect(await q(`select 1 from public.lead_outcome_events where outcome='appointment_booked' and appointment_id=$1 and contractor_id is null`, [apptId])).toHaveLength(1);
    expect(await q(`select 1 from public.calendar_sync_jobs where appointment_id=$1`, [apptId])).toHaveLength(1);
  });

  it('refuses a second booking on the same session, forged sessions and unqualified sessions', async () => {
    expect(await book({ p_calendar: team, p_starts_at: la(DAY, 14), p_session: s.id, p_session_hash: s.hash, p_source: 'funnel' }))
      .toEqual({ ok: false, error: 'already_booked', appointment_id: apptId });
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 14), p_session: s.id, p_session_hash: 'wrong', p_source: 'funnel' })).error).toBe('session_invalid');
    const unq = await session(id.houseFunnel, await lead('Unq'), null, false);
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 14), p_session: unq.id, p_session_hash: unq.hash, p_source: 'funnel' })).error).toBe('not_qualified');
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 14), p_lead: leadId, p_source: 'web' })).error).toBe('invalid_source');
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 14), p_lead: leadId, p_source: 'manual', p_manage_token_hash: 'nothex' })).error).toBe('invalid_token');
    expect((await book({ p_calendar: sales, p_starts_at: la(DAY, 14), p_lead: leadId, p_source: 'manual' })).error).toBe('wrong_calendar');
  });

  it('prevents double booking, including the buffer and a simultaneous race', async () => {
    const other = await lead('Other');
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 10), p_lead: other, p_source: 'manual' })).error).toBe('slot_taken');
    // The 5-minute buffer: on the 15-minute grid it never bites (10:10 + 5 = 10:15), so check it on a 5-minute grid.
    await q(`update public.booking_calendars set slot_step_minutes=5 where id=$1`, [team]);
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 10, 10), p_lead: other, p_source: 'manual' })).error).toBe('slot_taken');
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 9, 50), p_lead: other, p_source: 'manual' })).error).toBe('slot_taken');
    await q(`update public.booking_calendars set slot_step_minutes=15 where id=$1`, [team]);
    const [a, b] = await Promise.all([
      book({ p_calendar: team, p_starts_at: la(DAY, 13), p_lead: other, p_source: 'manual' }),
      book({ p_calendar: team, p_starts_at: la(DAY, 13), p_lead: await lead('Racer'), p_source: 'manual' }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a.error, b.error].filter(Boolean)).toEqual(['slot_taken']);
    // Writes that skip the RPCs are guarded too (same lock, no overlap), with the unique index behind it.
    await expect(q(`insert into public.appointments(lead_id, calendar_id, scheduled_at) values ($1,$2,$3)`, [other, team, la(DAY, 13)])).rejects.toThrow(/already booked/);
    await expect(q(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at) values ($1,$2,$3,$4)`, [other, team, la(DAY, 13, 5), la(DAY, 13, 35)])).rejects.toThrow(/already booked/);
    const side = (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at) values ($1,$2,$3,$4) returning id`, [other, team, la(DAY2, 9), la(DAY2, 9, 30)])).id;
    await expect(q(`update public.appointments set scheduled_at=$2, ends_at=$3 where id=$1`, [side, la(DAY, 13), la(DAY, 13, 30)])).rejects.toThrow(/already booked/);
    await q(`update public.appointments set status='cancelled' where id=$1`, [side]);
  });

  it('checks notice, horizon, hours, exceptions and the daily cap', async () => {
    const l = await lead('Rules');
    const r = (start: string, extra: Record<string, unknown> = {}) => book({ p_calendar: team, p_starts_at: start, p_lead: l, p_source: 'manual', ...extra });
    expect((await r(new Date(Date.now() + 60 * 60_000).toISOString())).error).toBe('too_soon');
    expect((await r(new Date(Date.now() + 20 * 86_400_000).toISOString())).error).toBe('too_far');
    expect((await r(la(DAY, 8))).error).toBe('outside_hours');
    expect((await r(la(DAY, 16, 55))).error).toBe('outside_hours');
    expect((await r(la(DAY, 16, 45))).ok).toBe(true); // the last 10-minute call ends at 4:55
    // Off the 15-minute grid, or not a whole minute: refused even inside the hours.
    expect((await r(la(DAY, 11, 7))).error).toBe('invalid_time');
    expect((await r(new Date(Date.parse(la(DAY, 11)) + 13_000).toISOString())).error).toBe('invalid_time');
    let sat = DAY; while (weekdayOfDate(sat) !== 6) sat = addDays(sat, 1);
    expect((await r(la(sat, 10))).error).toBe('outside_hours');
    await q(`insert into public.booking_calendar_exceptions(calendar_id, kind, date_start, date_end, start_minute, end_minute) values ($1,'available',$2,$2,600,720)`, [team, sat]);
    await q(`insert into public.booking_calendar_exceptions(calendar_id, kind, date_start, date_end) values ($1,'blocked',$2,$2)`, [team, DAY2]);
    expect((await r(la(DAY2, 11))).error).toBe('blocked_time');
    expect((await r(la(sat, 10))).ok).toBe(true);
    // Staff override skips hours, but never an overlap.
    expect((await r(la(DAY2, 11), { p_override: true, p_actor: id.admin })).ok).toBe(true);
    expect((await r(la(DAY, 13, 5), { p_override: true })).error).toBe('slot_taken');
    await q(`update public.booking_calendars set max_per_day=3 where id=$1`, [team]);
    expect((await r(la(DAY, 15))).error).toBe('daily_cap'); // DAY already has 10:00, 13:00 and 16:45
    await q(`update public.booking_calendars set max_per_day=null where id=$1`, [team]);
    await q(`update public.booking_calendars set active=false where id=$1`, [team]);
    expect((await r(la(DAY, 15))).error).toBe('calendar_inactive');
    await q(`update public.booking_calendars set active=true where id=$1`, [team]);
    await q(`delete from public.booking_calendar_exceptions where calendar_id=$1 and date_start=$2`, [team, DAY2]);
  });

  it('reschedules in place (workflow + push fire) and cancels', async () => {
    await q(`update public.appointments set confirmed_at=now(), reminder_24h_sent_at=now() where id=$1`, [apptId]);
    // Moving it excludes its own old time.
    const move = (await one(`select public.reschedule_appointment($1,$2,null,'homeowner') as r`, [apptId, la(DAY, 10, 30)])).r;
    expect(move).toMatchObject({ ok: true, appointment_id: apptId });
    const ap = await one(`select scheduled_at, ends_at, confirmed_at, reminder_24h_sent_at, reschedule_count, status from public.appointments where id=$1`, [apptId]);
    expect(new Date(ap.scheduled_at).toISOString()).toBe(la(DAY, 10, 30));
    expect(ap).toMatchObject({ confirmed_at: null, reminder_24h_sent_at: null, reschedule_count: 1, status: 'scheduled' });
    expect(await q(`select 1 from public.workflow_events where type='appointment.rescheduled' and entity_id=$1`, [apptId])).toHaveLength(1);
    expect(await q(`select 1 from public.notification_events where type='appointment_changed' and entity_id=$1`, [apptId])).toHaveLength(1);
    expect(new Date((await one(`select scheduled_at from public.funnel_bookings where appointment_id=$1`, [apptId])).scheduled_at).toISOString()).toBe(la(DAY, 10, 30));
    expect((await one(`select public.reschedule_appointment($1,$2) as r`, [apptId, la(DAY, 13)])).r.error).toBe('slot_taken');

    const c = (await one(`select public.cancel_appointment($1,'Found another installer',null,'homeowner') as r`, [apptId])).r;
    expect(c).toEqual({ ok: true, appointment_id: apptId });
    expect(await one(`select status, cancel_reason from public.appointments where id=$1`, [apptId])).toEqual({ status: 'cancelled', cancel_reason: 'Found another installer' });
    expect(await q(`select 1 from public.workflow_events where type='appointment.cancelled' and entity_id=$1`, [apptId])).toHaveLength(1);
    expect((await one(`select public.cancel_appointment($1) as r`, [apptId])).r).toMatchObject({ ok: true, already: true });
    expect((await one(`select public.reschedule_appointment($1,$2) as r`, [apptId, la(DAY, 15)])).r.error).toBe('not_active');
    expect((await one(`select public.reschedule_appointment($1,$2) as r`, [randomUUID(), la(DAY, 15)])).r.error).toBe('not_found');
    // The freed slot can be booked again.
    expect((await book({ p_calendar: team, p_starts_at: la(DAY, 10, 30), p_lead: await lead('Next'), p_source: 'manual' })).ok).toBe(true);
  });

  it('lets the same funnel session book again once its call was cancelled', async () => {
    const again = await book({ p_calendar: team, p_starts_at: la(DAY2, 14), p_session: s.id, p_session_hash: s.hash, p_source: 'funnel', p_actor_kind: 'homeowner' });
    expect(again).toMatchObject({ ok: true });
    expect(again.appointment_id).not.toBe(apptId);
    expect(await q(`select 1 from public.funnel_bookings where session_id=$1`, [s.id])).toHaveLength(2);
    // ...and only once: the new call is live.
    expect(await book({ p_calendar: team, p_starts_at: la(DAY2, 15), p_session: s.id, p_session_hash: s.hash, p_source: 'funnel' }))
      .toEqual({ ok: false, error: 'already_booked', appointment_id: again.appointment_id });
    await q(`select public.cancel_appointment($1)`, [again.appointment_id]);
  });
});

describe('book_appointment: contractor calendar', () => {
  it('books the contractor funnel lead into its assignment and sees the contractor’s on-site visits as busy', async () => {
    const l = await lead('Pool');
    const asg = (await one(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [l, id.companyA])).id;
    const s = await session(id.funnelA, l, asg);
    const r = await book({ p_calendar: calA, p_starts_at: la(DAY2, 9), p_session: s.id, p_session_hash: s.hash, p_source: 'estimator' });
    expect(r.ok).toBe(true);
    expect((await one(`select assignment_id from public.appointments where id=$1`, [r.appointment_id])).assignment_id).toBe(asg);
    expect((await one(`select status from public.lead_assignments where id=$1`, [asg])).status).toBe('appointment_set');
    expect((await one(`select metadata from public.lead_activities where lead_id=$1 and type='appointment'`, [l])).metadata.contractor_id).toBe(id.companyA);
    expect((await one(`select contractor_id from public.workflow_events where type='appointment.booked' and entity_id=$1`, [r.appointment_id])).contractor_id).toBe(id.companyA);

    // A staff-booked on-site visit (no calendar) for the same company blocks that time (60 min default).
    const l2 = await lead('Visit');
    const asg2 = (await one(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [l2, id.companyA])).id;
    await q(`insert into public.appointments(assignment_id, scheduled_at) values ($1,$2)`, [asg2, la(DAY2, 14)]);
    expect((await book({ p_calendar: calA, p_starts_at: la(DAY2, 14, 30), p_lead: l2, p_source: 'manual' })).error).toBe('slot_taken');
    // ...but not another contractor's or the team's.
    expect((await book({ p_calendar: team, p_starts_at: la(DAY2, 14, 30), p_lead: l2, p_source: 'manual' })).ok).toBe(true);
    // An assignment of another company cannot be put on this calendar.
    const asgB = (await one(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [l2, id.companyB])).id;
    expect((await book({ p_calendar: calA, p_starts_at: la(DAY2, 16), p_assignment: asgB, p_source: 'manual' })).error).toBe('assignment_mismatch');
  });

  it('attaches a booking made before the assignment once the lead is assigned to that contractor', async () => {
    const l = await lead('Later');
    const r = await book({ p_calendar: calA, p_starts_at: la(DAY2, 11), p_lead: l, p_source: 'manual' });
    expect(r.ok).toBe(true);
    expect((await one(`select assignment_id from public.appointments where id=$1`, [r.appointment_id])).assignment_id).toBeNull();
    const asg = (await one(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [l, id.companyA])).id;
    expect((await one(`select assignment_id from public.appointments where id=$1`, [r.appointment_id])).assignment_id).toBe(asg);
    expect((await one(`select status from public.lead_assignments where id=$1`, [asg])).status).toBe('appointment_set');
  });
});

describe('RLS', () => {
  it('staff see everything; a contractor sees only its own calendar and assignments; anon nothing', async () => {
    const all = (await q(`select id, calendar_id from public.appointments`)).length;
    expect((await as(id.admin, () => q(`select id from public.appointments`))).length).toBe(all);
    expect((await as(id.setter, () => q(`select id from public.appointments`))).length).toBe(all);
    const mine = await as(id.ownerA, () => q(`select calendar_id, assignment_id from public.appointments`));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.some((a) => a.calendar_id === team)).toBe(false);
    const companyOf = async (asg: string | null) => (asg ? (await one(`select contractor_id from public.lead_assignments where id=$1`, [asg])).contractor_id : null);
    for (const a of mine) expect(a.calendar_id === calA || (await companyOf(a.assignment_id)) === id.companyA).toBe(true);
    expect((await as(id.staffA, () => q(`select id from public.appointments`))).length).toBe(mine.length);
    const theirs = await as(id.ownerB, () => q(`select calendar_id from public.appointments`));
    expect(theirs.some((a) => a.calendar_id === calA || a.calendar_id === team)).toBe(false);
    await expect(as(null, () => q(`select id from public.appointments`))).resolves.toEqual([]);
    await expect(as(null, () => q(`select id from public.booking_calendars`))).rejects.toThrow();
  });

  it('calendars: contractors see their own, owners edit only their own; nobody books the team calendar as a contractor', async () => {
    expect((await as(id.ownerA, () => q(`select kind from public.booking_calendars`))).map((c) => c.kind)).toEqual(['contractor']);
    expect((await as(id.setter, () => q(`select id from public.booking_calendars`))).length).toBeGreaterThanOrEqual(3);
    await as(id.ownerA, () => q(`update public.booking_calendars set buffer_minutes=10 where id=$1`, [calA]));
    expect((await one(`select buffer_minutes from public.booking_calendars where id=$1`, [calA])).buffer_minutes).toBe(10);
    await as(id.ownerA, () => q(`update public.booking_calendars set buffer_minutes=0 where id=$1`, [team])); // silently no rows
    expect((await one(`select buffer_minutes from public.booking_calendars where id=$1`, [team])).buffer_minutes).toBe(5);
    await expect(as(id.ownerA, () => q(`update public.booking_calendars set contractor_id=$2 where id=$1`, [calA, id.companyB]))).rejects.toThrow();
    await expect(as(id.staffA, () => q(`insert into public.booking_calendar_rules(calendar_id,weekday,start_minute,end_minute) values ($1,6,540,600)`, [calA]))).rejects.toThrow();
    await expect(as(id.ownerA, () => q(`insert into public.booking_calendar_rules(calendar_id,weekday,start_minute,end_minute) values ($1,6,540,600)`, [team]))).rejects.toThrow();
    await as(id.ownerA, () => q(`insert into public.booking_calendar_exceptions(calendar_id,date_start,date_end) values ($1,'2027-01-01','2027-01-01')`, [calA]));
    expect(await as(id.ownerB, () => q(`select id from public.booking_calendar_rules where calendar_id=$1`, [calA]))).toEqual([]);
    const l = await lead('Rls');
    await expect(as(id.ownerA, () => q(`insert into public.appointments(lead_id, calendar_id, scheduled_at) values ($1,$2,now())`, [l, team]))).rejects.toThrow();
    await expect(as(id.ownerA, () => q(`insert into public.appointments(lead_id, calendar_id, scheduled_at) values ($1,$2,now())`, [l, calA]))).rejects.toThrow(); // lead not theirs
    await expect(as(id.ownerA, () => q(`select public.book_appointment($1, now(), $2)`, [calA, l]))).rejects.toThrow(); // service role only
  });

  it('hosts: an owner adds only its own company’s users; team / sales take only HomeQuote staff', async () => {
    await expect(as(id.ownerA, () => q(`insert into public.booking_calendar_members(calendar_id,user_id) values ($1,$2)`, [calA, id.ownerB]))).rejects.toThrow();
    await expect(as(id.ownerA, () => q(`insert into public.booking_calendar_members(calendar_id,user_id) values ($1,$2)`, [calA, id.admin]))).rejects.toThrow();
    await as(id.ownerA, () => q(`insert into public.booking_calendar_members(calendar_id,user_id) values ($1,$2)`, [calA, id.staffA]));
    await expect(as(id.admin, () => q(`insert into public.booking_calendar_members(calendar_id,user_id) values ($1,$2)`, [team, id.ownerA]))).rejects.toThrow();
    await as(id.admin, () => q(`insert into public.booking_calendar_members(calendar_id,user_id) values ($1,$2) on conflict do nothing`, [sales, id.setter]));
    expect((await q(`select user_id from public.booking_calendar_members where calendar_id=$1`, [sales])).map((r) => r.user_id)).toContain(id.setter);
    await q(`delete from public.booking_calendar_members where (calendar_id=$1 and user_id=$2) or (calendar_id=$3 and user_id=$4)`, [calA, id.staffA, sales, id.setter]);
  });

  it('keeps internal helpers off the public API', async () => {
    await expect(as(null, () => q(`select public.appointment_contractor_id(null, $1)`, [calA]))).rejects.toThrow(/permission denied/);
    await expect(as(id.ownerB, () => q(`select public.appointment_contractor_id(null, $1)`, [calA]))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => q(`select public.can_manage_booking_calendar($1)`, [calA]))).rejects.toThrow(/permission denied/);
    await expect(as(id.admin, () => q(`select public.booking_switch_funnels_to_native(true)`))).rejects.toThrow(/permission denied/);
  });
});

describe('sales calendar (contractor sales funnel)', () => {
  const subId = randomUUID();
  const subHash = 'a'.repeat(64);
  let saId: string;
  async function bookSales(args: Record<string, unknown>) {
    const names = Object.keys(args);
    return (await one<{ r: any }>(`select public.book_sales_appointment(${names.map((n, i) => `${n} := $${i + 1}`).join(', ')}) as r`, names.map((n) => args[n]))).r;
  }

  beforeAll(async () => {
    await q(`insert into public.contractor_funnel_submissions(submission_id, access_token_hash, service_area, role, project_value, appointment_capacity,
               start_timeline, name, company, email, phone, qualification_status)
             values ($1,$2,'LA','owner','50k+','5','now','Sam Builder','Builder Co','sam@builder.test','(818) 555-0142','qualified')`, [subId, subHash]);
  });

  it('books into prospect_sales_appointments with no setter credit and marks the submission booked', async () => {
    const r = await bookSales({ p_calendar: sales, p_starts_at: la(DAY, 11), p_submission: subId, p_submission_hash: subHash, p_manage_token_hash: hashOf(), p_invitee_time_zone: 'America/Denver' });
    expect(r).toMatchObject({ ok: true, calendar_id: sales });
    saId = r.sales_appointment_id;
    const sa = await one(`select partner_id, calendar_id, status, time_zone, appointment_type, source, setter_pay_amount, decision_maker_name from public.prospect_sales_appointments where id=$1`, [saId]);
    expect(sa).toEqual({ partner_id: null, calendar_id: sales, status: 'scheduled', time_zone: 'America/Denver', appointment_type: 'phone', source: 'sales_funnel', setter_pay_amount: null, decision_maker_name: 'Sam Builder' });
    const p = await one(`select company_name, phone_e164, disposition, source from public.contractor_prospects where id=$1`, [r.prospect_id]);
    expect(p).toEqual({ company_name: 'Builder Co', phone_e164: '+18185550142', disposition: 'appointment_booked', source: 'contractor_funnel' });
    const sub = await one(`select booking_status, review_status, sales_appointment_id from public.contractor_funnel_submissions where submission_id=$1`, [subId]);
    expect(sub).toEqual({ booking_status: 'confirmed', review_status: 'booked', sales_appointment_id: saId });
    expect(await q(`select 1 from public.notification_events where entity_id=$1 and type='appointment_booked'`, [saId])).toHaveLength(1);
    expect((await bookSales({ p_calendar: sales, p_starts_at: la(DAY, 14), p_submission: subId, p_submission_hash: subHash })).error).toBe('already_booked');
    expect((await bookSales({ p_calendar: sales, p_starts_at: la(DAY, 14), p_submission: subId, p_submission_hash: 'b'.repeat(64) })).error).toBe('submission_invalid');
    expect((await bookSales({ p_calendar: team, p_starts_at: la(DAY, 14), p_prospect: r.prospect_id })).error).toBe('wrong_calendar');
  });

  it('treats setter-booked meetings as busy, and a setter booking on behalf gets the credit', async () => {
    const pr = (await one(`insert into public.contractor_prospects(company_name, phone) values ('Walk-in Pools','(818) 555-0199') returning id`)).id;
    await q(`insert into public.prospect_sales_appointments(prospect_id, partner_id, scheduled_at) values ($1,$2,$3)`, [pr, id.setter, la(DAY, 15)]);
    expect((await bookSales({ p_calendar: sales, p_starts_at: la(DAY, 15), p_prospect: pr, p_source: 'manual' })).error).toBe('slot_taken');
    const r = await bookSales({ p_calendar: sales, p_starts_at: la(DAY2, 9), p_prospect: pr, p_partner: id.setter, p_actor: id.setter, p_source: 'manual' });
    expect(r.ok).toBe(true);
    expect((await one(`select partner_id from public.prospect_sales_appointments where id=$1`, [r.sales_appointment_id])).partner_id).toBe(id.setter);
  });

  it('reschedules and cancels', async () => {
    const m = (await one(`select public.reschedule_sales_appointment($1,$2) as r`, [saId, la(DAY, 12)])).r;
    expect(m).toMatchObject({ ok: true, sales_appointment_id: saId });
    expect(new Date((await one(`select booking_start_time from public.contractor_funnel_submissions where submission_id=$1`, [subId])).booking_start_time).toISOString()).toBe(la(DAY, 12));
    expect((await one(`select public.reschedule_sales_appointment($1,$2) as r`, [saId, la(DAY, 15)])).r.error).toBe('slot_taken');
    expect((await one(`select public.cancel_sales_appointment($1,'No longer interested') as r`, [saId])).r.ok).toBe(true);
    expect(await one(`select status, cancel_reason from public.prospect_sales_appointments where id=$1`, [saId])).toEqual({ status: 'cancelled', cancel_reason: 'No longer interested' });
    expect((await one(`select booking_status from public.contractor_funnel_submissions where submission_id=$1`, [subId])).booking_status).toBe('cancelled');
  });
});

describe('booking_switch_funnels_to_native (run after the code deploy)', () => {
  it('dry-runs, then moves Calendly / network funnels and their not-yet-started sessions to the HomeQuote calendar', async () => {
    const cal = { calendarProvider: 'calendly', calendarUrl: 'https://calendly.com/homequotenetwork/30min', calendarHeadline: 'Pick a time' };
    const f1 = (await one(`insert into public.funnels(slug,contractor_id,published,config) values ('calendly-client',$1,true,$2) returning id`, [id.companyB, JSON.stringify(cal)])).id;
    const f2 = (await one(`insert into public.funnels(slug,contractor_id,published,config) values ('ghl-client',$1,true,$2) returning id`,
      [id.companyB, JSON.stringify({ calendarProvider: 'ghl', calendarUrl: 'https://api.leadconnectorhq.com/widget/booking/x', calendarId: 'x' })])).id;
    const fresh = await session(f1, await lead('Fresh'));
    await q(`update public.funnel_sessions set contact_submitted_at=null, config_snapshot=$2 where id=$1`, [fresh.id, JSON.stringify(cal)]);
    const atCalendar = await session(f1, await lead('AtCal'));
    await q(`update public.funnel_sessions set config_snapshot=$2 where id=$1`, [atCalendar.id, JSON.stringify(cal)]);

    const dry = (await one(`select public.booking_switch_funnels_to_native() as r`)).r;
    expect(dry).toMatchObject({ applied: false, sessions: 0, ghl_left_alone: ['ghl-client'] });
    expect(dry.funnels).toEqual(expect.arrayContaining(['calendly-client', 'pool-masters-la']));
    expect(dry.funnels).not.toContain('ghl-client');
    expect((await one(`select config from public.funnels where id=$1`, [f1])).config.calendarProvider).toBe('calendly');

    const done = (await one(`select public.booking_switch_funnels_to_native(true) as r`)).r;
    expect(done).toMatchObject({ applied: true, sessions: 1, still_mentioning_calendly: [] });
    expect((await one(`select config from public.funnels where id=$1`, [f1])).config).toEqual({ calendarProvider: 'homequote', calendarHeadline: 'Pick a time' });
    expect((await one(`select config from public.funnels where id=$1`, [f2])).config.calendarProvider).toBe('ghl');
    expect((await one(`select config_snapshot from public.funnel_sessions where id=$1`, [fresh.id])).config_snapshot.calendarProvider).toBe('homequote');
    expect((await one(`select config_snapshot from public.funnel_sessions where id=$1`, [atCalendar.id])).config_snapshot.calendarProvider).toBe('calendly');
    // Idempotent.
    expect((await one(`select public.booking_switch_funnels_to_native(true) as r`)).r).toMatchObject({ funnels: [], sessions: 0 });
  });
});

describe('reminders', () => {
  it('claims each due reminder once', async () => {
    const l = await lead('Remind');
    const soon = (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at, created_at)
      values ($1,$2, now() + interval '50 minutes', now() + interval '80 minutes', now() - interval '3 days') returning id`, [l, team])).id;
    const tomorrow = (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at, created_at)
      values ($1,$2, now() + interval '23 hours', now() + interval '23 hours 30 minutes', now() - interval '3 days') returning id`, [l, team])).id;
    const fresh = (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at)
      values ($1,$2, now() + interval '22 hours', now() + interval '22 hours 30 minutes') returning id`, [l, team])).id;
    const first = (await one(`select public.claim_booking_reminders(50) as r`)).r as any[];
    expect(first.filter((x) => x.id === soon).map((x) => x.reminder)).toEqual(['1h']);
    expect(first.filter((x) => x.id === tomorrow).map((x) => x.reminder)).toEqual(['24h']);
    expect(first.some((x) => x.id === fresh)).toBe(false); // booked < 24 h ahead: the confirmation covers it
    expect(((await one(`select public.claim_booking_reminders(50) as r`)).r as any[]).some((x) => [soon, tomorrow].includes(x.id))).toBe(false);
    expect((await one(`select reminder_1h_sent_at from public.appointments where id=$1`, [soon])).reminder_1h_sent_at).toBeTruthy();
  });
});

describe('lib/booking on top of the RPCs', () => {
  it('getSlots / bookAppointment / manage-token reschedule + cancel', async () => {
    const { getSlots } = await import('@/lib/booking/slots.server');
    const { bookAppointment, findByManageToken, rescheduleByManageToken, cancelByManageToken } = await import('@/lib/booking/book.server');
    const { calendarForFunnel, calendarForContractorFunnel } = await import('@/lib/booking/calendars.server');
    const sb = fakeSupabase(db) as any;

    expect((await calendarForFunnel({ contractorId: null }, sb))!.id).toBe(team);
    expect((await calendarForFunnel({ contractorId: id.companyA }, sb))!.id).toBe(calA);
    expect((await calendarForContractorFunnel(sb))!.id).toBe(sales);

    const dayStart = zonedToUtc(DAY2, 0, TZ);
    const before = await getSlots(team, dayStart, dayStart + 86_400_000, { db: sb, includeExternalBusy: false });
    expect(before!.slots.length).toBeGreaterThan(0);
    const pick = before!.slots[0];

    const l = await lead('Lib');
    const r = await bookAppointment({ calendarId: team, startsAt: pick.startMs, leadId: l, source: 'manual', checkHostBusy: false, db: sb });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.manageToken).toBeTruthy();
    const after = await getSlots(team, dayStart, dayStart + 86_400_000, { db: sb, includeExternalBusy: false });
    expect(after!.slots.some((x) => x.startMs === pick.startMs)).toBe(false);
    const again = await bookAppointment({ calendarId: team, startsAt: pick.startMs, leadId: await lead('Late'), source: 'manual', checkHostBusy: false, db: sb });
    expect(again).toEqual({ ok: false, error: 'slot_taken', appointmentId: null });

    const found = await findByManageToken(r.manageToken!, sb);
    expect(found).toMatchObject({ kind: 'appointment', id: r.appointmentId, calendarId: team, status: 'scheduled', timeZone: TZ });
    expect(await findByManageToken('x'.repeat(43), sb)).toBeNull();
    expect(await findByManageToken('not a token', sb)).toBeNull();

    const target = after!.slots.find((x) => x.startMs >= pick.startMs + 2 * 3_600_000)!;
    const moved = await rescheduleByManageToken(r.manageToken!, target.startMs, sb);
    expect(moved).toMatchObject({ ok: true, id: r.appointmentId, startsAt: new Date(target.startMs).toISOString() });
    expect((await one(`select actor_type from public.workflow_events where type='appointment.rescheduled' and entity_id=$1`, [r.appointmentId])).actor_type).toBe('contact');
    expect(await cancelByManageToken(r.manageToken!, 'Changed my mind', sb)).toEqual({ ok: true, id: r.appointmentId });
    expect(await rescheduleByManageToken(r.manageToken!, pick.startMs, sb)).toEqual({ ok: false, error: 'not_active' });
  });
});
