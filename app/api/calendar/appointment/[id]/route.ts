import { NextResponse, type NextRequest } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { APPOINTMENT_SELECT, mapAppointment, toIcsEvent } from '@/lib/calendar/appointment-event.server';
import { buildCalendar } from '@/lib/calendar/ics';

export const dynamic = 'force-dynamic';

/** Download one appointment as an .ics file (works with any calendar app). Visibility follows the signed-in user's RLS. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getProfile();
  if (!me || !me.is_active) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.from('appointments').select(APPOINTMENT_SELECT).eq('id', id).maybeSingle();
  if (!data) return new NextResponse('Not found', { status: 404 });
  const appointment = mapAppointment(data);
  let duration = 60;
  if (appointment.contractorId) {
    const { data: s } = await createAdminClient().from('contractor_availability_settings').select('default_duration_minutes').eq('contractor_id', appointment.contractorId).maybeSingle();
    duration = s?.default_duration_minutes ?? 60;
  }
  const event = toIcsEvent(appointment, duration);
  if (!event) return new NextResponse('This appointment has no time yet', { status: 409 });
  return new NextResponse(buildCalendar([event], { name: 'HomeQuote appointment' }), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="homequote-appointment-${id.slice(0, 8)}.ics"`,
      'cache-control': 'no-store',
    },
  });
}
