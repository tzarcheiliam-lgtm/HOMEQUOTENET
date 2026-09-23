/**
 * Row Level Security for the calling workspace, exercised against the real
 * database with real policies — not mocked.
 *
 * Runs only when SUPABASE_DB_URL is set AND migration 0007 has been applied;
 * otherwise every test is skipped with a reason. Everything happens inside a
 * single transaction that is rolled back at the end, so no synthetic user,
 * prospect or call ever persists.
 *
 * Users are simulated the way PostgREST does it: `set local role authenticated`
 * plus `request.jwt.claims`, so auth.uid() resolves to the synthetic user.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg, { type Client } from 'pg';

const url = process.env.SUPABASE_DB_URL;
let client: Client | null = null;
let ready = false;
let skipReason = 'SUPABASE_DB_URL not set';

const ids = {
  admin: '00000000-0000-4000-8000-00000000a001',
  liam: '00000000-0000-4000-8000-00000000c001',
  nadav: '00000000-0000-4000-8000-00000000c002',
  setter: '00000000-0000-4000-8000-00000000d001',
  contractor: '00000000-0000-4000-8000-00000000e001',
  p1: '00000000-0000-4000-8000-0000000000f1', // assigned to liam
  p2: '00000000-0000-4000-8000-0000000000f2', // assigned to nadav
  p3: '00000000-0000-4000-8000-0000000000f3', // unassigned
  pDnc: '00000000-0000-4000-8000-0000000000f4', // assigned to liam, do-not-call
};

const q = async (sql: string, params: unknown[] = []) =>
  (await client!.query(sql, params)).rows;

/**
 * Run `fn` as the given user, then drop back to superuser.
 *
 * On failure the subtransaction is aborted, so nothing else can run until it
 * is rolled back — `rollback to savepoint` must come before `reset role`, or
 * the reset itself fails and its "transaction is aborted" message replaces
 * the real one. SET LOCAL ROLE is undone by the rollback as well.
 */
async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await client!.query('savepoint u');
  try {
    if (userId) {
      await client!.query(`set local role authenticated`);
      await client!.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
    }
    const result = await fn();
    await client!.query('reset role');
    await client!.query('release savepoint u');
    return result;
  } catch (e) {
    await client!.query('rollback to savepoint u');
    await client!.query('reset role');
    throw e;
  }
}

