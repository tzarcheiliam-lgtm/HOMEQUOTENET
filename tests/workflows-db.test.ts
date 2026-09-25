import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { eventIdempotencyKey, runKeys, stepRunIdempotencyKey, WORKFLOW_TEMPLATES } from '@/lib/workflows';

/**
 * Workflow data model (migration 0020) against the real database, with real
 * constraints, triggers and RLS — inside one transaction that always rolls
 * back. If 0020 is not applied yet it is applied inside that transaction, so
 * this doubles as a pre-apply verification. Skipped without SUPABASE_DB_URL.
 */
const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;

const ids = {
  poolCo: randomUUID(), fenceCo: randomUUID(),
  poolUser: randomUUID(), fenceUser: randomUUID(), admin: randomUUID(), setter: randomUUID(),
  lead: randomUUID(), otherLead: randomUUID(), assignment: randomUUID(),
  hqWorkflow: randomUUID(), poolWorkflow: randomUUID(), fenceWorkflow: randomUUID(), template: randomUUID(),
};

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
/** Runs `sql` in a savepoint and returns the Postgres error (or null), leaving the transaction usable. */
async function failure(sql: string, values: unknown[] = []): Promise<{ code?: string; message: string } | null> {
  await q('savepoint f');
  try { await q(sql, values); await q('release savepoint f'); return null; }
  catch (e) { await q('rollback to savepoint f'); return e as { code?: string; message: string }; }
}

const emit = async (type: string, key: string, entityType: string, entityId: string, contractor: string | null, lead: string | null) =>
  (await q(`select public.emit_workflow_event($1,$2,$3,$4,'test:workflows',now(),$5,$6) as id`,
    [type, key, entityType, entityId, contractor, lead]))[0].id as string;
const newRun = (workflow: string, event: string, extra: Record<string, unknown> = {}) => {
  const cols = { workflow_id: workflow, workflow_version: 1, definition_snapshot: {}, trigger_event_id: event, lead_id: ids.lead, entity_type: 'lead', entity_id: ids.lead, ...extra };
  const keys = Object.keys(cols);
  return { sql: `insert into public.workflow_runs(${keys.join(',')}) values(${keys.map((_, i) => `$${i + 1}`).join(',')}) returning *`, values: Object.values(cols) };
};

let connected = false;
beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  const [applied] = await q("select to_regclass('public.workflow_runs') as t");
  if (!applied.t) await q(readFileSync('supabase/migrations/0020_workflow_automation_foundation.sql', 'utf8'));

  await q("insert into public.contractors(id,name) values($1,'Pool Co (test)'),($2,'Fence Co (test)')", [ids.poolCo, ids.fenceCo]);
  for (const [user, role, contractor] of [[ids.poolUser, 'contractor', ids.poolCo], [ids.fenceUser, 'contractor', ids.fenceCo], [ids.admin, 'admin', null], [ids.setter, 'setter', null]]) {
    await q(`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, 'x', now(), '{}', now(), now())`, [user, `${user}@wf.test`]);
    await q("update public.profiles set role=$2, account_status='active', contractor_id=$3 where id=$1", [user, role, contractor]);
  }
  await q("insert into public.leads(id,first_name,email) values($1,'Wf','wf-a@example.test'),($2,'Wf','wf-b@example.test')", [ids.lead, ids.otherLead]);
  // Shared lead: assigned to Pool Co only.
  await q('insert into public.lead_assignments(id,lead_id,contractor_id) values($1,$2,$3)', [ids.assignment, ids.lead, ids.poolCo]);

  const wf = (id: string, contractor: string | null, trigger: string, extra = '') =>
    q(`insert into public.workflows(id,contractor_id,name,trigger_type,enabled${extra ? ',reentry_policy' : ''})
       values($1,$2,'Test ' || $3,$3,true${extra ? `,'${extra}'` : ''})`, [id, contractor, trigger]);
  await wf(ids.hqWorkflow, null, 'lead.created');
  await wf(ids.poolWorkflow, ids.poolCo, 'lead.assigned', 'one_active_per_entity');
  await wf(ids.fenceWorkflow, ids.fenceCo, 'lead.assigned');
  const t = WORKFLOW_TEMPLATES[0];
  await q(`insert into public.workflows(id,name,trigger_type,is_template,template_key) values($1,$2,$3,true,$4)`,
    [ids.template, t.definition.name, t.definition.trigger.type, t.key]);
  await q(`insert into public.workflow_steps(workflow_id,key,position,step_type,action_type,config)
    values($1,'wait_a_bit',0,'action','wait','{"mode":"duration","amount":5,"unit":"minutes"}')`, [ids.hqWorkflow]);
}, 60000);
afterAll(async () => { if (connected) { await q('rollback'); await db.end(); } });

