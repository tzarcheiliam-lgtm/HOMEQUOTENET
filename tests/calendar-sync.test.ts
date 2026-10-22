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
  const filters: [string, unknown, 'eq' | 'in'][] = [];
  let mode: 'select' | 'update' | 'delete' = 'select';
  let patch: Row = {};
  const rows = () => h.tables[table] ?? (h.tables[table] = []);
  const match = (r: Row) => filters.every(([k, v, op]) => (op === 'in' ? (v as unknown[]).includes(r[k]) : r[k] === v));
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
    insert: async (row: Row) => (rows().push({ ...row }), { error: null }),
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

import { processCalendarSyncJobs } from '@/lib/calendar/sync.server';

const appt = (over: Row = {}) => ({
  id: 'a1',
  scheduled_at: '2026-10-20T16:00:00Z',
  status: 'scheduled',
  location: null,
  notes: 'gate code 1234',
  updated_at: '2026-10-14T00:00:00Z',
  assignment: { contractor_id: 'c1', lead: { id: 'l1', first_name: 'Pat', last_name: 'Lee', phone: '555', address: '1 Main', city: 'LA', state: 'CA', zip: '90001', vertical: { name: 'Pool' }, sub_service: null } },
  ...over,
});
const conn = (over: Row = {}) => ({ id: 'k1', user_id: 'u1', contractor_id: 'c1', provider: 'google', calendar_id: 'primary', encrypted_credentials: 'enc', status: 'active', push_appointments: true, import_busy: true, ...over });

beforeEach(() => {
  h.tables = { appointments: [appt()], calendar_connections: [conn()], appointment_calendar_events: [], calendar_sync_jobs: [{ id: 'j1', appointment_id: 'a1', contractor_id: 'c1', processed_at: null }], contractor_availability_settings: [{ contractor_id: 'c1', default_duration_minutes: 90 }] };
  h.claimed = [{ id: 'j1', appointment_id: 'a1', contractor_id: 'c1' }];
  h.google = { upserts: [], deletes: [], failUpsert: null, authFail: false };
});

describe('calendar sync worker', () => {
  it('creates the event with a deterministic id and stores the mapping', async () => {
    const r = await processCalendarSyncJobs();
    expect(r).toEqual({ claimed: 1, done: 1, retried: 0 });
    expect(h.google.upserts).toHaveLength(1);
    const [token, calendar, eventId, ev] = h.google.upserts[0] as [string, string, string, any];
    expect(token).toBe('access');
    expect(calendar).toBe('primary');
    expect(eventId).toMatch(/^hqn[0-9a-f]{40}$/);
    expect(ev.summary).toBe('HomeQuote: Pool – Pat');
    expect(ev.endIso).toBe('2026-10-20T17:30:00.000Z'); // 90 minute default duration
    expect(ev.description).toContain('https://hq.test/app/leads/l1');
    expect(h.tables.appointment_calendar_events[0]).toMatchObject({ appointment_id: 'a1', connection_id: 'k1', external_event_id: eventId });
    expect(h.tables.calendar_sync_jobs[0].processed_at).toBeTruthy();
  });

  it('reuses the same event id on a reschedule (update, not duplicate)', async () => {
    await processCalendarSyncJobs();
    h.tables.appointments[0].scheduled_at = '2026-10-21T18:00:00Z';
    h.claimed = [{ id: 'j2', appointment_id: 'a1', contractor_id: 'c1' }];
    h.tables.calendar_sync_jobs.push({ id: 'j2', appointment_id: 'a1' });
    await processCalendarSyncJobs();
    expect(h.google.upserts).toHaveLength(2);
    expect(h.google.upserts[1][2]).toBe(h.google.upserts[0][2]);
    expect(h.tables.appointment_calendar_events).toHaveLength(1);
    expect(h.tables.appointment_calendar_events[0].sequence).toBe(2);
  });

  it('removes the event when the appointment is cancelled', async () => {
    await processCalendarSyncJobs();
    h.tables.appointments[0].status = 'cancelled';
    await processCalendarSyncJobs();
    expect(h.google.deletes).toHaveLength(1);
    expect(h.tables.appointment_calendar_events).toHaveLength(0);
  });

  it('removes events and mapping when the appointment row is gone', async () => {
    await processCalendarSyncJobs();
    h.tables.appointments = [];
    await processCalendarSyncJobs();
    expect(h.google.deletes).toHaveLength(1);
    expect(h.tables.appointment_calendar_events).toHaveLength(0);
  });

  it('skips connections that turned appointment push off or belong to another company', async () => {
    h.tables.calendar_connections = [conn({ push_appointments: false }), conn({ id: 'k2', contractor_id: 'c2' })];
    await processCalendarSyncJobs();
    expect(h.google.upserts).toHaveLength(0);
  });

  it('keeps the job for retry on a transient Google failure, without failing the appointment', async () => {
    h.google.failUpsert = new Error('Google event create failed (503)');
    const r = await processCalendarSyncJobs();
    expect(r).toEqual({ claimed: 1, done: 0, retried: 1 });
    expect(h.tables.calendar_sync_jobs[0].processed_at).toBeNull();
    expect(h.tables.calendar_sync_jobs[0].error).toContain('503');
    expect(h.tables.calendar_connections[0].last_error).toContain('503');
  });

  it('flags the connection for reconnect on a revoked grant and does not retry forever', async () => {
    h.google.authFail = true;
    const r = await processCalendarSyncJobs();
    expect(r.done).toBe(1);
    expect(h.tables.calendar_connections[0].status).toBe('needs_reconnect');
    expect(h.google.upserts).toHaveLength(0);
  });
});
