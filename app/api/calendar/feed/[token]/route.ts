/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { APPOINTMENT_SELECT, mapAppointment, toIcsEvent } from '@/lib/calendar/appointment-event.server';
import { buildCalendar } from '@/lib/calendar/ics';

export const dynamic = 'force-dynamic';

/**
 * Private subscribe feed for Apple Calendar / Google / Outlook. The unguessable
 * token in the URL is the only credential, so every failure looks identical
 * (404) and nothing is cached. Cancelled appointments stay in the feed as
 * STATUS:CANCELLED for 30 days so subscribed clients drop them.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, '');
  const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return notFound();

  const db = createAdminClient();
  const { data: row } = await db.from('calendar_feed_tokens').select('id, user_id, contractor_id').eq('token', token).maybeSingle();
  if (!row) return notFound();
  // The owner must still be an active user of that company.
  const { data: profile } = await db.from('profiles').select('is_active, role, contractor_id').eq('id', row.user_id).maybeSingle();
  if (!profile?.is_active || profile.role !== 'contractor' || profile.contractor_id !== row.contractor_id) return notFound();

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await db
    .from('appointments')
    .select(APPOINTMENT_SELECT.replace('assignment:lead_assignments(', 'assignment:lead_assignments!inner('))
    .eq('assignment.contractor_id', row.contractor_id)
    .gte('scheduled_at', since)
    .order('scheduled_at')
    .limit(1000);
  const { data: settings } = await db.from('contractor_availability_settings').select('default_duration_minutes').eq('contractor_id', row.contractor_id).maybeSingle();
  const duration = settings?.default_duration_minutes ?? 60;

  const events = ((data ?? []) as any[])
    .map(mapAppointment)
    .filter((a) => a.contractorId === row.contractor_id)
    .map((a) => toIcsEvent(a, duration))
    .filter((e): e is NonNullable<typeof e> => !!e);

  await db.from('calendar_feed_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
  return new NextResponse(buildCalendar(events, { name: 'HomeQuote appointments' }), {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="homequote-appointments.ics"',
      'cache-control': 'no-store',
    },
  });
}