/** Runs `fn` as the user and reports whether Postgres refused it. */
async function refused(userId: string, fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await as(userId, fn);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

beforeAll(async () => {
  if (!url) return;
  client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const [t] = await q(
    `select to_regclass('public.contractor_prospects') is not null as ok`
  );
  if (!t.ok) {
    skipReason = 'migration 0007 not applied yet';
    await client.end();
    client = null;
    return;
  }
  await client.query('begin');

  // Synthetic users. The profiles trigger fires on auth.users insert; then we
  // set roles directly (as superuser, which the privilege guard allows).
  for (const [key, id] of Object.entries({
    admin: ids.admin,
    liam: ids.liam,
    nadav: ids.nadav,
    setter: ids.setter,
    contractor: ids.contractor,
  })) {
    await q(
      `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
       values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), $3, now(), now())`,
      [id, `${key}@rls.test`, JSON.stringify({ full_name: key[0].toUpperCase() + key.slice(1) + ' Test' })]
    );
  }
  await q(`update public.profiles set role='admin',  account_status='active' where id=$1`, [ids.admin]);
  await q(`update public.profiles set role='caller', account_status='active' where id=$1`, [ids.liam]);
  await q(`update public.profiles set role='caller', account_status='active' where id=$1`, [ids.nadav]);
  await q(`update public.profiles set role='setter', account_status='active' where id=$1`, [ids.setter]);
  await q(`update public.profiles set role='contractor', account_status='active' where id=$1`, [ids.contractor]);

  await q(
    `insert into public.contractor_prospects (id, company_name, phone, assigned_to) values
      ($1, 'RLS Test Pools A', '(818) 555-0191', $5),
      ($2, 'RLS Test Pools B', '(818) 555-0192', $6),
      ($3, 'RLS Test Pools C', '(818) 555-0193', null),
      ($4, 'RLS Test Pools DNC', '(818) 555-0194', $5)`,
    [ids.p1, ids.p2, ids.p3, ids.pDnc, ids.liam, ids.nadav]
  );
  await q(`update public.contractor_prospects set disposition='do_not_call' where id=$1`, [ids.pDnc]);
  ready = true;
});

afterAll(async () => {
  if (!client) return;
  try {
    await client.query('rollback');
  } finally {
    await client.end();
  }
});

// `ready` is only known after beforeAll, which runs after test collection, so
// the decision to skip has to be made inside each test body.
const maybe =
  () =>
  (name: string, fn: () => Promise<void>) =>
    it(name, async (ctx) => {
      if (!ready) {
        ctx.skip();
        return;
      }
      await fn();
    });

describe('calls RLS', () => {
  it('environment', () => {
    if (!ready) console.log(`[calls-rls] skipped: ${skipReason}`);
    expect(true).toBe(true);
  });

  maybe()('a caller sees only prospects assigned to them', async () => {
    const rows = await as(ids.liam, () => q(`select id from public.contractor_prospects order by id`));
    expect(rows.map((r) => r.id).sort()).toEqual([ids.p1, ids.pDnc].sort());
  });

  maybe()('a caller cannot read another caller’s prospect, even by id', async () => {
    const rows = await as(ids.liam, () => q(`select id from public.contractor_prospects where id=$1`, [ids.p2]));
    expect(rows).toHaveLength(0);
  });

  maybe()('setters and contractors see no prospects at all', async () => {
    for (const u of [ids.setter, ids.contractor]) {
      const rows = await as(u, () => q(`select id from public.contractor_prospects`));
      expect(rows).toHaveLength(0);
    }
  });

  maybe()('an admin sees every prospect', async () => {
    const rows = await as(ids.admin, () => q(`select id from public.contractor_prospects where company_name like 'RLS Test%'`));
    expect(rows).toHaveLength(4);
  });

  maybe()('a caller can log a call on their own prospect and the counter follows', async () => {
    await as(ids.liam, () =>
      q(
        `insert into public.prospect_call_attempts (prospect_id, caller_id, outcome, new_disposition, attempt_number, notes)
         values ($1, $2, 'no_answer', 'no_answer', 0, 'rls test')`,
        [ids.p1, ids.liam]
      )
    );
    const [p] = await q(`select call_attempt_count, last_contacted_at from public.contractor_prospects where id=$1`, [ids.p1]);
    expect(p.call_attempt_count).toBe(1);
    expect(p.last_contacted_at).not.toBeNull();
    const [a] = await q(`select attempt_number, caller_name, previous_disposition from public.prospect_call_attempts where prospect_id=$1`, [ids.p1]);
    expect(a.attempt_number).toBe(1);
    expect(a.caller_name).toBe('Liam Test');
    expect(a.previous_disposition).toBe('new');
  });

  maybe()('a caller cannot log a call on a prospect that is not theirs', async () => {
    const err = await refused(ids.liam, () =>
      q(
        `insert into public.prospect_call_attempts (prospect_id, caller_id, outcome, new_disposition, attempt_number)
         values ($1, $2, 'no_answer', 'no_answer', 0)`,
        [ids.p2, ids.liam]
      )
    );
    expect(err).toMatch(/row-level security/i);
  });

  maybe()('a caller cannot log a call as someone else', async () => {
    const err = await refused(ids.liam, () =>
      q(
        `insert into public.prospect_call_attempts (prospect_id, caller_id, outcome, new_disposition, attempt_number)
         values ($1, $2, 'no_answer', 'no_answer', 0)`,
        [ids.p1, ids.nadav]
      )
    );
    expect(err).toMatch(/row-level security/i);
  });

  maybe()('call attempts cannot be edited or deleted by anyone', async () => {
    const [a] = await q(`select id from public.prospect_call_attempts where prospect_id=$1`, [ids.p1]);
    for (const u of [ids.liam, ids.admin]) {
      const upd = await as(u, () => q(`update public.prospect_call_attempts set notes='edited' where id=$1 returning id`, [a.id]));
      expect(upd).toHaveLength(0); // no UPDATE policy → zero rows affected
      const del = await as(u, () => q(`delete from public.prospect_call_attempts where id=$1 returning id`, [a.id]));
      expect(del).toHaveLength(0);
    }
    const [still] = await q(`select notes from public.prospect_call_attempts where id=$1`, [a.id]);
    expect(still.notes).toBe('rls test');
  });

  maybe()('a caller can update calling fields but not identity or assignment', async () => {
    await as(ids.liam, () =>
      q(`update public.contractor_prospects set disposition='callback_requested', next_callback_at=now()+interval '1 day', notes='n' where id=$1`, [ids.p1])
    );
    const [p] = await q(`select disposition from public.contractor_prospects where id=$1`, [ids.p1]);
    expect(p.disposition).toBe('callback_requested');

    const e1 = await refused(ids.liam, () => q(`update public.contractor_prospects set company_name='Renamed' where id=$1`, [ids.p1]));
    expect(e1).toMatch(/only update calling fields/i);
    const e2 = await refused(ids.liam, () => q(`update public.contractor_prospects set assigned_to=$2 where id=$1`, [ids.p1, ids.nadav]));
    // Either the column guard or the WITH CHECK clause refuses this; both are correct.
    expect(e2).toMatch(/calling fields|row-level security/i);
  });

  maybe()('a do-not-call prospect refuses new calls from everyone', async () => {
    const err = await refused(ids.liam, () =>
      q(
        `insert into public.prospect_call_attempts (prospect_id, caller_id, outcome, new_disposition, attempt_number)
         values ($1, $2, 'no_answer', 'no_answer', 0)`,
        [ids.pDnc, ids.liam]
      )
    );
    expect(err).toMatch(/do-not-call/i);
  });

  maybe()('only an admin can lift do-not-call', async () => {
    const err = await refused(ids.liam, () =>
      q(`update public.contractor_prospects set disposition='new', do_not_call_at=null where id=$1`, [ids.pDnc])
    );
    expect(err).toMatch(/only an admin/i);
    await as(ids.admin, () =>
      q(`update public.contractor_prospects set disposition='new', do_not_call_at=null where id=$1`, [ids.pDnc])
    );
    const [p] = await q(`select disposition, do_not_call_at from public.contractor_prospects where id=$1`, [ids.pDnc]);
    expect(p.disposition).toBe('new');
    expect(p.do_not_call_at).toBeNull();
  });

  maybe()('only an admin can create or assign prospects', async () => {
    const e = await refused(ids.liam, () =>
      q(`insert into public.contractor_prospects (company_name) values ('Caller Made This')`)
    );
    expect(e).toMatch(/row-level security/i);
    await as(ids.admin, () => q(`update public.contractor_prospects set assigned_to=$2 where id=$1`, [ids.p3, ids.liam]));
    const rows = await as(ids.liam, () => q(`select id from public.contractor_prospects where id=$1`, [ids.p3]));
    expect(rows).toHaveLength(1);
  });

  maybe()('history stays with the prospect across reassignment', async () => {
    await as(ids.admin, () => q(`update public.contractor_prospects set assigned_to=$2 where id=$1`, [ids.p1, ids.nadav]));
    const liamSees = await as(ids.liam, () => q(`select id from public.prospect_call_attempts where prospect_id=$1`, [ids.p1]));
    expect(liamSees).toHaveLength(0);
    const nadavSees = await as(ids.nadav, () => q(`select id from public.prospect_call_attempts where prospect_id=$1`, [ids.p1]));
    expect(nadavSees).toHaveLength(1);
  });

  maybe()('a caller can book and update only their own sales appointments', async () => {
    await as(ids.nadav, () =>
      q(
        `insert into public.prospect_sales_appointments (prospect_id, partner_id, scheduled_at) values ($1, $2, now()+interval '2 days')`,
        [ids.p2, ids.nadav]
      )
    );
    const e = await refused(ids.liam, () =>
      q(`insert into public.prospect_sales_appointments (prospect_id, partner_id, scheduled_at) values ($1, $2, now()+interval '2 days')`, [ids.p2, ids.liam])
    );
    expect(e).toMatch(/row-level security/i);
    const liamSees = await as(ids.liam, () => q(`select id from public.prospect_sales_appointments where prospect_id=$1`, [ids.p2]));
    expect(liamSees).toHaveLength(0);
    const adminSees = await as(ids.admin, () => q(`select id from public.prospect_sales_appointments where prospect_id=$1`, [ids.p2]));
    expect(adminSees).toHaveLength(1);
  });
});
