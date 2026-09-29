import 'server-only';
import webpush from 'web-push';

/**
 * Web Push transport. The private key only ever exists on the server
 * (VAPID_PRIVATE_KEY); NEXT_PUBLIC_VAPID_PUBLIC_KEY is the public half the
 * browser needs to subscribe.
 */
let configured: boolean | null = null;

export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (e) {
    console.error('[push] Invalid VAPID configuration:', e instanceof Error ? e.message : e);
    configured = false;
  }
  return configured;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushResult =
  | { ok: true }
  | { ok: false; gone: boolean; statusCode?: number; error: string };

export async function sendWebPush(target: PushTarget, payload: object): Promise<PushResult> {
  if (!isPushConfigured()) return { ok: false, gone: false, error: 'VAPID keys are not configured' };
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: 'high', timeout: 8000 }
    );
    return { ok: true };
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    // 404/410: the subscription no longer exists (app removed, permission revoked).
    const gone = err.statusCode === 404 || err.statusCode === 410;
    return {
      ok: false,
      gone,
      statusCode: err.statusCode,
      error: `${err.statusCode ?? 'ERR'} ${(err.body || err.message || 'push failed').toString().slice(0, 300)}`,
    };
  }
}
