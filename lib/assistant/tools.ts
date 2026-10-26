/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Profile } from '@/lib/types';
import { dayBoundsInZone } from '@/lib/calls/metrics';
import { hasDataAccess, isStaff, loadAccessibleLead, tenantOf } from './access';
import { clip } from './untrusted';
import { isUuid } from './context';
import type { DocPreview } from '@/lib/documents/preview';

export interface ToolContext {
  /** The signed-in user's own Supabase client: Row Level Security applies to every read here. */
  db: SupabaseClient;
  /** Service role. Used ONLY to write assistant_* rows, always with the user id from the session. */
  admin: SupabaseClient;
  profile: Profile;
  tz: string;
  conversationId: string;
  now: Date;
  /** Called when a change has been proposed so the UI can show the confirm card immediately. */
  onAction?: (action: ProposedAction) => void;
  /** Test seam for Graph calls; production leaves this unset and uses the real fetch. */
  fetchImpl?: typeof fetch;
  /** Guided selection cards / status panels shown inline in the chat (data the user can click, never instructions). */
  onBlock?: (block: UiBlock) => void;
}

export interface SelectCard { id: string; label: string; detail?: string; badge?: string; disabled?: boolean; reason?: string }
export type UiBlock =
  | { type: 'cards'; title: string; kind: string; items: SelectCard[]; note?: string }
  | { type: 'status'; title: string; rows: { label: string; value: string; state: 'ok' | 'warn' | 'bad' | 'unknown'; detail?: string }[]; note?: string };

export type ActionKind =
  | 'add_note' | 'update_status'
  | 'create_document' | 'update_document' | 'request_signature'
  | 'configure_meta_tracking' | 'create_meta_dataset';

export interface ProposedAction {
  id: string;
  kind: ActionKind;
  status: string;
  duplicate?: boolean;
  preview: ActionPreview;
}

export interface ActionPreview {
  title: string;
  target: { label: string; href: string };
  lines: string[];
  warning?: string;
  /** Editable merge-field preview for work orders / proposals / contracts (wording itself is never editable). */
  document?: DocPreview;
  /** Label for the confirm button when it is not just "Confirm". */
  confirmLabel?: string;
}

export const LEAD_STATUSES = [
  'new', 'contact_attempted', 'qualified', 'assigned', 'appointment_set', 'appointment_completed',
  'estimate_sent', 'sold', 'lost', 'cancelled',
] as const;
/** What a contractor may set on their own assignment (matches updateAssignmentStatus, minus admin-ish moves). */
export const ASSIGNMENT_STATUSES = [
  'accepted', 'contacted', 'no_answer', 'qualified', 'not_qualified', 'appointment_set', 'appointment_held',
  'estimate_given', 'sold', 'lost',
] as const;

export const allowedStatusesFor = (profile: Pick<Profile, 'role'>): readonly string[] =>
  isStaff(profile) ? LEAD_STATUSES : profile.role === 'contractor' ? ASSIGNMENT_STATUSES : [];

const ACTIVE_STATUSES = ['assigned', 'contact_attempted', 'qualified', 'appointment_set', 'appointment_completed', 'estimate_sent'];
const LIST_COLUMNS = 'id, first_name, last_name, status, city, state, zip, created_at, last_contact_date, project_description, budget_range, timeline';

export const leadHref = (id: string) => `/app/leads/${id}`;
export const fullName = (l: Record<string, unknown>) =>
  [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Unnamed lead';
export const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, v));
};
const escapeForOr = (value: string) => value.replace(/[(),%*\\]/g, ' ').trim();

