import { after } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { bookAppointment, bookSalesAppointment } from '@/lib/booking/book.server';
import { getCalendar } from '@/lib/booking/calendars.server';
import { ensureManageToken, notifyBookingSoon } from '@/lib/booking/notify.server';
import { safeTimeZone } from '@/lib/booking/format';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import { funnelSchema } from '@/lib/funnels/schema';
import { sendMetaEvent } from '@/lib/meta/capi';
import { nicheDataFor } from '@/lib/meta/niche';
import { loadLeadMetaIds } from '@/lib/meta/lead-ids';
import { directSendAudit } from '@/lib/meta/audit.server';
import type { BookResponse } from '@/components/booking/types';
import { clientIp, fail, limited, originOk, readJson, reply } from '../_lib/http';
import { existingBooking, publicBooking, resolveGrant, type Resolved } from '../_lib/resolve';

/**
 * POST /api/booking/book { grant, startsAt, timeZone? } — books the call.
 * Funnel / estimator ticket -> book_appointment on the funnel's calendar
 * (contractor's, else the HomeQuote team's) with the session's own token hash,
 * so the RPC re-checks the session (submitted, qualified, not yet booked) and
 * writes every funnel side effect. Contractor funnel grant ->
 * book_sales_appointment on the sales calendar. Both re-check the slot under the
 * calendar lock: two people racing for one time get one booking and one
 * "pick another time". The manage link shown here is the same one the
 * confirmation / reminder texts and emails carry (ensureManageToken), and those
 * notices go out right after the response (notifyBookingSoon).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  grant: z.string().min(10).max(400),
  startsAt: z.string().datetime({ offset: true }),
  timeZone: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  if (!originOk(request)) return fail('forbidden');
  if (limited(request, 'book')) return fail('rate_limited', {}, { 'Retry-After': '60' });
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return fail('invalid_request');
  const { grant, startsAt } = parsed.data;
  // Only a zone the server can format in is kept (the RPC re-validates it against Postgres).
  const timeZone = parsed.data.timeZone && safeTimeZone(parsed.data.timeZone, '') ? parsed.data.timeZone : null;
  try {
    const db = createAdminClient();
    const r = await resolveGrant(db, grant);
    if (!r) return fail('session_invalid');
    if (r.blocked) return fail(r.blocked, { booking: await existingBooking(db, r) });
    const calendar = r.calendar!;

    if (r.kind === 'session') {
      const result = await bookAppointment({
        calendarId: calendar.id, startsAt, sessionId: r.session.id, sessionHash: r.session.token_hash, source: r.source,
        actorKind: 'homeowner', inviteeTimeZone: timeZone, db,
      });
      if (!result.ok) {
        if (result.error === 'already_booked') return fail('already_booked', { booking: await existingBooking(db, r) });
        return fail(result.error);
      }
      const token = (await ensureManageToken(db, 'appointment', result.appointmentId)) ?? result.manageToken;
      notifyBookingSoon({ kind: 'appointment', id: result.appointmentId, change: 'booked', actorKind: 'homeowner' });
      flushNotificationsSoon();
      const c = r.session.contact ?? {};
      const cal = (await getCalendar(result.calendarId, db)) ?? calendar;
      const metaEventId = scheduleMetaEvent(request, db, r);
      const body: BookResponse = {
        ok: true,
        booking: publicBooking({ status: 'scheduled', startsAt: result.startsAt, endsAt: result.endsAt, timeZone: result.timeZone, inviteeTimeZone: timeZone,
          meetingType: cal.meetingType, name: c.firstName, phone: c.phone, calendar: cal, token }),
        metaEventId,
      };
      return reply(body);
    }

    const result = await bookSalesAppointment({
      calendarId: calendar.id, startsAt, submissionId: r.submission.submission_id, submissionHash: r.submission.access_token_hash,
      source: 'sales_funnel', inviteeTimeZone: timeZone, db,
    });
    if (!result.ok) {
      if (result.error === 'already_booked') return fail('already_booked', { booking: await existingBooking(db, r) });
      return fail(result.error);
    }
    const token = (await ensureManageToken(db, 'sales_appointment', result.salesAppointmentId)) ?? result.manageToken;
    notifyBookingSoon({ kind: 'sales_appointment', id: result.salesAppointmentId, change: 'booked', actorKind: 'homeowner' });
    flushNotificationsSoon();
    const body: BookResponse = {
      ok: true,
      booking: publicBooking({ status: 'scheduled', startsAt: result.startsAt, endsAt: result.endsAt, timeZone: result.timeZone, inviteeTimeZone: timeZone,
        meetingType: calendar.meetingType, name: r.submission.name, phone: r.submission.phone, calendar, token, sales: true }),
      metaEventId: null,
    };
    return reply(body);
  } catch (error) {
    console.error('[booking-book] failed', error instanceof Error ? error.name : 'unknown');
    return fail('unavailable');
  }
}

/**
 * Meta "Schedule" for a homeowner booking, exactly as the funnel route sends it
 * for a confirmed Calendly booking: same event id (`<session>:Schedule`, which
 * the page's pixel may reuse for deduplication), only with a pixel, contact
 * details and the visitor's measurement choice. Never for a demo funnel.
 */
function scheduleMetaEvent(request: Request, db: ReturnType<typeof createAdminClient>, r: Extract<Resolved, { kind: 'session' }>): string | null {
  const parsed = funnelSchema.safeParse(r.funnel.config ?? {});
  if (!parsed.success || r.funnel.is_demo) return null;
  const config = parsed.data;
  const pixelId = config.trackingPixels.metaPixelId;
  const allowed = r.session.measurement_allowed ?? config.trackingPixels.consentMode === 'opt_out';
  const c = r.session.contact;
  if (!pixelId || !allowed || !c) return null;
  const eventId = `${r.session.id}:Schedule`;
  after(async () => {
    const ids = await loadLeadMetaIds(db, r.session.lead_id);
    await sendMetaEvent({
      pixelId, eventName: 'Schedule', eventId,
      eventSourceUrl: r.session.attribution?.landing_page_url ?? `https://${request.headers.get('host')}/estimate/${r.funnel.slug}`,
      customData: nicheDataFor(config.industry, r.funnel.slug),
      user: {
        email: c.email as string, phone: c.phone as string, firstName: c.firstName as string, lastName: c.lastName as string,
        clientIpAddress: clientIp(request), clientUserAgent: request.headers.get('user-agent') ?? undefined,
        fbp: ids.fbp, fbc: ids.fbc,
      },
    }, r.session.lead_id ? directSendAudit(db, { leadId: r.session.lead_id, stage: 'appointment' }) : undefined);
  });
  return eventId;
}
