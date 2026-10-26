import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { bridgeUnauthorized } from '@/lib/sms/bridge-auth';
import { ackOutbound } from '@/lib/sms/service';

export const dynamic = 'force-dynamic';
const schema = z.object({ id: z.string().uuid(), ok: z.boolean(), error: z.string().max(300).optional() });

/** The Mac reports whether Messages accepted a text. */
export async function POST(request: Request) {
  const denied = bridgeUnauthorized(request);
  if (denied) return denied;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  try { await ackOutbound(createAdminClient(), body.data.id, body.data.ok, body.data.error); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Unavailable' }, { status: 503 }); }
}
