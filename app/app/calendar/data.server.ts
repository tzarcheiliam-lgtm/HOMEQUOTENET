/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import type { BookingCalendar } from '@/lib/booking/types';
import { designsByLead, mapAppointmentRow, mapSalesRow, type CalendarEvent, type DesignSummary } from '@/components/calendar/view';

/**
 * Events on one booking calendar in a window, read through the SIGNED-IN
 * user's client so RLS decides what they see (0068: staff everything; a
 * contractor only rows on its own calendar or for leads assigned to it).
 *   team / contractor  calls on the calendar (appointments.calendar_id)
 *   contractor         + the company's on-site visits (no calendar), which block the calendar too
 *   sales              sales meetings on the calendar, plus open ones with no calendar (setter-booked)
 * Cancelled rows are included; the view fades them.
 */

/** Calls are 30 minutes and visits about an hour: start a little before the window so one that runs into it shows. */
const LOOKBACK_MS = 3 * 3_600_000;

const LEAD_COLS = 'id, first_name, last_name, phone, email, city, vertical:verticals(name), sub_service:sub_services(name)';
const APPT_COLS = `id, calendar_id, lead_id, scheduled_at, ends_at, status, source, meeting_type, location, notes,
  contact_name, contact_phone, contact_email, cancel_reason, reschedule_count`;

export async function loadCalendarEvents(userDb: any, calendar: BookingCalendar, fromMs: number, toMs: number): Promise<CalendarEvent[]> {
  const from = new Date(fromMs - LOOKBACK_MS).toISOString();
  const to = new Date(toMs).toISOString();

  if (calendar.kind === 'sales') {
    const { data } = await userDb
      .from('prospect_sales_appointments')
      .select(`id, prospect_id, calendar_id, scheduled_at, ends_at, status, source, decision_maker_name, appointment_type, contact_info, notes,
        cancel_reason, reschedule_count, prospect:contractor_prospects(id, company_name, phone, email, city)`)
      .or(`calendar_id.eq.${calendar.id},calendar_id.is.null`)
      .gte('scheduled_at', from)
      .lt('scheduled_at', to)
      .order('scheduled_at');
    return inWindow(((data ?? []) as any[]).map(mapSalesRow), fromMs);
  }

  const calls = userDb
    .from('appointments')
    .select(`${APPT_COLS}, lead:leads(${LEAD_COLS}), assignment:lead_assignments(contractor:contractors(name))`)
    .eq('calendar_id', calendar.id)
    .gte('scheduled_at', from)
    .lt('scheduled_at', to)
    .order('scheduled_at');
  const visits = calendar.kind === 'contractor' && calendar.contractorId
    ? userDb
        .from('appointments')
        .select(`${APPT_COLS}, lead:leads(${LEAD_COLS}), assignment:lead_assignments!inner(contractor_id, contractor:contractors(name), lead:leads(${LEAD_COLS}))`)
        .is('calendar_id', null)
        .eq('assignment.contractor_id', calendar.contractorId)
        .gte('scheduled_at', from)
        .lt('scheduled_at', to)
        .order('scheduled_at')
    : Promise.resolve({ data: [] });
  const [{ data: callRows }, { data: visitRows }] = await Promise.all([calls, visits]);
  const rows = [...((callRows ?? []) as any[]), ...((visitRows ?? []) as any[])];

  // Design summary + photo from the estimator, when the lead came through one (RLS: contractors see their own leads' entries).
  const leadIds = [...new Set(rows.map((r) => r.lead_id ?? r.lead?.id).filter((v): v is string => typeof v === 'string'))];
  let designs = new Map<string, DesignSummary>();
  if (leadIds.length) {
    const { data: acts } = await userDb
      .from('lead_activities')
      .select('lead_id, metadata, created_at')
      .in('lead_id', leadIds)
      .not('metadata->estimator', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);
    designs = designsByLead((acts ?? []) as any[]);
  }
  return inWindow(rows.map((r) => mapAppointmentRow(r, designs.get(r.lead_id ?? r.lead?.id) ?? null)), fromMs);
}

function inWindow(events: (CalendarEvent | null)[], fromMs: number): CalendarEvent[] {
  return events.filter((e): e is CalendarEvent => !!e && e.endMs > fromMs).sort((a, b) => a.startMs - b.startMs);
}
