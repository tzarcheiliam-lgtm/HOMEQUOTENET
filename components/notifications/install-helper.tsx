'use client';

import { useEffect, useState } from 'react';
import { Share, SquarePlus, X } from 'lucide-react';
import { detectEnv } from '@/lib/notifications/client';

const KEY = 'hq_install_dismissed_at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function InstallSteps() {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm">
      <li>
        Open HomeQuote in <strong>Safari</strong>.
      </li>
      <li>
        Tap the <Share className="mx-0.5 inline size-4 align-text-bottom" aria-hidden="true" /> <strong>Share</strong> button.
      </li>
      <li>
        Tap <SquarePlus className="mx-0.5 inline size-4 align-text-bottom" aria-hidden="true" /> <strong>Add to Home Screen</strong>.
      </li>
      <li>Open HomeQuote from the new Home Screen icon.</li>
      <li>Then turn on notifications in Notification settings.</li>
    </ol>
  );
}

/**
 * Only for iPhone/iPad visitors in a Safari tab (Web Push does not exist there
 * until HomeQuote is on the Home Screen). Phones only, dismissible, and once
 * dismissed it stays away for two weeks.
 */
export function InstallHelper() {
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const env = detectEnv();
    if (!env.isIOS || env.standalone) return;
    try {
      const at = Number(localStorage.getItem(KEY) ?? 0);
      if (at && Date.now() - at < SNOOZE_MS) return;
    } catch {
      /* storage blocked: show it */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="mb-3 rounded-xl border bg-card p-3 lg:hidden" role="region" aria-label="Install HomeQuote">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install HomeQuote</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add HomeQuote to your Home Screen to use it like an app and enable push notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-accent"
        >
          <X className="size-5" />
        </button>
      </div>
      {expanded ? (
        <div className="mt-2">
          <InstallSteps />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 min-h-11 w-full rounded-lg border text-sm font-medium active:bg-accent"
        >
          Show me how
        </button>
      )}
    </div>
  );
}
