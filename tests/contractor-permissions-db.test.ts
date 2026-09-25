import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const id = Object.fromEntries([
  'admin', 'owner', 'staff', 'outsider', 'companyA', 'companyB', 'leadA', 'leadB',
  'assignmentA', 'assignmentB', 'internalNote', 'contractorNote', 'recipient',
].map((key) => [key, randomUUID()])) as Record<string, string>;
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
let connected = false;

async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  await q('savepoint actor');
  try {
    await q('set local role authenticated');
    await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const result = await fn();
    await q('reset role'); await q('release savepoint actor');
    return result;
  } catch (error) {
    await q('rollback to savepoint actor'); await q('reset role'); throw error;
  }
}

beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  const [probe] = await q("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='contractor_role') as ok");
  if (!probe.ok) await q(readFileSync('supabase/migrations/0017_contractor_portal_permissions.sql', 'utf8'));
  await q('insert into public.contractors(id,name) values($1,$2),($3,$4)', [id.companyA, 'Company A', id.companyB, 'Company B']);
  for (const [user, role, company, companyRole] of [
    [id.admin, 'admin', null, null], [id.owner, 'contractor', id.companyA, 'owner'],
    [id.staff, 'contractor', id.companyA, 'staff'], [id.outsider, 'contractor', id.companyB, 'owner'],
  ]) {
    await q(`insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
      values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'x',now(),'{}',now(),now())`, [user, `${user}@permissions.test`]);
    await q("update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, account_status='active', is_active=true where id=$1", [user, role, company, companyRole]);
  }
  await q("insert into public.leads(id,first_name,qualification_status,qualified) values($1,'Own','qualified',true),($2,'Other','qualified',true)", [id.leadA, id.leadB]);
  await q('insert into public.lead_assignments(id,lead_id,contractor_id) values($1,$2,$3),($4,$5,$6)', [id.assignmentA, id.leadA, id.companyA, id.assignmentB, id.leadB, id.companyB]);
  await q("insert into public.lead_activities(id,lead_id,type,body,visibility) values($1,$2,'note','HQN only','internal'),($3,$2,'note','Contractor note','contractor')", [id.internalNote, id.leadA, id.contractorNote]);
  await q("insert into public.lead_recipients(id,name,email,kind) values($1,'Approved','approved@permissions.test','contractor')", [id.recipient]);
}, 60000);

afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });
const suite = url ? describe : describe.skip;

suite('contractor portal RLS (rolled back)', () => {
  it('lets HQN administrators access all companies and leads', async () => {
    expect(await as(id.admin, () => q('select id from public.leads where id in ($1,$2) order by id', [id.leadA, id.leadB]))).toHaveLength(2);
  });

  it('limits contractor owners and staff to their company leads', async () => {
    for (const user of [id.owner, id.staff]) {
      expect(await as(user, () => q('select id from public.leads where id in ($1,$2)', [id.leadA, id.leadB]))).toEqual([{ id: id.leadA }]);
    }
  });

  it('rejects another company lead by direct id and modified assignment request', async () => {
    expect(await as(id.owner, () => q('select id from public.leads where id=$1', [id.leadB]))).toEqual([]);
    await expect(as(id.owner, () => q('update public.lead_assignments set contractor_id=$1 where id=$2', [id.companyB, id.assignmentA]))).rejects.toThrow();
  });

  it('allows owners, but not staff, to assign an approved same-company user', async () => {
    await as(id.owner, () => q('update public.lead_assignments set assigned_user_id=$1 where id=$2', [id.staff, id.assignmentA]));
    await expect(as(id.staff, () => q('update public.lead_assignments set assigned_user_id=null where id=$1', [id.assignmentA]))).rejects.toThrow();
    await expect(as(id.owner, () => q('update public.lead_assignments set assigned_user_id=$1 where id=$2', [id.outsider, id.assignmentA]))).rejects.toThrow();
  });

  it('rejects contractor deletion, recipient management and distribution visibility', async () => {
    expect(await as(id.owner, () => q('delete from public.leads where id=$1 returning id', [id.leadA]))).toEqual([]);
    await expect(as(id.owner, () => q('insert into public.lead_assignments(lead_id,contractor_id) values($1,$2)', [id.leadB, id.companyA]))).rejects.toThrow();
    await expect(as(id.owner, () => q("insert into public.lead_recipients(name,email,kind) values('Nope','nope@permissions.test','contractor')"))).rejects.toThrow();
    expect(await as(id.owner, () => q('select id from public.lead_recipients'))).toEqual([]);
    expect(await as(id.owner, () => q('select id from public.lead_email_deliveries'))).toEqual([]);
  });

  it('separates HQN internal notes from contractor-visible notes', async () => {
    const contractor = await as(id.owner, () => q('select body from public.lead_activities where lead_id=$1 order by body', [id.leadA]));
    expect(contractor).toEqual([{ body: 'Contractor note' }]);
    expect(await as(id.admin, () => q('select body from public.lead_activities where lead_id=$1', [id.leadA]))).toHaveLength(2);
  });

  it('requires an administrator actor and at least one recipient for database distribution', async () => {
    await q('savepoint bad_actor');
    await expect(q('select public.distribute_lead($1,$2,$3,false)', [id.leadA, [id.recipient], id.owner])).rejects.toThrow(/administrator/i);
    await q('rollback to savepoint bad_actor');
    await q('savepoint empty_send');
    await expect(q('select public.distribute_lead($1,$2,$3,false)', [id.leadA, [], id.admin])).rejects.toThrow(/Choose at least one recipient/);
    await q('rollback to savepoint empty_send');
  });
});
