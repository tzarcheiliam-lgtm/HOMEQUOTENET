import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { calendlyUri } from '@/lib/funnels/schema';
import { verifyCalendlyBooking } from '@/lib/funnels/calendly';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  submissionId: z.string().uuid(),
  token: z.string().min(20).max(200),
  eventUri: calendlyUri,
  inviteeUri: calendlyUri,
});

/**
 * Records a booking that the Calendly embed reported for a saved, qualified
 * contractor inquiry. Authorised by the per-submission token returned from the
 * inquiry route. With CALENDLY_API_TOKEN the booking is verified against the
 * Calendly API ('confirmed'); without it the embed's own report is stored as
 * 'reported' so nobody mistakes it for an API-verified booking.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid booking details.' }, { status: 400 });
  const { submissionId, token, eventUri, inviteeUri } = parsed.data;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from('contractor_funnel_submissions')
    .select('id, access_token_hash, qualification_status, booking_status')
    .eq('submission_id', submissionId)
    .maybeSingle();

  const given = createHash('sha256').update(token).digest();
  const stored = row ? Buffer.from(row.access_token_hash, 'hex') : null;
  if (!row || !stored || stored.length !== given.length || !timingSafeEqual(stored, given)) {
    return NextResponse.json({ error: 'Booking could not be matched to your inquiry.' }, { status: 403 });
  }
  if (row.qualification_status !== 'qualified') {
    return NextResponse.json({ error: 'Booking is not available for this inquiry.' }, { status: 409 });
  }
  if (row.booking_status !== 'none') return NextResponse.json({ status: row.booking_status });

  const verification = await verifyCalendlyBooking(eventUri.split('/invitees/')[0], inviteeUri);
  const status = verification.verified ? 'confirmed' : 'reported';

  const { error } = await supabase
    .from('contractor_funnel_submissions')
    .update({
      booking_status: status,
      booking_event_uri: eventUri.split('/invitees/')[0],
      booking_invitee_uri: inviteeUri,
      booked_at: new Date().toISOString(),
      booking_start_time: verification.startTime,
      review_status: 'booked',
    })
    .eq('id', row.id);

  if (error) {
    console.error('[contractor-funnel] booking save failed', error.code ?? 'unknown');
    return NextResponse.json({ error: 'Your booking was made with the calendar, but we could not record it here.' }, { status: 500 });
  }
  return NextResponse.json({ status });
}
