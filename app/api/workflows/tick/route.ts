import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { runNotificationMaintenance } from '@/lib/notifications/outbox';
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
    return NextResponse.json({ ...result, retention, notifications }, { status: result.failures ? 207 : 200 });
  } catch {
    return NextResponse.json({ error: 'Workflow processing unavailable' }, { status: 503 });
  }
}
