import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { eventFromRow, type WorkflowEventRow } from '@/lib/workflows/events';

/**
 * Production-readiness checks against the real database, in one transaction
 * that always rolls back:
 *  - No Answer: logContactAttempt's conditional update (status new ->
 *    contact_attempted) through real RLS emits exactly one canonical
 *    lead.status_changed; repeat attempts emit nothing; a contractor's attempt
 *    moves only its own assignment (no_answer) and that event parses too.
 *  - Retention (0027): prunes only old finished-run logs and cleanly
 *    dispatched unreferenced events; keeps everything audit-relevant.
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
const ids = { admin: randomUUID(), contractorUser: randomUUID(), contractor: randomUUID(), lead: randomUUID(), assignment: randomUUID() };

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
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  for (const [probe, file] of [['claim_workflow_events', '0024_workflow_runtime'], ['prune_workflow_history', '0027_workflow_retention']]) {
    const [{ applied }] = await q('select to_regproc($1) is not null as applied', [`public.${probe}`]);
    if (!applied) await q(readFileSync(`supabase/migrations/${file}.sql`, 'utf8'));
  }
  await q("insert into public.contractors(id,name) values($1,'Readiness test')", [ids.contractor]);
  for (const [user, role, contractor] of [[ids.admin, 'admin', null], [ids.contractorUser, 'contractor', ids.contractor]]) {
    await q(`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`, [user, `${user}@readiness.test`]);
    const cols = await q("select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='contractor_role'");
    if (cols.length && role === 'contractor') {
      await q("update public.profiles set role=$2, account_status='active', contractor_id=$3, contractor_role='owner' where id=$1", [user, role, contractor]);
    } else {
      await q("update public.profiles set role=$2, account_status='active', contractor_id=$3 where id=$1", [user, role, contractor]);
    }
  }
  await q("insert into public.leads(id,first_name,zip,source) values($1,'Readiness','91436','website')", [ids.lead]);
  await q('insert into public.lead_assignments(id,lead_id,contractor_id) values($1,$2,$3)', [ids.assignment, ids.lead, ids.contractor]);
}, 60_000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });

const statusEvents = () => q("select * from public.workflow_events where lead_id=$1 and type='lead.status_changed'", [ids.lead]) as Promise<WorkflowEventRow[]>;
// Exactly what logContactAttempt does for the status advance.
const logAttemptAdvance = () => q("update public.leads set status='contact_attempted' where id=$1 and status='new' returning id", [ids.lead]);

const suite = url ? describe : describe.skip;
suite('workflow production readiness (rolled back)', { timeout: 60_000 }, () => {
  it('No Answer: a staff contact attempt moves New -> Contact Attempted and emits exactly one canonical event', async () => {
    expect(await statusEvents()).toEqual([]);
    const first = await as(ids.admin, logAttemptAdvance);
    expect(first).toHaveLength(1);
    const events = await statusEvents();
    expect(events).toHaveLength(1);
    const event = eventFromRow(events[0]);
    expect(event.payload).toEqual({ leadId: ids.lead, fromStatus: 'new', toStatus: 'contact_attempted' });
    expect(event.contractorId).toBeNull();
    // Repeat attempts: the lead is no longer 'new', nothing changes, no new event.
    expect(await as(ids.admin, logAttemptAdvance)).toEqual([]);
    expect(await as(ids.admin, logAttemptAdvance)).toEqual([]);
    expect(await statusEvents()).toHaveLength(1);
    const [lead] = await q('select status from public.leads where id=$1', [ids.lead]);
    expect(lead.status).toBe('contact_attempted');
  });

  it("No Answer: a contractor's attempt cannot move the HomeQuote status, but its own assignment event is valid", async () => {
    await q("update public.leads set status='new' where id=$1", [ids.lead]);
    const before = (await statusEvents()).length;
    expect(await as(ids.contractorUser, logAttemptAdvance)).toEqual([]); // RLS: staff-only lead updates
    const [assignment] = await as(ids.contractorUser, () => q("update public.lead_assignments set status='no_answer' where id=$1 returning status", [ids.assignment]));
    expect(assignment.status).toBe('no_answer');
    const rows = await q("select * from public.workflow_events where entity_id=$1 and type='assignment.status_changed'", [ids.assignment]) as WorkflowEventRow[];
    expect(rows).toHaveLength(1);
    expect(eventFromRow(rows[0]).payload).toMatchObject({ toStatus: 'no_answer', contractorId: ids.contractor });
    // The status reset above was a real transition (+1); the contractor attempt added nothing.
    expect((await statusEvents()).length).toBe(before);
  });

  it('retention prunes only old, finished, unreferenced history', async () => {
    const [wf] = await q("insert into public.workflows(name,trigger_type) values('retention','lead.created') returning id");
    const emitOld = async (key: string, status: string) => {
      const [{ id }] = await q(`select public.emit_workflow_event('lead.created',$1,'lead',$2::uuid,'test:retention',now(),null,$2::uuid) as id`, [`lead.created|lead:${key}`, ids.lead]);
      await q(`update public.workflow_events set recorded_at=now()-interval '400 days', dispatch_status=$2,
        dispatched_at=case when $2 in ('dispatched','ignored') then now() else null end where id=$1`, [id, status]);
      return id as string;
    };
    const oldIgnored = await emitOld(`${ids.lead}:r1`, 'ignored');
    const oldFailed = await emitOld(`${ids.lead}:r2`, 'failed');
    const oldWithRun = await emitOld(`${ids.lead}:r3`, 'dispatched');
    const recentIgnored = (await q(`select public.emit_workflow_event('lead.created',$1,'lead',$2::uuid,'test:retention') as id`, [`lead.created|lead:${ids.lead}:r4`, ids.lead]))[0].id;
    await q("update public.workflow_events set dispatch_status='ignored', dispatched_at=now() where id=$1", [recentIgnored]);
    const run = async (status: string) => (await q(`insert into public.workflow_runs(workflow_id,workflow_version,definition_snapshot,trigger_event_id,lead_id,entity_type,entity_id,status,resume_at,completed_at)
      values($1,1,'{}',$2,$3,'lead',$3,$4,case when $4='waiting' then now() end,case when $4='completed' then now() end) returning id`, [wf.id, oldWithRun, ids.lead, status]))[0].id;
    const doneRun = await run('completed');
    const activeEvent = await emitOld(`${ids.lead}:r5`, 'dispatched');
    const [{ id: activeRun }] = await q(`insert into public.workflow_runs(workflow_id,workflow_version,definition_snapshot,trigger_event_id,lead_id,entity_type,entity_id,status,resume_at)
      values($1,1,'{}',$2,$3,'lead',$3,'waiting',now()+interval '1 day') returning id`, [wf.id, activeEvent, ids.lead]);
    const log = async (runId: string | null, days: number) => (await q(`insert into public.workflow_logs(run_id,workflow_id,level,code,message,created_at)
      values($1,$2,'info','run.completed','x',now()-make_interval(days=>$3)) returning id`, [runId, wf.id, days]))[0].id;
    const oldDoneLog = await log(doneRun, 200);
    const recentDoneLog = await log(doneRun, 5);
    const orphanOldLog = await log(null, 200);
    const activeOldLog = await log(activeRun, 200);

    const [{ r }] = await q('select public.prune_workflow_history(90,180,1000) as r');
    expect(r.logs_deleted).toBeGreaterThanOrEqual(2);
    const exists = async (table: string, id: string) => (await q(`select 1 from public.${table} where id=$1`, [id])).length === 1;
    expect(await exists('workflow_logs', oldDoneLog)).toBe(false);
    expect(await exists('workflow_logs', orphanOldLog)).toBe(false);
    expect(await exists('workflow_logs', recentDoneLog)).toBe(true);
    expect(await exists('workflow_events', oldIgnored)).toBe(false);
    expect(await exists('workflow_events', oldFailed)).toBe(true);      // failed / dead-lettered: kept for review
    expect(await exists('workflow_events', oldWithRun)).toBe(true);     // a run points at it: kept
    expect(await exists('workflow_events', recentIgnored)).toBe(true);  // too recent
    expect(await exists('workflow_runs', doneRun)).toBe(true);          // runs are never pruned
    expect(await exists('workflow_logs', activeOldLog)).toBe(true);     // an active run's logs are kept at any age
    await q('savepoint floor');
    await expect(q('select public.prune_workflow_history(1,1,10)')).rejects.toThrow(/at least 30 days/);
    await q('rollback to savepoint floor');
  });

  it('retention never runs for browser roles', async () => {
    await expect(as(ids.admin, () => q('select public.prune_workflow_history()'))).rejects.toThrow(/permission denied/);
  });
});
