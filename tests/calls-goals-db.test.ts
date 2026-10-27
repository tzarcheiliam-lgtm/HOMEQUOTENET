import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { fullSchema } from './helpers/full-migrations';

/**
 * Migration 0060 against every real migration (PGlite, in-process): the goal
 * column, its guard, and the single-row calling-workspace settings with RLS.
 */
const id = {
  admin: '00000000-0000-4000-8000-0000000590a1',
  caller: '00000000-0000-4000-8000-0000000590c1',
  setter: '00000000-0000-4000-8000-0000000590d1',
  contractor: '00000000-0000-4000-8000-0000000590e1',
};

let db: PGlite;

async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('begin');
  try {
    await db.query(`select set_config('app.uid', $1, true)`, [userId]);
    await db.exec('set local role authenticated');
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  const { rows: [co] } = await db.query<{ id: string }>(
    `insert into public.contractors (name) values ('Goal Test Pools') returning id`
  );
  for (const [uid, role] of [
    [id.admin, 'admin'],
    [id.caller, 'caller'],
    [id.setter, 'setter'],
    [id.contractor, 'contractor'],
  ]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${role}@goals.test`]);
    await db.query(
      `update public.profiles set role = $2, is_active = true, account_status = 'active',
         contractor_id = $3, contractor_role = $4 where id = $1`,
      [uid, role, role === 'contractor' ? co.id : null, role === 'contractor' ? 'owner' : null]
    );
  }
}, 120000);

describe('0060 daily call goals', () => {
  it('defaults every profile to 100 and rejects out-of-range goals', async () => {
    const { rows } = await db.query<{ daily_call_goal: number }>(
      'select daily_call_goal from public.profiles where id = $1',
      [id.caller]
    );
    expect(rows[0].daily_call_goal).toBe(100);
    await expect(
      db.query('update public.profiles set daily_call_goal = 0 where id = $1', [id.caller])
    ).rejects.toThrow(/daily_call_goal_range/);
  });

  it('lets an admin set a goal but not the caller themselves', async () => {
    await as(id.admin, async () => {
      await db.query('update public.profiles set daily_call_goal = 120 where id = $1', [id.caller]);
      const { rows } = await db.query<{ daily_call_goal: number }>(
        'select daily_call_goal from public.profiles where id = $1',
        [id.caller]
      );
      expect(rows[0].daily_call_goal).toBe(120);
    });
    await expect(
      as(id.caller, () =>
        db.query('update public.profiles set daily_call_goal = 5 where id = $1', [id.caller])
      )
    ).rejects.toThrow(/administrator/);
  });

  it('still lets users edit their own non-privileged fields', async () => {
    await as(id.setter, async () => {
      await db.query(`update public.profiles set full_name = 'Sam Setter' where id = $1`, [id.setter]);
    });
  });
});

describe('0060 call_workspace_settings', () => {
  it('seeds one row with the leaderboard off', async () => {
    const { rows } = await db.query<{ leaderboard_enabled: boolean }>(
      'select leaderboard_enabled from public.call_workspace_settings'
    );
    expect(rows).toEqual([{ leaderboard_enabled: false }]);
  });

  it('is readable by call agents and admins, not contractors', async () => {
    for (const uid of [id.admin, id.caller, id.setter]) {
      const n = await as(uid, async () => (await db.query('select 1 from public.call_workspace_settings')).rows.length);
      expect(n).toBe(1);
    }
    const n = await as(id.contractor, async () => (await db.query('select 1 from public.call_workspace_settings')).rows.length);
    expect(n).toBe(0);
  });

  it('only admins can flip the leaderboard', async () => {
    const changed = (uid: string) =>
      as(uid, async () => {
        const r = await db.query(
          'update public.call_workspace_settings set leaderboard_enabled = true where id returning id'
        );
        return r.rows.length;
      });
    expect(await changed(id.caller)).toBe(0);
    expect(await changed(id.setter)).toBe(0);
    expect(await changed(id.admin)).toBe(1);
  });

  it('allows only the single row', async () => {
    await expect(
      db.query('insert into public.call_workspace_settings (id) values (false)')
    ).rejects.toThrow();
  });
});
