'use client';

/**
 * Browser-side push plumbing: environment detection, service worker
 * registration, subscribe / unsubscribe and the "which state is this device
 * in" question the UI asks. No server secrets here — only the PUBLIC VAPID key.
 */

export const SW_URL = '/sw.js';
const USER_FLAG = 'hq_push_user';

export type PushUiState =
  | 'loading'
  | 'unsupported' // this browser cannot do Web Push at all
  | 'ios-needs-install' // iPhone/iPad Safari tab: Web Push only works from the Home Screen app
  | 'not-configured' // server has no VAPID public key
  | 'denied' // permission blocked in browser/OS settings
  | 'prompt' // permission not requested yet
  | 'missing' // permission granted but this device has no subscription
  | 'active'; // subscribed

export interface PushEnv {
  isIOS: boolean;
  standalone: boolean;
  canPush: boolean;
}

export function detectEnv(): PushEnv {
  if (typeof window === 'undefined') return { isIOS: false, standalone: false, canPush: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { isIOS, standalone, canPush };
}

export function vapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  } catch (e) {
    console.warn('[push] service worker registration failed', e);
    return null;
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = (await navigator.serviceWorker.getRegistration(SW_URL)) ?? (await navigator.serviceWorker.ready);
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function readPushState(): Promise<PushUiState> {
  const env = detectEnv();
  if (!env.canPush) return env.isIOS && !env.standalone ? 'ios-needs-install' : 'unsupported';
  if (!vapidPublicKey()) return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'prompt';
  return (await currentSubscription()) ? 'active' : 'missing';
}

function deviceName(): string {
  const ua = navigator.userAgent;
  const env = detectEnv();
  const platform = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) || /CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${platform} · ${env.standalone ? 'Home Screen app' : browser}`;
}

async function postSubscription(sub: PushSubscription): Promise<boolean> {
  const json = sub.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, deviceName: deviceName() }),
  });
  return res.ok;
}

export type EnableResult = { ok: true } | { ok: false; reason: 'denied' | 'unsupported' | 'error'; message: string };

/**
 * Must be called from a click handler: it is the ONLY place that asks for
 * notification permission.
 */
export async function enablePush(userId: string): Promise<EnableResult> {
  const env = detectEnv();
  if (!env.canPush) return { ok: false, reason: 'unsupported', message: 'This browser does not support push notifications.' };
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, reason: 'denied', message: 'Notifications are blocked. Allow them for HomeQuote in your device settings.' };
    }
    const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
      });
    }
    if (!(await postSubscription(sub))) {
      return { ok: false, reason: 'error', message: 'Could not save this device. Please try again.' };
    }
    try {
      localStorage.setItem(USER_FLAG, userId);
    } catch {
      /* private mode */
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'Could not turn on notifications.' };
  }
}

/** Fully turn notifications off for this device (server row + browser subscription). */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (sub) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  try {
    localStorage.removeItem(USER_FLAG);
  } catch {
    /* ignore */
  }
}

/**
 * Sign-out: stop this device receiving the account's alerts (server row is
 * removed) but keep the browser subscription, so the same person signing back
 * in is re-linked silently by resyncPush(). Never blocks sign-out.
 */
export async function detachThisDevice(): Promise<void> {
  try {
    if (!detectEnv().canPush) return;
    const sub = await currentSubscription();
    if (!sub) return;
    await Promise.race([
      fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* never block sign-out */
  }
}

/**
 * On portal load: if THIS user enabled push on this device before (flag) and
 * the browser still holds a subscription, make sure the server row exists
 * (covers re-login and endpoint rotation). Silent; never prompts.
 */
export async function resyncPush(userId: string): Promise<void> {
  try {
    const env = detectEnv();
    if (!env.canPush || !vapidPublicKey() || Notification.permission !== 'granted') return;
    let flagged = false;
    try {
      flagged = localStorage.getItem(USER_FLAG) === userId;
    } catch {
      /* ignore */
    }
    if (!flagged) return;
    const sub = await currentSubscription();
    if (sub) await postSubscription(sub);
  } catch {
    /* best effort */
  }
}
