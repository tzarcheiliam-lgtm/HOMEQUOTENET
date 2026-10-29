/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

const h = vi.hoisted(() => ({ client: null as any }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
const push = vi.hoisted(() => ({ calls: [] as any[], adminId: '' }));
vi.mock('@/lib/notifications/service', () => ({ sendPushNotification: async (i: any) => { push.calls.push(i); return {}; } }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: () => undefined, enqueueNotificationEvent: async () => true }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth', () => ({ requireRole: async () => ({ id: push.adminId, role: 'admin', full_name: 'Liam', email: 'admin@hq.test' }) }));

const { POST, GET } = await import('@/app/api/mcp/route');
const { newMcpKey } = await import('@/lib/mcp/keys');
const { hashToken } = await import('@/lib/signing/tokens');

let db: PGlite;
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const admin = randomUUID(); const setter = randomUUID();
push.adminId = admin;
const keys: Record<string, string> = {};
let leadId = '';

async function makeKey(label: string, scopes: string[], owner = admin, revoked = false) {
  const k = newMcpKey();
  await q(`insert into public.mcp_api_keys(name,key_hash,key_prefix,scopes,created_by,revoked_at) values ($1,$2,$3,$4,$5,$6)`, [label, k.hash, k.prefix, scopes, owner, revoked ? new Date().toISOString() : null]);
  keys[label] = k.key;
}
const rpc = (body: unknown, key?: string) => POST(new NextRequest('https://homequotenet.com/api/mcp', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body),
}));
const call = async (key: string, name: string, args: Record<string, unknown> = {}) => {
  const res = await (await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, key)).json();
  if (res.error) return { error: res.error };
  const textOut = res.result.content[0].text as string;
  let data: any = textOut; try { data = JSON.parse(textOut); } catch { /* plain text */ }
  return { isError: !!res.result.isError, data, text: textOut };
};

