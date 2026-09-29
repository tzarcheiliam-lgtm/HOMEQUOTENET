/*
 * HomeQuote service worker — Web Push only.
 *
 * Deliberately NOT a caching/offline worker: it has no fetch handler, so it can
 * never serve stale CRM data or interfere with auth. Its jobs are:
 *   1. show a notification when a push arrives (even with the app closed)
 *   2. open/focus HomeQuote on the right internal page when it is tapped
 *   3. keep the app-icon badge in step
 *   4. re-subscribe if the browser rotates the push subscription
 *
 * Keep this file dependency-free and small; it is served as-is from /public.
 */

const FALLBACK_URL = '/app';
const DEFAULT_ICON = '/icons/homequote-192.png';

// Same rule as lib/notifications/url.ts: only internal /app paths are followed.
function safeUrl(input) {
  if (typeof input !== 'string') return FALLBACK_URL;
  const url = input.trim();
  if (!url || url.length > 500 || /[\u0000-\u001f\u007f\\]/.test(url)) return FALLBACK_URL;
  if (url !== '/app' && !url.startsWith('/app/') && !url.startsWith('/app?') && !url.startsWith('/app#')) {
    return FALLBACK_URL;
  }
  return url;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'HomeQuote', body: event.data ? event.data.text() : '' };
  }

  const title = typeof data.title === 'string' && data.title ? data.title : 'HomeQuote';
  const url = safeUrl(data.url);
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: typeof data.icon === 'string' && data.icon.startsWith('/') ? data.icon : DEFAULT_ICON,
    badge: typeof data.badge === 'string' && data.badge.startsWith('/') ? data.badge : DEFAULT_ICON,
    // Same tag = same entity: a repeat replaces the earlier banner instead of stacking.
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    renotify: typeof data.tag === 'string',
    data: {
      url,
      notification_type: data.notification_type || null,
      entity_id: data.entity_id || null,
      metadata: data.metadata || {},
    },
  };

  const work = [self.registration.showNotification(title, options)];

  if (typeof data.badge_count === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
    work.push(
      (data.badge_count > 0 ? self.navigator.setAppBadge(data.badge_count) : self.navigator.clearAppBadge()).catch(
        () => {}
      )
    );
  }

  // Let any open HomeQuote window refresh its bell immediately.
  work.push(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((all) => all.forEach((c) => c.postMessage({ type: 'hq-push', notification_type: data.notification_type })))
      .catch(() => {})
  );

  // iOS/Safari requires every push to show a notification; always waitUntil it.
  event.waitUntil(Promise.all(work));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safeUrl(event.notification.data && event.notification.data.url);
  const target = new URL(url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Prefer an already-open HomeQuote window; reuse it instead of opening another.
      for (const client of all) {
        if (!client.url.startsWith(self.location.origin)) continue;
        try {
          await client.focus();
        } catch {
          /* focus can be refused; fall through */
        }
        let navigated = false;
        if ('navigate' in client) {
          try {
            await client.navigate(target);
            navigated = true;
          } catch {
            /* uncontrolled client */
          }
        }
        if (!navigated) client.postMessage({ type: 'hq-navigate', url });
        return;
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});

// The browser rotated/expired the subscription: get a fresh one and tell the server.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const key = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey;
        if (!key) return;
        const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const json = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, deviceName: 'Refreshed device' }),
        });
      } catch {
        /* the next portal visit re-syncs (resyncPush) */
      }
    })()
  );
});
