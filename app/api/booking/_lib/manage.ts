/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { findByManageToken, type ManagedBooking } from '@/lib/booking/book.server';
import { getCalendar } from '@/lib/booking/calendars.server';
import type { BookingCalendar } from '@/lib/booking/types';
import type { PublicBooking } from '@/components/booking/types';
import { publicBooking } from './resolve';

type Db = ReturnType<typeof createAdminClient>;

/**
 * The homeowner's manage link: the raw token (from the URL) -> the booking,
 * its calendar and the public view. Only the token's SHA-256 is stored, so a
 * lookup is the whole check. Shared by the manage page and its API routes.
 */
export interface Managed {
  managed: ManagedBooking;
  calendar: BookingCalendar | null;
  booking: PublicBooking;
}

export async function loadManaged(db: Db, token: string, nowMs = Date.now()): Promise<Managed | null> {
  const managed = await findByManageToken(token, db);
  if (!managed || !managed.startsAt) return null;
  const calendar = managed.calendarId ? await getCalendar(managed.calendarId, db) : null;
  let phone: string | null = null;
  if (managed.kind === 'appointment') {
    const { data } = await db.from('appointments').select('contact_phone').eq('id', managed.id).maybeSingle();
    phone = (data as any)?.contact_phone ?? null;
  } else {
    const { data } = await db.from('prospect_sales_appointments').select('contact_info').eq('id', managed.id).maybeSingle();
    // contact_info is "phone · email · link" as book_sales_appointment writes it.
    phone = String((data as any)?.contact_info ?? '').split(' · ')[0] || null;
  }
  const booking = publicBooking({
    status: managed.status, startsAt: managed.startsAt, endsAt: managed.endsAt, timeZone: managed.timeZone, inviteeTimeZone: managed.inviteeTimeZone,
    meetingType: managed.meetingType, name: managed.contactName, phone, calendar, token, sales: managed.kind === 'sales_appointment', nowMs,
  });
  return { managed, calendar, booking };
}
