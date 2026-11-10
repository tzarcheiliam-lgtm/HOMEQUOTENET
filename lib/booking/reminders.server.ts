/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { claimBookingReminders } from './book.server';
import { SUPERSEDED_WORKFLOW_TEMPLATES } from '@/lib/workflows/native-booking';
import {
  sendBookingCancellation,
  sendBookingConfirmation,
  sendBookingReminder,
  type NoticeResult,
  type NotifyDeps,
} from './notify.server';

/**
 * Booking notices on the 5-minute /api/workflows/tick:
 *   1. confirmations not sent yet (new bookings and reschedules whose
 *      request-time notifyBookingSoon did not run),
 *   2. due 24 h / 1 h reminder EMAILS (claim_booking_reminders: at most once;
 *      the reminder TEXTS come from runTextReminders, lib/sms/reminders.ts),
 *   3. cancellations (homeowner calls and sales meetings) in the last day with no notice yet.
 * It also counts enabled workflows cloned from the old "Appointment
 * confirmation" templates. The workflow engines skip those for calendar
 * bookings (lib/workflows/native-booking.ts), so they no longer double-send;
 * they only still run for on-site visits booked without a calendar.
 */

export { SUPERSEDED_WORKFLOW_TEMPLATES };

export interface BookingDispatchResult {
  confirmations: number;
  reminders: number;
  cancellations: number;
  /** Enabled workflows from the superseded templates (skipped for calendar bookings). */
  overlappingWorkflows: number;
  notices: NoticeResult[];
}

const LIMIT = 25;

export async function runBookingNotifications(deps: NotifyDeps & { limit?: number } = {}): Promise<BookingDispatchResult> {
  const db = deps.db ?? createAdminClient();
  const d: NotifyDeps = { ...deps, db };
  const now = deps.now ? deps.now() : new Date();
  const nowIso = now.toISOString();
  const limit = deps.limit ?? LIMIT;
  const out: BookingDispatchResult = { confirmations: 0, reminders: 0, cancellations: 0, overlappingWorkflows: 0, notices: [] };
  const keep = (r: NoticeResult | null) => { if (r) out.notices.push(r); return !!r; };

  // 1. Confirmations first, so a reminder never beats the confirmation.
  const pending: { kind: 'appointment' | 'sales_appointment'; id: string }[] = [];
  const { data: aps } = await db.from('appointments').select('id, calendar_id').is('confirmed_at', null).eq('status', 'scheduled')
    .not('calendar_id', 'is', null).gt('scheduled_at', nowIso).order('created_at', { ascending: true }).limit(limit);
  for (const r of (aps ?? []) as any[]) if (r.calendar_id) pending.push({ kind: 'appointment', id: r.id });
  const { data: sas } = await db.from('prospect_sales_appointments').select('id, calendar_id').is('booking_confirmed_at', null)
    .in('status', ['scheduled', 'confirmed', 'rescheduled']).not('calendar_id', 'is', null).gt('scheduled_at', nowIso)
    .order('created_at', { ascending: true }).limit(limit);
  for (const r of (sas ?? []) as any[]) if (r.calendar_id) pending.push({ kind: 'sales_appointment', id: r.id });
  for (const p of pending) {
    try { if (keep(await sendBookingConfirmation(p.kind, p.id, d))) out.confirmations++; } catch { /* next one */ }
  }

  // 2. Reminder emails (texts: runTextReminders).
  for (const r of await claimBookingReminders(limit * 2, db)) {
    try {
      if (keep(await sendBookingReminder(r.kind, r.id, r.reminder, d))) out.reminders++;
    } catch (e) {
      // Claimed, so not retried: say so in the logs.
      console.error('[booking] reminder failed:', e instanceof Error ? e.message : e);
    }
  }

  // 3. Cancellation backstop (cancel_notified_at makes a repeat a no-op). Give the request-time notice 2 minutes first.
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const until = new Date(now.getTime() - 120_000).toISOString();
  for (const kind of ['appointment', 'sales_appointment'] as const) {
    const { data: cancelled } = await db.from(kind === 'appointment' ? 'appointments' : 'prospect_sales_appointments').select('id, calendar_id')
      .eq('status', 'cancelled').not('calendar_id', 'is', null).is('cancel_notified_at', null)
      .gte('cancelled_at', since).lte('cancelled_at', until).gt('scheduled_at', nowIso).limit(limit);
    for (const r of (cancelled ?? []) as any[]) {
      if (!r.calendar_id) continue;
      try {
        if (keep(await sendBookingCancellation(kind, r.id, d))) out.cancellations++;
      } catch (e) {
        console.error('[booking] cancellation notice failed:', e instanceof Error ? e.message : e);
      }
    }
  }

  const { count } = await db.from('workflows').select('id', { count: 'exact', head: true }).eq('enabled', true).eq('is_template', false)
    .is('archived_at', null).in('template_key', [...SUPERSEDED_WORKFLOW_TEMPLATES]);
  out.overlappingWorkflows = count ?? 0;
  return out;
}
