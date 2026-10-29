import { createAdminClient } from '@/lib/supabase/admin';
import { getSlots } from '@/lib/booking/slots.server';
import type { SlotsResponse } from '@/components/booking/types';
import { fail, grantHeader, limited, originOk, reply } from '../_lib/http';
import { callbackRequested } from '../_lib/callback';
import { contactOf, existingBooking, publicCalendar, resolveGrant } from '../_lib/resolve';

/**
 * GET /api/booking/slots — open call times for the calendar this grant books
 * (header X-Booking-Grant: a funnel / estimator booking ticket or a contractor
 * funnel submission grant). Optional ?from=&to= ISO bounds; default is now
 * through the calendar's horizon (14 days), which is small enough to send at
 * once. A grant that already booked gets that booking back instead.
 * Includes the hosts' Google busy time; the SQL re-check at booking is the authority.
 */
export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

function bound(v: string | null): number | undefined {
  if (!v) return undefined;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : undefined;
}

export async function GET(request: Request) {
  if (!originOk(request)) return fail('forbidden');
  if (limited(request, 'slots')) return fail('rate_limited', {}, { 'Retry-After': '60' });
  try {
    const db = createAdminClient();
    const r = await resolveGrant(db, grantHeader(request));
    if (!r) return fail('session_invalid');
    const booked = await existingBooking(db, r);
    if (r.blocked && !booked) return fail(r.blocked);
    const url = new URL(request.url);
    const from = bound(url.searchParams.get('from'));
    let to = bound(url.searchParams.get('to'));
    if (from !== undefined && to !== undefined && to - from > 31 * DAY) to = from + 31 * DAY;
    const cal = r.calendar;
    if (!cal && !booked) return fail('calendar_inactive');
    const result = booked || !cal ? null : await getSlots(cal.id, from, to, { db });
    const body: SlotsResponse = {
      ok: true,
      calendar: cal
        ? publicCalendar(result?.calendar ?? cal)
        : { hostName: booked!.hostName, kind: r.kind === 'submission' ? 'sales' : 'team', timeZone: booked!.timeZone, durationMinutes: booked!.durationMinutes, meetingType: booked!.meetingType },
      slots: (result?.slots ?? []).map((s) => ({ start: new Date(s.startMs).toISOString(), end: new Date(s.endMs).toISOString() })),
      booked,
      callbackRequested: booked ? false : await callbackRequested(db, r),
      contact: contactOf(r),
    };
    return reply(body);
  } catch (error) {
    console.error('[booking-slots] lookup failed', error instanceof Error ? error.name : 'unknown');
    return fail('unavailable');
  }
}
