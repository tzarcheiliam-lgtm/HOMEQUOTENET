'use client';

import { useState, useTransition } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrCreateFeedUrl, revokeFeedUrl } from '@/lib/actions/availability';

/** Apple / any-calendar subscribe link. The URL is the credential, so it is only fetched on demand. */
export function FeedLink({ hasLink }: { hasLink: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [active, setActive] = useState(hasLink);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const load = (rotate: boolean) =>
    start(async () => {
      setError(null);
      const result = await getOrCreateFeedUrl(rotate);
      if (result.error || !result.url) return setError(result.error ?? 'Could not create the link');
      setUrl(result.url);
      setActive(true);
    });

  const webcal = url ? url.replace(/^https?:\/\//, 'webcal://') : null;

  return (
    <div className="space-y-3">
      {!url ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => load(false)} disabled={pending}>
            {pending ? 'Preparing…' : active ? 'Show my calendar link' : 'Add to Apple Calendar'}
          </Button>
          {active && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await revokeFeedUrl();
                  setActive(false);
                })
              }
            >
              Turn off link
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={webcal!}>Open in Apple Calendar</a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* clipboard blocked: the field below is selectable */
                }
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => load(true)}>
              New link (old one stops working)
            </Button>
          </div>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs" aria-label="Private calendar link" />
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Anyone with this private link can see your appointments, so don’t share it. Apple and Google refresh subscribed calendars every few
        hours, so new or changed appointments can take a while to appear — connect Google Calendar for instant updates.
      </p>
    </div>
  );
}
