import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicSiteUrl } from '@/lib/auth/site-url';
import { LEAD_STATUSES } from '@/lib/leads/constants';
import { queueWorkflowText, WORKFLOW_TEXT_SKIP_REASONS } from '@/lib/sms/service';
import { buildCatalogue } from '@/lib/workflows/ai-builder/catalogue';
import { assembleGraph, checkGraph } from '@/lib/workflows/ai-builder/check';
import { explainGraphText } from '@/lib/workflows/ai-builder/explain';
import { parseWorkflowGraph, triggerOf } from '@/lib/workflows/graph';
import { hashGraph } from '@/lib/workflows/graph/hash';
import { sendPushNotification } from '@/lib/notifications/service';
import { AREA_LABELS, AUTOMATIONS } from '@/lib/automations/registry';
import { automationStatuses } from '@/lib/automations/status.server';
import type { McpKey, McpScope } from './keys';

/**
 * The HomeQuote tools Claude gets over MCP. Every tool runs on the server with the service role, acting for the admin
 * who created the key, and only does what its scope allows:
 *   read  - look up leads, appointments, texting, workflows and the business summary
 *   write - add a lead note, change a lead's pipeline status, save a new workflow or change an existing one as an UNPUBLISHED draft
 *   text  - text a homeowner through the Mac bridge (every texting rule still applies)
 *   assign - PROPOSE assigning a lead to contractors; it only happens when the admin taps Approve in HomeQuote
 * Nothing here publishes a workflow, deletes anything, assigns a lead without the admin's approval, places calls or touches billing.
 */
export type Db = SupabaseClient;
type Json = Record<string, unknown>;

export class ToolError extends Error {}
const fail = (message: string): never => { throw new ToolError(message); };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max = 500) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const uuid = (v: unknown, what: string) => (typeof v === 'string' && UUID.test(v) ? v : fail(`${what} must be an id (uuid) from another tool's results.`));
const int = (v: unknown, lo: number, hi: number, dflt: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), lo), hi) : dflt);
const clip = (v: unknown, max: number) => (typeof v === 'string' ? (v.length > max ? `${v.slice(0, max)}…` : v) : v ?? null);
const name = (r: { first_name?: string | null; last_name?: string | null } | null | undefined) => [r?.first_name, r?.last_name].filter(Boolean).join(' ') || 'Unnamed lead';
const link = (path: string) => `${publicSiteUrl()}${path}`;
const STATUS_VALUES = LEAD_STATUSES.map((s) => s.value as string);
const TEXTS_PER_KEY_PER_DAY = 30;

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  scope: McpScope;
  inputSchema: Json;
  annotations?: Json;
  run: (db: Db, args: Json, key: McpKey) => Promise<unknown>;
  /** A short line for the audit log (no message bodies). */
  summarize?: (args: Json) => string;
}

const readOnly = { readOnlyHint: true };

/** The { nodes, edges, settings? } shape Claude sends (positions are laid out on the server). */
const WORKFLOW_INPUT: Json = {
  type: 'object', required: ['nodes', 'edges'],
  properties: {
    nodes: { type: 'array', items: { type: 'object', required: ['id', 'type'], properties: { id: { type: 'string' }, type: { type: 'string' }, name: { type: 'string' }, config: { type: 'object' } } } },
    edges: { type: 'array', items: { type: 'object', required: ['source', 'sourceHandle', 'target'], properties: { source: { type: 'string' }, sourceHandle: { type: 'string' }, target: { type: 'string' } } } },
    settings: { type: 'object' },
  },
};

/** A visual (graph) workflow and its draft, for get_workflow / update_workflow_draft. Classic workflows are refused. */
async function loadGraphWorkflow(db: Db, id: string) {
  const { data: w } = await db.from('workflows').select('id,name,description,engine,graph_status,contractor_id,is_template,archived_at').eq('id', id).maybeSingle();
  if (!w || (w as any).is_template) fail('No workflow with that id.');
  if ((w as any).engine !== 'graph') fail('This is a classic (list-style) workflow. Only visual workflows can be read and edited here; open it in the app to change it.');
  const { data: d } = await db.from('workflow_graph_drafts').select('graph,revision').eq('workflow_id', id).maybeSingle();
  if (!d) fail('This workflow has no saved steps yet.');
  return { w: w as any, graph: parseWorkflowGraph((d as any).graph), revision: (d as any).revision as number };
}

