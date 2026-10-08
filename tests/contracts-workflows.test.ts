/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './helpers/pglite-supabase';
import { BASE_DDL } from './helpers/workflow-base-schema';

/**
 * Contract events drive the EXISTING visual workflow engine: a published workflow that starts from a contract event
 * runs, notifies admins, and (by design) cannot touch billing. Real migrations + real runtime; only outside world faked.
 */
const h = vi.hoisted(() => ({ client: null as any, pushes: [] as any[] }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn(); }, NextRequest: Request, NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }));
vi.mock('@/lib/ai-calling/run.server', () => ({ runAiCallQueue: async () => ({ claimed: 0, outcomes: [] }), dispatchJobNow: async () => ({ claimed: 0, outcomes: [] }) }));
vi.mock('@/lib/notifications/outbox', () => ({ enqueueNotificationEvent: async (_db: unknown, e: any) => { h.pushes.push(e); return true; }, flushNotificationsSoon: () => undefined }));
vi.mock('@/lib/leads/notify', () => ({ leadAlertRecipients: () => [], processLeadEmails: async () => undefined }));

import { processWorkflowEvent } from '@/lib/workflows/runtime.server';
import { addNodeAfter, emptyGraph, updateNode, type GraphNodeType, type WorkflowGraph } from '@/lib/workflows/graph';

const read = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
let db: PGlite;
const q = async <T = any>(sql: string, p?: unknown[]) => (await db.query<T>(sql, p)).rows;
let admin: string, client: string;

function chain(event: string, steps: [GraphNodeType, Record<string, unknown>?][]): WorkflowGraph {
  let g = emptyGraph(event as never, {} as never);
  let prev = 'trigger';
  for (const [type, config] of steps) {
    const r = addNodeAfter(g, prev, 'next', type);
    g = config ? updateNode(r.graph, r.nodeId, { config: { ...r.graph.nodes.find((n) => n.id === r.nodeId)!.config, ...config } }) : r.graph;
    prev = r.nodeId;
  }
  return g;
}
async function publish(graph: WorkflowGraph) {
  await db.exec(`select set_config('test.uid', '${admin}', false)`);
  const trig = graph.nodes.find((n) => n.type === 'trigger')!.config as { event: string; filters: object };
  const id = (await q(`select wfg_create($1,'d',null,$2::jsonb,$3,$4::jsonb) as id`, ['Contract flow', JSON.stringify(graph), trig.event, JSON.stringify(trig.filters)]))[0].id;
  await q(`select wfg_publish_internal($1,1,null,'v1',$2,$3::jsonb,$4,$5) as r`, [id, trig.event, JSON.stringify(trig.filters), `{${graph.settings.exitEvents.join(',')}}`, graph.settings.reentry]);
  return id as string;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BASE_DDL);
  await db.exec(`alter table public.lead_email_deliveries add constraint lead_email_deliveries_kind_check check (kind in ('new_lead_alert','qualified_lead'))`);
  for (const f of ['0020_workflow_automation_foundation.sql', '0024_workflow_runtime.sql', '0037_ai_call_events.sql', '0038_ai_calling_queue.sql', '0041_visual_workflow_builder.sql']) await db.exec(read(f));
  await db.exec(`alter table public.contractors add column contact_name text, add column email text, add column phone text`);
  for (const f of ['0039_document_signing.sql', '0040_signing_templates_reminders_codes.sql', '0042_contracts_templates.sql']) await db.exec(read(f));
  h.client = fakeSupabase(db);
  admin = (await q(`insert into profiles(role, full_name, email) values ('admin','Liam','liam@hq.test') returning id`))[0].id;
  client = (await q(`insert into contractors(name) values ('Acme') returning id`))[0].id;
}, 120_000);
afterAll(async () => { await db?.close(); });

describe('contract events trigger existing workflows', () => {
  it('a workflow started by "Contract fully signed" notifies admins, once, and cannot be enrolled twice', async () => {
    const wf = await publish(chain('contract.fully_signed', [['send_notification', { audience: 'admins', title: 'Contract signed', body: 'An agreement was fully signed.' }], ['end']]));
    await new Promise((r) => setTimeout(r, 30));
    const cid = (await q(`insert into contracts(title, contractor_id, created_by) values ('Test', $1, $2) returning id`, [client, admin]))[0].id;
    const doc = (await q(`insert into signing_documents(title) values ('Test') returning id`))[0].id;
    const ver = (await q(`insert into signing_versions(document_id, version_no, original_path, original_sha256, original_size, page_count, pages) values ($1,1,'p',$2,10,1,'[{"w":612,"h":792,"rotation":0}]') returning id`, [doc, 'a'.repeat(64)]))[0].id;
    await db.query(`update contracts set signing_document_id=$1, signing_version_id=$2 where id=$3`, [doc, ver, cid]);
    await db.query(`select signing_log_event($1, null, 'completed', null, null, null, '{}'::jsonb)`, [ver]);
    await db.query(`select signing_log_event($1, null, 'completed', null, null, null, '{}'::jsonb)`, [ver]); // replayed event: same fact
    const events = await q(`select id, type from workflow_events where entity_id=$1 and type='contract.fully_signed'`, [cid]);
    expect(events).toHaveLength(1);
    const res = await processWorkflowEvent(events[0].id, { db: h.client });
    expect(res.createdRunIds).toHaveLength(1);
    const run = (await q(`select status from workflow_runs where workflow_id=$1`, [wf]))[0];
    expect(run.status).toBe('completed');
    expect(h.pushes.length).toBeGreaterThan(0);
    const again = await processWorkflowEvent(events[0].id, { db: h.client });
    expect(again.createdRunIds).toEqual([]);
  });

  it('contract events never belong to a contractor-owned workflow', async () => {
    const ev = await q(`select contractor_id, entity_type from workflow_events where type like 'contract.%'`);
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.every((e: any) => e.contractor_id === null && e.entity_type === 'contract')).toBe(true);
  });
});
