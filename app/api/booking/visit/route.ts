import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { bookFromVisitPage } from '@/lib/sms/visit-booking.server';
import { MAX_PROJECT_DESCRIPTION, MIN_PROJECT_DESCRIPTION } from '@/lib/sms/project-summary';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import { flushCalendarSyncSoon } from '@/lib/calendar/sync.server';
import { fail, limited, originOk, readJson, reply } from '../_lib/http';

/**
 * POST /api/booking/visit { grant, startsAt, description } — books from the visit link texted after the voice note
 * (/booking/visit/<grant>). The grant names the text conversation; the server picks the kind (in-home visit, or a call
 * when no contractor is on the lead), re-loads the open times and only books one still on the list.
 * Same-origin and rate-limited like the other public booking routes.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  grant: z.string().min(10).max(200),
  startsAt: z.string().datetime({ offset: true }),
  description: z.string().max(MAX_PROJECT_DESCRIPTION + 200),
});

const MESSAGES: Record<string, string> = {
  invalid: 'This link has expired. Reply to our text and we’ll send you a new one.',
  closed: 'This link is no longer active. Reply to our text if you’d still like to set up a time.',
  already_booked: 'You’re already booked. Check your texts for the details.',
  description: `Tell us a little about your project first (at least ${MIN_PROJECT_DESCRIPTION} characters).`,
  taken: 'Sorry, that time was just taken. Please pick another one.',
  no_times: 'There are no open times right now. Reply to our text and we’ll find one with you.',
  error: 'We couldn’t confirm it. Nothing was booked yet. Please try again.',
};

export async function POST(request: Request) {
  if (!originOk(request)) return fail('forbidden');
  if (limited(request, 'book')) return fail('rate_limited', {}, { 'Retry-After': '60' });
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return fail('invalid_request');
  try {
    const r = await bookFromVisitPage(createAdminClient(), parsed.data);
    try { flushNotificationsSoon(); flushCalendarSyncSoon(); } catch { /* best effort */ }
    if (r.ok) return reply({ ok: true, booking: r });
    const status = r.error === 'invalid' ? 401 : r.error === 'description' ? 422 : r.error === 'error' ? 503 : 409;
    return reply({ ok: false, error: r.error, message: MESSAGES[r.error], page: r.page ?? null }, status);
  } catch {
    return reply({ ok: false, error: 'error', message: MESSAGES.error }, 503);
  }
}
