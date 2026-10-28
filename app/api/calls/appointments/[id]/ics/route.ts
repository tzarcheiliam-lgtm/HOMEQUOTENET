import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildCalendar } from '@/lib/calendar/ics';
import { siteUrl } from '@/lib/calendar/config';
import { salesMeetingEvent } from '@/lib/calls/calendar-links';

export const dynamic = 'force-dynamic';

const CALL_ROLES = new Set(['admin', 'caller', 'setter']);

/**
 * One sales appointment (a meeting booked with a contractor prospect) as an .ics
 * file, for "Add to Apple Calendar". The UID is fixed per appointment and the
 * SEQUENCE follows its last update, so opening it again updates the event the
 * calendar already has instead of adding a second one, and a cancelled meeting
 * comes through as cancelled. Visibility follows the signed-in user's RLS.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getProfile();
  if (!me || !me.is_active || !CALL_ROLES.has(me.role)) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });

  const supabase = await createClient();
  const { data: a } = await supabase
    .from('prospect_sales_appointments')
    .select('id, prospect_id, decision_maker_name, scheduled_at, time_zone, appointment_type, contact_info, notes, status, updated_at, prospect:contractor_prospects!inner(company_name, phone)')
    .eq('id', id)
    .maybeSingle();
  if (!a) return new NextResponse('Not found', { status: 404 });

  const prospect = (Array.isArray(a.prospect) ? a.prospect[0] : a.prospect) as { company_name: string; phone: string | null } | null;
  const e = salesMeetingEvent(
    {
      id: a.id,
      prospectId: a.prospect_id,
      companyName: prospect?.company_name ?? 'Contractor',
      decisionMakerName: a.decision_maker_name,
      phone: prospect?.phone ?? null,
      scheduledAt: a.scheduled_at,
      timeZone: a.time_zone,
      appointmentType: a.appointment_type,
      contactInfo: a.contact_info,
      notes: a.notes,
    },
    siteUrl()
  );
  const updatedMs = Date.parse(a.updated_at);
  const ics = buildCalendar(
    [
      {
        uid: e.uid,
        startMs: e.startMs,
        endMs: e.endMs,
        summary: e.title,
        description: e.details,
        location: e.location,
        url: e.url,
        status: a.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
        sequence: Math.floor(updatedMs / 1000),
        lastModifiedMs: updatedMs,
      },
    ],
    { name: 'HomeQuote sales appointment' }
  );
  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      // inline: iPhone and Mac Safari open it straight in Calendar.
      'content-disposition': `inline; filename="homequote-meeting-${id.slice(0, 8)}.ics"`,
      'cache-control': 'no-store',
    },
  });
}