/** YYYY-MM-DD for an instant in a zone. */
export function dateInZone(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function fmtInZone(iso: string | null, tz: string): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
/** Start of the calendar day `dateStr` in `tz` (noon UTC always falls on that date for US zones). */
function dayStart(dateStr: string, tz: string): Date {
  return dayBoundsInZone(new Date(`${dateStr}T12:00:00Z`), tz).start;
}

/** Leads query pinned to the user's company when they are a contractor. */
function leadsQuery(ctx: ToolContext, columns: string) {
  const tenant = tenantOf(ctx.profile);
  let q = ctx.db.from('leads').select(tenant ? `${columns}, lead_assignments!inner(contractor_id, status)` : columns);
  if (tenant) q = q.eq('lead_assignments.contractor_id', tenant);
  return q;
}

const stripJoin = <T extends Record<string, unknown>>(row: T) => {
  const { lead_assignments: _a, ...rest } = row as Record<string, unknown>;
  void _a;
  return rest;
};

// ---- read tools ------------------------------------------------------------

async function searchLeads(ctx: ToolContext, input: Record<string, unknown>) {
  const limit = clamp(input.limit, 1, 10, 8);
  let q = leadsQuery(ctx, LIST_COLUMNS).is('archived_at', null).order('created_at', { ascending: false }).limit(limit);
  const status = typeof input.status === 'string' ? input.status : null;
  if (status) {
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) return { error: 'invalid_status', valid: LEAD_STATUSES };
    q = q.eq('status', status);
  }
  const query = typeof input.query === 'string' ? escapeForOr(input.query.slice(0, 80)) : '';
  if (query) {
    const terms = query.split(/\s+/).filter(Boolean).slice(0, 3);
    q = q.or(terms.flatMap(t => ['first_name', 'last_name', 'email', 'phone', 'city', 'address'].map(c => `${c}.ilike.%${t}%`)).join(','));
  }
  const { data, error } = await q;
  if (error) return { error: 'lookup_failed' };
  const leads = (data ?? []).map(r => {
    const l = stripJoin(r as unknown as Record<string, unknown>);
    return {
      id: l.id, name: fullName(l), status: l.status, city: l.city, zip: l.zip,
      created: fmtInZone(l.created_at as string, ctx.tz), last_contact: fmtInZone((l.last_contact_date as string) ?? null, ctx.tz),
      project: clip(l.project_description, 160), link: leadHref(l.id as string),
    };
  });
  return { count: leads.length, leads, note: leads.length === 0 ? 'No matching leads.' : leads.length > 1 ? 'Several matches: ask the user which one if they meant a specific person.' : undefined };
}

async function getLead(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.lead_id)) return { error: 'invalid_lead_id' };
  const lead = await loadAccessibleLead(ctx.db, ctx.profile, input.lead_id);
  if (!lead) return { error: 'not_found' };
  const tenant = tenantOf(ctx.profile);

  let activityQ = ctx.db.from('lead_activities').select('type, body, created_at, metadata').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(15);
  // Contractors never see internal notes (RLS agrees; this keeps it true even if a policy drifts).
  if (tenant) activityQ = activityQ.eq('visibility', 'contractor');

  let apptQ = ctx.db.from('appointments')
    .select('id, scheduled_at, status, location, notes, assignment:lead_assignments!inner(lead_id, contractor_id)')
    .eq('assignment.lead_id', lead.id).order('scheduled_at', { ascending: true }).limit(10);
  let asgQ = ctx.db.from('lead_assignments').select('id, status, assigned_at, contractor:contractors(name)').eq('lead_id', lead.id).limit(10);
  if (tenant) { apptQ = apptQ.eq('assignment.contractor_id', tenant); asgQ = asgQ.eq('contractor_id', tenant); }

  const [activities, appts, asgs] = await Promise.all([activityQ, apptQ, asgQ]);

  const l = lead as Record<string, unknown>;
  const missing = (['project_description', 'budget_range', 'timeline', 'address', 'email', 'phone'] as const)
    .filter(k => !clip(l[k]));
  return {
    lead: {
      id: l.id, name: fullName(l), status: l.status, qualification: l.qualification_status, source: l.source, urgency: l.urgency,
      phone: l.phone, email: l.email, address: [l.address, l.city, l.state, l.zip].filter(Boolean).join(', ') || null,
      project: clip(l.project_description, 800), budget_range: l.budget_range, timeline: l.timeline, notes: clip(l.notes, 600),
      created: fmtInZone(l.created_at as string, ctx.tz), last_contact: fmtInZone((l.last_contact_date as string) ?? null, ctx.tz),
      link: leadHref(l.id as string),
    },
    missing_information: missing.map(k => k.replace('_', ' ')),
    assignments: (asgs.data ?? []).map((a: any) => ({ status: a.status, contractor: a.contractor?.name ?? null })),
    appointments: (appts.data ?? []).map((a: any) => ({ id: a.id, when: fmtInZone(a.scheduled_at, ctx.tz), status: a.status, location: clip(a.location, 200), notes: clip(a.notes, 300) })),
    recent_activity: (activities.data ?? []).map((a: any) => ({
      type: a.type, when: fmtInZone(a.created_at, ctx.tz), text: clip(a.body, 500),
      follow_up_on: typeof a.metadata?.follow_up_on === 'string' ? a.metadata.follow_up_on : undefined,
    })),
    note: 'There is no stored text/email conversation with this homeowner in the app; the activity list is the full history.',
  };
}

