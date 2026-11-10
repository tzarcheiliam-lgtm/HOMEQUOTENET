'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Check, Copy, Mail, MessageSquareText, Plus, Video } from 'lucide-react';
import { createMeetingLink, type CreateLinkResult } from '@/lib/actions/meeting-links';
import { contactKind, inviteMessage, inviteSubject, mailtoHref, smsHref } from '@/lib/video/share';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Ready = Extract<CreateLinkResult, { ok: true }>;

/** "2026-11-06T14:30" in the browser's zone, rounded up to the next quarter hour, an hour from now. */
function defaultLater(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000);
      return true;
    } catch {
      return false;
    }
  };
  return { copied, copy };
}

/**
 * Make a video meeting link in one step and send it: name and phone/email are
 * optional, "Now" is the default. The link is copied as soon as it exists.
 */
export function MeetingComposer({
  hostFirstName,
  prospect,
}: {
  hostFirstName: string | null;
  prospect: { id: string; company: string; name: string | null; contact: string | null } | null;
}) {
  const [guestName, setGuestName] = useState(prospect?.name ?? '');
  const [contact, setContact] = useState(prospect?.contact ?? '');
  const [later, setLater] = useState(false);
  const [at, setAt] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [message, setMessage] = useState('');
  const [autoCopied, setAutoCopied] = useState(false);
  const [pending, start] = useTransition();
  const { copied, copy } = useCopy();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (later && !at) setAt(defaultLater());
  }, [later, at]);

  const submit = () => {
    setError(null);
    start(async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const r = await createMeetingLink({
        guestName,
        guestContact: contact,
        prospectId: prospect?.id,
        startsAt: later && at ? new Date(at).toISOString() : undefined,
        minutes: Number(minutes),
        timeZone: tz,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setReady(r);
      const msg = inviteMessage({
        url: r.guestUrl,
        guestName,
        hostFirstName,
        startsAtMs: r.startsAt ? Date.parse(r.startsAt) : null,
        timeZone: r.timeZone,
      });
      setMessage(msg);
      setAutoCopied(await copy('link', r.guestUrl));
    });
  };

  const reset = () => {
    setReady(null);
    setGuestName('');
    setContact('');
    setLater(false);
    setAt('');
    setAutoCopied(false);
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  const to = useMemo(() => contactKind(contact), [contact]);

  if (ready) {
    const isNow = !ready.startsAt;
    return (
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <span className="grid size-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-4" aria-hidden="true" />
              </span>
              Link ready{guestName.trim() ? ` for ${guestName.trim()}` : ''}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
              {autoCopied ? 'Copied to your clipboard. Paste it anywhere, or send it below.' : 'Send it below, or copy it.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="shrink-0 gap-1.5">
            <Plus className="size-4" aria-hidden="true" />
            New link
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={ready.guestUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-sm" aria-label="Guest link" />
          <Button variant="outline" onClick={() => copy('link', ready.guestUrl)} className="shrink-0 gap-1.5">
            {copied === 'link' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ml-message">Message</Label>
          <Textarea id="ml-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="text-sm" />
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={smsHref(to.phone, message)} className={cn(buttonVariants({ variant: to.phone || !to.email ? 'default' : 'outline' }), 'gap-1.5')}>
            <MessageSquareText className="size-4" aria-hidden="true" />
            {to.phone ? 'Text it' : 'Text…'}
          </a>
          <a href={mailtoHref(to.email, inviteSubject(hostFirstName), message)} className={cn(buttonVariants({ variant: to.email ? 'default' : 'outline' }), 'gap-1.5')}>
            <Mail className="size-4" aria-hidden="true" />
            {to.email ? 'Email it' : 'Email…'}
          </a>
          <Button variant="outline" onClick={() => copy('message', message)} className="gap-1.5">
            {copied === 'message' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied === 'message' ? 'Copied' : 'Copy message'}
          </Button>
          <Link href={ready.hostPath} className={cn(buttonVariants({ variant: isNow ? 'default' : 'outline' }), 'gap-1.5 sm:ml-auto')}>
            <Video className="size-4" aria-hidden="true" />
            {isNow ? 'Join now' : 'Open my room'}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">New meeting link</h2>
          {prospect ? (
            <Link href={`/app/calls/${prospect.id}`} className="truncate text-sm text-muted-foreground hover:underline">
              For {prospect.company}
            </Link>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ml-name">Who’s it for? <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="ml-name" ref={nameRef} autoFocus value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Mike Jones" maxLength={80} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ml-contact">Phone or email <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="ml-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="(310) 555-0100" maxLength={200} autoComplete="off" inputMode="email" />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">When</legend>
          <div className="inline-flex rounded-lg border p-0.5" role="radiogroup" aria-label="When">
            {[
              ['now', 'Now'],
              ['later', 'Pick a time'],
            ].map(([v, label]) => {
              const on = (v === 'later') === later;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLater(v === 'later')}
                  className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {later ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ml-at">Date and time</Label>
                <Input id="ml-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required className="w-auto" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ml-len">Length</Label>
                <Select id="ml-len" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-auto">
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                </Select>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">The room opens right away and stays open for the next few hours.</p>
          )}
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending} className="w-full gap-2 sm:w-auto">
          <Video className="size-4" aria-hidden="true" />
          {pending ? 'Creating…' : 'Create link'}
        </Button>
      </form>
    </Card>
  );
}
