/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * Migration 0063 and the call cadence against every real migration (PGlite):
 * the generated "not before" columns, the streak backfill, the queue queries
 * that skip resting prospects, and the real call-log action writing the cadence.
 */
const h = vi.hoisted(() => ({ client: null as any, me: null as any }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/auth', () => ({
  requireCallWorkspace: async () => h.me,
  requireRole: async () => h.me,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: () => {} }));

import { listProspects, nextProspectIdFor, nextProspectInContext } from '@/lib/data/prospects';
import { logCallOutcome, returnProspectToQueue } from '@/lib/actions/prospects';
import { CADENCE } from '@/lib/calls/cadence';

const CALLER = '00000000-0000-4000-8000-000000063c01';
const ID = (n: number) => `00000000-0000-4000-8000-0000000630${String(n).padStart(2, '0')}`;
const DAY = 86_400_000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

let db: PGlite;

async function addProspect(n: number, fields: Record<string, unknown> = {}) {
  const cols = ['id', 'company_name', 'assigned_to', 'disposition', 'created_at', ...Object.keys(fields)];
  const vals = [ID(n), `Prospect ${n}`, CALLER, 'new', iso(-DAY + n * 60_000), ...Object.values(fields)];
  await db.query(
    `insert into public.contractor_prospects (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
    vals
  );
}

async function row(n: number) {
  const { rows } = await db.query<any>('select * from public.contractor_prospects where id = $1', [ID(n)]);
  return rows[0];
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  h.client = fakeSupabase(db);
  await db.query('insert into auth.users (id, email) values ($1, $2)', [CALLER, 'caller@cadence.test']);
  await db.query(
    `update public.profiles set role = 'caller', is_active = true, account_status = 'active', full_name = 'Cadence Caller' where id = $1`,
    [CALLER]
  );
  const { rows } = await db.query<any>('select * from public.profiles where id = $1', [CALLER]);
  h.me = rows[0];
}, 180_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.query('delete from public.prospect_call_attempts');
  await db.query('delete from public.contractor_prospects');
});

describe('0063 generated columns', () => {
  it('rest, callback and parked-for-good all feed one "not before"', async () => {
    const soon = iso(DAY);
    const later = iso(3 * DAY);
    await addProspect(1);
    await addProspect(2, { next_attempt_at: soon });
    await addProspect(3, { next_attempt_at: soon, next_callback_at: later });
    await addProspect(4, { parked_at: iso(0) });
    const { rows } = await db.query<any>(
      `select id, resting_until, dial_after, resting_until = 'infinity'::timestamptz as forever
         from public.contractor_prospects order by id`
    );
    expect(rows[0].resting_until).toBeNull();
    expect(rows[0].dial_after).toBeNull();
    expect(new Date(rows[1].dial_after).toISOString()).toBe(soon);
    expect(new Date(rows[2].dial_after).toISOString()).toBe(later); // the later of the two
    expect(rows[3].forever).toBe(true);
  });

  it('backfills the current miss streak from the call log', async () => {
    await addProspect(1);
    await addProspect(2);
    const log = async (n: number, outcome: string, minutesAgo: number) =>
      db.query(
        `insert into public.prospect_call_attempts (prospect_id, caller_id, outcome, attempt_number, new_disposition, created_at)
         values ($1, $2, $3, 0, $3, now() - ($4 || ' minutes')::interval)`,
        [ID(n), CALLER, outcome, String(minutesAgo)]
      );
    // Prospect 1: reached once, then three misses (one "calling" in between is ignored).
    await log(1, 'no_answer', 50);
    await log(1, 'spoke_with_dm', 40);
    await log(1, 'no_answer', 30);
    await log(1, 'calling', 25);
    await log(1, 'gatekeeper', 20);
    await log(1, 'left_voicemail', 10);
    // Prospect 2: two misses, never reached.
    await log(2, 'no_answer', 20);
    await log(2, 'no_answer', 10);
    await db.exec(readFileSync(new URL('../supabase/migrations/0063_prospect_cadence.sql', import.meta.url), 'utf8'));
    expect((await row(1)).no_connect_streak).toBe(3);
    expect((await row(2)).no_connect_streak).toBe(2);
    expect((await row(1)).next_attempt_at).toBeNull(); // nothing is rested by the migration
  });
});

describe('the queue skips prospects the cadence is resting', () => {
  beforeEach(async () => {
    await addProspect(1, { next_attempt_at: iso(DAY), no_connect_streak: 1 }); // resting
    await addProspect(2); // due
    await addProspect(3, { parked_at: iso(-DAY), next_attempt_at: iso(80 * DAY) }); // parked
    await addProspect(4, { parked_at: iso(-200 * DAY), next_attempt_at: iso(-DAY) }); // back from a park
    await addProspect(5, { parked_at: iso(-DAY) }); // parked for good
  });

  it('"Next" and power hour pick only due prospects', async () => {
    expect(await nextProspectIdFor(h.me, ID(2))).toBe(ID(4));
    expect(await nextProspectIdFor(h.me, ID(4))).toBe(ID(2));
  });

  it('"My call list" hides resting and parked prospects; "Resting & parked" lists them', async () => {
    const mine = await listProspects({ view: 'mine' }, h.me, []);
    expect(mine.rows.map((r) => r.id)).toEqual([ID(2), ID(4)]);
    const resting = await listProspects({ view: 'resting' }, h.me, []);
    expect(resting.rows.map((r) => r.id)).toEqual([ID(1), ID(3), ID(5)]);
  });

  it('Next inside a list moves on from a prospect that just started resting', async () => {
    // Working "mine" filtered by niche-less context from prospect 1, which now rests: go to the next due one.
    expect(await nextProspectInContext(h.me, ID(1), { view: 'mine', city: '' } as any, [])).toBe(ID(2));
    // In "All", resting prospects are skipped too.
    expect(await nextProspectInContext(h.me, ID(2), { view: 'all' } as any, [])).toBe(ID(4));
  });
});

describe('logging a call writes the cadence', () => {
  const log = (n: number, outcome: string) => {
    const fd = new FormData();
    fd.set('prospect_id', ID(n));
    fd.set('outcome', outcome);
    return logCallOutcome(undefined, fd);
  };

  it('a miss rests the prospect; a conversation clears it', async () => {
    await addProspect(1);
    expect(await log(1, 'no_answer')).toMatchObject({ ok: true });
    let p = await row(1);
    expect(p.no_connect_streak).toBe(1);
    expect(new Date(p.next_attempt_at).getTime()).toBeGreaterThan(Date.now());
    expect(p.disposition).toBe('no_answer');

    expect(await log(1, 'spoke_with_dm')).toMatchObject({ ok: true });
    p = await row(1);
    expect(p.no_connect_streak).toBe(0);
    expect(p.next_attempt_at).toBeNull();
  });

  it(`the ${CADENCE.maxNoConnect}th miss in a row parks it, and a person can return it`, async () => {
    await addProspect(1, { no_connect_streak: CADENCE.maxNoConnect - 1 });
    expect(await log(1, 'left_voicemail')).toMatchObject({ ok: true });
    let p = await row(1);
    expect(p.parked_at).not.toBeNull();
    expect(p.park_count).toBe(1);
    expect(new Date(p.next_attempt_at).getTime()).toBeGreaterThan(Date.now() + (CADENCE.parkDays - 1) * DAY);

    const fd = new FormData();
    fd.set('prospect_id', ID(1));
    await returnProspectToQueue(fd);
    p = await row(1);
    expect(p.parked_at).toBeNull();
    expect(p.next_attempt_at).toBeNull();
    expect(p.park_count).toBe(1); // history kept: the next park is for good
    const { rows } = await db.query<any>(`select action from public.audit_logs where metadata->>'prospect_id' = $1`, [ID(1)]);
    expect(rows.map((r) => r.action)).toContain('prospect.return_to_queue');
  });
});
