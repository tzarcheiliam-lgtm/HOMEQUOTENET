/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, localParts, weekdayOfDate, zonedToUtc } from '@/lib/availability/time';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * The in-app calendar's server actions (lib/actions/booking.ts) on the REAL
 * migration chain in PGlite: the user's client really runs as that user (RLS
 * applies), the service-role client as the table owner, and the booking RPCs
 * are the real 0070 ones. Settings writes, "book a call on behalf", slot
 * access and the lead search are exercised per role. Nothing leaves the test.
 */
let db: PGlite;
const TZ = 'America/Los_Angeles';
const id = Object.fromEntries(
  ['admin', 'setter', 'ownerA', 'staffA', 'ownerB', 'companyA', 'companyB'].map((k) => [k, randomUUID()])
) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const one = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await q<T>(sql, p))[0];

// One statement at a time, each under the right role (PGlite is a single connection).
let lock: Promise<unknown> = Promise.resolve();
function runAs(uid: string | null, sql: string, params?: unknown[]) {
  const p = lock.then(async () => {
    if (uid) await db.exec(`set role authenticated; select set_config('app.uid','${uid}', false)`);
    try { return await db.query(sql, params); } finally { if (uid) await db.exec(`reset role; select set_config('app.uid','', false)`); }
  });
  lock = p.catch(() => undefined);
  return p;
}