const suite = url ? describe : describe.skip;
// Remote database round-trips: allow more than the 5s default per test.
suite('workflow data model (rolled back)', { timeout: 60_000 }, () => {
  let leadEvent = '';

  it('records an event once no matter how often it is emitted', async () => {
    const key = eventIdempotencyKey('lead.created', `lead:${ids.lead}`);
    leadEvent = await emit('lead.created', key, 'lead', ids.lead, null, ids.lead);
    // Duplicate webhook / retry / refresh: same key -> same event, no new row.
    expect(await emit('lead.created', key, 'lead', ids.lead, null, ids.lead)).toBe(leadEvent);
    expect(await q('select count(*)::int as n from public.workflow_events where idempotency_key=$1', [key])).toEqual([{ n: 1 }]);
    const [row] = await q('select dispatch_status, contractor_id from public.workflow_events where id=$1', [leadEvent]);
    expect(row).toEqual({ dispatch_status: 'pending', contractor_id: null });
    // Unknown event names never enter the ledger.
    expect((await failure(`select public.emit_workflow_event('lead.deleted','lead.deleted|lead:x','lead',$1,'test:x')`, [ids.lead]))?.code).toBe('23514');
  });

  it('creates at most one run per workflow per event', async () => {
    const r = newRun(ids.hqWorkflow, leadEvent);
    const [run] = await q(r.sql, r.values);
    expect(run).toMatchObject({ status: 'pending', contractor_id: null });
    expect((await failure(r.sql, r.values))?.code).toBe('23505');
  });

  it('enforces reentry policies with database keys', async () => {
    const poolEvent = await emit('lead.assigned', eventIdempotencyKey('lead.assigned', `assignment:${ids.assignment}`), 'lead_assignment', ids.assignment, ids.poolCo, ids.lead);
    const second = await emit('lead.assigned', eventIdempotencyKey('lead.assigned', `assignment:${ids.assignment}:again`), 'lead_assignment', ids.assignment, ids.poolCo, ids.lead);
    const { concurrencyKey } = runKeys('one_active_per_entity', 'lead_assignment', ids.assignment);
    const extra = { entity_type: 'lead_assignment', entity_id: ids.assignment, concurrency_key: concurrencyKey };
    const a = newRun(ids.poolWorkflow, poolEvent, extra);
    const [first] = await q(a.sql, a.values);
    const b = newRun(ids.poolWorkflow, second, extra);
    expect((await failure(b.sql, b.values))?.code).toBe('23505'); // still active
    await q("update public.workflow_runs set status='cancelled', cancelled_at=now(), cancel_reason='test' where id=$1", [first.id]);
    const [again] = await q(b.sql, b.values); // no longer active -> allowed
    expect(again.status).toBe('pending');
    // once_per_entity: dedupe_key is unique forever.
    const { dedupeKey } = runKeys('once_per_entity', 'lead', ids.lead);
    const e2 = await emit('lead.created', `lead.created|lead:${ids.lead}:dup2`, 'lead', ids.lead, null, ids.lead);
    const e3 = await emit('lead.created', `lead.created|lead:${ids.lead}:dup3`, 'lead', ids.lead, null, ids.lead);
    await q(newRun(ids.hqWorkflow, e2, { dedupe_key: dedupeKey }).sql, newRun(ids.hqWorkflow, e2, { dedupe_key: dedupeKey }).values);
    const dup = newRun(ids.hqWorkflow, e3, { dedupe_key: dedupeKey });
    expect((await failure(dup.sql, dup.values))?.code).toBe('23505');
  });

  it('takes the tenant from the workflow and refuses cross-tenant runs', async () => {
    // Caller lies about contractor_id -> overwritten from the workflow.
    const e = await emit('lead.assigned', `lead.assigned|assignment:${ids.assignment}:tenant1`, 'lead_assignment', ids.assignment, ids.poolCo, ids.lead);
    const r = newRun(ids.poolWorkflow, e, { entity_type: 'lead_assignment', entity_id: ids.assignment, contractor_id: ids.fenceCo });
    const [run] = await q(r.sql, r.values);
    expect(run.contractor_id).toBe(ids.poolCo);
    // Fence Co's workflow cannot run on Pool Co's event...
    const cross = newRun(ids.fenceWorkflow, e, { entity_type: 'lead_assignment', entity_id: ids.assignment });
    expect((await failure(cross.sql, cross.values))?.message).toMatch(/different tenant/);
    // ...nor on a Fence-scoped event about a lead Fence Co was never assigned.
    const fenceEvent = await emit('lead.assigned', `lead.assigned|assignment:${ids.assignment}:tenant2`, 'lead_assignment', ids.assignment, ids.fenceCo, ids.lead);
    const unassigned = newRun(ids.fenceWorkflow, fenceEvent, { entity_type: 'lead_assignment', entity_id: ids.assignment });
    expect((await failure(unassigned.sql, unassigned.values))?.message).toMatch(/not assigned/);
    // Event type must match the workflow trigger; templates never run.
    const wrongType = newRun(ids.poolWorkflow, leadEvent);
    expect((await failure(wrongType.sql, wrongType.values))?.message).toMatch(/does not match workflow trigger/);
    const tpl = newRun(ids.template, leadEvent);
    expect((await failure(tpl.sql, tpl.values))?.message).toMatch(/templates cannot run/);
  });

  it('keeps run identity immutable and terminal states final', async () => {
    const [run] = await q('select id from public.workflow_runs where workflow_id=$1 and trigger_event_id=$2', [ids.hqWorkflow, leadEvent]);
    expect((await failure('update public.workflow_runs set contractor_id=$2 where id=$1', [run.id, ids.poolCo]))?.message).toMatch(/immutable/);
    expect((await failure("update public.workflow_runs set status='waiting' where id=$1", [run.id]))?.code).toBe('23514'); // waiting needs resume_at
    await q("update public.workflow_runs set status='running', started_at=now() where id=$1", [run.id]);
    await q("update public.workflow_runs set status='waiting', resume_at=now() + interval '5 minutes' where id=$1", [run.id]);
    await q("update public.workflow_runs set status='running' where id=$1", [run.id]);
    await q("update public.workflow_runs set status='completed', completed_at=now() where id=$1", [run.id]);
    expect((await failure("update public.workflow_runs set status='running' where id=$1", [run.id]))?.message).toMatch(/already completed/);
    expect((await failure("update public.workflow_runs set status='failed', failed_at=now() where id=$1", [run.id]))?.message).toMatch(/already completed/);
  });

  it('tracks step runs with a unique effect key and derived tenant', async () => {
    const [run] = await q('select id, trigger_event_id from public.workflow_runs where workflow_id=$1 and status=$2 limit 1', [ids.poolWorkflow, 'pending']);
    const key = stepRunIdempotencyKey(run.id, 'welcome_sms');
    const insert = `insert into public.workflow_step_runs(run_id,step_key,step_type,action_type,idempotency_key,max_attempts,contractor_id)
      values($1,'welcome_sms','action','send_sms',$2,5,$3) returning *`;
    const [step] = await q(insert, [run.id, key, ids.fenceCo]);
    expect(step.contractor_id).toBe(ids.poolCo);
    expect((await failure(insert, [run.id, key, null]))?.code).toBe('23505');
    // Retry contract: temporary failure with next_retry_at, then permanent failure.
    expect((await failure("update public.workflow_step_runs set status='retry_scheduled' where id=$1", [step.id]))?.code).toBe('23514');
    await q(`update public.workflow_step_runs set status='retry_scheduled', attempt_count=1, failure_kind='temporary',
      next_retry_at=now() + interval '1 minute', last_error='{"code":"provider_timeout","message":"t","kind":"temporary","retryable":true}' where id=$1`, [step.id]);
    await q(`update public.workflow_step_runs set status='failed', attempt_count=2, failure_kind='permanent',
      last_error='{"code":"invalid_recipient","message":"p","kind":"permanent","retryable":false}', provider='{"provider":"sms","statusCode":400}' where id=$1`, [step.id]);
    expect((await failure("update public.workflow_step_runs set status='running' where id=$1", [step.id]))?.message).toMatch(/already failed/);
    expect((await failure('update public.workflow_step_runs set attempt_count=9 where id=$1', [step.id]))?.code).toBe('23514');
    // Logs inherit tenant and lineage from the run.
    const [log] = await q(`insert into public.workflow_logs(step_run_id,level,code,message) values($1,'error','step.failed','Permanent failure') returning *`, [step.id]);
    expect(log).toMatchObject({ run_id: run.id, workflow_id: ids.poolWorkflow, contractor_id: ids.poolCo, event_id: run.trigger_event_id });
  });

  it('rejects malformed definitions at the database too', async () => {
    expect((await failure(`insert into public.workflows(name,trigger_type,is_template,template_key,enabled) values('x','lead.created',true,'k',true)`))?.code).toBe('23514');
    expect((await failure(`insert into public.workflows(name,trigger_type,contractor_id,is_template,template_key) values('x','lead.created',$1,true,'k2')`, [ids.poolCo]))?.code).toBe('23514');
    expect((await failure(`insert into public.workflow_steps(workflow_id,key,position,step_type) values($1,'no_action',1,'action')`, [ids.hqWorkflow]))?.code).toBe('23514');
    expect((await failure(`insert into public.workflow_steps(workflow_id,key,position,step_type,action_type) values($1,'bad',1,'action','send_fax')`, [ids.hqWorkflow]))?.code).toBe('23514');
    // A child step's parent must live in the same workflow.
    const [parent] = await q(`insert into public.workflow_steps(workflow_id,key,position,step_type,conditions) values($1,'branch_a',5,'branch','{"match":"all","conditions":[]}') returning id`, [ids.hqWorkflow]);
    expect((await failure(`insert into public.workflow_steps(workflow_id,key,position,parent_step_id,branch,step_type,action_type) values($1,'child',0,$2,'then','action','stop_workflow')`, [ids.poolWorkflow, parent.id]))?.code).toBe('23503');
  });

  it('does not block deleting a lead that workflows referenced', async () => {
    const e = await emit('lead.created', `lead.created|lead:${ids.otherLead}:delete1`, 'lead', ids.otherLead, null, ids.otherLead);
    const r = newRun(ids.hqWorkflow, e, { lead_id: ids.otherLead, entity_id: ids.otherLead });
    const [run] = await q(r.sql, r.values);
    expect(await failure('delete from public.leads where id=$1', [ids.otherLead])).toBeNull();
    expect(await q('select lead_id from public.workflow_runs where id=$1', [run.id])).toEqual([{ lead_id: null }]);
  });

  it('RLS: contractors see only their own workflows and runs; admins see all; setters see none; nobody writes runtime rows', async () => {
    const view = (user: string) => as(user, async () => ({
      workflows: (await q('select id from public.workflows where id = any($1)', [[ids.hqWorkflow, ids.poolWorkflow, ids.fenceWorkflow, ids.template]])).map((r) => r.id).sort(),
      steps: (await q('select count(*)::int as n from public.workflow_steps where workflow_id=$1', [ids.hqWorkflow]))[0].n,
      runs: (await q('select distinct contractor_id from public.workflow_runs where workflow_id = any($1)', [[ids.hqWorkflow, ids.poolWorkflow]])).map((r) => r.contractor_id),
      events: (await q('select count(*)::int as n from public.workflow_events where source=$1', ['test:workflows']))[0].n,
      logs: (await q('select count(*)::int as n from public.workflow_logs where workflow_id=$1', [ids.poolWorkflow]))[0].n,
    }));
    expect(await view(ids.poolUser)).toEqual({ workflows: [ids.poolWorkflow], steps: 0, runs: [ids.poolCo], events: 0, logs: 0 });
    expect(await view(ids.fenceUser)).toEqual({ workflows: [ids.fenceWorkflow], steps: 0, runs: [], events: 0, logs: 0 });
    // Appointment setters have no Automations access at any layer.
    expect(await view(ids.setter)).toEqual({ workflows: [], steps: 0, runs: [], events: 0, logs: 0 });
    const admin = await view(ids.admin);
    expect(admin.workflows).toHaveLength(4);
    expect(admin.runs).toEqual(expect.arrayContaining([null, ids.poolCo]));
    expect(admin.events).toBeGreaterThan(0);

    // Writes: contractors and setters cannot define workflows; nobody but the
    // service role can write runtime rows or call the event entry point.
    for (const user of [ids.poolUser, ids.setter]) {
      await expect(as(user, () => q(`insert into public.workflows(contractor_id,name,trigger_type) values($1,'mine','lead.assigned')`, [ids.poolCo]))).rejects.toThrow(/row-level security/);
    }
    await expect(as(ids.admin, () => q(`insert into public.workflow_events(type,idempotency_key,occurred_at,entity_type,entity_id,source) values('lead.created','x',now(),'lead',$1,'app:x')`, [ids.lead]))).rejects.toThrow(/row-level security/);
    await expect(as(ids.admin, () => q(`select public.emit_workflow_event('lead.created','y','lead',$1,'app:x')`, [ids.lead]))).rejects.toThrow(/permission denied/);
    await expect(as(ids.poolUser, () => q("update public.workflow_runs set status='cancelled' where contractor_id=$1 returning id", [ids.poolCo]))).resolves.toEqual([]);
    // Admins manage definitions.
    const created = await as(ids.admin, () => q(`insert into public.workflows(contractor_id,name,trigger_type) values($1,'Admin-made','lead.assigned') returning id`, [ids.poolCo]));
    expect(created).toHaveLength(1);
  });
});
