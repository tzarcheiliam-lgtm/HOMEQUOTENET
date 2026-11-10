/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }));

import { parseRoomName, participantRole, videoRoomName } from '@/lib/video/links';
import { handleVideoEvent, minutesTogether, callSummaries } from '@/lib/video/events.server';
import { runVideoNoShows } from '@/lib/video/no-shows.server';
import { buildNotifications } from '@/lib/notifications/routing';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';
import { fakeDb, type Tables } from './fixtures/fake-db';

/**
 * Phase 2 of HomeQuote video rooms (§52): LiveKit webhook events become call
 * history, a guest arriving before any host raises one alert per session, and
 * video sales meetings the rep opened but the contractor never joined become
 * no-shows.
 */

describe('room and participant parsing', () => {
  it('maps our room names back to the meeting, and nothing else', () => {
    const id = randomUUID();
    expect(parseRoomName(videoRoomName('sales_appointment', id))).toEqual({ kind: 'sales_appointment', id });
    expect(parseRoomName(videoRoomName('link', id))).toEqual({ kind: 'link', id });
    expect(parseRoomName(videoRoomName('appointment', id))).toEqual({ kind: 'appointment', id });
    expect(parseRoomName('some-other-room')).toBeNull();
    expect(parseRoomName(`hq-sales-${id}-x`)).toBeNull();
  });
  it('knows hosts (with their profile) and guests; ignores bots and strangers', () => {
    const uid = randomUUID();
    expect(participantRole(`host-${uid}`)).toEqual({ role: 'host', userId: uid });
    expect(participantRole('guest-a1b2c3d4e5f6')).toEqual({ role: 'guest', userId: null });
    expect(participantRole('EG_recorder')).toBeNull();
    expect(participantRole('agent-123')).toBeNull();
    expect(participantRole(undefined)).toBeNull();
  });
});

describe('minutes together', () => {
  const t = (m: number) => new Date(Date.UTC(2026, 10, 6, 18, m)).toISOString();
  it('counts only the overlap of host and guest, without double-counting two guest tabs', () => {
    const rows = [
      { role: 'host' as const, joined_at: t(0), left_at: t(40) },
      { role: 'guest' as const, joined_at: t(5), left_at: t(35) },
      { role: 'guest' as const, joined_at: t(10), left_at: t(20) },
    ];
    expect(minutesTogether(rows, Date.parse(t(60)))).toBe(30);
  });
  it('is 0 when they never overlapped, and runs to now while both are still in', () => {
    expect(minutesTogether([{ role: 'host', joined_at: t(0), left_at: t(5) }, { role: 'guest', joined_at: t(10), left_at: t(20) }], Date.parse(t(60)))).toBe(0);
    expect(minutesTogether([{ role: 'host', joined_at: t(0), left_at: null }, { role: 'guest', joined_at: t(2), left_at: null }], Date.parse(t(14)))).toBe(12);
  });
});

