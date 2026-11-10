/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => void) => fn() }));

type Row = Record<string, any>;
const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  claimed: [] as Row[],
  google: { upserts: [] as any[], deletes: [] as any[], failUpsert: null as null | Error, authFail: false },
}));

function builder(table: string) {
  const filters: [string, unknown, 'eq' | 'in' | 'is' | 'gte' | 'lte'][] = [];
  let mode: 'select' | 'update' | 'delete' = 'select';
  let patch: Row = {};
  const rows = () => h.tables[table] ?? (h.tables[table] = []);
  const match = (r: Row) =>
    filters.every(([k, v, op]) =>
      op === 'in' ? (v as unknown[]).includes(r[k])
      : op === 'is' ? (r[k] ?? null) === v
      : op === 'gte' ? r[k] >= (v as string)
      : op === 'lte' ? r[k] <= (v as string)
      : r[k] === v);
  const run = () => {
    const hit = rows().filter(match);
    if (mode === 'update') hit.forEach((r) => Object.assign(r, patch));
    if (mode === 'delete') h.tables[table] = rows().filter((r) => !match(r));
    return { data: mode === 'select' ? hit : null, error: null };
  };
  const api: any = {
    select: () => api,
    eq: (k: string, v: unknown) => (filters.push([k, v, 'eq']), api),
    in: (k: string, v: unknown[]) => (filters.push([k, v, 'in']), api),
    is: (k: string, v: unknown) => (filters.push([k, v, 'is']), api),
    gte: (k: string, v: unknown) => (filters.push([k, v, 'gte']), api),
    lte: (k: string, v: unknown) => (filters.push([k, v, 'lte']), api),
    limit: () => api,
    order: () => api,
    update: (p: Row) => ((mode = 'update'), (patch = p), api),
    delete: () => ((mode = 'delete'), api),
    maybeSingle: async () => ({ data: run().data?.[0] ?? null, error: null }),
    upsert: async (row: Row, opts: { onConflict: string }) => {
      const keys = opts.onConflict.split(',');
      const existing = rows().find((r) => keys.every((k) => r[k] === row[k]));
      if (existing) Object.assign(existing, row);
      else rows().push({ ...row });
      return { error: null };
    },
    insert: async (row: Row) => {
      // The partial unique index: one pending job per kind + item.
      if (table === 'calendar_sync_jobs' && rows().some((r) => !r.processed_at && (r.kind ?? 'appointment') === (row.kind ?? 'appointment') && r.appointment_id === row.appointment_id)) {
        return { error: { message: 'duplicate key' } };
      }
      rows().push({ ...row });
      return { error: null };
    },
    then: (resolve: (v: unknown) => void) => resolve(run()),
  };
  return api;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (t: string) => builder(t),
    rpc: async (name: string) => (name === 'claim_calendar_sync_jobs' ? { data: h.claimed, error: null } : { data: null, error: null }),
  }),
}));

vi.mock('@/lib/calendar/config', async (orig) => ({
  ...(await orig<typeof import('@/lib/calendar/config')>()),
  decryptCalendarSecret: (v: string) => `dec(${v})`,
  siteUrl: () => 'https://hq.test',
}));

vi.mock('@/lib/calendar/google', async (orig) => {
  const actual = await orig<typeof import('@/lib/calendar/google')>();
  return {
    ...actual,
    refreshAccessToken: async () => {
      if (h.google.authFail) throw new actual.CalendarAuthError('revoked');
      return 'access';
    },
    upsertEvent: async (...a: unknown[]) => {
      if (h.google.failUpsert) throw h.google.failUpsert;
      h.google.upserts.push(a);
    },
    deleteEvent: async (...a: unknown[]) => void h.google.deletes.push(a),
  };
});

import { processCalendarSyncJobs, reconcileMirrorCalendars, unmirrorConnection } from '@/lib/calendar/sync.server';
import { createAdminClient } from '@/lib/supabase/admin';

/*
 * 0073: an admin's own Google connection with "Put every appointment on my calendar" gets every
 * homeowner appointment (all contractors) and every sales meeting with a contractor. Same worker,
 * same deterministic ids; a calendar that is both a host/company target and a mirror gets ONE event.
 */