const m = vi.hoisted(() => ({ profile: null as any, notify: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireProfile: async () => m.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeSupabase({ query: (s: string, p?: unknown[]) => runAs(m.profile.id, s, p) } as any) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeSupabase({ query: (s: string, p?: unknown[]) => runAs(null, s, p) } as any) }));
vi.mock('@/lib/booking/notify.server', () => ({ notifyBookingSoon: m.notify }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/calendar/sync.server', () => ({ flushCalendarSyncSoon: vi.fn() }));

import * as actions from '@/lib/actions/booking';

const profiles: Record<string, any> = {};
const asUser = (k: string) => { m.profile = profiles[k]; };
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function bookableDate(offsetDays = 3): string {
  let d = addDays(localParts(Date.now(), TZ).date, offsetDays);
  while (![2, 3, 4].includes(weekdayOfDate(d))) d = addDays(d, 1);
  return d;
}
const la = (date: string, hh: number, mm = 0) => new Date(zonedToUtc(date, hh * 60 + mm, TZ)).toISOString();
const DAY = bookableDate();

let team: string;
let calA: string;
let calB: string;

async function lead(first: string, assignTo?: string): Promise<string> {
  const l = (await one<{ id: string }>(`insert into public.leads(first_name, last_name, phone, email) values ($1,'Doe','+13105550100',$2) returning id`,
    [first, `${first.toLowerCase()}-${randomUUID().slice(0, 6)}@example.test`])).id;
  if (assignTo) await q(`insert into public.lead_assignments(lead_id, contractor_id) values ($1,$2)`, [l, assignTo]);
  return l;
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  await q(`insert into public.contractors(id,name) values ($1,'Pool Masters LA'),($2,'Other Pools')`, [id.companyA, id.companyB]);
  for (const [k, role, company, crole] of [
    ['admin', 'admin', null, null],
    ['setter', 'setter', null, null],
    ['ownerA', 'contractor', id.companyA, 'owner'],
    ['staffA', 'contractor', id.companyA, 'staff'],
    ['ownerB', 'contractor', id.companyB, 'owner'],
  ] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [id[k], `${k}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active', full_name=$5 where id=$1`,
      [id[k], role, company, crole, k]);
    profiles[k] = { id: id[k], role, contractor_id: company, contractor_role: crole, is_active: true };
  }
  team = (await one(`select id from public.booking_calendars where kind='team'`)).id;
  calA = (await one(`select public.ensure_contractor_booking_calendar($1) as id`, [id.companyA])).id;
  calB = (await one(`select public.ensure_contractor_booking_calendar($1) as id`, [id.companyB])).id;
}, 120_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { m.notify.mockReset(); });

describe('calendar settings through RLS', () => {
  it('lets the contractor owner edit their own calendar and nobody else’s', async () => {
    asUser('ownerA');
    const save = (cal: string, extra: Record<string, string> = {}) => actions.saveBookingCalendarSettings(cal, undefined, fd({
      name: 'Pool Masters calls', timezone: TZ, duration_minutes: '45', slot_step_minutes: '15', buffer_minutes: '10', min_notice_hours: '4',
      horizon_days: '21', max_per_day: '', meeting_type: 'phone', video_link: '', active: 'on', ...extra,
    }));
    expect(await save(calA)).toEqual({ success: 'Settings saved' });
    expect(await one(`select name, duration_minutes, slot_step_minutes, buffer_minutes, min_notice_minutes, horizon_days, max_per_day, active from public.booking_calendars where id=$1`, [calA]))
      .toEqual({ name: 'Pool Masters calls', duration_minutes: 45, slot_step_minutes: 15, buffer_minutes: 10, min_notice_minutes: 240, horizon_days: 21, max_per_day: null, active: true });
    expect(await save(calA, { meeting_type: 'video', video_link: '' })).toEqual({ error: 'Add the video link callers will join' });
    // With HomeQuote video rooms (LiveKit) set up, an empty link means "give each booking its own room" (§48).
    vi.stubEnv('LIVEKIT_URL', 'wss://example.livekit.cloud');
    vi.stubEnv('LIVEKIT_API_KEY', 'key');
    vi.stubEnv('LIVEKIT_API_SECRET', 'secret');
    try {
      expect(await save(calA, { meeting_type: 'video', video_link: '' })).toEqual({ success: 'Settings saved' });
      expect(await one(`select meeting_type, video_link from public.booking_calendars where id=$1`, [calA])).toEqual({ meeting_type: 'video', video_link: null });
    } finally {
      vi.unstubAllEnvs();
    }
    expect(await save(calA)).toEqual({ success: 'Settings saved' });
    expect(await save(calA, { meeting_type: 'video', video_link: 'http://meet.example' })).toEqual({ error: 'The video link must start with https://' });
    expect(await save(calB)).toEqual({ error: 'Calendar not found' }); // RLS: another company's calendar is invisible
    expect(await save(team)).toEqual({ error: 'Calendar not found' });

    asUser('staffA');
    expect((await save(calA))?.error).toMatch(/admin or the company owner/);
    asUser('setter');
    expect((await save(team))?.error).toMatch(/admin or the company owner/);
    asUser('admin');
    expect(await save(team, { name: 'HomeQuote team', duration_minutes: '30', slot_step_minutes: '30', buffer_minutes: '15', min_notice_hours: '2', horizon_days: '14' }))
      .toEqual({ success: 'Settings saved' });
    // Put Pool Masters back to the defaults the booking tests below expect.
    expect(await save(calA, { name: 'Pool Masters LA', duration_minutes: '30', slot_step_minutes: '30', buffer_minutes: '15', min_notice_hours: '2', horizon_days: '14' }))
      .toEqual({ success: 'Settings saved' });
  });

  it('replaces weekly hours and refuses overlaps', async () => {
    asUser('ownerA');
    const rules = (r: unknown[]) => actions.saveBookingCalendarRules(calA, undefined, fd({ rules: JSON.stringify(r) }));
    expect(await rules([{ weekday: 1, startMinute: 540, endMinute: 600 }, { weekday: 1, startMinute: 590, endMinute: 700 }])).toEqual({ error: 'Hours on the same day overlap' });
    expect(await rules([{ weekday: 2, startMinute: 600, endMinute: 540 }])).toEqual({ error: 'End time must be after start time' });
    const week = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 480, endMinute: 1080 }));
    expect(await rules(week)).toEqual({ success: 'Hours saved' });
    expect((await q(`select weekday, start_minute, end_minute from public.booking_calendar_rules where calendar_id=$1 order by weekday`, [calA])))
      .toEqual(week.map((w) => ({ weekday: w.weekday, start_minute: 480, end_minute: 1080 })));
    asUser('ownerB');
    expect(await actions.saveBookingCalendarRules(calA, undefined, fd({ rules: '[]' }))).toEqual({ error: 'Calendar not found' });
    expect((await q(`select 1 from public.booking_calendar_rules where calendar_id=$1`, [calA]))).toHaveLength(5);
    // Back to 9–5 for the booking tests.
    asUser('ownerA');
    expect(await rules([1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020 })))).toEqual({ success: 'Hours saved' });
  });

  it('adds only eligible hosts and toggles / removes them', async () => {
    asUser('ownerA');
    expect(await actions.addBookingCalendarMember(calA, undefined, fd({ user_id: id.ownerB }))).toEqual({ error: 'Pick a person to add' });
    expect(await actions.addBookingCalendarMember(calA, undefined, fd({ user_id: id.admin }))).toEqual({ error: 'Pick a person to add' });
    expect(await actions.addBookingCalendarMember(calA, undefined, fd({ user_id: id.staffA }))).toEqual({ success: 'Host added' });
    await actions.updateBookingCalendarMember(fd({ calendar_id: calA, user_id: id.staffA, op: 'notify_off' }));
    expect((await one(`select notify from public.booking_calendar_members where calendar_id=$1 and user_id=$2`, [calA, id.staffA])).notify).toBe(false);
    await actions.updateBookingCalendarMember(fd({ calendar_id: calA, user_id: id.staffA, op: 'remove' }));
    expect(await q(`select 1 from public.booking_calendar_members where calendar_id=$1 and user_id=$2`, [calA, id.staffA])).toHaveLength(0);

    asUser('admin');
    expect(await actions.addBookingCalendarMember(team, undefined, fd({ user_id: id.ownerA }))).toEqual({ error: 'Pick a person to add' });
    expect(await actions.addBookingCalendarMember(team, undefined, fd({ user_id: id.setter }))).toEqual({ success: 'Host added' });
    asUser('setter');
    await actions.updateBookingCalendarMember(fd({ calendar_id: team, user_id: id.setter, op: 'remove' }));
    expect(await q(`select 1 from public.booking_calendar_members where calendar_id=$1 and user_id=$2`, [team, id.setter])).toHaveLength(1);
  });
});