export const TOOLS: ToolDef[] = [
  {
    name: 'business_summary',
    title: 'Business summary',
    description: 'How the business is doing over the last N days: new leads by source and pipeline status, qualified leads, appointments booked, texts sent and received, and funnel visits vs contact forms submitted per funnel.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { days: { type: 'number', description: 'Look-back window in days (1-90). Default 7.' } } },
    annotations: readOnly,
    summarize: (a) => `days=${int(a.days, 1, 90, 7)}`,
    run: async (db, args) => {
      const days = int(args.days, 1, 90, 7);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const [{ data: leads }, { count: booked }, { data: msgs }, { data: sessions }] = await Promise.all([
        db.from('leads').select('source,status,qualification_status').gte('created_at', since).is('archived_at', null).limit(5000),
        db.from('appointments').select('id', { count: 'exact', head: true }).gte('created_at', since),
        db.from('sms_messages').select('direction,status').gte('created_at', since).limit(10000),
        db.from('funnel_sessions').select('funnel_id,contact_submitted_at').gte('created_at', since).limit(10000),
      ]);
      const tally = (rows: any[] | null, key: string) => (rows ?? []).reduce<Record<string, number>>((acc, r) => { const k = String(r[key] ?? 'unknown'); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
      const funnelIds = [...new Set((sessions ?? []).map((s: any) => s.funnel_id).filter(Boolean))];
      const { data: funnels } = funnelIds.length ? await db.from('funnels').select('id,slug').in('id', funnelIds) : { data: [] };
      const slug = new Map((funnels ?? []).map((f: any) => [f.id, f.slug]));
      const perFunnel: Record<string, { visits: number; contactForms: number }> = {};
      for (const s of (sessions ?? []) as any[]) {
        const k = slug.get(s.funnel_id) ?? 'other';
        perFunnel[k] ??= { visits: 0, contactForms: 0 };
        perFunnel[k].visits += 1;
        if (s.contact_submitted_at) perFunnel[k].contactForms += 1;
      }
      return {
        window: `last ${days} day${days === 1 ? '' : 's'}`,
        newLeads: (leads ?? []).length,
        bySource: tally(leads, 'source'),
        byStatus: tally(leads, 'status'),
        qualified: (leads ?? []).filter((l: any) => l.qualification_status === 'qualified').length,
        appointmentsBooked: booked ?? 0,
        texts: { sent: (msgs ?? []).filter((m: any) => m.direction === 'out' && m.status === 'sent').length, received: (msgs ?? []).filter((m: any) => m.direction === 'in').length },
        funnels: perFunnel,
      };
    },
  },
  {
    name: 'search_leads',
    title: 'Search leads',
    description: 'Find leads by name, phone, email or city, optionally filtered by pipeline status, source (e.g. website, meta) or how recent they are. Newest first.',
    scope: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Part of a name, phone, email or city.' },
        status: { type: 'string', enum: STATUS_VALUES, description: 'Pipeline status.' },
        source: { type: 'string', description: 'Lead source, e.g. website, meta, manual.' },
        created_after: { type: 'string', description: 'ISO date, e.g. 2026-10-01.' },
        limit: { type: 'number', description: '1-50. Default 20.' },
      },
    },
    annotations: readOnly,
    summarize: (a) => ['query', 'status', 'source', 'created_after'].filter((k) => a[k]).map((k) => `${k}=${String(a[k]).slice(0, 40)}`).join(' '),
    run: async (db, args) => {
      let q = db.from('leads').select('id,first_name,last_name,phone,email,city,state,status,source,qualification_status,created_at').is('archived_at', null);
      const query = str(args.query, 80)?.replace(/[,()%*\\]/g, ' ').trim();
      if (query) q = q.or(['first_name', 'last_name', 'phone', 'email', 'city'].map((c) => `${c}.ilike.%${query}%`).join(','));
      const status = str(args.status, 40);
      if (status) { if (!STATUS_VALUES.includes(status)) fail(`Unknown status. Use one of: ${STATUS_VALUES.join(', ')}.`); q = q.eq('status', status); }
      const source = str(args.source, 40); if (source) q = q.eq('source', source);
      const after = str(args.created_after, 40);
      if (after) { const d = new Date(after); if (Number.isNaN(+d)) fail('created_after must be a date like 2026-10-01.'); q = q.gte('created_at', d.toISOString()); }
      const { data, error } = await q.order('created_at', { ascending: false }).limit(int(args.limit, 1, 50, 20));
      if (error) fail('Could not search leads.');
      return (data ?? []).map((l: any) => ({ id: l.id, name: name(l), phone: l.phone, email: l.email, city: l.city, state: l.state, status: l.status, source: l.source, qualification: l.qualification_status, created_at: l.created_at, link: link(`/app/leads/${l.id}`) }));
    },
  },
  {
    name: 'get_lead',
    title: 'Get a lead',
    description: 'Everything about one lead: contact details, project, qualification and consent, recent activity timeline, the text conversation with them, contractor assignments and appointments.',
    scope: 'read',
    inputSchema: { type: 'object', required: ['lead_id'], properties: { lead_id: { type: 'string', description: 'Lead id from search_leads.' } } },
    annotations: readOnly,
    summarize: (a) => `lead=${String(a.lead_id ?? '').slice(0, 36)}`,
    run: async (db, args) => {
      const id = uuid(args.lead_id, 'lead_id');
      const { data: l } = await db.from('leads').select('*').eq('id', id).maybeSingle();
      if (!l) fail('No lead with that id.');
      const [{ data: acts }, { data: convo }, { data: assigns }] = await Promise.all([
        db.from('lead_activities').select('type,body,created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(25),
        db.from('sms_conversations').select('id,status,mode,sender_name,summary,workflow_owned').eq('lead_id', id).maybeSingle(),
        db.from('lead_assignments').select('id,contractor_id,status').eq('lead_id', id),
      ]);
      const assignmentIds = (assigns ?? []).map((a: any) => a.id);
      const contractorIds = [...new Set((assigns ?? []).map((a: any) => a.contractor_id))];
      const [{ data: msgs }, { data: appts }, { data: cos }] = await Promise.all([
        convo ? db.from('sms_messages').select('direction,body,status,created_at').eq('conversation_id', (convo as any).id).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
        assignmentIds.length ? db.from('appointments').select('id,assignment_id,scheduled_at,status,location').in('assignment_id', assignmentIds) : Promise.resolve({ data: [] }),
        contractorIds.length ? db.from('contractors').select('id,name').in('id', contractorIds) : Promise.resolve({ data: [] }),
      ]);
      const coName = new Map((cos ?? []).map((c: any) => [c.id, c.name]));
      const lead = l as any;
      return {
        id, name: name(lead), link: link(`/app/leads/${id}`),
        contact: { phone: lead.phone, email: lead.email, address: lead.address, city: lead.city, state: lead.state, zip: lead.zip },
        status: lead.status, source: lead.source, created_at: lead.created_at,
        project: { description: clip(lead.project_description, 800), budget: lead.budget_range, timeline: lead.timeline, urgency: lead.urgency, estimated_job_value: lead.estimated_job_value },
        qualification: { status: lead.qualification_status, notes: clip(lead.qualification_notes, 400) },
        consent: { granted: lead.consent_granted, at: lead.consent_at },
        activity: (acts ?? []).map((a: any) => ({ type: a.type, text: clip(a.body, 400), at: a.created_at })),
        texting: convo ? { status: (convo as any).status, prefers: (convo as any).mode, texting_as: (convo as any).sender_name, summary: clip((convo as any).summary, 500), assistant_answers_replies: !(convo as any).workflow_owned, messages: [...(msgs ?? [])].reverse().map((m: any) => ({ from: m.direction === 'in' ? 'lead' : 'us', text: clip(m.body, 500), status: m.status, at: m.created_at })) } : null,
        assignments: (assigns ?? []).map((a: any) => ({ contractor: coName.get(a.contractor_id) ?? a.contractor_id, status: a.status })),
        appointments: (appts ?? []).map((a: any) => ({ id: a.id, scheduled_at: a.scheduled_at, status: a.status, location: a.location })),
      };
    },
  },
  {
    name: 'list_appointments',
    title: 'List appointments',
    description: 'Appointments in a date range (default: the next 14 days) with the lead, contractor, time and status.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'ISO date/time. Default now.' }, to: { type: 'string', description: 'ISO date/time. Default 14 days after "from".' }, status: { type: 'string', description: 'e.g. scheduled, held, cancelled, no_show.' } } },
    annotations: readOnly,
    run: async (db, args) => {
      const from = str(args.from) ? new Date(String(args.from)) : new Date();
      const to = str(args.to) ? new Date(String(args.to)) : new Date(from.getTime() + 14 * 86_400_000);
      if (Number.isNaN(+from) || Number.isNaN(+to)) fail('from/to must be dates like 2026-10-28.');
      let q = db.from('appointments').select('id,assignment_id,scheduled_at,status,location').gte('scheduled_at', from.toISOString()).lte('scheduled_at', to.toISOString());
      const status = str(args.status, 40); if (status) q = q.eq('status', status);
      const { data: appts } = await q.order('scheduled_at', { ascending: true }).limit(200);
      const assignIds = [...new Set((appts ?? []).map((a: any) => a.assignment_id))];
      const { data: assigns } = assignIds.length ? await db.from('lead_assignments').select('id,lead_id,contractor_id').in('id', assignIds) : { data: [] };
      const byAssign = new Map((assigns ?? []).map((a: any) => [a.id, a]));
      const leadIds = [...new Set((assigns ?? []).map((a: any) => a.lead_id))];
      const coIds = [...new Set((assigns ?? []).map((a: any) => a.contractor_id))];
      const [{ data: leads }, { data: cos }] = await Promise.all([
        leadIds.length ? db.from('leads').select('id,first_name,last_name,phone,city').in('id', leadIds) : Promise.resolve({ data: [] }),
        coIds.length ? db.from('contractors').select('id,name').in('id', coIds) : Promise.resolve({ data: [] }),
      ]);
      const leadById = new Map((leads ?? []).map((l: any) => [l.id, l]));
      const coName = new Map((cos ?? []).map((c: any) => [c.id, c.name]));
      return (appts ?? []).map((a: any) => {
        const as = byAssign.get(a.assignment_id) as any; const l = as ? (leadById.get(as.lead_id) as any) : null;
        return { id: a.id, scheduled_at: a.scheduled_at, status: a.status, location: a.location, lead: l ? { id: l.id, name: name(l), phone: l.phone, city: l.city, link: link(`/app/leads/${l.id}`) } : null, contractor: as ? coName.get(as.contractor_id) ?? null : null };
      });
    },
  },
  {
    name: 'list_contractors',
    title: 'List contractors',
    description: 'Contractor companies with their status and whether automatic texting is on for them.',
    scope: 'read',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
    run: async (db) => {
      const { data } = await db.from('contractors').select('id,name,status,texting_enabled').order('name').limit(200);
      return (data ?? []).map((c: any) => ({ id: c.id, name: c.name, status: c.status, texting_enabled: !!c.texting_enabled, link: link(`/app/contractors/${c.id}`) }));
    },
  },
  {
    name: 'list_automations',
    title: 'Automation map',
    description: 'Every automation HomeQuote runs on its own (schedulers, texting, reminders, alerts, Meta, calls, workflows): whether each is on, off, not active or needs a look, when it last ran and how many times in 7 days. Optional filter by state.',
    scope: 'read',
    inputSchema: { type: 'object', properties: { state: { type: 'string', enum: ['on', 'off', 'dormant', 'not_set_up', 'attention'], description: 'Only automations in this state.' } } },
    annotations: readOnly,
    run: async (db, args) => {
      const { statuses, workflows } = await automationStatuses(db as never);
      const byId = new Map(statuses.map((s) => [s.id, s]));
      const want = typeof args.state === 'string' ? args.state : null;
      return {
        link: link('/app/automations'),
        automations: AUTOMATIONS.filter((a) => !want || byId.get(a.id)?.state === want).map((a) => {
          const st = byId.get(a.id);
          return { name: a.name, area: AREA_LABELS[a.area], when: a.when, what: a.what, state: st?.state, note: st?.note, last_ran: st?.lastRunAt ?? null, last_7_days: st?.count7d ?? null };
        }),
        workflows: workflows.map((w) => ({ name: w.name, live: w.live, status: w.status, trigger: w.triggerType, runs_7_days: w.runs7d, failed_7_days: w.failed7d, last_run: w.lastRunAt, link: link(`/app/workflows/${w.id}`) })),
      };
    },
  },
  {
    name: 'texting_overview',
    title: 'Texting overview',
    description: 'Is automatic texting on, is the Mac bridge connected, texts waiting to send, and conversations that need a person.',
    scope: 'read',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
    run: async (db) => {
      const [{ data: s }, { count: waiting }, { data: needs }] = await Promise.all([
        db.from('sms_settings').select('enabled,stopped_at,bridge_last_seen_at,window_start_hour,window_end_hour,daily_cap').eq('id', true).maybeSingle(),
        db.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'queued'),
        db.from('sms_conversations').select('lead_id,summary,updated_at').eq('status', 'handoff').not('lead_id', 'is', null).order('updated_at', { ascending: false }).limit(10),
      ]);
      const ids = (needs ?? []).map((c: any) => c.lead_id);
      const { data: leads } = ids.length ? await db.from('leads').select('id,first_name,last_name').in('id', ids) : { data: [] };
      const byId = new Map((leads ?? []).map((l: any) => [l.id, l]));
      const settings = s as any;
      const seen = settings?.bridge_last_seen_at ? new Date(settings.bridge_last_seen_at) : null;
      return {
        texting_on: !!settings?.enabled && !settings?.stopped_at,
        mac_bridge: seen ? { connected: Date.now() - +seen < 120_000, last_check_in: seen.toISOString() } : { connected: false, last_check_in: null },
        texting_hours: settings ? `${settings.window_start_hour}:00-${settings.window_end_hour}:00 in the lead's time zone` : null,
        daily_limit: settings?.daily_cap ?? null,
        texts_waiting_to_send: waiting ?? 0,
        need_a_person: (needs ?? []).map((c: any) => ({ lead: name(byId.get(c.lead_id) as any), link: link(`/app/leads/${c.lead_id}`), summary: clip(c.summary, 300), since: c.updated_at })),
      };
    },
  },
  {
    name: 'list_workflows',
    title: 'List workflows',
    description: 'Automations (workflows) with their status (draft, live, paused), what starts them and when they were last changed.',
    scope: 'read',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
    run: async (db) => {
      const { data } = await db.from('workflows').select('id,name,engine,graph_status,enabled,trigger_type,contractor_id,updated_at').eq('is_template', false).is('archived_at', null).order('updated_at', { ascending: false }).limit(60);
      return (data ?? []).map((w: any) => ({ id: w.id, name: w.name, status: w.engine === 'graph' ? w.graph_status : w.enabled ? 'enabled' : 'disabled', starts_on: w.trigger_type, for: w.contractor_id ? 'one contractor' : 'HomeQuote network', updated_at: w.updated_at, link: link(`/app/workflows/${w.id}`) }));
    },
  },
  {
    name: 'explain_workflow',
    title: 'Explain a workflow',
    description: 'A plain-English walk-through of one workflow (its current draft): what starts it and every step and branch.',
    scope: 'read',
    inputSchema: { type: 'object', required: ['workflow_id'], properties: { workflow_id: { type: 'string', description: 'Workflow id from list_workflows.' } } },
    annotations: readOnly,
    run: async (db, args) => {
      const id = uuid(args.workflow_id, 'workflow_id');
      const { data: w } = await db.from('workflows').select('id,name,engine,graph_status').eq('id', id).maybeSingle();
      if (!w) fail('No workflow with that id.');
      if ((w as any).engine !== 'graph') return { name: (w as any).name, explanation: 'This is a classic (list-style) workflow; open it in the app to see its steps.', link: link(`/app/workflows/${id}`) };
      const { data: d } = await db.from('workflow_graph_drafts').select('graph').eq('workflow_id', id).maybeSingle();
      if (!d) fail('This workflow has no saved steps yet.');
      return { name: (w as any).name, status: (w as any).graph_status, explanation: explainGraphText(parseWorkflowGraph((d as any).graph)), link: link(`/app/workflows/${id}`) };
    },
  },
  {
    name: 'get_workflow',
    title: 'Read a workflow',
    description: 'The current DRAFT of one visual workflow, in the same { nodes, edges, settings } shape create_workflow_draft takes, plus its revision number. Call this before update_workflow_draft: change what you need and send the whole workflow back with this revision.',
    scope: 'read',
    inputSchema: { type: 'object', required: ['workflow_id'], properties: { workflow_id: { type: 'string', description: 'Workflow id from list_workflows.' } } },
    annotations: readOnly,
    summarize: (a) => `workflow=${String(a.workflow_id ?? '').slice(0, 36)}`,
    run: async (db, args) => {
      const id = uuid(args.workflow_id, 'workflow_id');
      const { w, graph, revision } = await loadGraphWorkflow(db, id);
      return {
        id, name: w.name, description: w.description ?? null, status: w.graph_status, archived: !!w.archived_at,
        for: w.contractor_id ? 'one contractor' : 'HomeQuote network', contractor_id: w.contractor_id ?? null, revision,
        workflow: {
          nodes: graph.nodes.map((n) => ({ id: n.id, type: n.type, ...(n.name ? { name: n.name } : {}), config: n.config })),
          edges: graph.edges.map((e) => ({ source: e.source, sourceHandle: e.sourceHandle, target: e.target })),
          settings: graph.settings,
        },
        explanation: explainGraphText(graph), link: link(`/app/workflows/${id}`),
      };
    },
  },
  {
    name: 'workflow_building_guide',
    title: 'How to build a workflow',
    description: 'The exact step types, triggers, wait events, merge fields, condition fields and limits HomeQuote workflows support right now, with the config shape for each step. Read this before create_workflow_draft or update_workflow_draft.',
    scope: 'read',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
    run: async () => {
      const c = buildCatalogue();
      return `${c.text}\n\nTo save one, call create_workflow_draft with { name, workflow: { nodes: [{ id, type, name?, config }], edges: [{ source, sourceHandle, target }], settings? } }. Exactly one node has id "trigger". The draft is checked with the same rules as the in-app builder and is NEVER published: the admin reviews, tests and publishes it in the app.\n\nTo change an existing visual workflow, call get_workflow { workflow_id } first, edit its nodes/edges/settings, then call update_workflow_draft { workflow_id, revision, workflow } with the revision get_workflow returned (send the whole workflow, not just the changed step). This only changes the draft: if the workflow is live, the published version keeps running until the admin publishes the new draft in the app. Classic (list-style) workflows cannot be edited here.`;
    },
  },
  {
    name: 'add_lead_note',
    title: 'Add a note to a lead',
    description: 'Write an internal note on a lead\'s timeline (visible to HomeQuote staff, not the homeowner or contractor).',
    scope: 'write',
    inputSchema: { type: 'object', required: ['lead_id', 'note'], properties: { lead_id: { type: 'string' }, note: { type: 'string', description: 'The note, up to 2,000 characters.' } } },
    summarize: (a) => `lead=${String(a.lead_id ?? '').slice(0, 36)}`,
    run: async (db, args, key) => {
      const id = uuid(args.lead_id, 'lead_id');
      const note = str(args.note, 2000) ?? fail('Write the note first.');
      const { data: l } = await db.from('leads').select('id').eq('id', id).maybeSingle();
      if (!l) fail('No lead with that id.');
      const { error } = await db.from('lead_activities').insert({ lead_id: id, actor_id: key.actorId, type: 'note', body: note, visibility: 'internal', metadata: { source: 'claude_mcp', key_id: key.id } });
      if (error) fail('Could not save the note.');
      return { saved: true, link: link(`/app/leads/${id}`) };
    },
  },
  {
    name: 'update_lead_status',
    title: 'Change a lead\'s status',
    description: 'Move a lead to another pipeline status (new, contact_attempted, qualified, appointment_set, lost…). Recorded on the lead\'s timeline as done by Claude. Workflows that start on status changes will run.',
    scope: 'write',
    inputSchema: { type: 'object', required: ['lead_id', 'status'], properties: { lead_id: { type: 'string' }, status: { type: 'string', enum: STATUS_VALUES } } },
    summarize: (a) => `lead=${String(a.lead_id ?? '').slice(0, 36)} status=${String(a.status ?? '').slice(0, 30)}`,
    run: async (db, args, key) => {
      const id = uuid(args.lead_id, 'lead_id');
      const status = str(args.status, 40);
      if (!status || !STATUS_VALUES.includes(status)) fail(`status must be one of: ${STATUS_VALUES.join(', ')}.`);
      const { data: l } = await db.from('leads').select('id,status').eq('id', id).maybeSingle();
      if (!l) fail('No lead with that id.');
      if ((l as any).status === status) return { changed: false, status, note: 'The lead already has this status.' };
      const { error } = await db.from('leads').update({ status }).eq('id', id);
      if (error) fail('Could not change the status.');
      await db.from('lead_activities').insert({ lead_id: id, actor_id: key.actorId, type: 'status_change', body: `Status changed to ${status} (by Claude)`, visibility: 'internal', metadata: { source: 'claude_mcp', key_id: key.id, from: (l as any).status, to: status } });
      return { changed: true, from: (l as any).status, to: status, link: link(`/app/leads/${id}`) };
    },
  },
  {
    name: 'create_workflow_draft',
    title: 'Save a workflow draft',
    description: 'Save a new automation as an UNPUBLISHED draft (call workflow_building_guide first for the allowed steps and shapes). It is checked with the in-app builder\'s rules; problems come back so you can fix them. Nothing runs until the admin publishes it in the app.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      required: ['name', 'workflow'],
      properties: {
        name: { type: 'string', description: 'Short name, up to 120 characters.' },
        summary: { type: 'string', description: 'One or two sentences saying what it does.' },
        contractor_id: { type: 'string', description: 'Scope it to one contractor (id from list_contractors). Omit for a HomeQuote network workflow.' },
        workflow: WORKFLOW_INPUT,
      },
    },
    summarize: (a) => `name=${String(a.name ?? '').slice(0, 80)}`,
    run: async (db, args, key) => {
      const wfName = str(args.name, 120) ?? fail('Give the workflow a name.');
      const contractorId = args.contractor_id === undefined || args.contractor_id === null || args.contractor_id === '' ? null : uuid(args.contractor_id, 'contractor_id');
      if (contractorId) { const { data: c } = await db.from('contractors').select('id').eq('id', contractorId).maybeSingle(); if (!c) fail('No contractor with that id.'); }
      const wf = args.workflow as any;
      if (!wf || !Array.isArray(wf.nodes) || !Array.isArray(wf.edges ?? [])) fail('workflow needs nodes and edges arrays.');
      const checked = checkGraph(assembleGraph({ nodes: wf.nodes, edges: wf.edges ?? [], settings: wf.settings }), { contractorId, catalogue: buildCatalogue() });
      if (!checked.graph) fail(`The workflow has problems. Fix these and try again:\n- ${checked.errors.join('\n- ')}`);
      const graph = checked.graph!;
      const trig = triggerOf(graph)!;
      const { data: row, error } = await db.from('workflows').insert({
        contractor_id: contractorId, name: wfName, description: str(args.summary, 2000) ?? null, is_template: false, template_key: null,
        trigger_type: trig.config.event, trigger_config: trig.config.filters ?? {}, conditions: null, exit_events: [], reentry_policy: 'once_per_event',
        enabled: false, version: 1, engine: 'graph', graph_status: 'draft', created_by: key.actorId, updated_by: key.actorId,
      }).select('id').single();
      if (error || !row) fail('Could not save the workflow.');
      const id = (row as any).id as string;
      const { error: dErr } = await db.from('workflow_graph_drafts').insert({ workflow_id: id, graph, updated_by: key.actorId });
      if (dErr) { await db.from('workflows').update({ archived_at: new Date().toISOString() }).eq('id', id); fail('Could not save the workflow steps.'); }
      await db.from('audit_logs').insert({ actor_id: key.actorId, action: 'workflow.graph.mcp_create', metadata: { workflow_id: id, contractor_id: contractorId, key_id: key.id } }).then(() => undefined, () => undefined);
      return { saved: true, status: 'draft (not published)', workflow_id: id, link: link(`/app/workflows/${id}`), explanation: explainGraphText(graph), warnings: checked.warnings, next: 'Open the link to review it, run a dry run and publish it.' };
    },
  },
  {
    name: 'update_workflow_draft',
    title: 'Change a workflow draft',
    description: 'Replace the DRAFT of an existing visual workflow (call get_workflow first and send its revision with the whole edited workflow). It is checked with the in-app builder\'s rules; problems come back so you can fix them. This never publishes: a live workflow keeps running its published version until the admin publishes the draft in the app.',
    scope: 'write',
    inputSchema: {
      type: 'object',
      required: ['workflow_id', 'revision', 'workflow'],
      properties: {
        workflow_id: { type: 'string', description: 'Workflow id from list_workflows or get_workflow.' },
        revision: { type: 'number', description: 'The revision get_workflow returned. If the draft changed since, the save is refused.' },
        name: { type: 'string', description: 'New name, up to 120 characters. Omit to keep it.' },
        summary: { type: 'string', description: 'New one or two sentence description. Omit to keep it.' },
        workflow: WORKFLOW_INPUT,
      },
    },
    summarize: (a) => `workflow=${String(a.workflow_id ?? '').slice(0, 36)} revision=${typeof a.revision === 'number' ? a.revision : '?'}`,
    run: async (db, args, key) => {
      const id = uuid(args.workflow_id, 'workflow_id');
      const revision = typeof args.revision === 'number' && Number.isInteger(args.revision) && args.revision >= 1 ? args.revision : fail('revision must be the number get_workflow returned.');
      const wfName = args.name === undefined || args.name === null ? undefined : str(args.name, 120) ?? fail('The name cannot be empty.');
      const summary = args.summary === undefined || args.summary === null ? undefined : str(args.summary, 2000) ?? null;
      const { w, graph: before } = await loadGraphWorkflow(db, id);
      if (w.archived_at) fail('This workflow is archived and cannot be changed.');
      const wf = args.workflow as any;
      if (!wf || !Array.isArray(wf.nodes) || !Array.isArray(wf.edges ?? [])) fail('workflow needs nodes and edges arrays.');
      const checked = checkGraph(assembleGraph({ nodes: wf.nodes, edges: wf.edges ?? [], settings: wf.settings }), { contractorId: w.contractor_id ?? null, catalogue: buildCatalogue() });
      if (!checked.graph) fail(`The workflow has problems. Fix these and try again:\n- ${checked.errors.join('\n- ')}`);
      let graph = checked.graph!;
      // Same steps as before (only their settings changed): keep the admin's canvas layout instead of the automatic one.
      const oldPos = new Map(before.nodes.map((n) => [n.id, n.position]));
      if (graph.nodes.every((n) => oldPos.has(n.id))) graph = { ...graph, nodes: graph.nodes.map((n) => ({ ...n, position: oldPos.get(n.id)! })) };
      const { data: saved, error } = await db.from('workflow_graph_drafts')
        .update({ graph, revision: revision + 1, content_hash: hashGraph(graph), updated_by: key.actorId, updated_at: new Date().toISOString() })
        .eq('workflow_id', id).eq('revision', revision).select('revision');
      if (error) fail('Could not save the workflow.');
      if (!Array.isArray(saved) || saved.length === 0) fail('This workflow was changed since you read it. Call get_workflow again and re-apply your change.');
      const patch: Json = { updated_by: key.actorId };
      if (wfName) patch.name = wfName;
      if (summary !== undefined) patch.description = summary;
      await db.from('workflows').update(patch).eq('id', id);
      await db.from('audit_logs').insert({ actor_id: key.actorId, action: 'workflow.graph.mcp_update', metadata: { workflow_id: id, key_id: key.id, revision: revision + 1 } }).then(() => undefined, () => undefined);
      const status = w.graph_status as string;
      return {
        saved: true, revision: revision + 1, status, explanation: explainGraphText(graph), warnings: checked.warnings, link: link(`/app/workflows/${id}`),
        next: status === 'published' || status === 'paused'
          ? 'This changed the draft only. The live version keeps running until you publish the draft in HomeQuote.'
          : 'Open the link to review and publish.',
      };
    },
  },
  {
    name: 'send_text',
    title: 'Text a homeowner',
    description: 'Text a lead from the owner\'s Mac (iMessage bridge). Every texting rule applies: not sent if texting is off, the number opted out, a person took over the conversation or the daily limit is reached; outside texting hours it waits until they open. No links (they are removed). At most 30 texts per key per day.',
    scope: 'text',
    inputSchema: {
      type: 'object', required: ['lead_id', 'message'],
      properties: {
        lead_id: { type: 'string' },
        message: { type: 'string', description: 'The text, under 320 characters. Say who is texting if this is the first message.' },
        let_assistant_reply: { type: 'boolean', description: 'Let the texting assistant answer their replies (default true). False: replies are saved on the lead for a person.' },
      },
    },
    summarize: (a) => `lead=${String(a.lead_id ?? '').slice(0, 36)}`,
    run: async (db, args, key) => {
      const id = uuid(args.lead_id, 'lead_id');
      const message = str(args.message, 1000) ?? fail('Write the message first.');
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await db.from('mcp_tool_calls').select('id', { count: 'exact', head: true }).eq('key_id', key.id).eq('tool', 'send_text').eq('ok', true).gte('created_at', since);
      if ((count ?? 0) >= TEXTS_PER_KEY_PER_DAY) fail(`This key already sent ${TEXTS_PER_KEY_PER_DAY} texts in the last 24 hours.`);
      const r = await queueWorkflowText(db, { leadId: id, body: message, contractorId: null, stepRunId: randomUUID(), assistant: args.let_assistant_reply !== false, label: 'Text from Claude' });
      if (!r.ok) fail(`Not sent: ${WORKFLOW_TEXT_SKIP_REASONS[r.reason] ?? (r.reason === 'error' ? 'something went wrong; try again.' : r.reason)}`);
      return { queued: true, note: 'The Mac sends it within about a minute (or when texting hours open).', link: link(`/app/leads/${id}`) };
    },
  },
  {
    name: 'propose_lead_assignment',
    title: 'Propose assigning a lead',
    description: 'Ask the admin to approve assigning a lead to one or more contractors. Only use this when the admin asked for it in this conversation. Nothing is assigned by this call: the admin gets a notification and approves or declines it in HomeQuote. Check the outcome with list_pending_approvals.',
    scope: 'assign',
    inputSchema: {
      type: 'object', required: ['lead_id', 'contractor_ids'],
      properties: {
        lead_id: { type: 'string' },
        contractor_ids: { type: 'array', items: { type: 'string' }, description: 'Contractor ids from list_contractors (1-5).' },
        exclusive: { type: 'boolean', description: 'Exclusive lead (default false).' },
        reason: { type: 'string', description: 'Why, in a sentence, shown to the admin with the request.' },
      },
    },
    summarize: (a) => `lead=${String(a.lead_id ?? '').slice(0, 36)} contractors=${Array.isArray(a.contractor_ids) ? a.contractor_ids.length : 0}`,
    run: async (db, args, key) => {
      const leadId = uuid(args.lead_id, 'lead_id');
      const ids = Array.isArray(args.contractor_ids) ? [...new Set(args.contractor_ids.map((c) => uuid(c, 'Each contractor id')))] : [];
      if (!ids.length || ids.length > 5) fail('Give 1 to 5 contractor ids from list_contractors.');
      const { data: lead } = await db.from('leads').select('id,first_name,last_name,city').eq('id', leadId).maybeSingle();
      if (!lead) fail('No lead with that id.');
      const { data: cos } = await db.from('contractors').select('id,name,status').in('id', ids);
      if ((cos ?? []).length !== ids.length) fail('One of the contractor ids does not exist. Use ids from list_contractors.');
      const { data: existing } = await db.from('lead_assignments').select('contractor_id').eq('lead_id', leadId);
      const already = new Set((existing ?? []).map((r: any) => r.contractor_id));
      const fresh = (cos ?? []).filter((c: any) => !already.has(c.id));
      if (!fresh.length) fail('The lead is already assigned to every one of those contractors.');
      const { count } = await db.from('mcp_pending_actions').select('id', { count: 'exact', head: true }).eq('key_id', key.id).eq('status', 'pending');
      if ((count ?? 0) >= 20) fail('There are already 20 requests waiting for approval. Ask the admin to review them first.');
      const exclusive = args.exclusive === true;
      const leadName = name(lead as any);
      const summary = `Assign ${leadName}${(lead as any).city ? ` (${(lead as any).city})` : ''} to ${fresh.map((c: any) => c.name).join(', ')}${exclusive ? ' as an exclusive lead' : ''}`.slice(0, 500);
      const reason = str(args.reason, 300) ?? null;
      const { data: row, error } = await db.from('mcp_pending_actions').insert({
        key_id: key.id, requested_for: key.actorId, kind: 'assign_lead', summary,
        payload: { leadId, contractorIds: fresh.map((c: any) => c.id), exclusive, reason },
      }).select('id').single();
      if (error || !row) fail('Could not create the approval request.');
      if (key.actorId) await sendPushNotification({ userIds: [key.actorId], type: 'workflow_alert', title: 'Claude needs your OK', body: `${summary}. Tap to approve or decline.`, url: '/app/claude-connector#approvals', db }).catch(() => undefined);
      return { status: 'waiting for your approval', request_id: (row as any).id, request: summary, ...(already.size ? { already_assigned_to: [...already].length } : {}), approve_at: link('/app/claude-connector#approvals'), note: 'Nothing has been assigned yet. The admin approves or declines this in HomeQuote; it expires in 24 hours.' };
    },
  },
  {
    name: 'list_pending_approvals',
    title: 'Check approval requests',
    description: 'Assignment requests made through this connector and whether the admin approved, declined or has not decided yet (newest first).',
    scope: 'assign',
    inputSchema: { type: 'object', properties: {} },
    annotations: readOnly,
    run: async (db) => {
      const { data } = await db.from('mcp_pending_actions').select('id,summary,status,result,created_at,expires_at,decided_at').order('created_at', { ascending: false }).limit(20);
      const now = Date.now();
      return (data ?? []).map((r: any) => ({ id: r.id, request: r.summary, status: r.status === 'pending' && new Date(r.expires_at).getTime() < now ? 'expired' : r.status, result: r.result, asked_at: r.created_at, decided_at: r.decided_at }));
    },
  },
];

export const toolsFor = (scopes: McpScope[]) => TOOLS.filter((t) => scopes.includes(t.scope));
