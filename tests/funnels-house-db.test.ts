import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { funnelSchema } from '@/lib/funnels/schema';

/**
 * House funnels + private sharing (migration 0013), inside one transaction
 * that always rolls back. Contractor users are simulated the way PostgREST
 * does it (see calls-rls.test.ts).
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = { funnel: randomUUID(), session: randomUUID(), a: randomUUID(), b: randomUUID(), userA: randomUUID(), userB: randomUUID() };
const config = funnelSchema.parse(JSON.parse(readFileSync('content/funnels/pool-remodeling.json', 'utf8')));
const answers = { service: 'full_remodel', remodel_scope: 'pool_spa', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91362' };
const contact = { firstName: 'House', lastName: 'Test', phone: '8185550177', email: `house-${ids.session}@example.test`, consent: true };
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
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
let connected = false;
let lead = '';
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  const [fn] = await q("select to_regproc('public.activity_visible_to_contractor') as name");
  if (!fn.name) await q(readFileSync('supabase/migrations/0013_house_funnels_private_sharing.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values($1,'House A'),($2,'House B')", [ids.a, ids.b]);
  for (const [user, contractor] of [[ids.userA, ids.a], [ids.userB, ids.b]]) {
    await q(`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`, [user, `${user}@house.test`]);
    await q("update public.profiles set role='contractor', account_status='active', contractor_id=$2 where id=$1", [user, contractor]);
  }
  await q('insert into public.funnels(id,slug,published,config) values($1,$2,true,$3)', [ids.funnel, `house-${ids.funnel}`, config]);
  await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step,attribution) values($1,$2,$3,'test',$4,'contact',$5)",
    [ids.session, ids.funnel, ids.session, config, { utm_source: 'facebook' }]);
}, 30000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });
const suite = url ? describe : describe.skip;
suite('house funnels and private sharing (rolled back)', () => {
  it('creates an unassigned HomeQuote inbox lead with partner consent', async () => {
    await q("select public.save_funnel_session($1,$2,0,$3,'thanks',null,$4,true,'HomeQuote Network and the contractor partners it matches me with')", [ids.session, ids.session, answers, contact]);
    const [s] = await q('select lead_id, assignment_id from public.funnel_sessions where id=$1', [ids.session]);
    expect(s.lead_id).toBeTruthy(); expect(s.assignment_id).toBeNull();
    lead = s.lead_id;
    expect(await q('select 1 from public.lead_assignments where lead_id=$1', [lead])).toHaveLength(0);
    const [l] = await q('select status, qualified, consent_source, utm_source from public.leads where id=$1', [lead]);
    expect(l).toMatchObject({ qualified: true, consent_source: `funnel:house-${ids.funnel}`, utm_source: 'facebook' });
  });
  it('shows each contractor only their own side of a shared lead', async () => {
    await q('insert into public.lead_assignments(lead_id,contractor_id) values($1,$2),($1,$3)', [lead, ids.a, ids.b]);
    await q("insert into public.lead_activities(lead_id,type,body,metadata) values($1,'assignment','Assigned to 2 contractor(s)',$2)", [lead, { contractor_ids: [ids.a, ids.b] }]);
    await q("insert into public.lead_activities(lead_id,type,body) values($1,'note','Homeowner prefers mornings')", [lead]);
    await q("insert into public.lead_attachments(lead_id,name,url) values($1,'Staff photo','https://example.test/staff.jpg')", [lead]);
    await as(ids.userA, async () => {
      await q("insert into public.lead_activities(lead_id,actor_id,type,body) values($1,$2,'note','A: visited site')", [lead, ids.userA]);
      await q("insert into public.lead_attachments(lead_id,uploaded_by,name,url) values($1,$2,'A quote','https://example.test/a.pdf')", [lead, ids.userA]);
    });
    await as(ids.userB, async () => {
      await q("insert into public.lead_activities(lead_id,actor_id,type,body) values($1,$2,'note','B: sent proposal')", [lead, ids.userB]);
      await q("insert into public.lead_attachments(lead_id,uploaded_by,name,url) values($1,$2,'B quote','https://example.test/b.pdf')", [lead, ids.userB]);
    });
    const seen = await as(ids.userA, async () => ({
      activities: (await q('select body from public.lead_activities where lead_id=$1', [lead])).map(r => r.body),
      files: (await q('select name from public.lead_attachments where lead_id=$1', [lead])).map(r => r.name),
      assignments: (await q('select contractor_id from public.lead_assignments where lead_id=$1', [lead])).map(r => r.contractor_id),
    }));
    expect(seen.activities).toEqual(expect.arrayContaining(['Website estimate request received', 'Homeowner prefers mornings', 'A: visited site']));
    expect(seen.activities).not.toContain('B: sent proposal');
    expect(seen.activities).not.toContain('Assigned to 2 contractor(s)');
    expect(seen.files.sort()).toEqual(['A quote', 'Staff photo']);
    expect(seen.assignments).toEqual([ids.a]);
  });
  it('prevents a contractor from posing as another or deleting their files', async () => {
    await expect(as(ids.userA, () => q("insert into public.lead_activities(lead_id,actor_id,type,body) values($1,$2,'note','forged')", [lead, ids.userB]))).rejects.toThrow();
    await expect(as(ids.userA, () => q("insert into public.lead_activities(lead_id,actor_id,type,body,metadata) values($1,$2,'note','scoped',$3)", [lead, ids.userA, { contractor_id: ids.b }]))).rejects.toThrow();
    await as(ids.userA, () => q("delete from public.lead_attachments where lead_id=$1 and name='B quote'", [lead]));
    expect(await q("select 1 from public.lead_attachments where lead_id=$1 and name='B quote'", [lead])).toHaveLength(1);
  });
  it('reuses the existing inbox lead when the same homeowner submits again', async () => {
    const second = randomUUID();
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step) values($1,$2,$3,'test',$4,'contact')", [second, ids.funnel, second, config]);
    await q("select public.save_funnel_session($1,$2,0,$3,'thanks',null,$4,true,'consent')", [second, second, answers, { ...contact, email: contact.email.toUpperCase() }]);
    const [s] = await q('select lead_id from public.funnel_sessions where id=$1', [second]);
    expect(s.lead_id).toBe(lead);
  });
});
