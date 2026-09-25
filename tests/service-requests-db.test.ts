import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

/**
 * Growth-service requests (migration 0018) under real RLS, inside one
 * transaction that always rolls back. Skipped unless SUPABASE_DB_URL is set.
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = {
  companyA: randomUUID(), companyB: randomUUID(),
  ownerA: randomUUID(), ownerB: randomUUID(), admin: randomUUID(), setter: randomUUID(),
};
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
const count = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rowCount;
async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await q('savepoint u');
  try {
    await q('set local role authenticated');
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const result = await fn();
    await q('reset role'); await q('release savepoint u');
    return result;
  } catch (e) { await q('rollback to savepoint u'); await q('reset role'); throw e; }
}
const file = (userId: string, contractorId: string, service: string, extra: { requestedBy?: string; status?: string } = {}) =>
  q('insert into public.service_requests(contractor_id, requested_by, service, notes, status) values ($1,$2,$3,$4,$5) returning id',
    [contractorId, extra.requestedBy ?? userId, service, 'test notes', extra.status ?? 'new']);

let connected = false;
let requestA = '';
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  const [t] = await q("select to_regclass('public.service_requests') as t");
  if (!t.t) await q(readFileSync('supabase/migrations/0018_contractor_service_requests.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values ($1,'Company A (test)'), ($2,'Company B (test)')", [ids.companyA, ids.companyB]);
  // With the contractor-permissions migration (0017) applied, contractor logins also need an owner/staff role.
  const [col] = await q("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='contractor_role') as has");
  const setRole = col.has ? ", contractor_role = case when $2 = 'contractor' then 'owner' end" : '';
  for (const [user, role, company] of [
    [ids.ownerA, 'contractor', ids.companyA], [ids.ownerB, 'contractor', ids.companyB],
    [ids.admin, 'admin', null], [ids.setter, 'setter', null],
  ]) {
    await q(`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`, [user, `${user}@growth.test`]);
    await q(`update public.profiles set role=$2, account_status='active', is_active=true, contractor_id=$3${setRole} where id=$1`, [user, role, company]);
  }
}, 60000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });

const suite = url ? describe : describe.skip;
suite('service requests RLS (rolled back)', () => {
  it('a contractor files a New request for their own company', async () => {
    const [row] = await as(ids.ownerA, () => file(ids.ownerA, ids.companyA, 'website'));
    requestA = row.id;
    const [r] = await q('select status, contractor_id, requested_by, created_at, updated_at from public.service_requests where id=$1', [requestA]);
    expect(r).toMatchObject({ status: 'new', contractor_id: ids.companyA, requested_by: ids.ownerA });
    expect(r.created_at).toBeTruthy();
  });

  it('rejects a request for another company, as another user, or with a preset status', async () => {
    await expect(as(ids.ownerA, () => file(ids.ownerA, ids.companyB, 'crm_setup'))).rejects.toThrow(/row-level security/);
    await expect(as(ids.ownerA, () => file(ids.ownerA, ids.companyA, 'crm_setup', { requestedBy: ids.ownerB }))).rejects.toThrow(/row-level security/);
    await expect(as(ids.ownerA, () => file(ids.ownerA, ids.companyA, 'crm_setup', { status: 'accepted' }))).rejects.toThrow(/row-level security/);
    await expect(as(ids.setter, () => file(ids.setter, ids.companyA, 'crm_setup'))).rejects.toThrow(/row-level security/);
  });

  it('keeps each company’s requests private; admins see all; setters see none', async () => {
    expect(await as(ids.ownerA, () => q('select id from public.service_requests where id=$1', [requestA]))).toHaveLength(1);
    expect(await as(ids.ownerB, () => q('select id from public.service_requests where id=$1', [requestA]))).toHaveLength(0);
    expect(await as(ids.setter, () => q('select id from public.service_requests where id=$1', [requestA]))).toHaveLength(0);
    expect(await as(ids.admin, () => q('select id from public.service_requests where id=$1', [requestA]))).toHaveLength(1);
  });

  it('contractors cannot change status or delete; admins update and the change is stamped', async () => {
    expect(await as(ids.ownerA, () => count("update public.service_requests set status='accepted' where id=$1", [requestA]))).toBe(0);
    expect(await as(ids.ownerA, () => count('delete from public.service_requests where id=$1', [requestA]))).toBe(0);
    expect(await as(ids.admin, () => count('delete from public.service_requests where id=$1', [requestA]))).toBe(0);
    expect(await as(ids.admin, () => count("update public.service_requests set status='contacted' where id=$1", [requestA]))).toBe(1);
    const [r] = await q('select status, status_changed_by, status_changed_at from public.service_requests where id=$1', [requestA]);
    expect(r).toMatchObject({ status: 'contacted', status_changed_by: ids.admin });
    expect(r.status_changed_at).toBeTruthy();
  });

  it('allows one open request per service per company, and a new one once closed', async () => {
    await expect(as(ids.ownerA, () => file(ids.ownerA, ids.companyA, 'website'))).rejects.toThrow(/service_requests_one_open/);
    await as(ids.admin, () => q("update public.service_requests set status='closed' where id=$1", [requestA]));
    const [again] = await as(ids.ownerA, () => file(ids.ownerA, ids.companyA, 'website'));
    expect(again.id).toBeTruthy();
  });

  it('rejects unknown services and statuses at the database', async () => {
    await expect(as(ids.ownerA, () => file(ids.ownerA, ids.companyA, 'free_money'))).rejects.toThrow(/check constraint/);
    await expect(as(ids.admin, () => q("update public.service_requests set status='paid' where id=$1", [requestA]))).rejects.toThrow(/check constraint/);
  });
});
