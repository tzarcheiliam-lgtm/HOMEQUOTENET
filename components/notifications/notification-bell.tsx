'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { markAllRead, markRead, useNotifications } from './use-notifications';
import type { AppNotification } from '@/lib/notifications/types';

function ago(iso: string): string {
  const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function BellButton({ unread, className, ...props }: { unread: number; className?: string } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      className={cn('relative flex items-center justify-center rounded-lg text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}
      {...props}
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  );
}

function Panel({ onNavigate, big }: { onNavigate: () => void; big: boolean }) {
  const router = useRouter();
  const { items, unread, loaded } = useNotifications();

  const open = (n: AppNotification) => {
    void markRead(n.id);
    onNavigate();
    router.push(n.url || '/app');
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={unread === 0}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary disabled:opacity-40',
            big ? 'min-h-11' : 'min-h-8'
          )}
        >
          <CheckCheck className="size-4" aria-hidden="true" />
          Mark all read
        </button>
      </div>

      {!loaded ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-background">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={cn(
                  'flex w-full items-start gap-3 px-3 text-left active:bg-accent hover:bg-accent/60',
                  big ? 'min-h-16 py-3' : 'py-2.5'
                )}
              >
                <span
                  className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-primary')}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', n.read_at ? 'font-normal' : 'font-semibold')}>{n.title}</span>
                  {n.body ? <span className="block truncate text-sm text-muted-foreground">{n.body}</span> : null}
                </span>
                <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{ago(n.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/app/settings/notifications"
        onClick={onNavigate}
        className={cn(
          'mt-3 flex items-center justify-center gap-2 rounded-lg border text-sm font-medium active:bg-accent hover:bg-accent/60',
          big ? 'min-h-12' : 'min-h-9'
        )}
      >
        <Settings className="size-4" aria-hidden="true" />
        Notification settings
      </Link>
    </div>
  );
}

/**
 * The bell. Phones open a bottom sheet with 44px+ rows; the desktop header
 * gets a small dropdown, so the desktop layout only gains one icon.
 */
export function NotificationBell({ variant }: { variant: 'desktop' | 'mobile' }) {
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== 'desktop' || !open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [variant, open]);

  if (variant === 'mobile') {
    return (
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Notifications"
        trigger={<BellButton unread={unread} className="size-11 shrink-0" />}
      >
        <Panel big onNavigate={() => setOpen(false)} />
      </BottomSheet>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <BellButton unread={unread} onClick={() => setOpen((v) => !v)} aria-expanded={open} className="size-9 hover:bg-accent" />
      {open ? (
        <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-96 overflow-y-auto rounded-xl border bg-card p-3 shadow-lg">
          <Panel big={false} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
