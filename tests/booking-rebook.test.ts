/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * The "pick a new time" link sent after a missed call / no-show (hqr1 grant, lib/booking/recovery.server.ts) through
 * the public booking API on the real migration chain: a call nobody marked moves to the new time; a no-show gets a
 * new call for the same lead; a second tap shows the booked call instead of booking twice; a held call can't rebook.
 */
const h = vi.hoisted(() => ({ db: null as any, notices: [] as any[] }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.db }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: () => undefined }));
vi.mock('@/lib/notifications/service', () => ({ sendPushNotification: async () => ({ recipients: 0 }) }));
vi.mock('@/lib/booking/notify.server', async (orig) => ({
  ...(await orig<typeof import('@/lib/booking/notify.server')>()),
  notifyBookingSoon: (e: any) => { h.notices.push(e); },
}));
process.env.BOOKING_TICKET_SECRET = 'test-booking-secret';
process.env.BOOKING_LINK_SECRET = 'test-link-secret';

import { GET as slotsGET } from '@/app/api/booking/slots/route';
import { POST as bookPOST } from '@/app/api/booking/book/route';
import { signRebookGrant } from '@/app/api/booking/_lib/grant';
import { resetRateLimits } from '@/app/api/booking/_lib/http';

let db: PGlite;
let team: string;
const ORIGIN = 'https://homequote.test';
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const one = async (sql: string, p?: unknown[]) => (await q(sql, p))[0];
let ip = 0;
const req = (path: string, init: { method?: string; body?: unknown; grant?: string } = {}) => new Request(`${ORIGIN}${path}`, {
  method: init.method ?? 'GET',
  headers: { origin: ORIGIN, 'x-forwarded-for': `10.1.0.${++ip % 250}`, ...(init.grant ? { 'x-booking-grant': init.grant } : {}), ...(init.body ? { 'content-type': 'application/json' } : {}) },
  body: init.body ? JSON.stringify(init.body) : undefined,
});
const slots = async (grant: string) => { const r = await slotsGET(req('/api/booking/slots', { grant })); return { status: r.status, body: (await r.json()) as any }; };
const book = async (grant: string, startsAt: string) => { const r = await bookPOST(req('/api/booking/book', { method: 'POST', body: { grant, startsAt, timeZone: 'America/Los_Angeles' } })); return { status: r.status, body: (await r.json()) as any }; };

/** A call on the team calendar a day ago (or at `startsAt`), still in `status`. */
async function pastCall(status: string, minutesAgo = 24 * 60) {
  const lead = (await one(`insert into public.leads(first_name,last_name,phone,email,state) values ('Jordan','Rivera','+13105550188',$1,'CA') returning id`, [`j-${randomUUID().slice(0, 6)}@example.test`])).id;
  const start = new Date(Math.floor((Date.now() - minutesAgo * 60_000) / 900_000) * 900_000);
  const id = (await one(`insert into public.appointments(lead_id, calendar_id, scheduled_at, ends_at, time_zone, source, meeting_type, status, contact_name, contact_phone)
    values ($1,$2,$3,$4,'America/Los_Angeles','estimator','phone','scheduled','Jordan Rivera','+13105550188') returning id`, [lead, team, start.toISOString(), new Date(start.getTime() + 600_000).toISOString()])).id;
  if (status !== 'scheduled') await q(`update public.appointments set status=$2 where id=$1`, [id, status]);
  return { id, lead, grant: signRebookGrant(id)! };
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  h.db = fakeSupabase(db);
  team = (await one(`select id from public.booking_calendars where kind='team'`)).id;
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(() => { resetRateLimits(); h.notices = []; });

describe('"pick a new time" link', () => {
  it('a missed call nobody marked moves to the new time (same row), and a second tap shows it', async () => {
    const c = await pastCall('scheduled');
    const s = await slots(c.grant);
    expect(s.status).toBe(200);
    expect(s.body.booked).toBeNull();
    expect(s.body.contact).toEqual({ firstName: 'Jordan', phoneHint: '0188' });
    expect(s.body.slots.length).toBeGreaterThan(0);
    const pick = s.body.slots[0].start;
    const b = await book(c.grant, pick);
    expect(b.status).toBe(200);
    expect(b.body.booking.startsAt).toBe(new Date(pick).toISOString());
    expect(b.body.booking.manageUrl).toMatch(/^\/booking\/manage\//);
    const row = await one(`select status, scheduled_at, reschedule_count from public.appointments where id=$1`, [c.id]);
    expect(row).toMatchObject({ status: 'scheduled', reschedule_count: 1 });
    expect(new Date(row.scheduled_at).toISOString()).toBe(new Date(pick).toISOString());
    expect(h.notices).toEqual([expect.objectContaining({ kind: 'appointment', id: c.id, change: 'rescheduled', actorKind: 'homeowner' })]);
    // Second tap: their booked call, never a second booking.
    const again = await book(c.grant, s.body.slots[1].start);
    expect(again.body.error).toBe('already_booked');
    expect(again.body.booking.startsAt).toBe(new Date(pick).toISOString());
    expect((await slots(c.grant)).body.booked.startsAt).toBe(new Date(pick).toISOString());
  });

  it('a no-show gets a new call for the same lead; the no-show stays on record', async () => {
    const c = await pastCall('no_show', 2 * 24 * 60);
    const s = await slots(c.grant);
    const pick = s.body.slots[2].start;
    const b = await book(c.grant, pick);
    expect(b.status).toBe(200);
    const rows = await q(`select id, status from public.appointments where lead_id=$1 order by created_at`, [c.lead]);
    expect(rows.map((r) => r.status)).toEqual(['no_show', 'scheduled']);
    expect(rows[1].id).not.toBe(c.id);
    expect(h.notices).toEqual([expect.objectContaining({ id: rows[1].id, change: 'booked' })]);
  });

  it('a held call, or a forged / unknown link, cannot book', async () => {
    const held = await pastCall('held', 3 * 24 * 60);
    expect((await slots(held.grant)).body.error).toBe('not_active');
    expect((await slots(signRebookGrant(randomUUID())!)).status).toBe(401);
    expect((await slots(held.grant.slice(0, -4) + 'AAAA')).status).toBe(401);
  });
});
