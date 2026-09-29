import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { sendPushNotification } from '@/lib/notifications/service';
import { isPushConfigured } from '@/lib/notifications/webpush';

export const dynamic = 'force-dynamic';

// A user can only ever test-push THEMSELVES, and not more than once per few
// seconds per server instance (best effort; this is a convenience button, not
// a delivery path).
const last = new Map<string, number>();

export async function POST() {
  const profile = await getProfile();
  if (!profile || !profile.is_active) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Push is not configured on the server (VAPID keys missing).' }, { status: 503 });
  }
  const now = Date.now();
  if (now - (last.get(profile.id) ?? 0) < 5000) {
    return NextResponse.json({ error: 'Please wait a few seconds.' }, { status: 429 });
  }
  last.set(profile.id, now);

  const result = await sendPushNotification({
    userIds: [profile.id],
    type: 'test',
    title: 'HomeQuote test notification',
    body: 'Push notifications are working on this device.',
    url: '/app/settings/notifications',
  });
  if (result.devices === 0) {
    return NextResponse.json({ error: 'No enabled device found. Turn notifications on first.', result }, { status: 409 });
  }
  return NextResponse.json({ ok: result.sent > 0, result }, { status: result.sent > 0 ? 200 : 502 });
}