async function appointmentsBetween(ctx: ToolContext, from: Date, to: Date, limit: number) {
  const tenant = tenantOf(ctx.profile);
  let q = ctx.db.from('appointments')
    .select('id, scheduled_at, status, location, assignment:lead_assignments!inner(contractor_id, lead:leads(id, first_name, last_name, city, phone, project_description))')
    .gte('scheduled_at', from.toISOString()).lt('scheduled_at', to.toISOString())
    .order('scheduled_at', { ascending: true }).limit(limit);
  if (tenant) q = q.eq('assignment.contractor_id', tenant);
  const { data, error } = await q;
  if (error) return null;
  return (data ?? []).map((a: any) => {
    const lead = a.assignment?.lead;
    return {
      appointment_id: a.id, when: fmtInZone(a.scheduled_at, ctx.tz), status: a.status, location: clip(a.location, 160),
      lead: lead ? { id: lead.id, name: fullName(lead), city: lead.city, phone: lead.phone, project: clip(lead.project_description, 160), link: leadHref(lead.id) } : null,
    };
  });
}

async function listAppointments(ctx: ToolContext, input: Record<string, unknown>) {
  if (!hasDataAccess(ctx.profile)) return { error: 'no_access' };
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const today = dateInZone(ctx.now, ctx.tz);
  const fromStr = typeof input.from_date === 'string' && dateRe.test(input.from_date) ? input.from_date : today;
  const toStr = typeof input.to_date === 'string' && dateRe.test(input.to_date) ? input.to_date : fromStr;
  const from = dayStart(fromStr, ctx.tz);
  const to = new Date(dayStart(toStr, ctx.tz).getTime() + 24 * 3_600_000);
  if (to.getTime() - from.getTime() > 31 * 24 * 3_600_000) return { error: 'range_too_large', max_days: 31 };
  const rows = await appointmentsBetween(ctx, from, to, clamp(input.limit, 1, 30, 20));
  if (!rows) return { error: 'lookup_failed' };
  return { timezone: ctx.tz, from: fromStr, to: toStr, count: rows.length, appointments: rows };
}