const day = (n: number) => new Date(Math.floor(Date.now() / 86_400_000) * 86_400_000 + n * 86_400_000 + 17 * 3_600_000).toISOString();
const FUTURE = day(10);
const appt = (over: Row = {}) => ({
  id: 'a1',
  scheduled_at: FUTURE,
  status: 'scheduled',
  location: null,
  notes: null,
  updated_at: '2026-10-14T00:00:00Z',
  assignment: { contractor_id: 'c1', lead: { id: 'l1', first_name: 'Pat', last_name: 'Rivera', phone: '555', address: '1 Main', city: 'LA', state: 'CA', zip: '90001', vertical: { name: 'Pool' }, sub_service: null } },
  ...over,
});
const meeting = (over: Row = {}) => ({
  id: 's1', prospect_id: 'p1', decision_maker_name: 'Sam', scheduled_at: FUTURE, ends_at: null, appointment_type: 'phone',
  contact_info: '(310) 555-0100', status: 'scheduled', notes: null, updated_at: '2026-10-14T00:00:00Z',
  prospect: { company_name: 'ACME Roofing', phone: '(310) 555-0199', city: 'Burbank', state: 'CA' },
  ...over,
});
const conn = (over: Row = {}) => ({ id: 'k1', user_id: 'u1', contractor_id: 'c1', provider: 'google', calendar_id: 'primary', encrypted_credentials: 'enc', status: 'active', push_appointments: true, import_busy: true, mirror_all_appointments: false, ...over });
const adminConn = (over: Row = {}) => conn({ id: 'kA', user_id: 'admin1', contractor_id: null, mirror_all_appointments: true, ...over });

function claim(kind: 'appointment' | 'sales_meeting', id: string, jobId = `j-${kind}-${id}-${Math.random()}`) {
  h.tables.calendar_sync_jobs.push({ id: jobId, kind, appointment_id: id, contractor_id: null, processed_at: null });
  h.claimed = [{ id: jobId, kind, appointment_id: id, contractor_id: kind === 'appointment' ? 'c1' : null }];
}

beforeEach(() => {
  h.tables = {
    appointments: [appt()],
    prospect_sales_appointments: [meeting()],
    calendar_connections: [conn(), adminConn()],
    profiles: [{ id: 'admin1', role: 'admin', is_active: true }, { id: 'setter1', role: 'setter', is_active: true }, { id: 'u1', role: 'contractor', is_active: true }],
    contractors: [{ id: 'c1', name: 'Pool Masters' }],
    appointment_calendar_events: [],
    calendar_sync_jobs: [],
    contractor_availability_settings: [],
    booking_calendar_members: [],
  };
  h.claimed = [];
  h.google = { upserts: [], deletes: [], failUpsert: null, authFail: false };
});

const events = (connectionId: string) => h.tables.appointment_calendar_events.filter((e) => e.connection_id === connectionId);

