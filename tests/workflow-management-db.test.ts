import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows;
const admin = randomUUID();
let connected = false;

const definition = (name: string) => ({
  name, description: 'Management test', trigger: { type: 'lead.created', config: {} }, conditions: null,
  exitEvents: [], reentryPolicy: 'once_per_event',
  steps: [{ key: 'stop', position: 0, parentKey: null, branch: null, stepType: 'action', conditions: null, action: { type: 'stop_workflow', config: { reason: 'done' } } }],
});

beforeAll(async () => {
  if (!url) return;
  await db.connect(); connected = true; await q('begin');
  const [foundation] = await q("select to_regclass('public.workflow_runs') as t");
  if (!foundation.t) await q(readFileSync('supabase/migrations/0020_workflow_automation_foundation.sql', 'utf8'));
  await q(readFileSync('supabase/migrations/0025_workflow_management.sql', 'utf8'));
  await q(`insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_user_meta_data,created_at,updated_at)
    values($1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',$2,'x',now(),'{}',now(),now())`, [admin, `${admin}@workflow-ui.test`]);
  await q("update public.profiles set role='admin',account_status='active' where id=$1", [admin]);
  await q('set local role authenticated');
  await q("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: admin, role: 'authenticated' })]);
}, 60_000);
afterAll(async () => { if (connected) { await q('reset role'); await q('rollback'); await db.end(); } });

const suite = url ? describe : describe.skip;
suite('workflow management RPCs (rolled back)', { timeout: 60_000 }, () => {
  it('creates, edits with optimistic versioning, disables, and archives atomically', async () => {
    const [created] = await q('select public.create_workflow_definition($1,null,null,null,$2) as id', [definition('Created in UI'), admin]);
    const id = created.id as string;
    expect(await q('select name,enabled,version from public.workflows where id=$1', [id])).toEqual([{ name: 'Created in UI', enabled: false, version: 1 }]);
    expect((await q('select key,action_type from public.workflow_steps where workflow_id=$1', [id]))[0]).toEqual({ key: 'stop', action_type: 'stop_workflow' });
    expect((await q('select public.save_workflow_definition($1,1,$2,$3) as version', [id, definition('Edited in UI'), admin]))[0].version).toBe(2);
    expect((await q('select public.set_workflow_enabled($1,true,2) as version', [id]))[0].version).toBe(3);
    await q('select public.archive_workflow($1)', [id]);
    expect((await q('select enabled,archived_at is not null as archived from public.workflows where id=$1', [id]))[0]).toEqual({ enabled: false, archived: true });
  });
});