describe('book a call on behalf', () => {
  it('a contractor books its own lead on its own calendar, never anyone else’s', async () => {
    const mine = await lead('Mine', id.companyA);
    const theirs = await lead('Theirs', id.companyB);
    asUser('ownerA');
    const r = await actions.bookCallOnBehalf({ calendarId: calA, partyId: mine, startsAt: la(DAY, 10), notes: 'Wants a spa' });
    expect(r).toMatchObject({ ok: true, startsAt: la(DAY, 10) });
    if (!r.ok) return;
    const ap = await one(`select a.*, la.contractor_id from public.appointments a join public.lead_assignments la on la.id = a.assignment_id where a.id=$1`, [r.id]);
    expect(ap).toMatchObject({ calendar_id: calA, lead_id: mine, source: 'manual', created_by: id.ownerA, contractor_id: id.companyA, notes: 'Wants a spa', status: 'scheduled' });
    expect(m.notify).toHaveBeenCalledWith({ kind: 'appointment', id: r.id, change: 'booked', actorKind: 'user' });

    // Another company's lead is invisible; another company's / the team calendar is refused.
    expect(await actions.bookCallOnBehalf({ calendarId: calA, partyId: theirs, startsAt: la(DAY, 11) })).toEqual({ ok: false, error: 'Lead not found.' });
    expect((await actions.bookCallOnBehalf({ calendarId: calB, partyId: mine, startsAt: la(DAY, 11) })).ok).toBe(false);
    expect((await actions.bookCallOnBehalf({ calendarId: team, partyId: mine, startsAt: la(DAY, 11) })).ok).toBe(false);
    // Taken (with its buffer), and a contractor cannot "book anyway".
    expect(await actions.bookCallOnBehalf({ calendarId: calA, partyId: await lead('Next', id.companyA), startsAt: la(DAY, 10, 30) }))
      .toMatchObject({ ok: false, pickAnother: true });
    expect(await actions.bookCallOnBehalf({ calendarId: calA, partyId: mine, startsAt: la(DAY, 7), override: true }))
      .toMatchObject({ ok: false, error: expect.stringMatching(/outside the available hours/), pickAnother: true });
    expect(await q(`select 1 from public.audit_logs where action='appointment.availability_override'`)).toHaveLength(0);
  });

  it('staff book any lead on the team calendar, and may book anyway (logged)', async () => {
    const l = await lead('Network');
    asUser('setter');
    const r = await actions.bookCallOnBehalf({ calendarId: team, partyId: l, startsAt: la(DAY, 14) });
    expect(r.ok).toBe(true);
    const late = await actions.bookCallOnBehalf({ calendarId: team, partyId: await lead('Late'), startsAt: la(DAY, 18), override: true });
    expect(late.ok).toBe(true);
    if (!late.ok) return;
    expect((await one(`select actor_id, metadata from public.audit_logs where action='appointment.availability_override'`)))
      .toMatchObject({ actor_id: id.setter, metadata: { appointment_id: late.id, calendar_id: team } });
  });

  it('serves slots only for calendars the user may work, and searches what RLS shows', async () => {
    asUser('staffA');
    const own = await actions.getCalendarSlots({ calendarId: calA });
    expect(own.ok).toBe(true);
    if (own.ok) {
      expect(own.timeZone).toBe(TZ);
      expect(own.slots.some((s) => s.start === la(DAY, 10))).toBe(false); // booked above
      expect(own.slots.some((s) => s.start === la(DAY, 11))).toBe(true);
    }
    expect((await actions.getCalendarSlots({ calendarId: team })).ok).toBe(false);
    expect((await actions.getCalendarSlots({ calendarId: 'not-a-uuid' })).ok).toBe(false);

    asUser('admin');
    const found = await actions.searchBookable(team, 'Network');
    expect(found.ok && found.results.map((r) => r.name)).toEqual(['Network Doe']);
    asUser('ownerB');
    expect((await actions.searchBookable(team, 'Network')).ok).toBe(false);
    asUser('staffA');
    const ownLeads = await actions.searchBookable(calA, 'doe');
    expect(ownLeads.ok && ownLeads.results.map((r) => r.name).sort()).toEqual(['Mine Doe', 'Next Doe']);
  });
});
