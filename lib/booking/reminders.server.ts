/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { claimBookingReminders } from './book.server';
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
 *   2. due 24 h / 1 h reminders (claim_booking_reminders: at most once),
 *   3. cancellations of homeowner calls in the last day that have no notice yet.
 * It also reports enabled workflows cloned from the old "Appointment
 * confirmation" templates: those would text/email calendar bookings a second
 * time, so they should be turned off (the built-in notices replace them).
 */

export const SUPERSEDED_WORKFLOW_TEMPLATES = ['appointment_confirmation', 'appointment_confirmation_reminder'];

export interface BookingDispatchResult {
  confirmations: number;
  reminders: number;
  cancellations: number;
  /** Enabled workflows that duplicate these notices (turn them off). */
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

  // 2. Reminders.
  for (const r of await claimBookingReminders(limit * 2, db)) {
    try { if (keep(await sendBookingReminder(r.kind, r.id, r.reminder, d))) out.reminders++; } catch { /* claimed: not retried */ }
  }

  // 3. Cancellation backstop (homeowner calls; the marker makes a repeat a no-op). Give the request-time notice 2 minutes first.
  const { data: cancelled } = await db.from('appointments').select('id, calendar_id').eq('status', 'cancelled').not('calendar_id', 'is', null)
    .gte('cancelled_at', new Date(now.getTime() - 86_400_000).toISOString()).lte('cancelled_at', new Date(now.getTime() - 120_000).toISOString())
    .gt('scheduled_at', nowIso).limit(limit);
  for (const r of (cancelled ?? []) as any[]) {
    if (!r.calendar_id) continue;
    try { if (keep(await sendBookingCancellation('appointment', r.id, d))) out.cancellations++; } catch { /* next one */ }
  }

  const { count } = await db.from('workflows').select('id', { count: 'exact', head: true }).eq('enabled', true).eq('is_template', false)
    .is('archived_at', null).in('template_key', SUPERSEDED_WORKFLOW_TEMPLATES);
  out.overlappingWorkflows = count ?? 0;
  return out;
}
