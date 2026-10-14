import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { runCalendarMaintenance } from '@/lib/calendar/sync.server';
import { runNotificationMaintenance } from '@/lib/notifications/outbox';
import { signingMaintenance } from '@/lib/signing/service';
import { processWorkflowTick, pruneWorkflowHistory } from '@/lib/workflows/runtime.server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const expected = process.env.WORKFLOW_CRON_SECRET;
  if (!expected || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
    return NextResponse.json({ ...result, retention, notifications, calendar, signing }, { status: result.failures ? 207 : 200 });
  } catch {
    return NextResponse.json({ error: 'Workflow processing unavailable' }, { status: 503 });
  }
}
