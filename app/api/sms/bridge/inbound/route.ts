import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { bridgeUnauthorized } from '@/lib/sms/bridge-auth';
import { handleInbound } from '@/lib/sms/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const schema = z.object({ phone: z.string().max(40), body: z.string().max(4000), guid: z.string().min(1).max(200), receivedAt: z.string().max(40).optional() });

/** A lead's text arrived on the Mac. Safe to repeat: the guid de-duplicates. */
export async function POST(request: Request) {
  const denied = bridgeUnauthorized(request);
  if (denied) return denied;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  try { return NextResponse.json(await handleInbound(createAdminClient(), body.data)); }
  catch { return NextResponse.json({ error: 'Unavailable' }, { status: 503 }); }
}
