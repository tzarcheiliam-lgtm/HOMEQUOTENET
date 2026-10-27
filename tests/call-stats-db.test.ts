import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * lib/data/call-stats.ts end to end against every real migration (PGlite):
 * both call logs feed the goal, reads paginate past the 1000-row API page,
 * dedupe holds, and the board ranks the team. "Now" is pinned to noon in
 * Los Angeles on Tuesday 2026-10-27 (Date only — PGlite keeps real timers).
 */
const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));

const NOW = new Date('2026-10-27T19:00:00Z'); // 12:00 PDT
const id = {
  caller: '00000000-0000-4000-8000-00000000ca11',
  setter: '00000000-0000-4000-8000-000000005e77',
  idle: '00000000-0000-4000-8000-0000000001d1',
  contractor: '00000000-0000-4000-8000-00000000c0c0',
};

let db: PGlite;
let stats: typeof import('@/lib/data/call-stats');

/** Inserts `n` attempts for `caller` on distinct prospects, `stepSec` apart, ending at `endIso`. */
async function attempts(caller: string, n: number, endIso: string, outcome = 'no_answer', stepSec = 120) {
  await db.query(
    `with p as (
       insert into public.contractor_prospects (company_name)
       select 'Pool Co ' || g from generate_series(1, $2::int) g
       returning id
     ), numbered as (select id, row_number() over () as rn from p)
     insert into public.prospect_call_attempts
       (prospect_id, caller_id, outcome, new_disposition, attempt_number, created_at)
     select id, $1::uuid, $3::public.prospect_disposition, $3::public.prospect_disposition, 0,
            $4::timestamptz - ((rn - 1) * $5::int) * interval '1 second'
     from numbered`,
    [caller, n, outcome, endIso, stepSec]
  );
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  db = await fullSchema();
  h.client = fakeSupabase(db);
  stats = await import('@/lib/data/call-stats');

  const { rows: [co] } = await db.query<{ id: string }>(`insert into public.contractors (name) values ('Not a caller') returning id`);
  for (const [uid, role, name] of [
    [id.caller, 'caller', 'Liam Caller'],
    [id.setter, 'setter', 'Sam Setter'],
    [id.idle, 'caller', 'Idle Ida'],
    [id.contractor, 'contractor', 'Contractor Carl'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${role}@stats.test`]);
    await db.query(
      `update public.profiles set role = $2, full_name = $3, is_active = true, account_status = 'active',
         contractor_id = $4, contractor_role = $5 where id = $1`,
      [uid, role, name, role === 'contractor' ? co.id : null, role === 'contractor' ? 'owner' : null]
    );
  }
  await db.query('update public.profiles set daily_call_goal = 100 where id = $1', [id.caller]);

  // Caller: 100 calls on Fri 23 and Mon 26 (a streak across the weekend),
  // 1200 calls over earlier days to force pagination, and today 40 calls
  // ending 11:55 (+1 duplicate log, +3 DM conversations, +1 booking).
  await attempts(id.caller, 100, '2026-10-23T23:00:00Z');
  await attempts(id.caller, 100, '2026-10-26T23:00:00Z');
  await attempts(id.caller, 1200, '2026-10-20T23:30:00Z', 'left_voicemail', 30);
  await attempts(id.caller, 36, '2026-10-27T18:40:00Z');
  await attempts(id.caller, 3, '2026-10-27T18:50:00Z', 'spoke_with_dm');
  await attempts(id.caller, 1, '2026-10-27T18:55:00Z', 'appointment_booked');
  // A double-saved call on the same prospect 20s apart counts once.
  await db.query(
    `insert into public.prospect_call_attempts (prospect_id, caller_id, outcome, new_disposition, attempt_number, created_at)
     select prospect_id, caller_id, outcome, new_disposition, 0, created_at + interval '20 seconds'
     from public.prospect_call_attempts where caller_id = $1 and outcome = 'appointment_booked'`,
    [id.caller]
  );

  // Setter: 5 cold calls and 7 homeowner contact attempts today.
  await attempts(id.setter, 5, '2026-10-27T17:00:00Z');
  const { rows: [lead] } = await db.query<{ id: string }>(`insert into public.leads (first_name) values ('Hana') returning id`);
  await db.query(
    `insert into public.lead_activities (lead_id, actor_id, type, body, created_at)
     select $1, $2, 'contact_attempt', 'No answer', $3::timestamptz - g * interval '5 minutes'
     from generate_series(0, 6) g`,
    [lead.id, id.setter, '2026-10-27T18:00:00Z']
  );
  // A note is not a call.
  await db.query(`insert into public.lead_activities (lead_id, actor_id, type, body) values ($1, $2, 'note', 'hi')`, [lead.id, id.setter]);
}, 180000);

afterAll(() => {
  vi.useRealTimers();
});

describe('getGoalSnapshot', () => {
  it('counts today across the 8–5 day, deduped, with streak, combo and bookings', async () => {
    const s = await stats.getGoalSnapshot(id.caller);
    expect(s.goal).toBe(100);
    expect(s.todayKey).toBe('2026-10-27');
    expect(s.today).toBe(40);
    // Fri 23 and Mon 26 hit 100; today is in progress and does not break it.
    expect(s.streak).toBe(2);
    // The booking ended a run of 3 DM conversations → 4 in a row.
    expect(s.combo).toBe(4);
    expect(s.bookedToday).toBe(1);
    expect(s.week).toHaveLength(7);
    expect(s.week.at(-1)).toMatchObject({ key: '2026-10-27', calls: 40, booked: 1 });
    expect(s.week.find((d) => d.key === '2026-10-26')?.calls).toBe(100);
  });

  it('counts homeowner contact attempts for setters, not notes', async () => {
    const s = await stats.getGoalSnapshot(id.setter);
    expect(s.today).toBe(12);
    expect(s.goal).toBe(100);
  });
});

describe('getCallStats', () => {
  it('reads past the 1000-row page and builds the charts', async () => {
    const s = await stats.getCallStats(id.caller);
    expect(s.today).toBe(40);
    expect(s.bookingsAllTime).toBe(2); // the raw log keeps both saves
    const total = s.days.reduce((a, d) => a + d.calls, 0);
    expect(total).toBe(100 + 100 + 1200 + 40);
    // Monday-aligned: starts on a Monday three weeks back, ends today (Tue).
    expect(s.days[0].key).toBe('2026-10-05');
    expect(s.days.at(-1)!.key).toBe('2026-10-27');
    expect(s.hourlyToday.reduce((a, b) => a + b, 0)).toBe(40);
    expect(s.bestDayKey).toBe('2026-10-20');
    expect(s.funnelToday.attempts).toBe(40);
    expect(s.funnelToday.dmConversations).toBe(4);
    expect(s.bests.find((b) => b.id === 'calls')?.value).toBe(1200);
    expect(s.badges.find((b) => b.id === 'first-goal')?.earned).toBe(true);
    expect(s.badges.find((b) => b.id === 'first-booking')?.earned).toBe(true);
  });
});

describe('getTeamBoard', () => {
  it('ranks callers and setters by calls today, never contractors', async () => {
    const board = await stats.getTeamBoard();
    expect(board.map((r) => r.id)).toEqual([id.caller, id.setter, id.idle]);
    expect(board[0]).toMatchObject({ today: 40, goal: 100, bookedWeek: 1 });
    expect(board[1].today).toBe(12);
    expect(board[2].today).toBe(0);
  });

  it('keeps the leaderboard off until an admin turns it on', async () => {
    expect(await stats.isLeaderboardEnabled()).toBe(false);
    await db.query('update public.call_workspace_settings set leaderboard_enabled = true');
    expect(await stats.isLeaderboardEnabled()).toBe(true);
  });
});
