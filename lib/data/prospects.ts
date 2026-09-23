import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {
  ContractorProspect,
  Profile,
  ProspectCallAttempt,
  ProspectEmailLog,
  ProspectDisposition,
  ProspectSalesAppointment,
  SalesAppointmentStatus,
} from '@/lib/types';
import {
  CALL_PAGE_SIZE,
  QUEUE_DISPOSITIONS,
  type CallSort,
  type CallView,
} from '@/lib/calls/constants';
import {
  computeMetrics,
  dayBoundsInZone,
  type AttemptLike,
  type CallerMetrics,
} from '@/lib/calls/metrics';

/**
 * Data access for the calling workspace. Every query goes through the
 * user's own Supabase client, so RLS scopes rows by role before any filter
 * here is applied: a caller asking for "all" still only receives their own.
 */

import {
  assignedProfileIdForView,
  CALL_ASSIGNEE_ROLES,
  findCallerByName,
  type CallerOption,
} from '@/lib/calls/callers';
export { findCallerByName, type CallerOption };

type ProfileRow = Pick<Profile, 'id' | 'full_name' | 'email'>;

/**
 * The PostgREST builder's generic types are deep enough that casting back to
 * `typeof query` after a helper exceeds TypeScript's instantiation limit. A
 * minimal structural view of the methods this file uses avoids that, keeps
 * the helpers honest, and keeps `any` out.
 */
type ListQuery = {
  eq: (c: string, v: unknown) => ListQuery;
  neq: (c: string, v: unknown) => ListQuery;
  in: (c: string, v: readonly unknown[]) => ListQuery;
  is: (c: string, v: null) => ListQuery;
  not: (c: string, op: string, v: unknown) => ListQuery;
  lte: (c: string, v: unknown) => ListQuery;
  gt: (c: string, v: unknown) => ListQuery;
  or: (f: string) => ListQuery;
  ilike: (c: string, v: string) => ListQuery;
  contains: (c: string, v: readonly unknown[]) => ListQuery;
  order: (c: string, o?: { ascending?: boolean; nullsFirst?: boolean }) => ListQuery;
  range: (from: number, to: number) => ListQuery;
} & PromiseLike<{ data: ContractorProspect[] | null; count: number | null }>;

/** Active admins, callers and setters who can own a call list. */
export async function listCallers(): Promise<CallerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, account_status, deleted_at')
    .in('role', [...CALL_ASSIGNEE_ROLES])
    .eq('account_status', 'active')
    .is('deleted_at', null)
    .order('full_name', { ascending: true });
  return ((data ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    name: p.full_name || p.email || 'Caller',
    email: p.email,
  }));
}

export interface ProspectFilters {
  view?: CallView;
  q?: string;
  caller?: string; // profile id | 'unassigned'
  disposition?: ProspectDisposition;
  city?: string;
  county?: string;
  service?: string;
  niche?: string;
  callback?: 'due' | 'upcoming' | 'any';
  sort?: CallSort;
  page?: number;
}

export interface ProspectListRow extends ContractorProspect {
  assigned_name: string | null;
}

export interface ProspectListResult {
  rows: ProspectListRow[];
  total: number;
  page: number;
  pageSize: number;
}

function escapeForOr(value: string): string {
  return value.replace(/[(),%*]/g, ' ').trim();
}

/**
 * Applies a saved view. Views are filters, never copies: "Liam's list" is
 * `assigned_to = liam` over the one prospects table.
 */
function applyView(
  query: ListQuery,
  view: CallView,
  me: Profile,
  callers: CallerOption[],
  now: Date
) {
  switch (view) {
    case 'mine': {
      const assignedTo = assignedProfileIdForView('mine', me.id, callers);
      return query.eq('assigned_to', assignedTo).in('disposition', QUEUE_DISPOSITIONS);
    }
    case 'liam':
    case 'nadav': {
      const assignedTo = assignedProfileIdForView(view, me.id, callers);
      // No such caller yet → an empty, honest list rather than everything.
      return query.eq('assigned_to', assignedTo ?? '00000000-0000-0000-0000-000000000000');
    }
    case 'all':
      return query;
    case 'new':
      return query.eq('disposition', 'new');
    case 'callbacks':
      return query
        .not('next_callback_at', 'is', null)
        .lte('next_callback_at', now.toISOString())
        .in('disposition', QUEUE_DISPOSITIONS);
    case 'interested':
      return query.in('disposition', ['interested', 'follow_up_required']);
    case 'booked':
      return query.eq('disposition', 'appointment_booked');
    case 'dnc':
      return query.eq('disposition', 'do_not_call');
    default:
      return query;
  }
}

