import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { deliverPendingFunnels } from '@/lib/funnels/delivery';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!equalSecret(request.headers.get('authorization') ?? '', `Bearer ${process.env.FUNNEL_CRON_SECRET ?? ''}`) || !process.env.FUNNEL_CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json(await deliverPendingFunnels()); }
  catch { return NextResponse.json({ error: 'Delivery unavailable' }, { status: 503 }); }
}