async function attentionSummary(ctx: ToolContext) {
  if (!hasDataAccess(ctx.profile)) return { error: 'no_access' };
  const tenant = tenantOf(ctx.profile);
  const today = dateInZone(ctx.now, ctx.tz);
  const dayMs = 24 * 3_600_000;
  const todayStart = dayStart(today, ctx.tz);
  const staleBefore = new Date(ctx.now.getTime() - 3 * dayMs).toISOString();

  // Needs a first contact. Contractors: leads assigned to them that are still "assigned/accepted". Staff: new leads.
  let firstQ = leadsQuery(ctx, 'id, first_name, last_name, status, created_at, city')
    .is('archived_at', null).order('created_at', { ascending: true }).limit(10);
  firstQ = tenant ? firstQ.in('lead_assignments.status', ['assigned', 'accepted']) : firstQ.eq('status', 'new');

  // Active leads nobody has touched for 3+ days.
  const staleQ = leadsQuery(ctx, 'id, first_name, last_name, status, last_contact_date, created_at')
    .is('archived_at', null).in('status', ACTIVE_STATUSES)
    .or(`last_contact_date.is.null,last_contact_date.lt.${staleBefore}`).lt('created_at', staleBefore)
    .order('created_at', { ascending: true }).limit(10);

  const followQ = ctx.db.from('lead_activities').select('lead_id, created_at, metadata')
    .not('metadata->>follow_up_on', 'is', null).order('created_at', { ascending: false }).limit(60);

  const [first, stale, follow, todayAppts, tomorrowAppts] = await Promise.all([
    firstQ, staleQ, followQ,
    appointmentsBetween(ctx, todayStart, new Date(todayStart.getTime() + dayMs), 15),
    appointmentsBetween(ctx, new Date(todayStart.getTime() + dayMs), new Date(todayStart.getTime() + 2 * dayMs), 15),
  ]);

  const leadRow = (r: unknown) => {
    const l = stripJoin(r as Record<string, unknown>);
    return { id: l.id, name: fullName(l), status: l.status, city: l.city, created: fmtInZone(l.created_at as string, ctx.tz), last_contact: fmtInZone((l.last_contact_date as string) ?? null, ctx.tz), link: leadHref(l.id as string) };
  };

  // A follow-up counts as open until a later logged contact attempt on that lead.
  const followRows = (follow.data ?? []) as { lead_id: string; created_at: string; metadata: { follow_up_on?: string } }[];
  const ids = [...new Set(followRows.map(f => f.lead_id))];
  let followUps: unknown[] = [];
  if (ids.length) {
    const [accessible, contacts] = await Promise.all([
      leadsQuery(ctx, 'id, first_name, last_name').in('id', ids),
      ctx.db.from('lead_activities').select('lead_id, created_at').eq('type', 'contact_attempt').in('lead_id', ids),
    ]);
    const visible = new Map((accessible.data ?? []).map((r: any) => [r.id as string, r]));
    followUps = followRows
      .filter(f => visible.has(f.lead_id) && typeof f.metadata?.follow_up_on === 'string' && f.metadata.follow_up_on <= today)
      .filter(f => !(contacts.data ?? []).some((c: any) => c.lead_id === f.lead_id && c.created_at > f.created_at))
      .slice(0, 10)
      .map(f => {
        const lead = visible.get(f.lead_id) as Record<string, unknown>;
        return { lead_id: f.lead_id, name: fullName(lead), due: f.metadata.follow_up_on, overdue: (f.metadata.follow_up_on as string) < today, link: leadHref(f.lead_id) };
      });
  }

  return {
    timezone: ctx.tz, today,
    needs_first_contact: (first.data ?? []).map(leadRow),
    no_activity_3_plus_days: (stale.data ?? []).map(leadRow),
    follow_ups_due: followUps,
    appointments_today: todayAppts ?? [],
    appointments_tomorrow: tomorrowAppts ?? [],
    note: 'Follow-ups come from dated notes saved on leads. The app does not send reminder notifications.',
  };
}

// ---- propose tools (write nothing to the CRM) ------------------------------

const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));

export function actionKey(conversationId: string, kind: string, leadId: string, payload: unknown): string {
  return createHash('sha256').update(`${conversationId}|${kind}|${leadId}|${stable(payload)}`).digest('hex');
}

