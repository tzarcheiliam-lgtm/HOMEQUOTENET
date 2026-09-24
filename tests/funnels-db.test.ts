import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import example from '@/content/funnels/pool-demo.json';
import { funnelSchema } from '@/lib/funnels/schema';

const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const ids = { contractor: randomUUID(), other: randomUUID(), funnel: randomUUID(), integration: randomUUID(), session: randomUUID() };
const config = funnelSchema.parse({ ...example, calendarUrl: 'https://api.leadconnectorhq.com/widget/booking/test', calendarId: 'test' });
const answers = { service: 'full_remodel', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91301' };
const contact = { firstName: 'Funnel', lastName: 'Test', phone: '8185550188', email: `funnel-${ids.session}@example.test`, consent: true };
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
let connected = false;
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  const [table] = await q("select to_regclass('public.funnels') as name");
  if (!table.name) await q(readFileSync('supabase/migrations/0012_lead_funnels.sql', 'utf8'));
  await q("insert into public.contractors(id,name) values($1,'Funnel test'),($2,'Other test')", [ids.contractor, ids.other]);
  await q("insert into public.integrations(id,provider,name,is_enabled,secret) values($1,'ghl',$2,true,'test-secret')", [ids.integration, ids.integration]);
  await q('insert into public.funnels(id,slug,contractor_id,integration_id,published,config) values($1,$2,$3,$4,true,$5)', [ids.funnel, `test-${ids.funnel}`, ids.contractor, ids.integration, config]);
  await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step,attribution) values($1,$2,$3,'test',$4,'contact',$5)", [ids.session, ids.funnel, ids.session, config, { utm_source: 'facebook', fbclid: 'test-click' }]);
}, 30000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });
const suite = url ? describe : describe.skip;
suite('funnel database (rolled back)', () => {
  it('denies public reads and RPC access', async () => {
    await q('savepoint public_access');
    try {
      await q('set local role anon');
      const rows = await q('select id from public.funnel_sessions');
      expect(rows).toHaveLength(0);
      const [allowed] = await q("select has_function_privilege('anon','public.save_funnel_session(uuid,text,integer,jsonb,text,text,jsonb,boolean,text)','execute') as ok");
      expect(allowed.ok).toBe(false);
    } finally { await q('rollback to savepoint public_access'); }
  });
  it('atomically creates one lead, contractor assignment, intake log and durable delivery', async () => {
    await q('select public.save_funnel_session($1,$2,0,$3,$4,null,$5,true,$6)', [ids.session, ids.session, answers, 'calendar', contact, 'Reviewed consent']);
    const [s] = await q('select * from public.funnel_sessions where id=$1', [ids.session]);
    expect(s.lead_id).toBeTruthy(); expect(s.contact_submitted_at).toBeTruthy();
    const [lead] = await q('select * from public.leads where id=$1', [s.lead_id]);
    expect(lead.utm_source).toBe('facebook'); expect(lead.phone_e164).toBe('+18185550188'); expect(lead.consent_granted).toBe(true);
    const [assignment] = await q('select * from public.lead_assignments where id=$1', [s.assignment_id]);
    expect(assignment.contractor_id).toBe(ids.contractor);
    expect((await q('select id from public.funnel_deliveries where session_id=$1', [s.id]))).toHaveLength(1);
    expect((await q('select id from public.lead_intake_events where lead_id=$1', [s.lead_id]))).toHaveLength(1);
    expect(s.attribution.fbclid).toBe('test-click');
  });
  it('submission replays preserve the lead, assignment and history', async () => {
    await q('select public.save_funnel_session($1,$2,1,$3,$4,null,$5,true,$6)', [ids.session, ids.session, answers, 'calendar', contact, 'Reviewed consent']);
    expect(await q('select id from public.leads where email=$1', [contact.email])).toHaveLength(1);
    expect(await q('select id from public.funnel_events where session_id=$1 and event=$2', [ids.session, 'contact_submitted'])).toHaveLength(1);
    expect(await q('select id from public.funnel_deliveries where session_id=$1', [ids.session])).toHaveLength(1);
  });
  it('records an appointment only through verified calendar mapping and deduplicates retries', async () => {
    await q('savepoint wrong_calendar');
    await expect(q("select public.record_funnel_booking($1,$2,'external-1','wrong',now())", [ids.session, ids.integration])).rejects.toThrow();
    await q('rollback to savepoint wrong_calendar');
    await q("select public.record_funnel_booking($1,$2,'external-1','test',now())", [ids.session, ids.integration]);
    await q("select public.record_funnel_booking($1,$2,'external-1','test',now())", [ids.session, ids.integration]);
    expect(await q('select id from public.funnel_bookings where session_id=$1', [ids.session])).toHaveLength(1);
    const [report] = await q("select public.funnel_report($1,now()-interval '1 day') as report", [ids.funnel]);
    expect(report.report.events.find((e: { event: string }) => e.event === 'appointment_booked').total).toBe(1);
  });
  it('rejects stolen IDs and stale versions without changing stored answers', async () => {
    await q('savepoint forged');
    await expect(q('select public.save_funnel_session($1,$2,1,$3,$4)', [ids.session, 'wrong-token', {}, 'service'])).rejects.toThrow();
    await q('rollback to savepoint forged');
    await q('savepoint stale');
    await expect(q('select public.save_funnel_session($1,$2,0,$3,$4)', [ids.session, ids.session, {}, 'service'])).rejects.toThrow();
    await q('rollback to savepoint stale');
    const [s] = await q('select answers from public.funnel_sessions where id=$1', [ids.session]);
    expect(s.answers).toEqual(answers);
  });
  it('reuses contacts within a client but keeps another client’s history separate', async () => {
    const retry = randomUUID();
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step) values($1::uuid,$2,$1::uuid::text,'test',$3,'contact')", [retry, ids.funnel, config]);
    await q("select public.save_funnel_session($1::uuid,$1::uuid::text,0,$2,'calendar',null,$3,true,'Reviewed consent')", [retry, answers, contact]);
    const sessions = await q('select lead_id from public.funnel_sessions where id=any($1::uuid[])', [[retry, ids.session]]);
    expect(sessions[0].lead_id).toBe(sessions[1].lead_id);
    const otherFunnel = randomUUID(); const otherSession = randomUUID();
    await q('insert into public.funnels(id,slug,contractor_id,published,config) values($1,$2,$3,true,$4)', [otherFunnel, `test-${otherFunnel}`, ids.other, config]);
    await q("insert into public.funnel_sessions(id,funnel_id,token_hash,rate_key,config_snapshot,current_step) values($1::uuid,$2,$1::uuid::text,'test',$3,'contact')", [otherSession, otherFunnel, config]);
    await q("select public.save_funnel_session($1::uuid,$1::uuid::text,0,$2,'thanks',null,$3,false,'Reviewed consent')", [otherSession, { ...answers, homeowner: 'no' }, contact]);
    const [other] = await q('select lead_id,qualified from public.funnel_sessions where id=$1', [otherSession]);
    expect(other.lead_id).not.toBe(sessions[0].lead_id); expect(other.qualified).toBe(false);
  });
  it('leases deliveries and keeps a failed delivery available for retry without creating leads', async () => {
    // Claim only synthetic jobs during this rolled-back transaction by postponing
    // pre-existing jobs temporarily; rollback restores their original state.
    await q("update public.funnel_deliveries set available_at=now()+interval '1 day' where integration_id<>$1", [ids.integration]);
    const jobs = await q('select * from public.claim_funnel_deliveries()');
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every(j => j.status === 'sending' && j.attempts === 1)).toBe(true);
    expect(await q('select * from public.claim_funnel_deliveries()')).toHaveLength(0);
    await q("update public.funnel_deliveries set status='failed',available_at=now() where id=$1", [jobs[0].id]);
    const retry = await q('select * from public.claim_funnel_deliveries()');
    expect(retry).toHaveLength(1); expect(retry[0].id).toBe(jobs[0].id); expect(retry[0].attempts).toBe(2);
  });
});
