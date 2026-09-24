import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { deliverPendingFunnels } from '@/lib/funnels/delivery';
import { processLeadEmails } from '@/lib/leads/notify';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!equalSecret(request.headers.get('authorization') ?? '', `Bearer ${process.env.FUNNEL_CRON_SECRET ?? ''}`) || !process.env.FUNNEL_CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Also retries queued/failed HomeQuote lead emails (alerts and sends).
  try {
    const [crm, emails] = await Promise.all([deliverPendingFunnels(), processLeadEmails()]);
    return NextResponse.json({ ...crm, leadEmails: { sent: emails.sent, failed: emails.failed } });
  }
  catch { return NextResponse.json({ error: 'Delivery unavailable' }, { status: 503 }); }
}
