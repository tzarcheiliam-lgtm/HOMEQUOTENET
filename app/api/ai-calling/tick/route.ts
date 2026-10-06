import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { aiCallingEnabled } from '@/lib/ai-calling/config';

// Scheduler endpoint for AI calling (Bearer AI_CALLING_CRON_SECRET).
// Currently a gate only: no prospect is selected or dialed here yet. Dialing
// needs do-not-call / calling-hours / consent rules decided first (see
// lib/ai-calling/place.ts). With AI_CALLING_GLOBAL_ENABLED unset or false it
// does nothing at all.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const expected = process.env.AI_CALLING_CRON_SECRET;
  if (!expected || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!aiCallingEnabled()) return NextResponse.json({ status: 'disabled', dialed: 0 });
  return NextResponse.json({ status: 'idle', dialed: 0 });
}