describe('"guest joined" alert routing', () => {
  let tables: Tables;
  beforeEach(() => {
    tables = {
      profiles: [
        { id: 'admin-1', role: 'admin', is_active: true, contractor_id: null },
        { id: 'setter-1', role: 'setter', is_active: true, contractor_id: null },
        { id: 'setter-2', role: 'setter', is_active: true, contractor_id: null },
        { id: 'caller-1', role: 'caller', is_active: true, contractor_id: null },
        { id: 'owner-1', role: 'contractor', is_active: true, contractor_id: 'co-1' },
      ],
      meeting_links: [{ id: 'link-1', host_id: 'setter-1', guest_name: 'Mike', cancelled_at: null, prospect: { company_name: 'ABC Roofing' } }],
      prospect_sales_appointments: [{ id: 'sa-1', partner_id: 'setter-2', decision_maker_name: 'Dana', prospect: { company_name: 'Blue Pools', assigned_to: 'caller-1' } }],
    };
  });
  const ev = (entity_type: string, entity_id: string) => ({ id: 'ev', type: 'video_guest_joined', entity_type, entity_id, lead_id: null, contractor_id: null, payload: {} });
  const who = (out: Awaited<ReturnType<typeof buildNotifications>>) => out.flatMap((m) => m.userIds).sort();

  it('a meeting link alerts its host (and admins), never another rep or a contractor', async () => {
    const out = await buildNotifications(ev('link', 'link-1'), fakeDb(tables) as any);
    expect(who(out)).toEqual(['admin-1', 'setter-1']);
    expect(out[0].body).toBe('Mike · ABC Roofing is waiting in your video call.');
    expect(out.every((m) => m.url === '/app/meet/link/link-1')).toBe(true);
  });
  it('a sales meeting alerts its setter and the prospect’s caller', async () => {
    const out = await buildNotifications(ev('sales_appointment', 'sa-1'), fakeDb(tables) as any);
    expect(who(out)).toEqual(['admin-1', 'caller-1', 'setter-2']);
  });
  it('a homeowner appointment never names the homeowner, and a cancelled link alerts nobody', async () => {
    const out = await buildNotifications(ev('appointment', 'ap-1'), fakeDb(tables) as any);
    expect(out[0]?.body).toBe('A homeowner is waiting in your video call.');
    tables.meeting_links[0].cancelled_at = '2026-11-06T00:00:00Z';
    expect(await buildNotifications(ev('link', 'link-1'), fakeDb(tables) as any)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// Webhook handling + no-shows on the real migration chain
// ---------------------------------------------------------------------------------------------

let pg: PGlite;
const id = Object.fromEntries(['admin', 'setter', 'prospect', 'saVideo', 'saGuestCame', 'saNoHost', 'saPhone'].map((k) => [k, randomUUID()])) as Record<string, string>;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await pg.query<T>(sql, p)).rows;

beforeAll(async () => {
  pg = await fullSchema({ supabaseGrants: true });
  for (const [uid, role] of [[id.admin, 'admin'], [id.setter, 'setter']] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, is_active=true, account_status='active' where id=$1`, [uid, role]);
  }
  await q(`insert into public.contractor_prospects(id, company_name) values ($1, 'ABC Roofing')`, [id.prospect]);
}, 120_000);
afterAll(async () => {
  await pg?.close();
});

describe('webhook events → call history', () => {
  const sales = randomUUID();
  const room = { sid: 'RM_1', name: videoRoomName('sales_appointment', sales) };
  const base = Date.UTC(2026, 10, 6, 18, 0) / 1000;
  const guest = { sid: 'PA_g1', identity: 'guest-aaaaaaaaaaaa', name: 'Mike', kind: 0 };
  const host = { sid: 'PA_h1', identity: `host-${randomUUID()}`, name: 'Liam', kind: 0 };

  it('records joins, alerts once when the guest is first in, and ignores replays and bots', async () => {
    const db = fakeSupabase(pg) as any;
    const notify = vi.fn(async () => {});
    const deps = { db, notifyGuestJoined: notify };
    expect(await handleVideoEvent({ event: 'room_started', room, createdAt: base }, deps)).toMatchObject({ handled: true });
    expect(await handleVideoEvent({ event: 'participant_joined', room, participant: guest, createdAt: base + 60 }, deps)).toMatchObject({ notified: true });
    // LiveKit may deliver twice.
    expect(await handleVideoEvent({ event: 'participant_joined', room, participant: guest, createdAt: base + 60 }, deps)).toMatchObject({ notified: false });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({ kind: 'sales_appointment', refId: sales, roomSid: 'RM_1', guestName: 'Mike' });
    expect(await handleVideoEvent({ event: 'participant_joined', room, participant: { sid: 'PA_bot', identity: 'EG_rec', kind: 2 }, createdAt: base + 61 }, deps)).toMatchObject({ handled: false });
    await handleVideoEvent({ event: 'participant_joined', room, participant: host, createdAt: base + 120 }, deps);
    await handleVideoEvent({ event: 'participant_left', room, participant: guest, createdAt: base + 120 + 25 * 60 }, deps);
    await handleVideoEvent({ event: 'room_finished', room, createdAt: base + 30 * 60 }, deps);
    const [call] = await q(`select * from public.video_calls where room_sid='RM_1'`);
    expect(call).toMatchObject({ kind: 'sales_appointment', ref_id: sales });
    expect(call.guest_first_joined_at).not.toBeNull();
    expect(call.host_first_joined_at).not.toBeNull();
    expect(call.ended_at).not.toBeNull();
    expect(await q(`select role from public.video_call_participants where call_id=$1 order by role`, [call.id])).toEqual([{ role: 'guest' }, { role: 'host' }]);
    const summary = (await callSummaries(db, 'sales_appointment', [sales], (base + 30 * 60) * 1000)).get(sales);
    expect(summary?.minutesTogether).toBe(25);
  });

  it('does not alert when a host is already in the room, and ignores rooms HomeQuote did not name', async () => {
    const db = fakeSupabase(pg) as any;
    const notify = vi.fn(async () => {});
    const room2 = { sid: 'RM_2', name: videoRoomName('link', randomUUID()) };
    await handleVideoEvent({ event: 'participant_joined', room: room2, participant: { ...host, sid: 'PA_h2' }, createdAt: base }, { db, notifyGuestJoined: notify });
    expect(await handleVideoEvent({ event: 'participant_joined', room: room2, participant: { ...guest, sid: 'PA_g2' }, createdAt: base + 30 }, { db, notifyGuestJoined: notify })).toMatchObject({ notified: false });
    expect(notify).not.toHaveBeenCalled();
    expect(await handleVideoEvent({ event: 'participant_joined', room: { sid: 'RM_x', name: 'not-ours' }, participant: guest }, { db })).toMatchObject({ handled: false });
  });
});

describe('automatic no-shows for video sales meetings', () => {
  it('marks only video meetings the rep opened and the contractor never joined, after the meeting ended', async () => {
    const start = new Date(Date.UTC(2026, 10, 6, 17, 0));
    const now = new Date(start.getTime() + 45 * 60_000); // 30-min meeting + 10-min grace has passed
    const mk = (sid: string, type: string) =>
      q(`insert into public.prospect_sales_appointments(id, prospect_id, partner_id, scheduled_at, appointment_type, status) values ($1,$2,$3,$4,$5,'scheduled')`, [sid, id.prospect, id.setter, start.toISOString(), type]);
    await mk(id.saVideo, 'video');
    await mk(id.saGuestCame, 'video');
    await mk(id.saNoHost, 'video');
    await mk(id.saPhone, 'phone');
    const call = (ref: string, host: boolean, guest: boolean) =>
      q(`insert into public.video_calls(room_sid, room_name, kind, ref_id, host_first_joined_at, guest_first_joined_at) values ($1,$2,'sales_appointment',$3,$4,$5)`, [
        `RM_${ref}`, videoRoomName('sales_appointment', ref), ref, host ? start.toISOString() : null, guest ? start.toISOString() : null,
      ]);
    await call(id.saVideo, true, false);
    await call(id.saGuestCame, true, true);
    await call(id.saPhone, true, false);

    const tooEarly = await runVideoNoShows({ db: fakeSupabase(pg) as any, now: new Date(start.getTime() + 35 * 60_000) });
    expect(tooEarly.marked).toEqual([]);
    const r = await runVideoNoShows({ db: fakeSupabase(pg) as any, now });
    expect(r.marked).toEqual([id.saVideo]);
    const status = Object.fromEntries((await q(`select id, status from public.prospect_sales_appointments`)).map((x) => [x.id, x.status]));
    expect(status[id.saVideo]).toBe('no_show');
    expect(status[id.saGuestCame]).toBe('scheduled');
    expect(status[id.saNoHost]).toBe('scheduled');
    expect(status[id.saPhone]).toBe('scheduled');
    // Idempotent.
    expect((await runVideoNoShows({ db: fakeSupabase(pg) as any, now })).marked).toEqual([]);
  });
});

describe('video call history RLS', () => {
  it('admins and reps can read it; nobody can write it from the app', async () => {
    await pg.exec(`set role authenticated; select set_config('app.uid','${id.setter}', false)`);
    try {
      expect((await q(`select count(*)::int as n from public.video_calls`))[0].n).toBeGreaterThan(0);
      await expect(q(`insert into public.video_calls(room_sid, room_name, kind, ref_id) values ('x','x','link',$1)`, [randomUUID()])).rejects.toThrow();
    } finally {
      await pg.exec(`reset role; select set_config('app.uid','', false)`);
    }
  });
});