function applySort(query: ListQuery, sort: CallSort): ListQuery {
  switch (sort) {
    case 'newest':
      return query.order('created_at', { ascending: false });
    case 'fewest_attempts':
      return query
        .order('call_attempt_count', { ascending: true })
        .order('created_at', { ascending: true });
    case 'next_callback':
      return query
        .order('next_callback_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
    case 'oldest':
    default:
      return query.order('created_at', { ascending: true });
  }
}

export async function listProspects(
  filters: ProspectFilters,
  me: Profile,
  callers: CallerOption[]
): Promise<ProspectListResult> {
  const supabase = await createClient();
  const now = new Date();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * CALL_PAGE_SIZE;
  const to = from + CALL_PAGE_SIZE - 1;

  let query = supabase
    .from('contractor_prospects')
    .select('*', { count: 'exact' })
    .is('archived_at', null) as unknown as ListQuery;

  query = applyView(query, filters.view ?? 'mine', me, callers, now);

  if (filters.q) {
    const q = escapeForOr(filters.q);
    if (q) {
      query = query.or(
        `company_name.ilike.%${q}%,phone.ilike.%${q}%,website.ilike.%${q}%,city.ilike.%${q}%,decision_maker_name.ilike.%${q}%`
      );
    }
  }
  if (filters.caller === 'unassigned') query = query.is('assigned_to', null);
  else if (filters.caller) query = query.eq('assigned_to', filters.caller);
  if (filters.disposition) query = query.eq('disposition', filters.disposition);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.county) query = query.ilike('county', `%${filters.county}%`);
  if (filters.service) query = query.contains('primary_services', [filters.service]);
  if (filters.niche) query = query.eq('niche', filters.niche);
  if (filters.callback === 'due') {
    query = query.not('next_callback_at', 'is', null).lte('next_callback_at', now.toISOString());
  } else if (filters.callback === 'upcoming') {
    query = query.not('next_callback_at', 'is', null).gt('next_callback_at', now.toISOString());
  } else if (filters.callback === 'any') {
    query = query.not('next_callback_at', 'is', null);
  }

  // Callbacks view reads best soonest-first regardless of the chosen sort.
  const sort: CallSort =
    filters.sort ?? (filters.view === 'callbacks' ? 'next_callback' : 'oldest');
  query = applySort(query, sort).range(from, to);

  const { data, count } = await query;
  const nameById = new Map(callers.map((c) => [c.id, c.name]));
  // A call agent sees their own list labelled "Me" rather than their own name.
  if (me.role !== 'admin') nameById.set(me.id, me.full_name || me.email || 'Me');

  return {
    rows: ((data ?? []) as ContractorProspect[]).map((p) => ({
      ...p,
      assigned_name: p.assigned_to ? (nameById.get(p.assigned_to) ?? 'Assigned') : null,
    })),
    total: count ?? 0,
    page,
    pageSize: CALL_PAGE_SIZE,
  };
}

/** Distinct values for the filter selects, scoped by RLS like everything else. */
export async function listProspectFilterOptions(): Promise<{
  cities: string[];
  counties: string[];
  services: string[];
  niches: string[];
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contractor_prospects')
    .select('city, county, primary_services, niche')
    .is('archived_at', null)
    .limit(5000);
  const cities = new Set<string>();
  const counties = new Set<string>();
  const services = new Set<string>();
  const niches = new Set<string>();
  for (const r of data ?? []) {
    if (r.city) cities.add(r.city);
    if (r.county) counties.add(r.county);
    if (r.niche) niches.add(r.niche);
    for (const s of r.primary_services ?? []) services.add(s);
  }
  const sorted = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b));
  return {
    cities: sorted(cities),
    counties: sorted(counties),
    services: sorted(services),
    niches: sorted(niches),
  };
}

