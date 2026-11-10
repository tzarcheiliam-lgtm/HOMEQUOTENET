import { createAdminClient } from '@/lib/supabase/admin';
import { getSlots } from '@/lib/booking/slots.server';
import { isManageTokenShape } from '@/lib/booking/tokens';
import type { ManageSlotsResponse } from '@/components/booking/types';
import { fail, limited, originOk, reply } from '../../../_lib/http';
import { loadManaged } from '../../../_lib/manage';
import { publicCalendar } from '../../../_lib/resolve';

/**
 * GET /api/booking/manage/<token>/slots — times this booking can move to.
 * The booking itself is left out of the busy time (so its neighbours are not
 * blocked by its own buffer); its current start comes back as `current` so
 * the picker can mark it instead of offering it.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: Context) {
  if (!originOk(request)) return fail('forbidden');
  if (limited(request, 'slots')) return fail('rate_limited', {}, { 'Retry-After': '60' });
  const { token } = await context.params;
  if (!isManageTokenShape(token)) return fail('not_found');
  try {
    const db = createAdminClient();
    const m = await loadManaged(db, token);
    if (!m) return fail('not_found');
    if (!m.booking.canChange) return fail('not_active');
    if (!m.calendar) return fail('not_bookable');
    if (!m.calendar.active) return fail('calendar_inactive');
    const result = await getSlots(m.calendar.id, undefined, undefined, { db, excludeId: m.managed.id });
    if (!result) return fail('not_bookable');
    const current = m.booking.startsAt;
    const body: ManageSlotsResponse = {
      ok: true,
      calendar: publicCalendar(result.calendar),
      slots: result.slots.map((s) => ({ start: new Date(s.startMs).toISOString(), end: new Date(s.endMs).toISOString() })),
      current,
    };
    return reply(body);
  } catch (error) {
    console.error('[booking-manage-slots] lookup failed', error instanceof Error ? error.name : 'unknown');
    return fail('unavailable');
  }
}