export async function createAction(
  ctx: ToolContext,
  spec: { kind: ActionKind; leadId?: string | null; documentId?: string | null; payload: Record<string, unknown>; preview: ActionPreview; keySeed?: string }
) {
  const key = actionKey(ctx.conversationId, spec.kind, spec.leadId ?? spec.documentId ?? spec.keySeed ?? '', spec.payload);
  const row = {
    conversation_id: ctx.conversationId, user_id: ctx.profile.id, contractor_id: tenantOf(ctx.profile), kind: spec.kind, lead_id: spec.leadId ?? null,
    document_id: spec.documentId ?? null, payload: spec.payload, preview: spec.preview, idempotency_key: key, status: 'proposed',
  };
  const { data, error } = await ctx.admin.from('assistant_actions').insert(row).select('id, status, preview').single();
  let result = data as { id: string; status: string; preview: ActionPreview } | null;
  let duplicate = false;
  if (error) {
    if (error.code !== '23505') return { error: 'could_not_create_proposal' as const };
    // The same proposal is already live (proposed / executing / executed): return it, never a second one.
    const { data: existing } = await ctx.admin.from('assistant_actions').select('id, status, preview')
      .eq('user_id', ctx.profile.id).eq('idempotency_key', key).in('status', ['proposed', 'executing', 'executed']).maybeSingle();
    if (!existing) return { error: 'could_not_create_proposal' as const };
    result = existing as typeof result;
    duplicate = true;
  }
  const action: ProposedAction = { id: result!.id, kind: spec.kind, status: result!.status, duplicate, preview: result!.preview };
  ctx.onAction?.(action);
  return action;
}