export interface ProspectDetail {
  prospect: ProspectListRow;
  attempts: ProspectCallAttempt[];
  emails: ProspectEmailLog[];
  appointments: ProspectSalesAppointment[];
}

export async function getProspect(
  id: string,
  callers: CallerOption[]
): Promise<ProspectDetail | null> {
  const supabase = await createClient();
  const [{ data: p }, { data: attempts }, { data: emails }, { data: appointments }] = await Promise.all([
    supabase.from('contractor_prospects').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('prospect_call_attempts')
      .select('*')
      .eq('prospect_id', id)
      .order('attempt_number', { ascending: false }),
    supabase
      .from('prospect_email_logs')
      .select('*')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('prospect_sales_appointments')
      .select('*')
      .eq('prospect_id', id)
      .order('scheduled_at', { ascending: false }),
  ]);
  if (!p) return null;
  const nameById = new Map(callers.map((c) => [c.id, c.name]));
  return {
    prospect: {
      ...(p as ContractorProspect),
      assigned_name: p.assigned_to ? (nameById.get(p.assigned_to) ?? 'Assigned') : null,
    },
    attempts: (attempts ?? []) as ProspectCallAttempt[],
    emails: (emails ?? []) as ProspectEmailLog[],
    appointments: (appointments ?? []) as ProspectSalesAppointment[],
  };
}

/**
 * The next prospect to open after saving an outcome: the oldest one still in
 * the caller's queue that is not the one just worked. Callbacks that are due
 * come first, because a promised time beats an untouched record.
 */
export async function nextProspectIdFor(
  me: Profile,
  currentId: string
): Promise<string | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from('contractor_prospects')
    .select('id')
    .eq('assigned_to', me.id)
    .is('archived_at', null)
    .in('disposition', QUEUE_DISPOSITIONS)
    .not('next_callback_at', 'is', null)
    .lte('next_callback_at', now)
    .neq('id', currentId)
    .order('next_callback_at', { ascending: true })
    .limit(1);
  if (due && due.length > 0) return due[0].id;

  const { data: next } = await supabase
    .from('contractor_prospects')
    .select('id')
    .eq('assigned_to', me.id)
    .is('archived_at', null)
    .in('disposition', QUEUE_DISPOSITIONS)
    .or(`next_callback_at.is.null,next_callback_at.lte.${now}`)
    .neq('id', currentId)
    .order('call_attempt_count', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1);
  return next && next.length > 0 ? next[0].id : null;
}

/* ---- Metrics ------------------------------------------------------------- */

export interface CallerDashboard {
  callsDueToday: number;
  callbacksDue: number;
  interestedOpen: number;
  appointmentsBooked: number;
  today: CallerMetrics;
  allTime: CallerMetrics;
}

/**
 * Operational numbers for one caller. Counts are from real rows; the rates
 * come from computeMetrics so the dashboard and the admin comparison agree.
 */
export async function getCallerDashboard(
  callerId: string,
  timeZone = 'America/Los_Angeles'
): Promise<CallerDashboard> {
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = dayBoundsInZone(now, timeZone);

  const [queue, callbacks, interested, booked, todayAttempts, allAttempts] = await Promise.all([
    supabase
      .from('contractor_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', callerId)
      .is('archived_at', null)
      .in('disposition', QUEUE_DISPOSITIONS)
      .or(`next_callback_at.is.null,next_callback_at.lte.${end.toISOString()}`),
    supabase
      .from('contractor_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', callerId)
      .is('archived_at', null)
      .in('disposition', QUEUE_DISPOSITIONS)
      .not('next_callback_at', 'is', null)
      .lte('next_callback_at', now.toISOString()),
    supabase
      .from('contractor_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', callerId)
      .is('archived_at', null)
      .in('disposition', ['interested', 'follow_up_required']),
    supabase
      .from('prospect_sales_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', callerId)
      .in('status', ['scheduled', 'confirmed', 'rescheduled']),
    supabase
      .from('prospect_call_attempts')
      .select('outcome, created_at')
      .eq('caller_id', callerId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString()),
    supabase
      .from('prospect_call_attempts')
      .select('outcome, created_at')
      .eq('caller_id', callerId),
  ]);

  return {
    callsDueToday: queue.count ?? 0,
    callbacksDue: callbacks.count ?? 0,
    interestedOpen: interested.count ?? 0,
    appointmentsBooked: booked.count ?? 0,
    today: computeMetrics((todayAttempts.data ?? []) as AttemptLike[]),
    allTime: computeMetrics((allAttempts.data ?? []) as AttemptLike[]),
  };
}

