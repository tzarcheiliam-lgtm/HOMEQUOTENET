/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';
import { usesNativeCalendar } from '@/lib/funnels/schema';
import { mapCalendar, type BookingCalendar } from './types';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Leads who gave their details on a funnel / estimator that books on a
 * HomeQuote calendar, were qualified (offered times), and did not book a call
 * within 2 hours. Shared by the follow-up TEXT (lib/sms/reminders.ts,
 * runTextReminders, so it lives with the other no-reply follow-ups) and the
 * follow-up EMAIL (lib/booking/recovery.server.ts). Each sends once per lead.
 */
export const UNBOOKED_AFTER_MS = 2 * 3_600_000;
/** Looked at for a day after it becomes due, so switching it on never mails old leads. */
export const UNBOOKED_WINDOW_MS = 24 * 3_600_000;

export interface UnbookedLead {
  sessionId: string;
  leadId: string;
  submittedAt: Date;
  /** Booking ticket source for the session ('estimator' when the estimator saved it). */
  source: 'funnel' | 'estimator';
  contractorId: string | null;
  /** The industry of the funnel ("bathroom remodeling"), for leads without an estimator design. */
  industry: string | null;
  isDemo: boolean;
}

export async function findUnbookedLeads(db: Db, now: Date): Promise<UnbookedLead[]> {
  const from = new Date(now.getTime() - UNBOOKED_AFTER_MS - UNBOOKED_WINDOW_MS).toISOString();
  const to = new Date(now.getTime() - UNBOOKED_AFTER_MS).toISOString();
  const { data, error } = await db.from('funnel_sessions')
    .select('id,funnel_id,lead_id,qualified,booked_at,contact_submitted_at,config_snapshot')
    .gte('contact_submitted_at', from).lte('contact_submitted_at', to).is('booked_at', null).eq('qualified', true)
    .not('lead_id', 'is', null).limit(500);
  if (error) return [];
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];
  const funnelIds = [...new Set(rows.map((r) => r.funnel_id))];
  const sessionIds = rows.map((r) => r.id);
  const [{ data: funnels }, { data: viewed }, { data: est }] = await Promise.all([
    db.from('funnels').select('id,is_demo,contractor_id').in('id', funnelIds),
    db.from('funnel_events').select('session_id').eq('event', 'calendar_viewed').in('session_id', sessionIds),
    db.from('lead_activities').select('lead_id').in('lead_id', rows.map((r) => r.lead_id)).not('metadata->estimator', 'is', null).limit(1000),
  ]);
  const funnelById = new Map(((funnels ?? []) as any[]).map((f) => [f.id, f]));
  const sawCalendar = new Set(((viewed ?? []) as any[]).map((v) => v.session_id));
  const estimatorLeads = new Set(((est ?? []) as any[]).map((a) => a.lead_id));
  const out: UnbookedLead[] = [];
  const seen = new Set<string>();
  for (const r of rows.sort((a, b) => String(b.contact_submitted_at).localeCompare(String(a.contact_submitted_at)))) {
    if (seen.has(r.lead_id)) continue; // the latest submission per lead
    seen.add(r.lead_id);
    const f = funnelById.get(r.funnel_id) as any;
    if (!f || f.is_demo) continue;
    const cfg = r.config_snapshot ?? {};
    // Only where we offered our own calendar (a Calendly / GHL funnel books elsewhere).
    if (!usesNativeCalendar(cfg) && !sawCalendar.has(r.id)) continue;
    out.push({
      sessionId: r.id, leadId: r.lead_id, submittedAt: new Date(r.contact_submitted_at), source: estimatorLeads.has(r.lead_id) ? 'estimator' : 'funnel',
      contractorId: f.contractor_id ?? null, industry: typeof cfg.industry === 'string' ? cfg.industry : null, isDemo: !!f.is_demo,
    });
  }
  return out;
}

/**
 * Why NOT to follow up (null = go ahead): they booked or have a call, the lead moved on or was archived, a person
 * already texted or called them, or they asked for a callback. Same rules for the text and the email.
 */
export async function unbookedBlocker(db: Db, u: Pick<UnbookedLead, 'leadId' | 'submittedAt'>): Promise<string | null> {
  const since = u.submittedAt.toISOString();
  const { data: lead } = await db.from('leads').select('id,status,archived_at').eq('id', u.leadId).maybeSingle();
  if (!lead) return 'The lead was not found.';
  if ((lead as any).archived_at) return 'The lead is archived.';
  if (!['new', 'contact_attempted', 'qualified', 'assigned'].includes((lead as any).status)) return 'The lead has moved on (booked, lost or closed).';
  const { data: appts } = await db.from('appointments').select('id').eq('lead_id', u.leadId).neq('status', 'cancelled').limit(1);
  if (appts?.length) return 'They already have a call or visit.';
  const { data: touched } = await db.from('lead_activities').select('id').eq('lead_id', u.leadId).in('type', ['contact_attempt', 'appointment']).gt('created_at', since).limit(1);
  if (touched?.length) return 'Someone from the team already called them (or they asked for a callback).';
  const { data: personText } = await db.from('sms_messages').select('id').eq('lead_id', u.leadId).eq('direction', 'out').eq('ai', false)
    .is('reminder_kind', null).is('workflow_step_run_id', null).gt('created_at', since).limit(1);
  if (personText?.length) return 'Someone from the team already texted them.';
  return null;
}

/** The calendar a lead's call goes on (the contractor's, else the HomeQuote team's), without creating one. */
export async function leadCalendar(db: Db, contractorId: string | null): Promise<BookingCalendar | null> {
  const q = contractorId
    ? db.from('booking_calendars').select('*').eq('kind', 'contractor').eq('contractor_id', contractorId)
    : db.from('booking_calendars').select('*').eq('kind', 'team');
  const { data } = await q.limit(1).maybeSingle();
  return data ? mapCalendar(data) : null;
}
