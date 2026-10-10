import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { inquirySchema, qualifyContractor } from '@/lib/contractor-funnel/schema';
import { loadFunnelSettings } from '@/lib/contractor-funnel/settings.server';
import { screenSubmission } from '@/lib/applications/spam';

export const dynamic = 'force-dynamic';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/**
 * Saves a completed contractor inquiry. The calendar is only returned AFTER the
 * row is durably stored. Idempotent on submissionId: a retry or double-click
 * never creates a second row, it just re-issues the booking token.
 *
 * Contact data is never logged.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return NextResponse.json({ error: 'Please check your answers and try again.', fieldErrors }, { status: 422 });
  }
  const input = parsed.data;

  // Silent spam handling: look like success, store nothing, no calendar.
  const screen = screenSubmission({ honeypot: input.honeypot, startedAt: input.startedAt });
  if (screen.spam) {
    console.warn(`[contractor-funnel] discarded: ${screen.reason}`);
    return NextResponse.json({ status: 'needs_review', token: null, calendar: null });
  }

  const settings = await loadFunnelSettings();
  const result = qualifyContractor(input.answers, settings.rules);
  const showCalendar = result.status === 'qualified' && settings.calendar !== null;

  const token = randomBytes(24).toString('hex');
  const supabase = createAdminClient();
  const a = input.answers;
  const c = input.contact;

  const { error } = await supabase.from('contractor_funnel_submissions').insert({
    submission_id: input.submissionId,
    access_token_hash: sha256(token),
    services: a.services,
    service_other: a.services.includes('other') ? a.serviceOtherText?.trim() || null : null,
    service_area: a.serviceArea,
    role: a.role,
    project_value: a.projectValue,
    appointment_capacity: a.capacity,
    customer_sources: a.sources,
    start_timeline: a.timeline,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    website: c.website,
    contact_consent: c.contactConsent,
    marketing_consent: c.marketingConsent,
    measurement_allowed: input.measurement,
    qualification_status: result.status,
    qualification_reasons: result.reasons,
    rules_snapshot: settings.rules,
    attribution: input.attribution,
    calendar_shown_at: showCalendar ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.code === '23505') {
      // Retry of a submission we already stored. Re-issue the token (only while
      // unbooked) and answer from the stored row, not from this request.
      const { data: existing } = await supabase
        .from('contractor_funnel_submissions')
        .select('qualification_status, booking_status')
        .eq('submission_id', input.submissionId)
        .maybeSingle();
      if (existing) {
        const stillQualified = existing.qualification_status === 'qualified';
        if (existing.booking_status === 'none') {
          await supabase.from('contractor_funnel_submissions').update({ access_token_hash: sha256(token) }).eq('submission_id', input.submissionId);
        }
        return NextResponse.json({
          status: existing.qualification_status,
          token,
          calendar: stillQualified ? settings.calendar : null,
          duplicate: true,
        });
      }
    }
    console.error('[contractor-funnel] insert failed', error.code ?? 'unknown');
    return NextResponse.json(
      { error: 'We could not save your details just now. Nothing was lost on your side. Please try again in a moment.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    status: result.status,
    token,
    calendar: showCalendar ? settings.calendar : null,
    calendarConfigured: settings.calendar !== null,
  });
}