/* ---- Logs ---------------------------------------------------------------- */

export interface LogFilters {
  caller?: string;
  date_from?: string;
  date_to?: string;
  prospect?: string; // company name search
  outcome?: ProspectDisposition | 'interested_any' | 'booked' | 'callback' | 'dnc';
  page?: number;
}

export interface CallLogRow extends ProspectCallAttempt {
  company_name: string;
}

export async function listCallLogs(
  filters: LogFilters
): Promise<{ rows: CallLogRow[]; total: number; page: number; pageSize: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * CALL_PAGE_SIZE;
  const to = from + CALL_PAGE_SIZE - 1;

  let query = supabase
    .from('prospect_call_attempts')
    .select('*, prospect:contractor_prospects!inner(company_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('attempt_number', { ascending: false });

  if (filters.caller) query = query.eq('caller_id', filters.caller);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59.999Z`);
  if (filters.prospect) {
    query = query.ilike('prospect.company_name', `%${escapeForOr(filters.prospect)}%`);
  }
  switch (filters.outcome) {
    case undefined:
      break;
    case 'interested_any':
      query = query.in('outcome', ['interested', 'follow_up_required']);
      break;
    case 'booked':
      query = query.eq('outcome', 'appointment_booked');
      break;
    case 'callback':
      query = query.eq('outcome', 'callback_requested');
      break;
    case 'dnc':
      query = query.eq('outcome', 'do_not_call');
      break;
    default:
      query = query.eq('outcome', filters.outcome);
  }

  const { data, count } = await query.range(from, to);
  return {
    rows: ((data ?? []) as (ProspectCallAttempt & { prospect: { company_name: string } | null })[]).map(
      (r) => {
        const { prospect, ...rest } = r;
        return { ...rest, company_name: prospect?.company_name ?? 'Prospect' };
      }
    ),
    total: count ?? 0,
    page,
    pageSize: CALL_PAGE_SIZE,
  };
}

/* ---- Sales appointments --------------------------------------------------- */

export interface SalesAppointmentRow extends ProspectSalesAppointment {
  company_name: string;
  phone: string | null;
  partner_name: string | null;
}

export async function listSalesAppointments(
  callers: CallerOption[],
  filters: { partner?: string; status?: SalesAppointmentStatus; upcoming?: boolean } = {}
): Promise<SalesAppointmentRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('prospect_sales_appointments')
    .select('*, prospect:contractor_prospects!inner(company_name, phone)')
    .order('scheduled_at', { ascending: true });
  if (filters.partner) query = query.eq('partner_id', filters.partner);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.upcoming) query = query.gte('scheduled_at', new Date().toISOString());

  const { data } = await query.limit(500);
  const nameById = new Map(callers.map((c) => [c.id, c.name]));
  type Row = ProspectSalesAppointment & {
    prospect: { company_name: string; phone: string | null } | null;
  };
  return ((data ?? []) as Row[]).map((r) => {
    const { prospect, ...rest } = r;
    return {
      ...rest,
      company_name: prospect?.company_name ?? 'Prospect',
      phone: prospect?.phone ?? null,
      partner_name: rest.partner_id ? (nameById.get(rest.partner_id) ?? null) : null,
    };
  });
}
