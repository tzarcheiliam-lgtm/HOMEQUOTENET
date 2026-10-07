/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Applies the REAL workflow migrations (0020, 0024, 0037, 0038, 0041) in an in-process Postgres against minimal
 * stand-ins for the tables they touch. Exercises the graph engine's database contract: immutable versions,
 * permission checks inside the RPCs, pause/resume, cancel, retry, the call wake-up trigger, event-wait
 * satisfaction, and the additive event emitters.
 */
const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
let db: PGlite;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const as = async (uid: string | null) => { await db.exec(`select set_config('test.uid', '${uid ?? ''}', false)`); };
const fails = async (sql: string, p?: unknown[]) => { try { await db.query(sql, p); return null; } catch (e) { return e as { message: string; code?: string }; } };

let admin: string, owner1: string, staff1: string, owner2: string, c1: string, c2: string;

const validGraph = {
  schemaVersion: 2, settings: { reentry: 'once_per_entity', exitEvents: [], allowManualEnrollment: false, runLifetimeDays: 30 },
  nodes: [{ id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: { event: 'lead.assigned', filters: {}, entry: null } }], edges: [],
};

async function newLead(phone = '+15125550101') {
  return (await q<{ id: string }>(`insert into leads(first_name, phone_e164, state, consent_granted) values ('Ada', $1, 'TX', true) returning id`, [phone]))[0].id;
}
async function newAssignment(lead: string, contractor: string) {
  return (await q<{ id: string }>(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2) returning id`, [lead, contractor]))[0].id;
}
async function createWorkflow(contractor: string | null, uid: string) {
  await as(uid);
  return (await q<{ id: string }>(`select wfg_create('Test flow', 'd', $1, $2::jsonb, 'lead.assigned', '{}'::jsonb) as id`, [contractor, JSON.stringify(validGraph)]))[0].id;
}
async function publish(wf: string, revision = 1) {
  return (await q(`select wfg_publish_internal($1, $2, null, 'v', 'lead.assigned', '{}'::jsonb, '{}', 'once_per_entity') as r`, [wf, revision]))[0].r as { version: number; versionId: string };
}
async function event(type: string, key: string, lead: string, contractor: string | null, payload: object = {}) {
  return (await q<{ id: string }>(`select emit_workflow_event($1,$2,'lead',$3,'test:sql',now(),$4,$3,'system',null,$5::jsonb) as id`, [type, `${type}|${key}`, lead, contractor, JSON.stringify(payload)]))[0].id;
}
async function runFor(wf: string, lead: string, contractor: string | null, status = 'waiting', resume = "now() + interval '1 hour'") {
  const ev = await event('lead.assigned', `r:${wf}:${lead}:${Math.random()}`, lead, contractor, { leadId: lead });
  return (await q<{ id: string }>(
    `insert into workflow_runs(workflow_id, workflow_version, definition_snapshot, trigger_event_id, lead_id, entity_type, entity_id, status, resume_at)
     values ($1,1,'{"kind":"graph"}'::jsonb,$2,$3,'lead',$3,$4,${resume}) returning id`, [wf, ev, lead, status]))[0].id;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema if not exists auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
    create table public.profiles (id uuid primary key default gen_random_uuid(), role text, is_active boolean default true, contractor_id uuid, contractor_role text);
    create table public.contractors (id uuid primary key default gen_random_uuid(), name text);
    create function public.is_admin() returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = auth.uid() and is_active and role = 'admin') $$;
    create function public.auth_contractor_id() returns uuid language sql stable security definer as $$ select contractor_id from public.profiles where id = auth.uid() and is_active and role = 'contractor' $$;
    create table public.leads (id uuid primary key default gen_random_uuid(), first_name text, last_name text, phone_e164 text, state text, zip text, city text,
      consent_granted boolean default false, consent_at timestamptz, consent_source text, consent_disclosure text, archived_at timestamptz,
      status text default 'new', qualification_status text default 'needs_qualification', source text, vertical_id uuid, sub_service_id uuid,
      created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now());
    create table public.lead_assignments (id uuid primary key default gen_random_uuid(), lead_id uuid references leads(id), contractor_id uuid references contractors(id),
      status text default 'assigned', assigned_by uuid, assigned_at timestamptz default now(), updated_at timestamptz default now(), assigned_user_id uuid, unique(lead_id, contractor_id));
    create table public.appointments (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id), scheduled_at timestamptz,
      status text default 'scheduled', location text, notes text, created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now());
    create table public.estimates (id uuid primary key default gen_random_uuid(), assignment_id uuid references lead_assignments(id), amount numeric, status text default 'pending',
      created_by uuid, created_at timestamptz default now(), updated_at timestamptz default now());
    create table public.sales (id uuid primary key default gen_random_uuid(), assignment_id uuid, sale_status text, amount numeric, updated_at timestamptz default now());
    create table public.funnels (id uuid primary key default gen_random_uuid(), slug text, contractor_id uuid);
    create table public.funnel_sessions (id uuid primary key default gen_random_uuid(), funnel_id uuid, lead_id uuid);
    create table public.funnel_bookings (id uuid primary key default gen_random_uuid(), session_id uuid, appointment_id uuid, provider text, external_id text, scheduled_at timestamptz, fb_id bigint);
    create table public.lead_email_deliveries (id uuid primary key default gen_random_uuid(), lead_id uuid, kind text, recipient_email text, subject text, status text default 'pending', provider_message_id text);
    create table public.lead_activities (id uuid primary key default gen_random_uuid(), lead_id uuid, actor_id uuid, type text default 'note', body text, metadata jsonb default '{}', created_at timestamptz default now());
    create table public.contractor_prospects (id uuid primary key default gen_random_uuid());
  `);
  // lead_email_deliveries needs the pre-existing kind check that 0024 replaces.
  await db.exec(`alter table public.lead_email_deliveries add constraint lead_email_deliveries_kind_check check (kind in ('new_lead_alert','qualified_lead'))`);
  for (const f of ['0020_workflow_automation_foundation.sql', '0024_workflow_runtime.sql', '0037_ai_call_events.sql', '0038_ai_calling_queue.sql', '0041_visual_workflow_builder.sql']) {
    try { await db.exec(read(f)); } catch (e) { throw new Error(`${f}: ${(e as Error).message}`); }
  }
  c1 = (await q<{ id: string }>(`insert into contractors(name) values ('Pool Masters LA') returning id`))[0].id;
  c2 = (await q<{ id: string }>(`insert into contractors(name) values ('Other Co') returning id`))[0].id;
  admin = (await q<{ id: string }>(`insert into profiles(role) values ('admin') returning id`))[0].id;
  owner1 = (await q<{ id: string }>(`insert into profiles(role, contractor_id, contractor_role) values ('contractor', $1, 'owner') returning id`, [c1]))[0].id;
  staff1 = (await q<{ id: string }>(`insert into profiles(role, contractor_id, contractor_role) values ('contractor', $1, 'staff') returning id`, [c1]))[0].id;
  owner2 = (await q<{ id: string }>(`insert into profiles(role, contractor_id, contractor_role) values ('contractor', $1, 'owner') returning id`, [c2]))[0].id;
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('migration 0041', () => {
  it('re-applies cleanly (idempotent) and leaves existing linear workflows untouched', async () => {
    await as(admin);
    const linear = (await q<{ id: string }>(`insert into workflows(name, trigger_type) values ('Old linear', 'lead.created') returning id`))[0].id;
    await db.exec(read('0041_visual_workflow_builder.sql'));
    expect((await q(`select engine, graph_status, published_version from workflows where id = $1`, [linear]))[0]).toEqual({ engine: 'linear', graph_status: null, published_version: null });
  });

  it('accepts the new event types and still rejects unknown ones', async () => {
    const lead = await newLead();
    for (const t of ['appointment.rescheduled', 'estimate.accepted', 'ai_call.completed', 'ai_call.failed', 'workflow.manual_enrollment']) {
      expect(await fails(`select emit_workflow_event($1,$2,'lead',$3,'test:x',now(),null,$3)`, [t, `${t}|x:${lead}`, lead])).toBeNull();
    }
    expect((await fails(`select emit_workflow_event('lead.exploded','lead.exploded|x:1','lead',$1,'test:x',now(),null,$1)`, [lead]))?.message).toMatch(/violates check constraint/);
  });
});

describe('permissions are enforced by the database', () => {
  it('admins and enabled contractor owners may create; staff, other tenants and disabled owners may not', async () => {
    expect(await createWorkflow(null, admin)).toBeTruthy();
    await as(owner1);
    expect((await fails(`select wfg_create('x','d',$1,$2::jsonb,'lead.assigned','{}'::jsonb)`, [c1, JSON.stringify(validGraph)]))?.message).toMatch(/not allowed/); // not enabled yet
    await db.query(`insert into workflow_builder_access(contractor_id, enabled) values ($1, true)`, [c1]);
    expect(await createWorkflow(c1, owner1)).toBeTruthy();
    await as(staff1);
    expect((await fails(`select wfg_create('x','d',$1,$2::jsonb,'lead.assigned','{}'::jsonb)`, [c1, JSON.stringify(validGraph)]))?.message).toMatch(/not allowed/);
    await as(owner2);
    expect((await fails(`select wfg_create('x','d',$1,$2::jsonb,'lead.assigned','{}'::jsonb)`, [c1, JSON.stringify(validGraph)]))?.message).toMatch(/not allowed/);
    expect((await fails(`select wfg_create('x','d',null,$1::jsonb,'lead.assigned','{}'::jsonb)`, [JSON.stringify(validGraph)]))?.message).toMatch(/not allowed/); // network workflow: admin only
  });

  it('an owner cannot touch another company\'s workflow, run or task', async () => {
    const wf = await createWorkflow(c1, owner1);
    await as(owner2);
    expect((await fails(`select wfg_save_draft($1,1,$2::jsonb,'n','d','h')`, [wf, JSON.stringify(validGraph)]))?.message).toMatch(/not allowed/);
    expect((await fails(`select wfg_set_paused($1,true)`, [wf]))?.message).toMatch(/publish the workflow|not allowed/);
    expect((await fails(`select wfg_archive($1)`, [wf]))?.message).toMatch(/not allowed/);
    const lead = await newLead('+15125550102');
    await newAssignment(lead, c1);
    const run = await runFor(wf, lead, c1);
    await as(owner2);
    expect((await fails(`select wfg_cancel_run($1)`, [run]))?.message).toMatch(/not allowed/);
    expect((await fails(`select wfg_retry_run($1)`, [run]))?.message).toMatch(/not allowed/);
  });

  it('browser roles cannot call the service-only functions', async () => {
    const grants = await q<{ proname: string; ok: boolean }>(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as ok from pg_proc p
      where p.proname in ('wfg_publish_internal','workflow_wake_run','workflow_sweep_waits','workflow_satisfy_event_waits','workflow_assign_lead_user')`);
    expect(grants.length).toBe(5);
    expect(grants.every((g) => g.ok === false)).toBe(true);
    const user = await q<{ proname: string; ok: boolean }>(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as ok from pg_proc p where p.proname like 'wfg_%' and p.proname <> 'wfg_publish_internal'`);
    expect(user.every((g) => g.ok === false)).toBe(true);
  });

  it('RLS (enforced by the database as a non-superuser): each company sees only its own workflows, drafts, versions, runs and tasks', async () => {
    const mine = await createWorkflow(c1, owner1);
    await publish(mine);
    const theirs = await createWorkflow(c2, admin);
    await publish(theirs);
    const lead = await newLead('+15125550199');
    await newAssignment(lead, c1);
    await runFor(mine, lead, c1);
    await db.query(`insert into workflow_tasks(contractor_id, lead_id, title) values ($1,$2,'mine'), ($3,$2,'theirs')`, [c1, lead, c2]);
    // Supabase grants table privileges broadly and relies on RLS; emulate that, then act as each user.
    await db.exec(`grant usage on schema public to authenticated; grant select, insert, update, delete on workflows, workflow_runs, workflow_step_runs, workflow_events, workflow_logs, workflow_steps to authenticated`);
    const seen = async (uid: string, sql: string) => { await db.exec('reset role'); await as(uid); await db.exec('set role authenticated'); try { return (await q<any>(sql)).length; } finally { await db.exec('reset role'); } };
    const ids = async (uid: string, sql: string) => { await db.exec('reset role'); await as(uid); await db.exec('set role authenticated'); try { return (await q<any>(sql)).map((r) => Object.values(r)[0]); } finally { await db.exec('reset role'); } };
    for (const table of ['workflow_graph_drafts', 'workflow_versions']) {
      const col = 'workflow_id';
      expect(await ids(owner1, `select ${col} from ${table}`)).toEqual(expect.arrayContaining([mine]));
      expect(await ids(owner1, `select ${col} from ${table}`)).not.toContain(theirs);
      expect(await ids(staff1, `select ${col} from ${table}`)).toContain(mine); // staff may VIEW their company's workflows
      expect(await ids(owner2, `select ${col} from ${table}`)).not.toContain(mine);
      expect(await ids(admin, `select ${col} from ${table}`)).toEqual(expect.arrayContaining([mine, theirs]));
    }
    expect(await ids(owner1, `select contractor_id from workflows where engine='graph'`)).toSatisfy((rows: unknown[]) => rows.length > 0 && rows.every((r) => r === c1));
    const onlyOwn = (c: string) => (rows: unknown[]) => rows.length > 0 && rows.every((r) => r === c);
    expect(await ids(owner1, `select contractor_id from workflow_runs`)).toSatisfy(onlyOwn(c1));
    expect(await ids(owner2, `select contractor_id from workflow_runs`)).not.toContain(c1);
    expect(await ids(owner1, `select contractor_id from workflow_tasks`)).toSatisfy(onlyOwn(c1));
    expect(await ids(owner1, `select title from workflow_tasks`)).not.toContain('theirs');
    expect(await ids(admin, `select title from workflow_tasks`)).toEqual(expect.arrayContaining(['mine', 'theirs']));
    // Events and logs are admin-only, even for the company's own owner.
    await event('lead.assigned', `rls:${lead}`, lead, c1, { leadId: lead });
    expect(await seen(owner1, `select id from workflow_events`)).toBe(0);
    expect(await seen(admin, `select id from workflow_events`)).toBeGreaterThan(0);
    // No browser role can write the new tables directly (only through the permission-checked functions).
    for (const sql of [
      `insert into workflow_versions(workflow_id, version, graph, content_hash) values ('${mine}', 99, '{}'::jsonb, 'x')`,
      `update workflow_graph_drafts set graph = '{}'::jsonb`,
      `insert into workflow_waits(run_id, step_key, kind, timeout_at) select id, 'x', 'call', now() from workflow_runs limit 1`,
      `update workflow_tasks set status = 'done'`,
      `update workflows set name = 'hijacked'`,
    ]) {
      await db.exec('reset role'); await as(owner1); await db.exec('set role authenticated');
      const err = await fails(sql);
      await db.exec('reset role');
      // Either the privilege is missing, or RLS turns the write into zero rows. Never a successful change.
      if (!err) expect((await q<any>(`select count(*)::int n from workflows where name = 'hijacked'`))[0].n).toBe(0);
    }
    expect((await q<any>(`select count(*)::int n from workflow_versions where version = 99`))[0].n).toBe(0);
    expect((await q<any>(`select count(*)::int n from workflow_tasks where status = 'done'`))[0].n).toBe(0);
    // The access switch is admin-write only.
    await db.exec('reset role'); await as(owner1); await db.exec('set role authenticated');
    expect(await fails(`insert into workflow_builder_access(contractor_id, enabled) values ('${c2}', true)`)).not.toBeNull();
    await db.exec('reset role');
  });
});

describe('drafts, versions and publishing', () => {
  it('autosave uses optimistic concurrency and a stale save is rejected', async () => {
    const wf = await createWorkflow(null, admin);
    await as(admin);
    expect((await q(`select wfg_save_draft($1,1,$2::jsonb,'Renamed','d','h1') as r`, [wf, JSON.stringify(validGraph)]))[0].r).toBe(2);
    const stale = await fails(`select wfg_save_draft($1,1,$2::jsonb,'x','d','h2')`, [wf, JSON.stringify(validGraph)]);
    expect(stale?.message).toMatch(/draft changed elsewhere/);
    expect((await q(`select name from workflows where id=$1`, [wf]))[0].name).toBe('Renamed');
  });

  it('publishing creates immutable, numbered versions; the draft stays editable; editing never changes a published version', async () => {
    const wf = await createWorkflow(null, admin);
    await as(admin);
    const v1 = await publish(wf, 1);
    expect(v1.version).toBe(1);
    expect((await q(`select enabled, graph_status, published_version, enroll_from is not null as cut from workflows where id=$1`, [wf]))[0]).toEqual({ enabled: true, graph_status: 'published', published_version: 1, cut: true });
    const edited = { ...validGraph, settings: { ...validGraph.settings, runLifetimeDays: 5 } };
    await q(`select wfg_save_draft($1,1,$2::jsonb,'n','d','h') as r`, [wf, JSON.stringify(edited)]);
    expect((await q(`select (graph->'settings'->>'runLifetimeDays')::int d from workflow_versions where id=$1`, [v1.versionId]))[0].d).toBe(30);
    const v2 = await publish(wf, 2);
    expect(v2.version).toBe(2);
    expect((await fails(`update workflow_versions set graph = '{}'::jsonb where id = $1`, [v1.versionId]))?.message).toMatch(/immutable/);
    expect((await fails(`delete from workflow_versions where id = $1`, [v1.versionId]))?.message).toMatch(/immutable/);
    expect(await q(`select version from workflow_versions where workflow_id=$1 order by version`, [wf])).toEqual([{ version: 1 }, { version: 2 }]);
  });

  it('publishing a stale draft revision is refused', async () => {
    const wf = await createWorkflow(null, admin);
    await as(admin);
    await q(`select wfg_save_draft($1,1,$2::jsonb,'n','d','h')`, [wf, JSON.stringify(validGraph)]);
    expect((await fails(`select wfg_publish_internal($1, 1, null, 'v', 'lead.assigned', '{}'::jsonb, '{}', 'once_per_entity')`, [wf]))?.message).toMatch(/draft changed/);
  });

  it('a run is pinned to its version: it keeps its snapshot and the run identity cannot be rewritten', async () => {
    const wf = await createWorkflow(null, admin);
    const v1 = await publish(wf, 1);
    const lead = await newLead('+15125550103');
    const run = await runFor(wf, lead, null);
    await db.query(`update workflow_runs set workflow_version_id = $2 where id = $1`, [run, v1.versionId]).catch(() => undefined);
    const e = await fails(`update workflow_runs set definition_snapshot = '{}'::jsonb where id = $1`, [run]);
    expect(e?.message).toMatch(/identity is immutable/);
  });
});

describe('pause and resume', () => {
  it('pausing stops new enrollment, parks waiting runs, and resuming restores their wake time', async () => {
    const wf = await createWorkflow(null, admin);
    await publish(wf, 1);
    const lead = await newLead('+15125550104');
    const run = await runFor(wf, lead, null, 'waiting', "now() + interval '2 hours'");
    const before = (await q<{ r: string }>(`select resume_at::text r from workflow_runs where id=$1`, [run]))[0].r;
    await as(admin);
    await q(`select wfg_set_paused($1, true)`, [wf]);
    expect((await q(`select enabled, graph_status, enroll_from from workflows where id=$1`, [wf]))[0]).toMatchObject({ enabled: false, graph_status: 'paused' });
    expect((await q(`select resume_at = 'infinity' as parked from workflow_runs where id=$1`, [run]))[0].parked).toBe(true);
    // A parked run is never claimed, even when the clock passes its old wake time.
    expect(await q(`select id from claim_workflow_runs('w1')`)).toHaveLength(0);
    await q(`select wfg_set_paused($1, false)`, [wf]);
    const after = (await q<{ r: string; enabled: boolean }>(`select r.resume_at::text r, w.enabled from workflow_runs r join workflows w on w.id=r.workflow_id where r.id=$1`, [run]))[0];
    expect(after.enabled).toBe(true);
    expect(after.r).toBe(before);
  });

  it('cannot pause a workflow that was never published', async () => {
    const wf = await createWorkflow(null, admin);
    await as(admin);
    expect((await fails(`select wfg_set_paused($1,true)`, [wf]))?.message).toMatch(/publish the workflow/);
  });
});

describe('cancel and retry', () => {
  it('cancelling closes the run, its steps and waits, and cancels a queued call but reports one in progress', async () => {
    const wf = await createWorkflow(null, admin);
    await publish(wf, 1);
    const lead = await newLead('+15125550105');
    const run = await runFor(wf, lead, null);
    await db.query(`insert into workflow_step_runs(run_id, step_key, step_type, action_type, status, idempotency_key, resume_at) values ($1,'ai_call_1','action','ai_call','waiting',$2, now()+interval '1 hour')`, [run, `${run}:ai_call_1:0`]);
    await db.query(`insert into workflow_waits(run_id, step_key, kind, timeout_at) values ($1,'ai_call_1','call', now()+interval '1 hour')`, [run]);
    const queued = (await q<{ id: string }>(`insert into ai_call_jobs(trigger_source, dedupe_key, workflow_run_id, workflow_step_key, status) values ('workflow','wf:a',$1,'ai_call_1','queued') returning id`, [run]))[0].id;
    await as(admin);
    const res = (await q(`select wfg_cancel_run($1,'because') as r`, [run]))[0].r;
    expect(res).toMatchObject({ cancelled: true, queuedCallsCancelled: 1, callInProgress: false });
    expect((await q(`select status, cancel_reason from workflow_runs where id=$1`, [run]))[0]).toEqual({ status: 'cancelled', cancel_reason: 'because' });
    expect((await q(`select status from workflow_step_runs where run_id=$1`, [run]))[0].status).toBe('cancelled');
    expect((await q(`select status from workflow_waits where run_id=$1`, [run]))[0].status).toBe('cancelled');
    expect((await q(`select status from ai_call_jobs where id=$1`, [queued]))[0].status).toBe('cancelled');
    // Cancelling again is a no-op, never an error.
    expect((await q(`select wfg_cancel_run($1) as r`, [run]))[0].r).toMatchObject({ cancelled: false, status: 'cancelled' });

    const run2 = await runFor(wf, await newLead('+15125550106'), null);
    await db.query(`insert into ai_call_jobs(trigger_source, dedupe_key, workflow_run_id, workflow_step_key, status) values ('workflow','wf:b',$1,'ai_call_1','accepted')`, [run2]);
    expect((await q(`select wfg_cancel_run($1) as r`, [run2]))[0].r).toMatchObject({ cancelled: true, callInProgress: true });
  });

  it('retry re-opens only the failed step, keeps its idempotency key, and is refused for runs that did not fail', async () => {
    const wf = await createWorkflow(null, admin);
    await publish(wf, 1);
    const lead = await newLead('+15125550107');
    const run = await runFor(wf, lead, null, 'pending', 'now()');
    const key = `${run}:send_email_1:0`;
    await db.query(`insert into workflow_step_runs(run_id, step_key, step_type, action_type, status, idempotency_key, completed_at, attempt_count, max_attempts) values ($1,'add_note_1','action','add_note','succeeded',$2,now(),1,3)`, [run, `${run}:add_note_1:0`]);
    await db.query(`insert into workflow_step_runs(run_id, step_key, step_type, action_type, status, idempotency_key, completed_at, attempt_count, max_attempts, failure_kind, last_error) values ($1,'send_email_1','action','send_email','failed',$2,now(),5,5,'permanent','{"code":"x","message":"y","kind":"permanent","retryable":false}')`, [run, key]);
    await db.query(`update workflow_runs set status='running' where id=$1`, [run]);
    await db.query(`update workflow_runs set status='failed', failed_at=now(), last_error='{"code":"x","message":"y","kind":"permanent","retryable":false}' where id=$1`, [run]);
    await as(admin);
    // Without the audited RPC a failed run stays failed.
    expect((await fails(`update workflow_runs set status='pending' where id=$1`, [run]))?.message).toMatch(/already failed/);
    const res = (await q(`select wfg_retry_run($1) as r`, [run]))[0].r;
    expect(res).toMatchObject({ retried: true, stepsReopened: 1 });
    expect((await q(`select status, resume_at is not null as due from workflow_runs where id=$1`, [run]))[0]).toEqual({ status: 'pending', due: true });
    const steps = await q(`select step_key, status, idempotency_key, max_attempts from workflow_step_runs where run_id=$1 order by step_key`, [run]);
    expect(steps).toEqual([
      { step_key: 'add_note_1', status: 'succeeded', idempotency_key: `${run}:add_note_1:0`, max_attempts: 3 },
      { step_key: 'send_email_1', status: 'retry_scheduled', idempotency_key: key, max_attempts: 8 },
    ]);
    expect((await q(`select wfg_retry_run($1) as r`, [run]))[0].r).toMatchObject({ retried: false, status: 'pending' });
    // The revive switch does not leak: outside the RPC a terminal step is still final.
    await db.query(`update workflow_step_runs set status='succeeded', completed_at=now() where run_id=$1 and step_key='send_email_1'`, [run]);
    expect((await fails(`update workflow_step_runs set status='retry_scheduled', failure_kind='temporary', next_retry_at=now() where run_id=$1 and step_key='send_email_1'`, [run]))?.message).toMatch(/already succeeded/);
  });
});

describe('waits: AI-call results and events wake the right run', () => {
  async function waitingOnCall(phone: string) {
    const wf = await createWorkflow(null, admin);
    const lead = await newLead(phone);
    const run = await runFor(wf, lead, null);
    const job = (await q<{ id: string }>(`insert into ai_call_jobs(trigger_source, dedupe_key, workflow_run_id, workflow_step_key, lead_id, contractor_id, status) values ('workflow',$1,$2,'ai_call_1',$3,$4,'accepted') returning id`, [`wf:${run}`, run, lead, c1]))[0].id;
    await db.query(`insert into workflow_waits(run_id, step_key, kind, call_job_id, timeout_at) values ($1,'ai_call_1','call',$2, now()+interval '6 hours')`, [run, job]);
    return { run, job, lead };
  }
  const resumeIn = async (run: string) => (await q<{ s: number }>(`select extract(epoch from (resume_at - now()))::float s from workflow_runs where id=$1`, [run]))[0].s;

  it('a webhook-driven status change wakes ONLY the run waiting on that call', async () => {
    const a = await waitingOnCall('+15125550111');
    const b = await waitingOnCall('+15125550112');
    expect(await resumeIn(a.run)).toBeGreaterThan(3000);
    await db.query(`update ai_call_jobs set status='answered' where id=$1`, [a.job]);
    expect(await resumeIn(a.run)).toBeLessThan(5);
    expect(await resumeIn(b.run)).toBeGreaterThan(3000);
  });

  it('analysis arriving later wakes the run again', async () => {
    const a = await waitingOnCall('+15125550113');
    await db.query(`update ai_call_jobs set status='completed' where id=$1`, [a.job]);
    await db.query(`update workflow_runs set resume_at = now() + interval '30 minutes' where id=$1`, [a.run]); // the engine re-waited for the analysis
    await db.query(`update ai_call_jobs set analysis = '{"status":"completed","data":[]}'::jsonb where id=$1`, [a.job]);
    expect(await resumeIn(a.run)).toBeLessThan(5);
  });

  it('does not wake a parked (paused) run', async () => {
    const a = await waitingOnCall('+15125550114');
    await db.query(`update workflow_runs set resume_at='infinity' where id=$1`, [a.run]);
    await db.query(`update ai_call_jobs set status='no_answer' where id=$1`, [a.job]);
    expect((await q(`select resume_at = 'infinity' as parked from workflow_runs where id=$1`, [a.run]))[0].parked).toBe(true);
  });

  it('the sweeper repairs a missed wake-up and ignores calls that are still in flight', async () => {
    const a = await waitingOnCall('+15125550115');
    const b = await waitingOnCall('+15125550116');
    // Simulate the trigger having been missed (e.g. an old row written before the trigger existed).
    await db.exec(`alter table ai_call_jobs disable trigger trg_ai_call_jobs_workflow`);
    await db.query(`update ai_call_jobs set status='failed' where id=$1`, [a.job]);
    await db.exec(`alter table ai_call_jobs enable trigger trg_ai_call_jobs_workflow`);
    expect(await resumeIn(a.run)).toBeGreaterThan(3000);
    await q(`select workflow_sweep_waits()`);
    expect(await resumeIn(a.run)).toBeLessThan(5);
    expect(await resumeIn(b.run)).toBeGreaterThan(3000);
  });

  it('a wake-up raising an error can never break the call webhook update', async () => {
    const a = await waitingOnCall('+15125550117');
    await db.exec(`alter table workflow_runs add constraint force_fail check (resume_at is null or resume_at > now() - interval '1 minute') not valid`);
    await expect(db.query(`update ai_call_jobs set status='completed' where id=$1`, [a.job])).resolves.toBeDefined();
    await db.exec(`alter table workflow_runs drop constraint force_fail`);
    expect((await q(`select status from ai_call_jobs where id=$1`, [a.job]))[0].status).toBe('completed');
  });

  it('call results are announced as events: completed vs failed, once each', async () => {
    const lead = await newLead('+15125550118');
    const done = (await q<{ id: string }>(`insert into ai_call_jobs(trigger_source, dedupe_key, lead_id, contractor_id, status) values ('manual','m1',$1,$2,'accepted') returning id`, [lead, c1]))[0].id;
    await db.query(`update ai_call_jobs set status='completed', duration_seconds=90 where id=$1`, [done]);
    await db.query(`update ai_call_jobs set status='completed' where id=$1`, [done]);
    const e = await q(`select type, payload->>'executionStatus' s, contractor_id from workflow_events where idempotency_key like $1`, [`ai_call.%|ai_call:${done}:%`]);
    expect(e).toEqual([{ type: 'ai_call.completed', s: 'completed', contractor_id: c1 }]);
    const nope = (await q<{ id: string }>(`insert into ai_call_jobs(trigger_source, dedupe_key, lead_id, contractor_id, status) values ('manual','m2',$1,$2,'accepted') returning id`, [lead, c1]))[0].id;
    await db.query(`update ai_call_jobs set status='no_answer' where id=$1`, [nope]);
    expect((await q(`select type, payload->>'executionStatus' s from workflow_events where idempotency_key like $1`, [`ai_call.%|ai_call:${nope}:%`]))).toEqual([{ type: 'ai_call.failed', s: 'no_answer' }]);
    // Prospect calls (no lead) announce nothing.
    const p = (await q<{ id: string }>(`insert into ai_call_jobs(trigger_source, dedupe_key, status) values ('manual','m3','accepted') returning id`))[0].id;
    await db.query(`update ai_call_jobs set status='completed' where id=$1`, [p]);
    expect(await q(`select 1 from workflow_events where idempotency_key like $1`, [`%ai_call:${p}:%`])).toHaveLength(0);
  });

  it('event waits: a matching event satisfies and wakes the run; wrong lead, wrong type and earlier events do not', async () => {
    const wf = await createWorkflow(null, admin);
    const lead = await newLead('+15125550119');
    const other = await newLead('+15125550120');
    const run = await runFor(wf, lead, null);
    await db.query(`insert into workflow_waits(run_id, step_key, kind, lead_id, event_types, since, timeout_at) values ($1,'wait_event_1','event',$2,'{appointment.booked}', now() - interval '1 second', now()+interval '1 day')`, [run, lead]);
    const wrongLead = await event('appointment.booked', `w1:${other}`, other, null, {});
    const wrongType = await event('appointment.cancelled', `w2:${lead}`, lead, null, {});
    await q(`select workflow_satisfy_event_waits($1)`, [wrongLead]);
    await q(`select workflow_satisfy_event_waits($1)`, [wrongType]);
    expect((await q(`select status from workflow_waits where run_id=$1`, [run]))[0].status).toBe('open');
    const ok = await event('appointment.booked', `w3:${lead}`, lead, null, {});
    expect((await q(`select workflow_satisfy_event_waits($1) as n`, [ok]))[0].n).toBe(1);
    expect((await q(`select status, satisfied_event_id from workflow_waits where run_id=$1`, [run]))[0]).toEqual({ status: 'satisfied', satisfied_event_id: ok });
    expect(await resumeIn(run)).toBeLessThan(5);
    // Delivering the same event again is harmless.
    expect((await q(`select workflow_satisfy_event_waits($1) as n`, [ok]))[0].n).toBe(0);
  });

  it('an event that happened BEFORE the wait began does not satisfy it (no out-of-order surprises)', async () => {
    const wf = await createWorkflow(null, admin);
    const lead = await newLead('+15125550121');
    const early = await event('estimate.accepted', `early:${lead}`, lead, null, {});
    const run = await runFor(wf, lead, null);
    await db.query(`insert into workflow_waits(run_id, step_key, kind, lead_id, event_types, since, timeout_at) values ($1,'wait_event_1','event',$2,'{estimate.accepted}', now() + interval '1 minute', now()+interval '1 day')`, [run, lead]);
    await q(`select workflow_satisfy_event_waits($1)`, [early]);
    expect((await q(`select status from workflow_waits where run_id=$1`, [run]))[0].status).toBe('open');
  });

  it('status filters on "lead stage changed" waits are honoured', async () => {
    const wf = await createWorkflow(null, admin);
    const lead = await newLead('+15125550122');
    const run = await runFor(wf, lead, null);
    await db.query(`insert into workflow_waits(run_id, step_key, kind, lead_id, event_types, match, since, timeout_at) values ($1,'wait_event_1','event',$2,'{lead.status_changed}','{"toStatuses":["qualified"]}', now() - interval '1 second', now()+interval '1 day')`, [run, lead]);
    const wrong = await event('lead.status_changed', `s1:${lead}`, lead, null, { toStatus: 'lost' });
    await q(`select workflow_satisfy_event_waits($1)`, [wrong]);
    expect((await q(`select status from workflow_waits where run_id=$1`, [run]))[0].status).toBe('open');
    const right = await event('lead.status_changed', `s2:${lead}`, lead, null, { toStatus: 'qualified' });
    await q(`select workflow_satisfy_event_waits($1)`, [right]);
    expect((await q(`select status from workflow_waits where run_id=$1`, [run]))[0].status).toBe('satisfied');
  });
});

describe('enrollment guards (database)', () => {
  it('a manual-enrollment event may only start the workflow it names, and a contractor workflow only for its own assigned leads', async () => {
    const wf = await createWorkflow(c1, owner1);
    const lead = await newLead('+15125550130');
    const evOther = await event('workflow.manual_enrollment', `m:${lead}:a`, lead, c1, { leadId: lead, workflowId: '00000000-0000-0000-0000-000000000000', requestId: '00000000-0000-0000-0000-000000000001', enrolledBy: admin });
    const insert = (ev: string) => fails(`insert into workflow_runs(workflow_id, workflow_version, definition_snapshot, trigger_event_id, lead_id, entity_type, entity_id, status, resume_at) values ($1,1,'{"kind":"graph"}'::jsonb,$2,$3,'lead',$3,'pending',now())`, [wf, ev, lead]);
    expect((await insert(evOther))?.message).toMatch(/names a different workflow/);
    const evMine = await event('workflow.manual_enrollment', `m:${lead}:b`, lead, c1, { leadId: lead, workflowId: wf, requestId: '00000000-0000-0000-0000-000000000002', enrolledBy: admin });
    expect((await insert(evMine))?.message).toMatch(/not assigned to the workflow/); // not assigned to c1 yet
    await newAssignment(lead, c1);
    expect(await insert(evMine)).toBeNull();
    const evOtherTenant = await event('workflow.manual_enrollment', `m:${lead}:c`, lead, c2, { leadId: lead, workflowId: wf, requestId: '00000000-0000-0000-0000-000000000003', enrolledBy: admin });
    expect((await insert(evOtherTenant))?.message).toMatch(/different tenant/);
  });

  it('duplicate events and re-entry are stopped by unique keys', async () => {
    const wf = await createWorkflow(null, admin);
    const lead = await newLead('+15125550131');
    const ev = await event('lead.assigned', `dup:${lead}`, lead, null, { leadId: lead });
    const again = await event('lead.assigned', `dup:${lead}`, lead, null, { leadId: lead });
    expect(again).toBe(ev);
    const ins = (e: string, dedupe: string | null) => fails(`insert into workflow_runs(workflow_id, workflow_version, definition_snapshot, trigger_event_id, lead_id, entity_type, entity_id, status, resume_at, dedupe_key) values ($1,1,'{"kind":"graph"}'::jsonb,$2,$3,'lead',$3,'pending',now(),$4)`, [wf, e, lead, dedupe]);
    expect(await ins(ev, `lead:${lead}`)).toBeNull();
    expect((await ins(ev, null))?.code).toBe('23505'); // same event twice
    const ev2 = await event('lead.assigned', `dup2:${lead}`, lead, null, { leadId: lead });
    expect((await ins(ev2, `lead:${lead}`))?.code).toBe('23505'); // once per lead, ever
  });
});

describe('workflow calls in the AI queue', () => {
  it('one job per workflow step, and the contractor may be in workflow-only mode', async () => {
    const wf = await createWorkflow(null, admin);
    const lead = await newLead('+15125550140');
    const run = await runFor(wf, lead, null);
    const ins = () => fails(`insert into ai_call_jobs(trigger_source, dedupe_key, workflow_run_id, workflow_step_key, lead_id, contractor_id) values ('workflow',$1,$2,'ai_call_1',$3,$4)`, [`wf:${Math.random()}`, run, lead, c1]);
    expect(await ins()).toBeNull();
    expect((await ins())?.code).toBe('23505'); // a second job for the same step is impossible
    await db.query(`insert into ai_calling_contractor_settings(contractor_id, mode, agent_id, phone_number_id) values ($1,'workflow_only','a','p')`, [c1]);
    expect((await fails(`update ai_calling_contractor_settings set mode='sometimes' where contractor_id=$1`, [c1]))?.message).toMatch(/violates check constraint/);
  });

  it('the automatic form-to-call trigger ignores workflow-only contractors (production behaviour unchanged)', async () => {
    const lead = await newLead('+15125550141');
    await db.query(`delete from ai_call_jobs`);
    await newAssignment(lead, c1); // c1 is workflow_only
    expect((await q(`select count(*)::int n from ai_call_jobs where lead_id=$1`, [lead]))[0].n).toBe(0);
    await db.query(`update ai_calling_contractor_settings set mode='automatic' where contractor_id=$1`, [c1]);
    const lead2 = await newLead('+15125550142');
    await newAssignment(lead2, c1);
    expect((await q(`select trigger_source from ai_call_jobs where lead_id=$1`, [lead2]))).toEqual([{ trigger_source: 'auto_form' }]);
  });
});

describe('additive event emitters', () => {
  it('appointment.rescheduled fires when the time moves, not on other edits; existing events are unchanged', async () => {
    const lead = await newLead('+15125550150');
    const a = await newAssignment(lead, c2);
    const appt = (await q<{ id: string }>(`insert into appointments(assignment_id, scheduled_at) values ($1, now() + interval '2 days') returning id`, [a]))[0].id;
    expect((await q(`select count(*)::int n from workflow_events where type='appointment.booked' and entity_id=$1`, [appt]))[0].n).toBe(1);
    await db.query(`update appointments set location='Elsewhere' where id=$1`, [appt]);
    await db.query(`update appointments set scheduled_at = now() + interval '3 days' where id=$1`, [appt]);
    await db.query(`update appointments set status='cancelled' where id=$1`, [appt]);
    const types = (await q<{ type: string }>(`select type from workflow_events where entity_id=$1 order by recorded_at, type`, [appt])).map((r) => r.type).sort();
    expect(types).toEqual(['appointment.booked', 'appointment.cancelled', 'appointment.rescheduled']);
    const moved = (await q(`select payload from workflow_events where type='appointment.rescheduled' and entity_id=$1`, [appt]))[0].payload;
    expect(moved.previousScheduledAt).toBeTruthy();
    expect(moved.scheduledAt).toBeTruthy();
  });

  it('estimate.sent is unchanged and estimate.accepted is new', async () => {
    const lead = await newLead('+15125550151');
    const a = await newAssignment(lead, c2);
    const est = (await q<{ id: string }>(`insert into estimates(assignment_id, amount, status) values ($1, 100, 'pending') returning id`, [a]))[0].id;
    await db.query(`update estimates set status='sent' where id=$1`, [est]);
    await db.query(`update estimates set status='accepted' where id=$1`, [est]);
    await db.query(`update estimates set status='accepted' where id=$1`, [est]);
    const rows = await q(`select type, idempotency_key from workflow_events where entity_id=$1 order by type`, [est]);
    expect(rows).toEqual([
      { type: 'estimate.accepted', idempotency_key: `estimate.accepted|estimate:${est}:accepted` },
      { type: 'estimate.sent', idempotency_key: `estimate.sent|estimate:${est}:sent` },
    ]);
  });

  it('task.completed fires once when a workflow task is marked done by someone in the right tenant', async () => {
    const lead = await newLead('+15125550152');
    const t = (await q<{ id: string }>(`insert into workflow_tasks(contractor_id, lead_id, title) values ($1,$2,'Call them') returning id`, [c1, lead]))[0].id;
    await as(owner2);
    expect((await fails(`select wfg_complete_task($1)`, [t]))?.message).toMatch(/not allowed/);
    await as(staff1);
    await q(`select wfg_complete_task($1)`, [t]);
    await q(`select wfg_complete_task($1)`, [t]);
    expect((await q(`select count(*)::int n from workflow_events where type='task.completed' and entity_id=$1`, [t]))[0].n).toBe(1);
  });

  it('a workflow note is written at most once per step run', async () => {
    const lead = await newLead('+15125550153');
    const note = () => fails(`insert into lead_activities(lead_id, type, body, metadata) values ($1,'note','hi','{"source":"workflow","step_run_id":"sr-1"}')`, [lead]);
    expect(await note()).toBeNull();
    expect((await note())?.code).toBe('23505');
  });
});
