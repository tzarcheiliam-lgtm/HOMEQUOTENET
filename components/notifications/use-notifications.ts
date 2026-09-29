'use client';

import { useSyncExternalStore } from 'react';
import { setAppBadge } from '@/lib/notifications/badge';
import type { AppNotification } from '@/lib/notifications/types';

/**
 * One shared notification store for the whole page (the desktop and phone
 * bells are both mounted, only one is visible): a single poll, refreshed on
 * focus and whenever the service worker reports a push. Every failure is
 * swallowed — the bell must never break the portal.
 */
interface State {
  items: AppNotification[];
  unread: number;
  loaded: boolean;
}

let state: State = { items: [], unread: 0, loaded: false };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;

function emit(next: State) {
  state = next;
  setAppBadge(next.unread);
  listeners.forEach((l) => l());
}

export async function refreshNotifications(): Promise<void> {
  if (inflight || typeof document === 'undefined') return;
  inflight = true;
  try {
    const res = await fetch('/api/notifications?limit=20', { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as { items: AppNotification[]; unread: number };
    emit({ items: json.items, unread: json.unread, loaded: true });
  } catch {
    /* offline: keep what we have */
  } finally {
    inflight = false;
  }
}

export async function markRead(id: string): Promise<void> {
  const target = state.items.find((n) => n.id === id);
  if (!target || target.read_at) return;
  emit({
    ...state,
    items: state.items.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    unread: Math.max(0, state.unread - 1),
  });
  fetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }).catch(() => {});
}

export async function markAllRead(): Promise<void> {
  const now = new Date().toISOString();
  emit({ ...state, items: state.items.map((n) => ({ ...n, read_at: n.read_at ?? now })), unread: 0 });
  fetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  }).catch(() => {});
}

const onVisible = () => {
  if (document.visibilityState === 'visible') void refreshNotifications();
};
const onMessage = (e: MessageEvent) => {
  if (e.data?.type === 'hq-push') void refreshNotifications();
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refreshNotifications();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshNotifications();
    }, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    navigator.serviceWorker?.addEventListener('message', onMessage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    }
  };
}

const EMPTY: State = { items: [], unread: 0, loaded: false };

export function useNotifications(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY
  );
}