describe('homeowner appointments on the admin calendar', () => {
  it('adds every contractor appointment to the admin calendar, with whose appointment it is, next to the company calendar', async () => {
    claim('appointment', 'a1');
    const r = await processCalendarSyncJobs();
    expect(r).toEqual({ claimed: 1, done: 1, retried: 0 });
    expect(h.google.upserts).toHaveLength(2);
    const byTitle = h.google.upserts.map((u) => (u[3] as any).summary).sort();
    expect(byTitle).toEqual(['HomeQuote: Pool – Pat', 'Pool Masters · Pat Rivera (homeowner appt)']);
    const mirror = h.google.upserts.find((u) => (u[3] as any).summary.startsWith('Pool Masters'))![3] as any;
    expect(mirror.description).toContain('Contractor: Pool Masters');
    expect(mirror.description).toContain('Status: scheduled');
    expect(mirror.description).toContain('Phone: 555');
    expect(mirror.description).toContain('https://hq.test/app/leads/l1');
    expect(mirror.location).toBe('1 Main, LA, CA 90001');
    expect(events('kA')).toHaveLength(1);
    expect(events('kA')[0].kind).toBe('appointment');
  });

  it('moves the same event on a reschedule and removes it on a cancel', async () => {
    claim('appointment', 'a1');
    await processCalendarSyncJobs();
    const id = events('kA')[0].external_event_id;
    h.tables.appointments[0].scheduled_at = day(11);
    claim('appointment', 'a1');
    await processCalendarSyncJobs();
    const adminUpserts = h.google.upserts.filter((u) => (u[3] as any).summary.startsWith('Pool Masters'));
    expect(adminUpserts).toHaveLength(2);
    expect(adminUpserts[1][2]).toBe(id);
    expect((adminUpserts[1][3] as any).startIso).toBe(day(11));
    h.tables.appointments[0].status = 'cancelled';
    claim('appointment', 'a1');
    await processCalendarSyncJobs();
    expect(h.google.deletes.map((d) => d[2])).toContain(id);
    expect(events('kA')).toHaveLength(0);
  });

  it('adds nothing when the admin turned it off, or when the owner is not an admin', async () => {
    h.tables.calendar_connections = [conn(), adminConn({ mirror_all_appointments: false }), adminConn({ id: 'kS', user_id: 'setter1' })];
    claim('appointment', 'a1');
    await processCalendarSyncJobs();
    expect(h.google.upserts).toHaveLength(1);
    expect(events('kA')).toHaveLength(0);
    expect(events('kS')).toHaveLength(0);
  });

  it('a calendar that hosts the call AND mirrors gets one event, not two', async () => {
    h.tables.appointments = [appt({ assignment: null, calendar_id: 'team', direct_lead: { id: 'l9', first_name: 'Jo', last_name: 'Kim', phone: '777' } })];
    h.tables.booking_calendar_members = [{ calendar_id: 'team', user_id: 'admin1' }];
    h.tables.calendar_connections = [adminConn()];
    claim('appointment', 'a1');
    h.claimed[0].contractor_id = null;
    await processCalendarSyncJobs();
    expect(h.google.upserts).toHaveLength(1);
    expect((h.google.upserts[0][3] as any).summary).toBe('HomeQuote team · Jo Kim (homeowner appt)');
    expect(events('kA')).toHaveLength(1);
  });
});

describe('sales meetings with contractors on the admin calendar', () => {
  it('creates, moves and removes the meeting event', async () => {
    claim('sales_meeting', 's1');
    expect(await processCalendarSyncJobs()).toEqual({ claimed: 1, done: 1, retried: 0 });
    expect(h.google.upserts).toHaveLength(1);
    const [, , eventId, ev] = h.google.upserts[0] as [string, string, string, any];
    expect(eventId).toMatch(/^hqn[0-9a-f]{40}$/);
    expect(ev.summary).toBe('Sales call · ACME Roofing (contractor)');
    expect(ev.description).toContain('With: Sam');
    expect(ev.description).toContain('Contact: (310) 555-0100');
    expect(ev.description).toContain('https://hq.test/app/calls/p1');
    expect(ev.endIso).toBe(new Date(new Date(FUTURE).getTime() + 30 * 60_000).toISOString());
    expect(h.tables.appointment_calendar_events).toEqual([expect.objectContaining({ kind: 'sales_meeting', appointment_id: 's1', connection_id: 'kA', external_event_id: eventId })]);

    h.tables.prospect_sales_appointments[0].scheduled_at = day(12);
    h.tables.prospect_sales_appointments[0].status = 'rescheduled';
    claim('sales_meeting', 's1');
    await processCalendarSyncJobs();
    expect(h.google.upserts).toHaveLength(2);
    expect(h.google.upserts[1][2]).toBe(eventId);

    h.tables.prospect_sales_appointments[0].status = 'cancelled';
    claim('sales_meeting', 's1');
    await processCalendarSyncJobs();
    expect(h.google.deletes.map((d) => d[2])).toEqual([eventId]);
    expect(h.tables.appointment_calendar_events).toHaveLength(0);
  });

  it('removes the event when the meeting row is deleted', async () => {
    claim('sales_meeting', 's1');
    await processCalendarSyncJobs();
    h.tables.prospect_sales_appointments = [];
    claim('sales_meeting', 's1');
    await processCalendarSyncJobs();
    expect(h.google.deletes).toHaveLength(1);
    expect(h.tables.appointment_calendar_events).toHaveLength(0);
  });

  it('never goes to contractor calendars, and nowhere when nobody mirrors', async () => {
    h.tables.calendar_connections = [conn()];
    claim('sales_meeting', 's1');
    await processCalendarSyncJobs();
    expect(h.google.upserts).toHaveLength(0);
  });

  it('a revoked Google grant flags the calendar for reconnect and settles the job', async () => {
    h.google.authFail = true;
    claim('sales_meeting', 's1');
    const r = await processCalendarSyncJobs();
    expect(r.done).toBe(1);
    expect(h.tables.calendar_connections.find((c) => c.id === 'kA')!.status).toBe('needs_reconnect');
  });

  it('a temporary Google error keeps the job for retry', async () => {
    h.google.failUpsert = new Error('Google event create failed (503)');
    claim('sales_meeting', 's1');
    const r = await processCalendarSyncJobs();
    expect(r).toEqual({ claimed: 1, done: 0, retried: 1 });
  });
});

