'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerServiceWorker, resyncPush } from '@/lib/notifications/client';
import { safeInternalUrl } from '@/lib/notifications/url';

/**
 * Mounted once in the portal layout. Registers the service worker (no
 * permission prompt — that only ever happens from the Enable button), silently
 * re-links a device this user already enabled, and follows notification taps
 * that arrive as messages from the worker.
 */
export function PortalPushBoot({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    void registerServiceWorker().then(() => resyncPush(userId));
  }, [userId]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'hq-navigate') router.push(safeInternalUrl(e.data.url));
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  return null;
}