beforeAll(async () => {
  db = await fullSchema({ supabaseGrants: true });
  h.client = fakeSupabase(db);
  for (const [uid, role] of [[admin, 'admin'], [setter, 'setter']] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${role}@hq.test`]);
    await q(`update public.profiles set role=$2, is_active=true, account_status='active' where id=$1`, [uid, role]);
  }
  leadId = randomUUID();
  await q(`insert into public.leads(id,first_name,last_name,phone,email,city,state,status,source) values ($1,'Ada','Lee','(818) 555-0501','ada@example.com','Encino','CA','new','website')`, [leadId]);
  await makeKey('reader', ['read']);
  await makeKey('writer', ['read', 'write']);
  await makeKey('texter', ['read', 'text']);
  await makeKey('revoked', ['read', 'write', 'text'], admin, true);
  await makeKey('setter', ['read'], setter);
  await makeKey('assigner', ['read', 'assign']);
}, 180_000);
afterAll(async () => { await db?.close(); });

describe('HomeQuote MCP: keys', () => {
  it('rejects no key, a malformed key, a revoked key and a key whose owner is not an admin', async () => {
    expect((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).status).toBe(401);
    expect((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'hq_nope')).status).toBe(401);
    expect((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, keys.revoked)).status).toBe(401);
    expect((await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, keys.setter)).status).toBe(401);
    expect(GET().status).toBe(405);
  });
  it('stores only the hash of a key', async () => {
    const rows = await q(`select key_hash from public.mcp_api_keys where name='reader'`);
    expect(rows[0].key_hash).toBe(hashToken(keys.reader));
    expect(JSON.stringify(await q(`select * from public.mcp_api_keys`))).not.toContain(keys.reader);
  });
});

describe('HomeQuote MCP: tools follow the key permissions', () => {
  it('a read key only sees read tools; a write or text key sees theirs too', async () => {
    const names = async (k: string) => (await (await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, k)).json()).result.tools.map((t: any) => t.name);
    const read = await names(keys.reader);
    expect(read).toContain('search_leads'); expect(read).not.toContain('add_lead_note'); expect(read).not.toContain('send_text');
    expect(await names(keys.writer)).toEqual(expect.arrayContaining(['add_lead_note', 'update_lead_status', 'create_workflow_draft', 'update_workflow_draft']));
    expect(read).toContain('get_workflow'); expect(read).not.toContain('update_workflow_draft');
    expect(await names(keys.texter)).toContain('send_text');
    expect(await names(keys.texter)).not.toContain('add_lead_note');
    const init = await (await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }, keys.reader)).json();
    expect(init.result.serverInfo.name).toBe('homequote');
  });
  it('a read key cannot call a write tool, even by name', async () => {
    const r = await call(keys.reader, 'add_lead_note', { lead_id: leadId, note: 'x' });
    expect(r.error?.message).toMatch(/Unknown tool/);
    expect(await q(`select 1 from public.lead_activities where lead_id=$1 and type='note'`, [leadId])).toHaveLength(0);
  });
});

describe('HomeQuote MCP: reading', () => {
  it('search_leads and get_lead return the lead with a link', async () => {
    const found = await call(keys.reader, 'search_leads', { query: 'Ada' });
    expect(found.data[0]).toMatchObject({ id: leadId, name: 'Ada Lee', status: 'new', source: 'website' });
    expect(found.data[0].link).toContain(`/app/leads/${leadId}`);
    const lead = await call(keys.reader, 'get_lead', { lead_id: leadId });
    expect(lead.data).toMatchObject({ id: leadId, name: 'Ada Lee', contact: { city: 'Encino' }, texting: null });
    expect((await call(keys.reader, 'get_lead', { lead_id: 'not-an-id' })).isError).toBe(true);
  });
  it('business_summary counts new leads by source', async () => {
    const s = await call(keys.reader, 'business_summary', { days: 7 });
    expect(s.data.newLeads).toBeGreaterThanOrEqual(1);
    expect(s.data.bySource.website).toBeGreaterThanOrEqual(1);
  });
  it('the building guide comes from the real workflow catalogue', async () => {
    const g = await call(keys.reader, 'workflow_building_guide');
    expect(g.text).toContain('send_sms'); expect(g.text).toContain('create_workflow_draft');
    expect(g.text).toContain('get_workflow'); expect(g.text).toContain('update_workflow_draft');
  });
});

describe('HomeQuote MCP: changes', () => {
  it('adds a note and changes the status, both recorded on the lead and in the audit log', async () => {
    expect((await call(keys.writer, 'add_lead_note', { lead_id: leadId, note: 'Prefers evenings' })).data).toMatchObject({ saved: true });
    expect((await call(keys.writer, 'update_lead_status', { lead_id: leadId, status: 'contact_attempted' })).data).toMatchObject({ changed: true, from: 'new', to: 'contact_attempted' });
    expect((await call(keys.writer, 'update_lead_status', { lead_id: leadId, status: 'won_big' })).isError).toBe(true);
    const acts = await q(`select type, body, actor_id from public.lead_activities where lead_id=$1 order by created_at`, [leadId]);
    expect(acts.map((a: any) => a.type)).toEqual(expect.arrayContaining(['note', 'status_change']));
    expect(acts.every((a: any) => a.actor_id === admin)).toBe(true);
    expect((await q(`select status from public.leads where id=$1`, [leadId]))[0].status).toBe('contact_attempted');
    const audit = await q(`select tool, ok from public.mcp_tool_calls order by created_at`);
    expect(audit.map((a: any) => `${a.tool}:${a.ok}`)).toEqual(expect.arrayContaining(['add_lead_note:true', 'update_lead_status:true', 'update_lead_status:false']));
  });
  it('saves a valid workflow as an unpublished draft, and refuses an invalid one with the exact problems', async () => {
    const wf = { nodes: [
      { id: 'trigger', type: 'trigger', config: { event: 'lead.created', filters: {}, entry: null } },
      { id: 'note', type: 'add_note', config: { body: 'New lead {{lead.first_name}}' } },
      { id: 'done', type: 'end', config: {} },
    ], edges: [{ source: 'trigger', sourceHandle: 'next', target: 'note' }, { source: 'note', sourceHandle: 'next', target: 'done' }] };
    const ok = await call(keys.writer, 'create_workflow_draft', { name: 'Note new leads', workflow: wf });
    expect(ok.isError).toBe(false);
    expect(ok.data).toMatchObject({ saved: true, status: 'draft (not published)' });
    const [row] = await q(`select engine, graph_status, enabled, created_by from public.workflows where id=$1`, [ok.data.workflow_id]);
    expect(row).toEqual({ engine: 'graph', graph_status: 'draft', enabled: false, created_by: admin });
    expect(await q(`select 1 from public.workflow_graph_drafts where workflow_id=$1`, [ok.data.workflow_id])).toHaveLength(1);
    expect(await q(`select 1 from public.workflow_versions where workflow_id=$1`, [ok.data.workflow_id])).toHaveLength(0); // never published
    const bad = await call(keys.writer, 'create_workflow_draft', { name: 'Broken', workflow: { nodes: [{ id: 'trigger', type: 'trigger', config: { event: 'lead.created', filters: {}, entry: null } }], edges: [] } });
    expect(bad.isError).toBe(true); expect(bad.text).toMatch(/Add at least one step/);
  });
});

describe('HomeQuote MCP: editing workflow drafts', () => {
  const trigger = { id: 'trigger', type: 'trigger', config: { event: 'lead.created', filters: {}, entry: null } };
  let wfId = '';
  beforeAll(async () => {
    const made = await call(keys.writer, 'create_workflow_draft', { name: 'Welcome note', workflow: { nodes: [
      trigger, { id: 'note', type: 'add_note', config: { body: 'Hello {{lead.first_name}}' } }, { id: 'done', type: 'end', config: {} },
    ], edges: [{ source: 'trigger', sourceHandle: 'next', target: 'note' }, { source: 'note', sourceHandle: 'next', target: 'done' }] } });
    wfId = made.data.workflow_id;
  });

  it('get_workflow returns the draft in the create_workflow_draft shape, with its revision', async () => {
    const g = await call(keys.reader, 'get_workflow', { workflow_id: wfId });
    expect(g.isError).toBe(false);
    expect(g.data).toMatchObject({ id: wfId, name: 'Welcome note', status: 'draft', for: 'HomeQuote network', contractor_id: null, revision: 1 });
    expect(g.data.workflow.nodes.map((n: any) => n.id).sort()).toEqual(['done', 'note', 'trigger']);
    expect(g.data.workflow.nodes.find((n: any) => n.id === 'note').config.body).toBe('Hello {{lead.first_name}}');
    expect(g.data.workflow.nodes[0]).not.toHaveProperty('position');
    expect(g.data.workflow.edges).toEqual(expect.arrayContaining([{ source: 'trigger', sourceHandle: 'next', target: 'note' }]));
    expect(g.data.workflow.settings).toBeTruthy();
    expect(typeof g.data.explanation).toBe('string'); expect(g.data.link).toContain(`/app/workflows/${wfId}`);
  });

  it('a read-only key cannot call update_workflow_draft', async () => {
    const r = await call(keys.reader, 'update_workflow_draft', { workflow_id: wfId, revision: 1, workflow: { nodes: [], edges: [] } });
    expect(r.error?.message).toMatch(/Unknown tool/);
  });

  it('saves an edit with the right revision (revision+1, hash, attributed to the admin) and never publishes', async () => {
    const g = await call(keys.reader, 'get_workflow', { workflow_id: wfId });
    const wf = g.data.workflow;
    wf.nodes.find((n: any) => n.id === 'note').config.body = 'Welcome aboard {{lead.first_name}}';
    const r = await call(keys.writer, 'update_workflow_draft', { workflow_id: wfId, revision: g.data.revision, workflow: wf, name: 'Welcome note v2', summary: 'Adds a friendlier note.' });
    expect(r.isError).toBe(false);
    expect(r.data).toMatchObject({ saved: true, revision: 2, status: 'draft', next: 'Open the link to review and publish.' });
    const [d] = await q(`select graph, revision, content_hash, updated_by from public.workflow_graph_drafts where workflow_id=$1`, [wfId]);
    expect(d.revision).toBe(2); expect(d.updated_by).toBe(admin);
    expect(d.content_hash).toMatch(/^[0-9a-f]{64}$/);
    const { hashGraph } = await import('@/lib/workflows/graph/hash');
    expect(d.content_hash).toBe(hashGraph(d.graph));
    expect(d.graph.nodes.find((n: any) => n.id === 'note').config.body).toBe('Welcome aboard {{lead.first_name}}');
    expect((await q(`select name, description, updated_by, graph_status from public.workflows where id=$1`, [wfId]))[0]).toEqual({ name: 'Welcome note v2', description: 'Adds a friendlier note.', updated_by: admin, graph_status: 'draft' });
    expect(await q(`select 1 from public.workflow_versions where workflow_id=$1`, [wfId])).toHaveLength(0); // never published
    expect(await q(`select metadata from public.audit_logs where action='workflow.graph.mcp_update'`)).toEqual([{ metadata: expect.objectContaining({ workflow_id: wfId, revision: 2 }) }]);
  });

  it('refuses a stale revision and leaves the draft alone', async () => {
    const g = await call(keys.reader, 'get_workflow', { workflow_id: wfId });
    const r = await call(keys.writer, 'update_workflow_draft', { workflow_id: wfId, revision: 1, workflow: g.data.workflow });
    expect(r.isError).toBe(true);
    expect(r.text).toBe('This workflow was changed since you read it. Call get_workflow again and re-apply your change.');
    expect((await q(`select revision from public.workflow_graph_drafts where workflow_id=$1`, [wfId]))[0].revision).toBe(2);
  });

  it('refuses an invalid workflow with the exact problems', async () => {
    const r = await call(keys.writer, 'update_workflow_draft', { workflow_id: wfId, revision: 2, workflow: { nodes: [trigger], edges: [] } });
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/^The workflow has problems. Fix these and try again:\n- /);
    expect(r.text).toMatch(/Add at least one step after the trigger/);
    expect((await q(`select revision from public.workflow_graph_drafts where workflow_id=$1`, [wfId]))[0].revision).toBe(2);
  });

  it('says a live workflow keeps running until the draft is published', async () => {
    await q(`update public.workflows set graph_status='published' where id=$1`, [wfId]);
    const g = await call(keys.reader, 'get_workflow', { workflow_id: wfId });
    const r = await call(keys.writer, 'update_workflow_draft', { workflow_id: wfId, revision: g.data.revision, workflow: g.data.workflow });
    expect(r.data).toMatchObject({ saved: true, revision: 3, status: 'published', next: 'This changed the draft only. The live version keeps running until you publish the draft in HomeQuote.' });
    await q(`update public.workflows set archived_at=now() where id=$1`, [wfId]);
    const archived = await call(keys.writer, 'update_workflow_draft', { workflow_id: wfId, revision: 3, workflow: g.data.workflow });
    expect(archived.isError).toBe(true); expect(archived.text).toMatch(/archived/);
  });

  it('get_workflow on a classic workflow says only visual workflows can be edited', async () => {
    const [c] = await q(`insert into public.workflows(name,trigger_type) values('Classic one','lead.created') returning id`);
    const r = await call(keys.reader, 'get_workflow', { workflow_id: c.id });
    expect(r.isError).toBe(true); expect(r.text).toMatch(/Only visual workflows can be read and edited here/);
  });
});

describe('HomeQuote MCP: texting', () => {
  it('queues a text through the texting rules, and says why when it cannot', async () => {
    await q(`update public.sms_settings set enabled=false where id`);
    const off = await call(keys.texter, 'send_text', { lead_id: leadId, message: 'Hi Ada, it’s HomeQuote. Still interested in the remodel?' });
    expect(off.isError).toBe(true); expect(off.text).toMatch(/texting is turned off/i);
    await q(`update public.sms_settings set enabled=true, stopped_at=null, window_start_hour=0, window_end_hour=24, daily_cap=500 where id`);
    const sent = await call(keys.texter, 'send_text', { lead_id: leadId, message: 'Hi Ada, it’s HomeQuote. Still interested in the remodel? https://spam.example' });
    expect(sent.data).toMatchObject({ queued: true });
    const msgs = await q(`select body, status from public.sms_messages where lead_id=$1`, [leadId]);
    expect(msgs).toHaveLength(1); expect(msgs[0].body).not.toContain('https://');
    expect(await q(`select 1 from public.lead_activities where lead_id=$1 and body like 'Text from Claude queued%'`, [leadId])).toHaveLength(1);
  });
  it('stops at 30 texts per key per day', async () => {
    const k = (await q(`select id from public.mcp_api_keys where name='texter'`))[0].id;
    for (let i = 0; i < 30; i++) await q(`insert into public.mcp_tool_calls(key_id, tool, ok) values ($1,'send_text',true)`, [k]);
    const r = await call(keys.texter, 'send_text', { lead_id: leadId, message: 'again' });
    expect(r.isError).toBe(true); expect(r.text).toMatch(/30 texts/);
  });
});

describe('HomeQuote MCP: assigning leads needs the admin to approve in HomeQuote', () => {
  const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
  let co1 = ''; let co2 = '';
  beforeAll(async () => {
    co1 = randomUUID(); co2 = randomUUID();
    await q(`insert into public.contractors(id, name) values ($1,'Acme Remodel'),($2,'Best Baths')`, [co1, co2]);
  });

  it('a key without the assign permission cannot even propose', async () => {
    expect((await call(keys.writer, 'propose_lead_assignment', { lead_id: leadId, contractor_ids: [co1] })).error?.message).toMatch(/Unknown tool/);
  });

  it('proposing assigns nothing, notifies the admin, and approving in HomeQuote does the assignment once', async () => {
    const r = await call(keys.assigner, 'propose_lead_assignment', { lead_id: leadId, contractor_ids: [co1, co2], reason: 'They cover Encino' });
    expect(r.data).toMatchObject({ status: 'waiting for your approval' });
    expect(r.data.request).toBe('Assign Ada Lee (Encino) to Acme Remodel, Best Baths');
    expect(await q(`select 1 from public.lead_assignments where lead_id=$1`, [leadId])).toHaveLength(0); // nothing assigned yet
    expect(push.calls.at(-1)).toMatchObject({ userIds: [admin], title: 'Claude needs your OK', url: '/app/claude-connector#approvals' });
    expect((await call(keys.assigner, 'list_pending_approvals')).data[0]).toMatchObject({ status: 'pending' });

    const { decideMcpAction: decide } = await import('@/lib/actions/claude-connector');
    await decide(fd({ id: r.data.request_id, decision: 'approve' }));
    await decide(fd({ id: r.data.request_id, decision: 'approve' })); // a second click does nothing
    const rows = await q(`select contractor_id, assigned_by from public.lead_assignments where lead_id=$1 order by contractor_id`, [leadId]);
    expect(rows).toHaveLength(2); expect(rows.every((x: any) => x.assigned_by === admin)).toBe(true);
    expect((await q(`select status, result from public.mcp_pending_actions where id=$1`, [r.data.request_id]))[0]).toMatchObject({ status: 'approved', result: 'Done: 2 new assignment(s).' });
    expect((await q(`select body from public.lead_activities where lead_id=$1 and type='assignment'`, [leadId]))[0].body).toMatch(/proposed by Claude, approved by Liam. Reason: They cover Encino/);
    expect((await call(keys.assigner, 'propose_lead_assignment', { lead_id: leadId, contractor_ids: [co1] })).text).toMatch(/already assigned/);
  });

  it('declining, or letting it expire, assigns nothing', async () => {
    const other = randomUUID();
    await q(`insert into public.leads(id,first_name,last_name,status,source) values ($1,'Bo','Ray','new','meta')`, [other]);
    const { decideMcpAction: decide } = await import('@/lib/actions/claude-connector');
    const a = await call(keys.assigner, 'propose_lead_assignment', { lead_id: other, contractor_ids: [co1] });
    await decide(fd({ id: a.data.request_id, decision: 'decline' }));
    const b = await call(keys.assigner, 'propose_lead_assignment', { lead_id: other, contractor_ids: [co2] });
    await q(`update public.mcp_pending_actions set expires_at = now() - interval '1 minute' where id=$1`, [b.data.request_id]);
    await decide(fd({ id: b.data.request_id, decision: 'approve' }));
    expect(await q(`select 1 from public.lead_assignments where lead_id=$1`, [other])).toHaveLength(0);
    expect((await q(`select status from public.mcp_pending_actions where id=$1`, [a.data.request_id]))[0].status).toBe('declined');
    expect((await q(`select status from public.mcp_pending_actions where id=$1`, [b.data.request_id]))[0].status).toBe('pending'); // expired: never acted on
  });
});
