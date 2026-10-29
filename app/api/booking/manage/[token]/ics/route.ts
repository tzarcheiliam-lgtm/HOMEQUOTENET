import { createAdminClient } from '@/lib/supabase/admin';
import { buildCalendar } from '@/lib/calendar/ics';
import { isManageTokenShape } from '@/lib/booking/tokens';
import { callTitle, callDetails } from '@/components/booking/calendar-links';
import { limited } from '../../../_lib/http';
import { loadManaged } from '../../../_lib/manage';

/**
 * GET /api/booking/manage/<token>/ics — "Add to Apple / Outlook calendar".
 * A plain link (no fetch), so no Origin check: the token is the only gate.
 * The UID is stable per booking, so adding it again after a reschedule updates
 * the same event; a cancelled booking downloads as STATUS:CANCELLED.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ token: string }> };

const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };

export async function GET(request: Request, context: Context) {
  if (limited(request, 'manageRead')) return new Response('Too many requests', { status: 429, headers });
  const { token } = await context.params;
  if (!isManageTokenShape(token)) return new Response('Not found', { status: 404, headers });
  try {
    const m = await loadManaged(createAdminClient(), token);
    if (!m) return new Response('Not found', { status: 404, headers });
    const b = m.booking;
    const origin = new URL(request.url).origin;
    const body = buildCalendar([{
      uid: `booking-${m.managed.id}@homequotenet.com`,
      startMs: Date.parse(b.startsAt),
      endMs: Date.parse(b.endsAt),
      summary: callTitle(b),
      description: callDetails(b, `${origin}${b.manageUrl ?? ''}`),
      location: b.meetingType === 'video' ? b.videoLink : 'Phone call',
      status: b.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
      // Grows with every download, so a newer copy (moved / cancelled) always replaces an older one.
      sequence: Math.max(0, Math.floor(Date.now() / 1000) - 1_700_000_000),
    }], { name: callTitle(b) });
    return new Response(body, {
      headers: { ...headers, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="call.ics"' },
    });
  } catch {
    return new Response('Unavailable', { status: 503, headers });
  }
}
