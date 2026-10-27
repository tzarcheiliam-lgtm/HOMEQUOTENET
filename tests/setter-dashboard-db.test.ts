import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

/**
 * The setter money dashboard and payouts end to end against every real
 * migration (PGlite). "Now" is Tuesday 2026-10-27, noon in Los Angeles.
 */
const h = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));

const NOW = new Date('2026-10-27T19:00:00Z');
const LA = (local: string) => `${local}-07:00`;
const id = {
  setter: '00000000-0000-4000-8000-0000000d5e01',
  rival: '00000000-0000-4000-8000-0000000d5e02',
  admin: '00000000-0000-4000-8000-0000000d5a01',
  pCallback: '00000000-0000-4000-8000-0000000d5f01',
  pHot: '00000000-0000-4000-8000-0000000d5f02',
  pSlipped: '00000000-0000-4000-8000-0000000d5f03',
  pFresh: '00000000-0000-4000-8000-0000000d5f04',
  pM: '00000000-0000-4000-8000-0000000d5f05',
  pNoShow: '00000000-0000-4000-8000-0000000d5f06',
};

let db: PGlite;
let dash: typeof import('@/lib/data/setter-dashboard');
let money: typeof import('@/lib/data/setter-money');

async function meeting(o: {
  prospect: string;
  partner: string;
  booked: string;
  scheduled: string;
  status?: string;
  outcome?: 'sold' | 'not_sold';
  decided?: string;
  pay?: number;
}) {
  await db.query(
    `insert into public.prospect_sales_appointments
       (prospect_id, partner_id, created_at, scheduled_at, status, sale_outcome, sale_decided_at, setter_pay_amount)
     values ($1, $2, $3, $4, $5::public.sales_appointment_status, $6, $7, $8)`,
    [o.prospect, o.partner, LA(o.booked), LA(o.scheduled), o.status ?? 'scheduled', o.outcome ?? null, o.decided ? LA(o.decided) : null, o.pay ?? null]
  );
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  db = await fullSchema();
  h.client = fakeSupabase(db);
  dash = await import('@/lib/data/setter-dashboard');
  money = await import('@/lib/data/setter-money');

  for (const [uid, role, name, pay, goal] of [
    [id.setter, 'setter', 'Sam Setter', 150, 10],
    [id.rival, 'setter', 'Riley Rival', 100, null],
    [id.admin, 'admin', 'Liam Admin', null, null],
  ] as const) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${uid}@dash.test`]);
    await db.query(
      `update public.profiles set role = $2, full_name = $3, pay_per_sale = $4, weekly_booking_goal = $5,
         is_active = true, account_status = 'active' where id = $1`,
      [uid, role, name, pay, goal]
    );
  }
  const prospect = (pid: string, name: string, disposition: string, extra: Record<string, string | null> = {}) =>
    db.query(
      `insert into public.contractor_prospects (id, company_name, phone, assigned_to, disposition, next_callback_at, last_contacted_at, follow_up_at)
       values ($1, $2, $8, $3, $4::public.prospect_disposition, $5, $6, $7)`,
      [pid, name, id.setter, disposition, extra.callback ?? null, extra.last ?? null, extra.follow ?? null, `+1555555${pid.slice(-4)}`]
    );
  await prospect(id.pCallback, 'Callback Pools', 'callback_requested', { callback: LA('2026-10-27T09:00:00'), last: LA('2026-10-24T09:00:00') });
  await prospect(id.pHot, 'Hot Tub Hank', 'interested', { last: LA('2026-10-26T09:00:00') });
  await prospect(id.pSlipped, 'Slow Splash', 'interested', { last: LA('2026-10-15T09:00:00') });
  await prospect(id.pFresh, 'Fresh Pools', 'new');
  await prospect(id.pM, 'Meeting Co', 'appointment_booked');
  await prospect(id.pNoShow, 'Ghost Pools', 'appointment_booked');

  // Setter: booked this week (tomorrow, unconfirmed); sold last week; sold today; a no-show; a not-sold.
  await meeting({ prospect: id.pM, partner: id.setter, booked: '2026-10-26T10:00:00', scheduled: '2026-10-28T10:00:00' });
  await meeting({ prospect: id.pM, partner: id.setter, booked: '2026-10-20T10:00:00', scheduled: '2026-10-21T10:00:00', status: 'completed', outcome: 'sold', decided: '2026-10-21T15:00:00', pay: 150 });
  await meeting({ prospect: id.pM, partner: id.setter, booked: '2026-10-05T10:00:00', scheduled: '2026-10-20T10:00:00', status: 'completed', outcome: 'sold', decided: '2026-10-27T09:00:00', pay: 150 });
  await meeting({ prospect: id.pNoShow, partner: id.setter, booked: '2026-10-22T10:00:00', scheduled: '2026-10-23T10:00:00', status: 'no_show' });
  await meeting({ prospect: id.pM, partner: id.setter, booked: '2026-10-22T11:00:00', scheduled: '2026-10-23T11:00:00', status: 'completed', outcome: 'not_sold', decided: '2026-10-24T09:00:00' });
  // Rival: booked and sold today.
  await meeting({ prospect: id.pM, partner: id.rival, booked: '2026-10-27T08:30:00', scheduled: '2026-10-27T10:00:00', status: 'completed', outcome: 'sold', decided: '2026-10-27T11:00:00', pay: 100 });

  await db.query(`insert into public.leads (first_name, status) values ('Open', 'new')`);
  await db.query('update public.call_workspace_settings set leaderboard_enabled = true');
}, 180000);

afterAll(() => vi.useRealTimers());

describe('getSetterDashboard', () => {
  it('counts money honestly: earned on sold, pending on undecided', async () => {
    const d = await dash.getSetterDashboard(id.setter);
    expect(d.payPerSale).toBe(150);
    expect(d.weeklyGoal).toBe(10);
    expect(d.earnedMonth).toBe(300);
    expect(d.earnedAllTime).toBe(300);
    expect(d.pendingCount).toBe(1); // the no-show and the decided ones are not pending
    expect(d.pendingValue).toBe(150);
    expect(d.weekBookings).toBe(1);
    expect(d.todayBookings).toBe(0);
    expect(d.closeRate).toBeCloseTo(2 / 3, 5);
    expect(d.lastWeek).toEqual({ weekKey: '2026-10-19', bookings: 3, sold: 1, earned: 150 });
    expect(d.recentSold.map((s) => s.company).sort()).toEqual(['Meeting Co', 'Meeting Co']);
    expect(d.upcoming).toHaveLength(1);
    expect(d.badges.find((b) => b.id === 'first-sale')?.earned).toBe(true);
  });

  it('ranks the money-on-the-table queue', async () => {
    const d = await dash.getSetterDashboard(id.setter);
    expect(d.queue.map((q) => `${q.kind}:${q.title}`)).toEqual([
      'confirm:Meeting Co',
      'callback:Callback Pools',
      'hot:Hot Tub Hank',
      'rescue:Ghost Pools',
      'slipped:Slow Splash',
      'homeowner:1 homeowner lead still open',
      'fresh:1 contractors never called',
    ]);
    expect(d.chances).toBe(4);
  });

  it('shows the race only with the leaderboard on, and never other people’s records', async () => {
    const d = await dash.getSetterDashboard(id.setter);
    expect(d.rivals).toEqual([{ id: id.rival, name: 'Riley Rival', weekBookings: 1, monthEarned: 100 }]);
    await db.query('update public.call_workspace_settings set leaderboard_enabled = false');
    expect((await dash.getSetterDashboard(id.setter)).rivals).toBeNull();
    await db.query('update public.call_workspace_settings set leaderboard_enabled = true');
  });
});

describe('payouts', () => {
  it('owes each setter for meetings sold in the month, at the stored pay', async () => {
    const p = await money.getPayouts('2026-10');
    expect(p.total).toBe(400);
    const sam = p.rows.find((r) => r.partnerId === id.setter)!;
    expect(sam).toMatchObject({ booked: 5, sold: 2, notSold: 1, earned: 300, awaitingDecision: 0, payPerSale: 150 });
    expect(p.rows.find((r) => r.partnerId === id.rival)).toMatchObject({ booked: 1, sold: 1, earned: 100 });
    expect(p.rows.some((r) => r.partnerId === id.admin)).toBe(false);
    expect(p.lines).toHaveLength(3);

    const csv = money.payoutsCsv(p);
    expect(csv).toContain('2026-10,2026-10-21,Sam Setter,Meeting Co,2026-10-21,150.00');
    expect(csv.trim().split('\n').at(-1)).toBe('2026-10,TOTAL,,,,400.00');
  });

  it('a past meeting with no outcome is awaiting a decision', async () => {
    await meeting({ prospect: id.pM, partner: id.rival, booked: '2026-10-26T09:00:00', scheduled: '2026-10-26T15:00:00', status: 'confirmed' });
    const p = await money.getPayouts('2026-10');
    expect(p.rows.find((r) => r.partnerId === id.rival)?.awaitingDecision).toBe(1);
  });

  it('validates month strings', () => {
    expect(money.isMonth('2026-10')).toBe(true);
    expect(money.isMonth('2026-13')).toBe(false);
    expect(money.isMonth('oct')).toBe(false);
  });
});
