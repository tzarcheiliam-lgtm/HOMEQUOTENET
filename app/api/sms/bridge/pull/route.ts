import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { bridgeUnauthorized } from '@/lib/sms/bridge-auth';
import { claimOutbound } from '@/lib/sms/service';

export const dynamic = 'force-dynamic';

/** The Mac asks for texts to send. Doubles as the bridge's heartbeat. */
export async function POST(request: Request) {
  const denied = bridgeUnauthorized(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ messages: await claimOutbound(createAdminClient(), 5) });
  } catch { return NextResponse.json({ error: 'Unavailable' }, { status: 503 }); }
}
