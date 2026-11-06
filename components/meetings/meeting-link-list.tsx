'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Check, Copy, Video, X } from 'lucide-react';
import { cancelMeetingLink } from '@/lib/actions/meeting-links';
import type { MeetingLinkRow, MeetingLinkStatus } from '@/lib/data/meeting-links';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

const STATUS: Record<MeetingLinkStatus, { label: string; tone: string }> = {
  open: { label: 'Open now', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  upcoming: { label: 'Upcoming', tone: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  ended: { label: 'Ended', tone: 'bg-muted text-muted-foreground ring-border' },
  cancelled: { label: 'Cancelled', tone: 'bg-muted text-muted-foreground ring-border' },
};

function when(r: MeetingLinkRow): string {
  const opts = { timeZone: r.timeZone } as const;
  const start = new Date(r.startsAt);
  const day = new Intl.DateTimeFormat('en-US', { ...opts, weekday: 'short', month: 'short', day: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat('en-US', { ...opts, hour: 'numeric', minute: '2-digit' }).format(start);
  return `${day}, ${time}`;
}

function Row({ r, showHost }: { r: MeetingLinkRow; showHost: boolean }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const live = r.status === 'open' || r.status === 'upcoming';
  const who = r.guestName || r.company || 'Anyone with the link';
  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {who}
          {r.guestName && r.company ? <span className="font-normal text-muted-foreground"> · {r.company}</span> : null}
        </p>
        <p className="text-sm text-muted-foreground">
          {when(r)}
          {showHost && r.hostName ? ` · ${r.hostName}` : ''}
          {r.guestContact ? ` · ${r.guestContact}` : ''}
        </p>
        {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      </div>
      <span className={cn('self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 sm:self-center', STATUS[r.status].tone)}>{STATUS[r.status].label}</span>
      {live ? (
        <div className="flex flex-wrap gap-2">
          {r.guestUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(r.guestUrl!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  window.prompt('Copy the guest link:', r.guestUrl!);
                }
              }}
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          ) : null}
          <Link href={r.hostPath} className={cn(buttonVariants({ size: 'sm', variant: r.status === 'open' ? 'default' : 'outline' }), 'gap-1.5')}>
            <Video className="size-4" aria-hidden="true" />
            Join
          </Link>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label={`Cancel the link for ${who}`}
            title="Cancel this link"
            onClick={() => {
              if (!window.confirm('Cancel this link? Anyone who opens it will see that the meeting was cancelled.')) return;
              start(async () => {
                const res = await cancelMeetingLink(r.id);
                if (!res.ok) setError(res.error ?? 'Could not cancel the link.');
              });
            }}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function MeetingLinkList({ rows, showHost }: { rows: MeetingLinkRow[]; showHost: boolean }) {
  if (!rows.length) {
    return <EmptyState icon={Video} title="No meeting links yet" description="Links you create show up here, so you can copy one again or jump into the call." />;
  }
  return (
    <Card className="gap-0 p-0 lg:gap-0 lg:py-0">
      <ul className="divide-y">
        {rows.map((r) => (
          <Row key={r.id} r={r} showHost={showHost} />
        ))}
      </ul>
    </Card>
  );
}
