/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addNodeAfter, emptyGraph } from '@/lib/workflows/graph';
import { BASE_DDL, MIGRATIONS_BEFORE_0041 } from './helpers/workflow-base-schema';
// @ts-expect-error plain ESM scripts shared with the staging CLI
import { assertStagingSafe, CONFIRM_TEXT } from '../scripts/staging/guard.mjs';
// @ts-expect-error plain ESM scripts shared with the staging CLI
import { runChecks } from '../scripts/staging/checks.mjs';

/**
 * RELEASE READINESS - LOCAL DATABASE TESTS (in-process Postgres, real migration files).
 * These are NOT staging checks and NOT provider tests: nothing here talks to Supabase, Fish or a phone.
 *   - migration 0041 applies on top of a database that already has classic workflow data, twice, safely
 *   - the same read-only checks that run on staging (scripts/staging/checks.mjs) pass here
 *   - the staging guard refuses production-looking or call-enabled environments
 *   - the documented soft rollback script does exactly what the docs say, and deletes nothing
 */
const read = (f: string) => readFileSync(new URL(`../supabase/${f}`, import.meta.url), 'utf8');
let db: PGlite;
const q = async <T = any>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
const as = async (uid: string) => { await db.exec(`select set_config('test.uid', '${uid}', false)`); };
let c1: string, admin: string, lead: string, classicId: string;
const counts = async () => (await q<any>(`select (select count(*)::int from workflows) w, (select count(*)::int from workflow_steps) s, (select count(*)::int from workflow_events) e, (select count(*)::int from workflow_runs) r`))[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BASE_DDL);
  await db.exec(`alter table public.lead_email_deliveries add constraint lead_email_deliveries_kind_check check (kind in ('new_lead_alert','qualified_lead'))`);
  for (const f of MIGRATIONS_BEFORE_0041) await db.exec(read(`migrations/${f}`));
  c1 = (await q<{ id: string }>(`insert into contractors(name) values ('Pool Masters LA') returning id`))[0].id;
  admin = (await q<{ id: string }>(`insert into profiles(role) values ('admin') returning id`))[0].id;
  // Pre-existing CLASSIC data, created before 0041 exists.
  classicId = (await q<{ id: string }>(`insert into workflows(contractor_id, name, trigger_type, enabled, version) values ($1,'Classic follow-up','lead.assigned', true, 1) returning id`, [c1]))[0].id;
  await db.query(`insert into workflow_steps(workflow_id, key, position, step_type, action_type, config) values ($1,'wait_one',0,'action','wait','{"mode":"duration","amount":1,"unit":"hours"}'::jsonb), ($1,'stop_now',1,'action','stop_workflow','{}'::jsonb)`, [classicId]);
  lead = (await q<{ id: string }>(`insert into leads(first_name, phone_e164, state, zip, consent_granted, consent_at, consent_source, consent_disclosure) values ('Ada','+15125550001','TX','78701',true,now(),'funnel:x','You may call or email me') returning id`))[0].id;
  await db.query(`insert into lead_assignments(lead_id, contractor_id) values ($1,$2)`, [lead, c1]);
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('migration 0041 on a database that already has classic workflows (LOCAL DB test)', () => {
  let before: any;
  it('applies without touching classic data, and classic workflows stay engine=linear and enabled', async () => {
    before = await counts();
    expect(before.w).toBe(1);
    expect(before.e).toBeGreaterThan(0);
    await db.exec(read('migrations/0041_visual_workflow_builder.sql'));
    const after = await counts();
    expect(after).toEqual(before);
    const wf = (await q<any>(`select engine, graph_status, enabled, name, version from workflows where id=$1`, [classicId]))[0];
    expect(wf).toEqual({ engine: 'linear', graph_status: null, enabled: true, name: 'Classic follow-up', version: 1 });
  });

  it('is safe to apply twice (idempotent)', async () => {
    await db.exec(read('migrations/0041_visual_workflow_builder.sql'));
    expect(await counts()).toEqual(before);
  });

  it('the staging read-only checks pass on the migrated schema', async () => {
    const results = await runChecks(async (sql: string) => q(sql));
    expect(results.filter((r: any) => r.status !== 'pass')).toEqual([]);
    expect(results.map((r: any) => r.id)).toEqual(expect.arrayContaining(['security.rls', 'security.service_only', 'safety.global_calling_off']));
  });

  it('the safety checks DO fail when calling is switched on or a contractor could be called', async () => {
    await db.exec(`update ai_calling_settings set enabled = true`);
    await db.query(`insert into ai_calling_contractor_settings(contractor_id, mode, agent_id) values ($1,'workflow_only','agent-x')`, [c1]);
    const failed = (await runChecks(async (sql: string) => q(sql))).filter((r: any) => r.status === 'FAIL').map((r: any) => r.id);
    expect(failed).toEqual(expect.arrayContaining(['safety.global_calling_off', 'safety.no_contractor_can_dial']));
    await db.exec(`update ai_calling_settings set enabled = false; delete from ai_calling_contractor_settings`);
  });
});

