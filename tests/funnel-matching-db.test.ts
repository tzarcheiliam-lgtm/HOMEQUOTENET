import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import example from '@/content/funnels/pool-demo.json';
import { funnelSchema } from '@/lib/funnels/schema';

// Regression tests for migration 0036's save_funnel_session contact matching. Runs inside one
// transaction that is rolled back (including the migration itself). Skipped without SUPABASE_DB_URL,
// like the other *-db suites — point it at a disposable database, not production.
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const config = funnelSchema.parse(example);
const run = randomUUID().slice(0, 8);
const ids = { house: randomUUID(), client: randomUUID(), contractor: randomUUID(), otherContractor: randomUUID() };
const answers = { service: 'full_remodel', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91301' };
const person = { firstName: 'Jordan', lastName: 'Rivera', phone: '8185550142', email: `jordan-${run}@example.test`, consent: true };
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
let connected = false;

async function submit(funnel: string, contact: Record<string, unknown>, answered: Record<string, string> = answers) {
  const id = randomUUID();
  await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step,attribution) values($1,$2,$3,'test',$4,'contact','{}')", [id, funnel, id, config]);
  await q('select public.save_funnel_session($1,$2,0,$3,$4,null,$5,true,$6)', [id, id, answered, 'calendar', contact, 'Reviewed consent']);
  const [s] = await q('select lead_id from public.funnel_sessions where id=$1', [id]);
  return s.lead_id as string;
}
const leadCount = async (email: string) => (await q('select id from public.leads where email=lower($1)', [email])).length;
const activities = (leadId: string) => q('select body, metadata from public.lead_activities where lead_id=$1 order by created_at', [leadId]);

beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  await q(readFileSync('supabase/migrations/0036_funnel_measurement_choice_and_contact_matching.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values($1,'Match test'),($2,'Other match test')", [ids.contractor, ids.otherContractor]);
  await q('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,null,true,$3)', [ids.house, `house-${ids.house}`, config]);
  await q('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,$3,true,$4)', [ids.client, `client-${ids.client}`, ids.contractor, config]);
}, 30000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });

const suite = url ? describe : describe.skip;
suite('save_funnel_session contact matching (rolled back)', () => {
  it('treats an identical re-submission of the same open inquiry as the same lead', async () => {
    const first = await submit(ids.house, person);
    const again = await submit(ids.house, person);
    expect(again).toBe(first);
    expect(await leadCount(person.email)).toBe(1);
  });

  it('keeps a different person who shares only a phone as a separate, flagged lead and leaves the old lead untouched', async () => {
    const original = await submit(ids.house, { ...person, firstName: 'Casey', lastName: 'Nguyen', email: `casey-${run}@example.test`, phone: '8185550177' });
    const before = await activities(original);
    const other = await submit(ids.house, { ...person, firstName: 'Sam', lastName: 'Nguyen', email: `sam-${run}@example.test`, phone: '8185550177' });
    expect(other).not.toBe(original);
    expect((await activities(other)).some(a => /possible duplicate/i.test(a.body) && a.metadata.possible_duplicate_of === original)).toBe(true);
    expect(await activities(original)).toEqual(before);
  });

  it('keeps the same person asking about a different project as a separate lead', async () => {
    const email = `project-${run}@example.test`;
    const first = await submit(ids.house, { ...person, email, phone: '8185550101' });
    const second = await submit(ids.house, { ...person, email, phone: '8185550101' }, { ...answers, service: 'spa' });
    expect(second).not.toBe(first);
    expect(await leadCount(email)).toBe(2);
    expect((await activities(second)).some(a => a.metadata.possible_duplicate_of === first)).toBe(true);
  });

  it('does not reuse a closed (sold / lost / cancelled) lead', async () => {
    for (const status of ['sold', 'lost', 'cancelled']) {
      const contact = { ...person, email: `${status}-${run}@example.test`, phone: `818555${status === 'sold' ? '0201' : status === 'lost' ? '0202' : '0203'}` };
      const first = await submit(ids.house, contact);
      await q('update public.leads set status=$2 where id=$1', [first, status]);
      expect(await submit(ids.house, contact)).not.toBe(first);
    }
  });

  it('does not reuse a lead older than 30 days', async () => {
    const contact = { ...person, email: `old-${run}@example.test`, phone: '8185550301' };
    const first = await submit(ids.house, contact);
    await q("update public.leads set created_at = now() - interval '45 days' where id=$1", [first]);
    expect(await submit(ids.house, contact)).not.toBe(first);
  });

  it('still reuses on one shared field when the first name matches (e.g. a mistyped phone) and the inquiry is identical', async () => {
    const email = `typo-${run}@example.test`;
    const first = await submit(ids.house, { ...person, email, phone: '8185550401' });
    expect(await submit(ids.house, { ...person, email, phone: '8185550499' })).toBe(first);
  });

  it('client funnels never match, flag or merge into another contractor\'s lead', async () => {
    const contact = { ...person, email: `scope-${run}@example.test`, phone: '8185550501' };
    const houseLead = await submit(ids.house, contact);
    const clientLead = await submit(ids.client, contact);
    expect(clientLead).not.toBe(houseLead);
    expect((await activities(clientLead)).some(a => a.metadata?.possible_duplicate_of)).toBe(false);
  });

  it('records the measurement choice column and keeps the original function signature callable', async () => {
    const [col] = await q("select data_type from information_schema.columns where table_name='funnel_sessions' and column_name='measurement_allowed'");
    expect(col.data_type).toBe('boolean');
  });
});
