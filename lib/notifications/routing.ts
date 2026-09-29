import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types';
import { DEFAULT_TZ } from '@/components/calls/format';
import { FALLBACK_URL, safeInternalUrl } from './url';
import {
  ALLOWED_AUDIENCES,
  AUDIENCES,
  DEFAULT_ROUTING,
  isNotificationType,
  type Audience,
  type NotificationType,
  type RoutingRule,
} from './types';

type Db = ReturnType<typeof createAdminClient>;

/** A row of public.notification_events. */
export interface NotificationEvent {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  lead_id: string | null;
  contractor_id: string | null;
  payload: Record<string, unknown>;
}

export interface OutgoingNotification {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  entityId: string;
  metadata: Record<string, unknown>;
}

interface Person {
  id: string;
  role: UserRole;
  contractor_id?: string | null;
}

type Via = Audience | 'specific';
interface Candidate {
  id: string;
  via: Via;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/**
 * FAIL-CLOSED recipient resolution.
 *
 * The backend decides the exact audience BEFORE anything is created or sent;
 * nothing is ever broadcast and filtered later. The audience comes from the
 * admin's routing rule for the event type (defaults in types.ts), resolved from
 * the event's own records:
 *
 *   admins               active admins
 *   assigned_setter      the setter tied to THIS lead/appointment (assignee,
 *                        booker, lead creator) — or a prospect's partner
 *   assigned_caller      the caller tied to it — or the prospect's assignee
 *   assigned_contractor  users of the ONE contractor company that owns this
 *                        assignment (its assigned user, or the company's users)
 *   specific_user_ids    hand-picked HomeQuote staff
 *
 * Then every candidate passes authorize(): re-read from the database, must be
 * active, and a contractor user must (a) have role = contractor, (b) belong to
 * the event's contractor, AND (c) that contractor must really hold an
 * assignment on the lead. A contractor can never be reached any other way —
 * not by role, not by being hand-picked. Anything unresolved yields NO
 * recipients, never "everyone".
 *
 * Text never contains a homeowner's name, phone, email, street address, notes
 * or money — only "service — city" and a time.
 */
export async function buildNotifications(event: NotificationEvent, db: Db): Promise<OutgoingNotification[]> {
  if (!isNotificationType(event.type)) return [];
  const type = event.type;
  const ctx: Ctx = { db, event, type, entityId: event.entity_id, rule: await loadRule(db, type) };

  switch (type) {
    case 'new_lead':
    case 'form_submission':
      return newLead(ctx);
    case 'lead_assigned':
      return leadAssigned(ctx);
    case 'appointment_booked':
    case 'appointment_changed':
    case 'appointment_cancelled':
      return event.entity_type === 'prospect_sales_appointment' ? prospectAppointment(ctx) : homeownerAppointment(ctx);
    case 'callback_due':
      return callbackDue(ctx);
    case 'payment_received':
      return staffEvent(ctx, '💰 Payment Received', 'A Growth Tools payment was confirmed.', '/app/service-requests');
    case 'workflow_alert': {
      const p = event.payload ?? {};
      const named = Array.isArray(p.userIds) ? (p.userIds.filter((x) => typeof x === 'string') as string[]) : [];
      // A workflow names its own audience; otherwise the routing rule decides.
      const cands: Candidate[] = named.map((id) => ({ id, via: 'specific' as const }));
      if (!named.length) cands.push(...(await staffAudience(ctx, ctx.rule)));
      const people = await authorize(ctx, cands);
      return group(ctx, people, str(p.title) ?? 'Automation alert', str(p.body) ?? '', () => str(p.url) ?? FALLBACK_URL);
    }
  }
}

interface Ctx {
  db: Db;
  event: NotificationEvent;
  type: NotificationType;
  entityId: string;
  rule: RoutingRule;
  /** Set by the event handlers; what authorize() checks contractor users against. */
  contractorId?: string | null;
  leadId?: string | null;
}

// --- routing rule ------------------------------------------------------------------

async function loadRule(db: Db, type: NotificationType): Promise<RoutingRule> {
  const { data } = await db.from('notification_routing_rules').select('*').eq('type', type).maybeSingle();
  const base = DEFAULT_ROUTING[type];
  if (!data) return base;
  const row = data as Record<string, unknown>;
  const allowed = ALLOWED_AUDIENCES[type];
  const rule: RoutingRule = { ...base, specific_user_ids: [] };
  // Only audiences that are valid for this type can ever be switched on.
  for (const a of AUDIENCES) rule[a] = allowed.includes(a) && row[a] === true;
  rule.specific_user_ids = Array.isArray(row.specific_user_ids)
    ? (row.specific_user_ids as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 50)
    : [];
  return rule;
}

// --- people ----------------------------------------------------------------------------

async function peopleByIds(db: Db, ids: (string | null | undefined)[]): Promise<Person[]> {
  const list = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (list.length === 0) return [];
  const { data } = await db.from('profiles').select('id, role, contractor_id').in('id', list).eq('is_active', true);
  return (data ?? []) as Person[];
}

async function admins(db: Db): Promise<Person[]> {
  const { data } = await db.from('profiles').select('id, role, contractor_id').eq('role', 'admin').eq('is_active', true);
  return (data ?? []) as Person[];
}

async function contractorUsers(db: Db, contractorId: string | null | undefined): Promise<Person[]> {
  if (!contractorId) return [];
  const { data } = await db
    .from('profiles')
    .select('id, role, contractor_id')
    .eq('contractor_id', contractorId)
    .eq('role', 'contractor')
    .eq('is_active', true);
  return (data ?? []) as Person[];
}

const cand = (people: Person[], via: Via): Candidate[] => people.map((p) => ({ id: p.id, via }));

/** Audiences that need no event records: admins + hand-picked staff. */
async function staffAudience(ctx: Ctx, rule: RoutingRule, exclude: (string | null)[] = []): Promise<Candidate[]> {
  const out: Candidate[] = [];
  if (rule.admins) out.push(...cand((await admins(ctx.db)).filter((p) => !exclude.includes(p.id)), 'admins'));
  out.push(...rule.specific_user_ids.map((id) => ({ id, via: 'specific' as const })));
  return out;
}

/**
 * The final, independent gate. Re-reads every candidate and applies the
 * tenant rules; a candidate that cannot be positively authorized is dropped.
 */
async function authorize(ctx: Ctx, candidates: Candidate[]): Promise<Person[]> {
  const byId = new Map<string, Via[]>();
  for (const c of candidates) byId.set(c.id, [...(byId.get(c.id) ?? []), c.via]);
  const people = await peopleByIds(ctx.db, Array.from(byId.keys()));

  // Does this contractor really hold an assignment on this lead?
  let contractorHoldsLead: boolean | null = null;
  const holdsLead = async () => {
    if (contractorHoldsLead !== null) return contractorHoldsLead;
    if (!ctx.contractorId || !ctx.leadId) return (contractorHoldsLead = false);
    const { data } = await ctx.db
      .from('lead_assignments')
      .select('id')
      .eq('lead_id', ctx.leadId)
      .eq('contractor_id', ctx.contractorId)
      .maybeSingle();
    return (contractorHoldsLead = !!data);
  };

  const allowed: Person[] = [];
  for (const p of people) {
    const vias = byId.get(p.id) ?? [];
    if (p.role === 'admin' || p.role === 'setter' || p.role === 'caller') {
      allowed.push(p);
    } else if (
      p.role === 'contractor' &&
      vias.includes('assigned_contractor') && // never via role, never hand-picked
      !!ctx.contractorId &&
      p.contractor_id === ctx.contractorId &&
      (await holdsLead())
    ) {
      allowed.push(p);
    }
  }
  return allowed;
}

// --- destinations ------------------------------------------------------------------------

/** Callers never see homeowner leads; send them to their workspace instead. */
function leadUrl(role: UserRole, leadId: string | null): string {
  if (!leadId) return FALLBACK_URL;
  return role === 'caller' ? '/app/calls' : `/app/leads/${leadId}`;
}

function appointmentsUrl(role: UserRole): string {
  return role === 'caller' ? '/app/calls/appointments' : '/app/appointments';
}

/** One OutgoingNotification per distinct URL so every recipient lands on a page their role can open. */
function group(
  ctx: Ctx,
  people: Person[],
  title: string,
  body: string,
  urlFor: (role: UserRole) => string
): OutgoingNotification[] {
  const byUrl = new Map<string, string[]>();
  for (const person of people) {
    const url = safeInternalUrl(urlFor(person.role));
    byUrl.set(url, [...(byUrl.get(url) ?? []), person.id]);
  }
  return Array.from(byUrl, ([url, userIds]) => ({
    userIds,
    type: ctx.type,
    title,
    body,
    url,
    entityId: ctx.entityId,
    metadata: { eventId: ctx.event.id },
  }));
}

async function staffEvent(ctx: Ctx, title: string, body: string, url: string): Promise<OutgoingNotification[]> {
  const people = await authorize(ctx, await staffAudience(ctx, ctx.rule));
  return group(ctx, people, title, body, () => url);
}

// --- text ----------------------------------------------------------------------------------

/** "Pool Remodel — Encino": service and city only. */
async function leadSummary(db: Db, leadId: string | null): Promise<string> {
  if (!leadId) return 'Open HomeQuote for details';
  const { data } = await db
    .from('leads')
    .select('city, vertical:verticals(name), sub_service:sub_services(name)')
    .eq('id', leadId)
    .maybeSingle();
  const row = data as unknown as {
    city: string | null;
    vertical: { name: string } | { name: string }[] | null;
    sub_service: { name: string } | { name: string }[] | null;
  } | null;
  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
  const service = one(row?.sub_service)?.name ?? one(row?.vertical)?.name ?? 'New lead';
  const city = row?.city?.trim();
  return city ? `${service} — ${city}` : service;
}

export function formatWhen(iso: string | null | undefined, timeZone = DEFAULT_TZ): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

// --- homeowner-side association ------------------------------------------------------------

interface Association {
  leadId: string | null;
  contractorId: string | null;
  /** Users tied to this lead/appointment: the assignee, the booker, the lead's creator. */
  linkedIds: string[];
  assigneeId: string | null;
  assignedBy: string | null;
  bookedBy: string | null;
  scheduledAt: string | null;
}

async function associate(ctx: Ctx, opts: { assignmentId?: string | null; appointmentId?: string | null }): Promise<Association> {
  const p = ctx.event.payload ?? {};
  const a: Association = {
    leadId: ctx.event.lead_id ?? str(p.leadId),
    contractorId: ctx.event.contractor_id ?? str(p.contractorId),
    linkedIds: [],
    assigneeId: null,
    assignedBy: null,
    bookedBy: null,
    scheduledAt: str(p.scheduledAt),
  };
  if (opts.assignmentId) {
    const { data } = await ctx.db
      .from('lead_assignments')
      .select('lead_id, contractor_id, assigned_user_id, assigned_by')
      .eq('id', opts.assignmentId)
      .maybeSingle();
    const row = data as { lead_id: string; contractor_id: string; assigned_user_id: string | null; assigned_by: string | null } | null;
    if (row) {
      a.leadId = row.lead_id;
      a.contractorId = row.contractor_id;
      a.assigneeId = row.assigned_user_id;
      a.assignedBy = row.assigned_by;
    }
  }
  if (opts.appointmentId) {
    const { data } = await ctx.db.from('appointments').select('created_by, scheduled_at').eq('id', opts.appointmentId).maybeSingle();
    const row = data as { created_by: string | null; scheduled_at: string | null } | null;
    a.bookedBy = row?.created_by ?? null;
    a.scheduledAt = a.scheduledAt ?? row?.scheduled_at ?? null;
  }
  if (a.leadId) {
    const { data } = await ctx.db.from('leads').select('created_by').eq('id', a.leadId).maybeSingle();
    a.linkedIds = [a.assigneeId, a.bookedBy, (data as { created_by: string | null } | null)?.created_by ?? null].filter((x): x is string => !!x);
  } else {
    a.linkedIds = [a.assigneeId, a.bookedBy].filter((x): x is string => !!x);
  }
  ctx.leadId = a.leadId;
  ctx.contractorId = a.contractorId;
  return a;
}

/** Resolve the rule's audiences for a homeowner lead/appointment event. */
async function homeownerAudience(ctx: Ctx, a: Association, exclude: (string | null)[], includeAdmins = true): Promise<Candidate[]> {
  const rule = ctx.rule;
  const out: Candidate[] = [];
  if (rule.admins && includeAdmins) out.push(...cand((await admins(ctx.db)).filter((p) => !exclude.includes(p.id)), 'admins'));
  out.push(...rule.specific_user_ids.map((id) => ({ id, via: 'specific' as const })));

  if (rule.assigned_setter || rule.assigned_caller) {
    const linked = await peopleByIds(ctx.db, a.linkedIds);
    if (rule.assigned_setter) out.push(...cand(linked.filter((p) => p.role === 'setter'), 'assigned_setter'));
    if (rule.assigned_caller) out.push(...cand(linked.filter((p) => p.role === 'caller'), 'assigned_caller'));
  }
  if (rule.assigned_contractor && a.contractorId) {
    // A named assignee narrows it to that person (and only if they belong to the company);
    // with no assignee, the company's own users.
    const users = await contractorUsers(ctx.db, a.contractorId);
    out.push(...cand(a.assigneeId ? users.filter((u) => u.id === a.assigneeId) : users, 'assigned_contractor'));
  }
  return out;
}

// --- per-event routing -------------------------------------------------------------------------

async function newLead(ctx: Ctx): Promise<OutgoingNotification[]> {
  const leadId = ctx.event.lead_id ?? ctx.entityId;
  const a = await associate(ctx, {});
  a.leadId = leadId;
  ctx.leadId = leadId;
  // A brand-new lead has no contractor recipient: contractors are told when it is ASSIGNED to them.
  const cands = (await homeownerAudience({ ...ctx, rule: { ...ctx.rule, assigned_contractor: false, assigned_caller: false } }, a, [])).filter(
    (c) => c.via !== 'assigned_contractor'
  );
  const people = await authorize(ctx, cands);
  const body = await leadSummary(ctx.db, leadId);
  const title = ctx.type === 'form_submission' ? '🔥 New Form Submission' : '🚨 New Lead';
  return group(ctx, people, title, body, (role) => leadUrl(role, leadId));
}

async function leadAssigned(ctx: Ctx): Promise<OutgoingNotification[]> {
  const overrideAssignee = str(ctx.event.payload.assignedUserId);
  const a = await associate(ctx, { assignmentId: ctx.entityId });
  if (!a.leadId || !a.contractorId) return []; // unknown assignment: nobody
  if (overrideAssignee) {
    a.assigneeId = overrideAssignee;
    a.linkedIds = [...a.linkedIds, overrideAssignee];
  }
  // Whoever performed THIS change (a reassignment names its actor; otherwise the original assigner).
  const actorId = str(ctx.event.payload.actorId) ?? a.assignedBy;
  // Admins are told about hand assignments; a funnel's automatic assignment already
  // produced their "new form submission" alert.
  const handAssigned = !!(a.assignedBy || overrideAssignee);
  const cands = await homeownerAudience(ctx, a, [actorId], handAssigned);
  const people = await authorize(ctx, cands);
  const body = await leadSummary(ctx.db, a.leadId);
  const leadId = a.leadId;
  return group(ctx, people, 'New Lead Assigned', body, (role) => leadUrl(role, leadId));
}

async function homeownerAppointment(ctx: Ctx): Promise<OutgoingNotification[]> {
  const p = ctx.event.payload;
  const a = await associate(ctx, { assignmentId: str(p.assignmentId), appointmentId: str(p.appointmentId) });
  // An admin who booked it themselves does not need to be told.
  const cands = await homeownerAudience(ctx, a, [a.bookedBy]);
  const people = await authorize(ctx, cands);

  const summary = await leadSummary(ctx.db, a.leadId);
  const when = formatWhen(a.scheduledAt);
  const body = when ? `${summary} — ${when}` : summary;
  const title =
    ctx.type === 'appointment_booked'
      ? '📅 Appointment Booked'
      : ctx.type === 'appointment_changed'
        ? '🔄 Appointment Changed'
        : '❌ Appointment Cancelled';
  return group(ctx, people, title, body, appointmentsUrl);
}

async function prospectAppointment(ctx: Ctx): Promise<OutgoingNotification[]> {
  const p = ctx.event.payload;
  const prospectId = str(p.prospectId);
  const { data } = prospectId
    ? await ctx.db.from('contractor_prospects').select('company_name, assigned_to').eq('id', prospectId).maybeSingle()
    : { data: null };
  const prospect = data as { company_name: string; assigned_to: string | null } | null;
  if (!prospect) return [];
  // Calling workspace: the partner who booked it is the "setter", the prospect's owner the "caller".
  const staff = await peopleByIds(ctx.db, [str(p.partnerId), prospect.assigned_to]);
  const out = await staffAudience(ctx, ctx.rule);
  if (ctx.rule.assigned_setter) out.push(...cand(staff.filter((s) => s.id === str(p.partnerId)), 'assigned_setter'));
  if (ctx.rule.assigned_caller) out.push(...cand(staff.filter((s) => s.id === prospect.assigned_to), 'assigned_caller'));
  const people = await authorize(ctx, out);
  const when = formatWhen(str(p.scheduledAt));
  const title =
    ctx.type === 'appointment_booked'
      ? '📅 Sales Call Booked'
      : ctx.type === 'appointment_changed'
        ? '🔄 Sales Call Changed'
        : '❌ Sales Call Cancelled';
  return group(ctx, people, title, when ? `${prospect.company_name} — ${when}` : prospect.company_name, () => '/app/calls/appointments');
}

async function callbackDue(ctx: Ctx): Promise<OutgoingNotification[]> {
  const prospectId = str(ctx.event.payload.prospectId) ?? ctx.entityId;
  const { data } = await ctx.db
    .from('contractor_prospects')
    .select('company_name, assigned_to, do_not_call_at')
    .eq('id', prospectId)
    .maybeSingle();
  const prospect = data as { company_name: string; assigned_to: string | null; do_not_call_at: string | null } | null;
  if (!prospect || prospect.do_not_call_at) return [];
  const out = await staffAudience(ctx, ctx.rule);
  // Fail closed: an unassigned prospect's callback reaches only whoever the rule names explicitly.
  if (ctx.rule.assigned_caller && prospect.assigned_to) {
    out.push(...cand(await peopleByIds(ctx.db, [prospect.assigned_to]), 'assigned_caller'));
  }
  const people = await authorize(ctx, out);
  return group(ctx, people, '📞 Callback Due', prospect.company_name, () => `/app/calls/${prospectId}`);
}