const noteInput = z.object({
  lead_id: z.string().refine(isUuid, 'lead_id must be a lead id from a previous lookup'),
  note: z.string().trim().min(3).max(1500),
  next_step: z.string().trim().max(300).optional(),
  follow_up_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** The text that will be saved. Built here, from validated fields, so the preview and the write cannot differ. */
export function composeNoteBody(p: { note: string; next_step?: string; follow_up_on?: string }, tz: string): string {
  const lines = [p.note.trim()];
  if (p.next_step) lines.push(`Next step: ${p.next_step.trim()}`);
  if (p.follow_up_on) {
    const label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${p.follow_up_on}T12:00:00Z`));
    lines.push(`Follow up on: ${label}`);
  }
  void tz;
  return lines.join('\n');
}

async function proposeNote(ctx: ToolContext, input: Record<string, unknown>) {
  const parsed = noteInput.safeParse(input);
  if (!parsed.success) return { error: 'invalid_input', details: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).slice(0, 4) };
  const p = parsed.data;
  if (p.follow_up_on) {
    const today = dateInZone(ctx.now, ctx.tz);
    if (p.follow_up_on < today) return { error: 'follow_up_in_the_past', today };
    if (Number.isNaN(new Date(`${p.follow_up_on}T12:00:00Z`).getTime())) return { error: 'invalid_date' };
  }
  const lead = await loadAccessibleLead(ctx.db, ctx.profile, p.lead_id);
  if (!lead) return { error: 'not_found' };
  const payload = { note: p.note, ...(p.next_step ? { next_step: p.next_step } : {}), ...(p.follow_up_on ? { follow_up_on: p.follow_up_on } : {}) };
  const body = composeNoteBody(payload, ctx.tz);
  return createAction(ctx, {
    kind: 'add_note', leadId: p.lead_id, payload,
    preview: {
      title: p.follow_up_on ? 'Add note and follow-up date' : 'Add note',
      target: { label: fullName(lead), href: leadHref(p.lead_id) },
      lines: body.split('\n'),
      warning: p.follow_up_on ? 'This saves a dated note on the lead. HomeQuote does not send reminder notifications for it.' : undefined,
    },
  });
}

async function proposeStatus(ctx: ToolContext, input: Record<string, unknown>) {
  if (!isUuid(input.lead_id)) return { error: 'invalid_lead_id' };
  const status = typeof input.status === 'string' ? input.status : '';
  const allowed = allowedStatusesFor(ctx.profile);
  if (!allowed.includes(status)) return { error: 'status_not_allowed_for_your_role', allowed };
  const lead = await loadAccessibleLead(ctx.db, ctx.profile, input.lead_id);
  if (!lead) return { error: 'not_found' };

  let current = String(lead.status);
  if (ctx.profile.role === 'contractor') {
    const { data } = await ctx.db.from('lead_assignments').select('status').eq('lead_id', lead.id).eq('contractor_id', tenantOf(ctx.profile)!).maybeSingle();
    if (!data) return { error: 'not_found' };
    current = String((data as { status: string }).status);
  }
  if (current === status) return { error: 'already_that_status', status };
  return createAction(ctx, {
    kind: 'update_status', leadId: lead.id, payload: { status },
    preview: { title: 'Update status', target: { label: fullName(lead), href: leadHref(lead.id) }, lines: [`${current.replace(/_/g, ' ')} → ${status.replace(/_/g, ' ')}`] },
  });
}

// ---- registry --------------------------------------------------------------

export interface ToolDef {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
  run: (ctx: ToolContext, input: Record<string, unknown>) => Promise<unknown>;
}

const noInput = { type: 'object' as const, properties: {}, additionalProperties: false as const };

export const TOOLS: ToolDef[] = [
  {
    name: 'attention_summary',
    description: 'What needs the user’s attention now: leads awaiting first contact, leads with no activity for 3+ days, follow-ups due, and today’s and tomorrow’s appointments. Use for "what needs my attention", "what’s on today/tomorrow", "who haven’t I followed up with".',
    input_schema: noInput,
    run: ctx => attentionSummary(ctx),
  },
  {
    name: 'search_leads',
    description: 'Find leads the user can see by name, phone, email, city or address, and/or by status. Returns at most 10 compact rows with ids and links. Use it to resolve "Sarah" to a lead id; if several match, ask the user which one.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name, phone, email, city or address fragment.' },
        status: { type: 'string', enum: [...LEAD_STATUSES] },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
    run: searchLeads,
  },
  {
    name: 'get_lead',
    description: 'Full details for ONE lead: contact info, project, status, assignments, appointments, recent activity/notes, and which key facts are missing. Use for briefings and drafts. lead_id must come from the page context or search_leads.',
    input_schema: { type: 'object', properties: { lead_id: { type: 'string', description: 'Lead UUID' } }, required: ['lead_id'], additionalProperties: false },
    run: getLead,
  },
  {
    name: 'list_appointments',
    description: 'Appointments in a date range in the user’s time zone (defaults to today). Dates are YYYY-MM-DD, max 31 days.',
    input_schema: {
      type: 'object',
      properties: { from_date: { type: 'string' }, to_date: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 30 } },
      additionalProperties: false,
    },
    run: listAppointments,
  },
  {
    name: 'propose_note',
    description: 'PROPOSE saving a note (optionally with a next step and a follow-up date) on a lead. Nothing is saved until the user presses Confirm on the card. Resolve the lead first (search_leads); never guess the lead. Write the note in the user’s own facts only.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        note: { type: 'string', description: 'What happened, using only facts the user stated.' },
        next_step: { type: 'string' },
        follow_up_on: { type: 'string', description: 'YYYY-MM-DD in the user’s time zone, today or later.' },
      },
      required: ['lead_id', 'note'],
      additionalProperties: false,
    },
    run: proposeNote,
  },
  {
    name: 'propose_status_change',
    description: 'PROPOSE changing a lead’s status. Nothing changes until the user presses Confirm. Only call when the user clearly asked for a status change.',
    input_schema: {
      type: 'object',
      properties: { lead_id: { type: 'string' }, status: { type: 'string', description: 'A valid status for the user’s role.' } },
      required: ['lead_id', 'status'],
      additionalProperties: false,
    },
    run: proposeStatus,
  },
];