describe('backstop: the admin calendar converges even if a trigger was missed', () => {
  const db = () => createAdminClient() as any;

  it('queues upcoming items the admin calendar is missing, then nothing once written', async () => {
    h.tables.appointments.push(appt({ id: 'a-past', scheduled_at: '2020-01-01T00:00:00Z' }));
    expect(await reconcileMirrorCalendars(db())).toBe(2);
    expect(h.tables.calendar_sync_jobs.map((j) => `${j.kind}:${j.appointment_id}`).sort()).toEqual(['appointment:a1', 'sales_meeting:s1']);
    h.claimed = h.tables.calendar_sync_jobs.map((j) => ({ ...j }));
    await processCalendarSyncJobs();
    expect(h.google.upserts.map((u) => (u[3] as any).summary)).toContain('Sales call · ACME Roofing (contractor)');
    h.tables.calendar_sync_jobs.forEach((j) => (j.processed_at = j.processed_at ?? 'x'));
    for (const e of h.tables.appointment_calendar_events) e.updated_at = '2026-10-20T00:00:00Z';
    expect(await reconcileMirrorCalendars(db())).toBe(0);
  });

  it('re-queues an item changed after its event was written, and a cancelled one still on the calendar', async () => {
    h.tables.appointment_calendar_events = [
      { kind: 'appointment', appointment_id: 'a1', connection_id: 'kA', external_event_id: 'e1', sequence: 1, updated_at: '2026-10-10T00:00:00Z' },
      { kind: 'sales_meeting', appointment_id: 's1', connection_id: 'kA', external_event_id: 'e2', sequence: 1, updated_at: '2026-10-20T00:00:00Z' },
    ];
    h.tables.prospect_sales_appointments[0].status = 'cancelled';
    expect(await reconcileMirrorCalendars(db())).toBe(2);
    h.claimed = h.tables.calendar_sync_jobs.map((j) => ({ ...j }));
    await processCalendarSyncJobs();
    expect(h.google.deletes.map((d) => d[2])).toEqual(['e2']);
  });

  it('turning it off takes the mirrored events off (but keeps calls the admin hosts)', async () => {
    claim('sales_meeting', 's1');
    await processCalendarSyncJobs();
    claim('appointment', 'a1');
    await processCalendarSyncJobs();
    h.tables.calendar_connections.find((c) => c.id === 'kA')!.mirror_all_appointments = false;
    h.tables.calendar_sync_jobs.forEach((j) => (j.processed_at = 'x'));
    expect(await unmirrorConnection(db(), 'kA')).toBe(2);
    h.claimed = h.tables.calendar_sync_jobs.filter((j) => !j.processed_at).map((j) => ({ ...j }));
    await processCalendarSyncJobs();
    expect(events('kA')).toHaveLength(0);
    expect(events('k1')).toHaveLength(1);
  });
});
