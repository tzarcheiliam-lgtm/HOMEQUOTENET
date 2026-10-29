import { NextResponse } from 'next/server';
import { recordAutomationRun } from '@/lib/automations/runs.server';
import { equalSecret } from '@/lib/funnels/server';
import { runCalendarMaintenance } from '@/lib/calendar/sync.server';
import { runNotificationMaintenance } from '@/lib/notifications/outbox';
import { signingMaintenance } from '@/lib/signing/service';
import { retryPendingAduQuizLeads } from '@/lib/adu-quiz/leads.server';
import { runBookingNotifications } from '@/lib/booking/reminders.server';
import { runRecovery } from '@/lib/booking/recovery.server';
import { checkBridgeHealth } from '@/lib/sms/health';
import { notifyAdmins } from '@/lib/sms/health-notify';
import { runTextReminders } from '@/lib/sms/reminders';
import { createAdminClient } from '@/lib/supabase/admin';
import { processWorkflowTick, pruneWorkflowHistory } from '@/lib/workflows/runtime.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const expected = process.env.WORKFLOW_CRON_SECRET;
  if (!expected || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const startedAt = new Date();
  try {
    const result = await processWorkflowTick();
    const retention = await pruneWorkflowHistory();
    // Push notifications ride the same scheduler: due callbacks + a backstop
    // for anything the request-time flush missed. Never affects the tick result.
    let notifications: unknown = null;
    try {
      notifications = await runNotificationMaintenance();
    } catch {
      notifications = { error: 'notification maintenance failed' };
    }
    // Calendar sync backstop (retries failed Google writes; best effort, never affects the tick result).
    let calendar: unknown = null;
    try {
      calendar = await runCalendarMaintenance();
    } catch {
      calendar = { error: 'calendar sync failed' };
    }
    // Documents & Signing: expire overdue requests, retry stuck completed-PDF generation. Best effort.
    const signing = await signingMaintenance();
    // Texting: alert the team if texts are waiting and the Mac bridge is not sending them. Best effort.
    let sms: unknown = null;
    try { sms = await checkBridgeHealth(createAdminClient(), { notify: notifyAdmins }); } catch { sms = { error: 'texting health check failed' }; }
    // Native calendar bookings: confirmations (email + text), 24 h / 1 h reminder EMAILS, cancellation notices. Best effort.
    // Runs before the reminder texts so a booking's confirmation always goes first.
    let bookings: unknown = null;
    try {
      const r = await runBookingNotifications();
      bookings = { confirmations: r.confirmations, reminders: r.reminders, cancellations: r.cancellations, overlappingWorkflows: r.overlappingWorkflows };
    } catch {
      bookings = { error: 'booking notifications failed' };
    }
    // Reminder texts for booked meetings (sales meetings, on-site visits AND calendar calls: the only reminder texts)
    // and follow-ups when homeowners don't reply. Best effort.
    let reminders: unknown = null;
    try { reminders = await runTextReminders(createAdminClient()); } catch { reminders = { error: 'text reminders failed' }; }
    // Lead recovery: "did you reach them?" pushes, no-show and never-booked follow-up EMAILS (their texts are in the
    // reminder texts above). Best effort.
    let recovery: unknown = null;
    try { recovery = await runRecovery(); } catch { recovery = { error: 'lead recovery failed' }; }
    // ADU quiz leads whose webhook delivery failed. Best effort; a failure never affects the tick.
    let aduQuiz: unknown = null;
    try {
      aduQuiz = await retryPendingAduQuizLeads();
    } catch {
      aduQuiz = { error: 'adu quiz retry failed' };
    }
    const body = { ...result, retention, notifications, calendar, signing, sms, reminders, recovery, bookings, aduQuiz };
    await recordAutomationRun('workflow_tick', startedAt, !result.failures, body);
    return NextResponse.json(body, { status: result.failures ? 207 : 200 });
  } catch {
    await recordAutomationRun('workflow_tick', startedAt, false, { error: 'Workflow processing unavailable' });
    return NextResponse.json({ error: 'Workflow processing unavailable' }, { status: 503 });
  }
}
