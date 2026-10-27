import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { fullSchema } from './helpers/full-migrations';

/**
 * Migration 0062 against every real migration (PGlite): pay and weekly goals
 * are admin-only, and only an admin can record a sale or move a meeting's
 * credit — while setters keep updating their own meetings' status.
 */
const id = {
  admin: '00000000-0000-4000-8000-000000062a01',
  setter: '00000000-0000-4000-8000-000000062d01',
  other: '00000000-0000-4000-8000-000000062d02',
  prospect: '00000000-0000-4000-8000-000000062f01',
  meeting: '00000000-0000-4000-8000-000000062e01',
};

let db: PGlite;

async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('begin');
  try {
    await db.query(`select set_config('app.uid', $1, true)`, [userId]);
    await db.exec('set local role authenticated');
    const out = await fn();
    await db.exec('commit');
    return out;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}

const meetingRow = async () =>
  (await db.query<{ status: string; sale_outcome: string | null; setter_pay_amount: string | null; partner_id: string }>(
    'select status, sale_outcome, setter_pay_amount, partner_id from public.prospect_sales_appointments where id = $1',
    [id.meeting]
  )).rows[0];

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  for (const [uid, role] of [
    [id.admin, 'admin'],
    [id.setter, 'setter'],
    [id.other, 'setter'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${uid}@pay.test`]);
    await db.query(`update public.profiles set role = $2, is_active = true, account_status = 'active' where id = $1`, [uid, role]);
  }
  await db.query(`insert into public.contractor_prospects (id, company_name, assigned_to) values ($1, 'Blue Lagoon Pools', $2)`, [id.prospect, id.setter]);
  await db.query(
    `insert into public.prospect_sales_appointments (id, prospect_id, partner_id, scheduled_at) values ($1, $2, $3, now() + interval '1 day')`,
    [id.meeting, id.prospect, id.setter]
  );
}, 120000);

describe('0062 profile pay settings', () => {
  it('start empty and are range-checked', async () => {
    const { rows } = await db.query<{ pay_per_sale: string | null; weekly_booking_goal: number | null }>(
      'select pay_per_sale, weekly_booking_goal from public.profiles where id = $1',
      [id.setter]
    );
    expect(rows[0]).toEqual({ pay_per_sale: null, weekly_booking_goal: null });
    await expect(db.query('update public.profiles set weekly_booking_goal = 0 where id = $1', [id.setter])).rejects.toThrow(/weekly_booking_goal_range/);
    await expect(db.query('update public.profiles set pay_per_sale = -1 where id = $1', [id.setter])).rejects.toThrow(/pay_per_sale_range/);
  });

  it('only an admin can set them', async () => {
    await as(id.admin, () => db.query('update public.profiles set pay_per_sale = 150, weekly_booking_goal = 10 where id = $1', [id.setter]));
    const { rows } = await db.query<{ pay_per_sale: string; weekly_booking_goal: number }>(
      'select pay_per_sale, weekly_booking_goal from public.profiles where id = $1',
      [id.setter]
    );
    expect(Number(rows[0].pay_per_sale)).toBe(150);
    expect(rows[0].weekly_booking_goal).toBe(10);
    await expect(as(id.setter, () => db.query('update public.profiles set pay_per_sale = 5000 where id = $1', [id.setter]))).rejects.toThrow(/administrator/);
    await expect(as(id.setter, () => db.query('update public.profiles set weekly_booking_goal = 1 where id = $1', [id.setter]))).rejects.toThrow(/administrator/);
  });
});

describe('0062 sale outcomes on sales meetings', () => {
  it('a setter still updates their own meeting status', async () => {
    await as(id.setter, () => db.query(`update public.prospect_sales_appointments set status = 'confirmed' where id = $1`, [id.meeting]));
    expect((await meetingRow()).status).toBe('confirmed');
  });

  it('a setter cannot mark their own meeting sold or move the credit', async () => {
    await expect(
      as(id.setter, () => db.query(`update public.prospect_sales_appointments set sale_outcome = 'sold', setter_pay_amount = 999 where id = $1`, [id.meeting]))
    ).rejects.toThrow(/administrator/);
    await expect(
      as(id.setter, () => db.query(`update public.prospect_sales_appointments set partner_id = $2 where id = $1`, [id.meeting, id.other]))
    ).rejects.toThrow();
    expect(await meetingRow()).toMatchObject({ sale_outcome: null, setter_pay_amount: null, partner_id: id.setter });
  });

  it('a setter cannot book a meeting that is already sold', async () => {
    await expect(
      as(id.setter, () =>
        db.query(
          `insert into public.prospect_sales_appointments (prospect_id, partner_id, scheduled_at, sale_outcome, setter_pay_amount)
           values ($1, $2, now(), 'sold', 100)`,
          [id.prospect, id.setter]
        )
      )
    ).rejects.toThrow(/administrator/);
  });

  it('an admin records the sale with a pay snapshot', async () => {
    await as(id.admin, () =>
      db.query(
        `update public.prospect_sales_appointments
            set sale_outcome = 'sold', sale_decided_at = now(), sale_decided_by = $2, setter_pay_amount = 150, status = 'completed'
          where id = $1`,
        [id.meeting, id.admin]
      )
    );
    const row = await meetingRow();
    expect(row.sale_outcome).toBe('sold');
    expect(Number(row.setter_pay_amount)).toBe(150);
  });

  it('pay can only sit on a sold meeting, and outcomes are only sold / not_sold', async () => {
    await expect(
      db.query(`update public.prospect_sales_appointments set sale_outcome = 'not_sold' where id = $1`, [id.meeting])
    ).rejects.toThrow(/setter_pay_check/);
    await expect(
      db.query(`update public.prospect_sales_appointments set sale_outcome = 'maybe', setter_pay_amount = null where id = $1`, [id.meeting])
    ).rejects.toThrow(/sale_outcome_check/);
  });

  it('an admin can move the credit to another setter', async () => {
    await as(id.admin, () => db.query(`update public.prospect_sales_appointments set partner_id = $2 where id = $1`, [id.meeting, id.other]));
    expect((await meetingRow()).partner_id).toBe(id.other);
  });
});