describe('staging guard (pure)', () => {
  const ok = { SUPABASE_DB_URL: 'postgresql://postgres:x@db.stagingref123.supabase.co:5432/postgres', STAGING_PROJECT_REF: 'stagingref123', STAGING_CONFIRM: CONFIRM_TEXT };
  it('accepts a clearly-staging environment', () => expect(assertStagingSafe(ok)).toEqual({ ok: true, problems: [] }));
  it.each([
    ['the production project', { ...ok, SUPABASE_DB_URL: 'postgresql://postgres:x@db.fzglejpmxriohuyalcjt.supabase.co:5432/postgres', STAGING_PROJECT_REF: 'fzglejpmxriohuyalcjt' }],
    ['the production site URL', { ...ok, NEXT_PUBLIC_SITE_URL: 'https://homequotenet.com' }],
    ['a DB url that is not the staging ref', { ...ok, STAGING_PROJECT_REF: 'someotherref' }],
    ['a missing confirmation', { ...ok, STAGING_CONFIRM: undefined }],
    ['global calling enabled', { ...ok, AI_CALLING_GLOBAL_ENABLED: 'true' }],
    ['provider credentials present', { ...ok, FISH_API_KEY: 'x' }],
    ['no database url', { ...ok, SUPABASE_DB_URL: undefined }],
  ])('refuses %s', (_name, env) => expect(assertStagingSafe(env as any).ok).toBe(false));
});

describe('soft rollback script (LOCAL DB test of the documented rollback)', () => {
  it('stops graph workflows, cancels in-flight work, ignores new events, deletes nothing, and leaves classic workflows alone', async () => {
    await as(admin);
    const graph = addNodeAfter(emptyGraph('lead.assigned'), 'trigger', 'next', 'add_note').graph;
    const trig = { event: 'lead.assigned', filters: {} };
    const wf = (await q<{ id: string }>(`select wfg_create('Visual','d',$1,$2::jsonb,$3,$4::jsonb) as id`, [c1, JSON.stringify(graph), trig.event, JSON.stringify(trig.filters)]))[0].id;
    await q(`select wfg_publish_internal($1,1,null,'v1',$2,$3::jsonb,$4,$5)`, [wf, trig.event, JSON.stringify(trig.filters), '{}', 'once_per_entity']);
    const versions = (await q<any>(`select id from workflow_versions where workflow_id=$1`, [wf]))[0].id;
    // In-flight state a rollback has to deal with.
    const trigEvent = (await q<{ id: string }>(`select id from workflow_events where type='lead.assigned' and lead_id=$1 limit 1`, [lead]))[0].id;
    const ev = (await q<{ id: string }>(`select emit_workflow_event('ai_call.completed','ai_call.completed|rb:1','lead',$1,'db:test',now(),$2,$1,'system',null,'{}'::jsonb,'{}'::jsonb) as id`, [lead, c1]))[0].id;
    const run = (await q<{ id: string }>(`insert into workflow_runs(workflow_id, workflow_version, workflow_version_id, definition_snapshot, trigger_event_id, lead_id, entity_type, entity_id, status, resume_at)
      values ($1,1,$2,$3::jsonb,$4,$5,'lead',$5,'waiting', now() + interval '1 day') returning id`, [wf, versions, JSON.stringify({ kind: 'graph', version: 1, versionId: versions, graph }), trigEvent, lead]))[0].id;
    await q(`insert into workflow_waits(run_id, step_key, kind, status, contractor_id, lead_id, timeout_at, since) values ($1,'wait_event_1','event','open',$2,$3, now() + interval '1 day', now())`, [run, c1, lead]);
    await q(`insert into ai_call_jobs(trigger_source, dedupe_key, contractor_id, lead_id, contact_phone, status, workflow_run_id, workflow_step_key) values ('workflow','wf:rb1',$1,$2,'+15125550001','queued',$3,'ai_call_1')`, [c1, lead, run]);
    await q(`insert into ai_calling_contractor_settings(contractor_id, mode) values ($1,'workflow_only')`, [c1]);
    const beforeRows = await q<any>(`select (select count(*)::int from workflow_graph_drafts) d, (select count(*)::int from workflow_versions) v, (select count(*)::int from workflow_runs) r, (select count(*)::int from ai_call_jobs) j`);

    const script = read('rollback/0041_visual_workflow_builder_soft_rollback.sql');
    await db.exec(script);

    expect((await q<any>(`select enabled, graph_status from workflows where id=$1`, [wf]))[0]).toEqual({ enabled: false, graph_status: 'paused' });
    expect((await q<any>(`select status, cancel_reason from workflow_runs where id=$1`, [run]))[0]).toEqual({ status: 'cancelled', cancel_reason: 'rollback' });
    expect((await q<any>(`select status from workflow_waits where run_id=$1`, [run]))[0].status).toBe('cancelled');
    expect((await q<any>(`select status, block_reason from ai_call_jobs where workflow_run_id=$1`, [run]))[0]).toEqual({ status: 'cancelled', block_reason: 'workflow_rollback' });
    expect((await q<any>(`select dispatch_status from workflow_events where id=$1`, [ev]))[0].dispatch_status).toBe('ignored');
    expect((await q<any>(`select mode from ai_calling_contractor_settings where contractor_id=$1`, [c1]))[0].mode).toBe('manual_only');
    // Classic workflow untouched; nothing deleted.
    expect((await q<any>(`select enabled, engine from workflows where id=$1`, [classicId]))[0]).toEqual({ enabled: true, engine: 'linear' });
    expect((await q<any>(`select (select count(*)::int from workflow_graph_drafts) d, (select count(*)::int from workflow_versions) v, (select count(*)::int from workflow_runs) r, (select count(*)::int from ai_call_jobs) j`))[0]).toEqual(beforeRows[0]);
    // Running it again changes nothing and does not fail.
    await db.exec(script);
    expect((await q<any>(`select status from workflow_runs where id=$1`, [run]))[0].status).toBe('cancelled');
  });
});
