import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAllowedPushEndpoint } from '@/lib/notifications/endpoint';

export const dynamic = 'force-dynamic';

const schema = z.object({
  endpoint: z.string().url().max(2048).refine(isAllowedPushEndpoint, 'Unsupported push service'),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  deviceName: z.string().trim().max(100).optional(),
});

/**
 * Save (or re-home) this device's push subscription for the signed-in user.
 * The owner is ALWAYS the session user — never a value from the request — so a
 * caller cannot subscribe another account. The service role is used because a
 * device that was previously signed in as someone else already owns the
 * endpoint row, which the new user's RLS could not update; the upsert on the
 * unique endpoint moves it to whoever is signed in now.
 */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || !profile.is_active) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription' }, { status: 422 });
  const { endpoint, keys, deviceName } = parsed.data;

  const db = createAdminClient();
  const { error } = await db.from('push_subscriptions').upsert(
    {
      user_id: profile.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: (request.headers.get('user-agent') ?? '').slice(0, 500) || null,
      device_name: deviceName || null,
      enabled: true,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) {
    console.error('[push] subscribe failed:', error.message);
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
