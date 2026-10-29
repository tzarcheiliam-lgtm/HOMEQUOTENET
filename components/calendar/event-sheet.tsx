'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { CalendarClock, ExternalLink, Mail, Phone, PhoneMissed, Video, XCircle } from 'lucide-react';
import { formatRange } from '@/lib/booking/format';
import { cancelCalendarEvent, reportMissedCall, rescheduleCalendarEvent, setCalendarEventStatus } from '@/lib/actions/booking';
import { fmtPhone, telHref } from '@/components/calls/format';
import { zoneLabel } from '@/components/booking/zone-label';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CalendarPanel } from './panel';
import { SlotChooser, type ChosenTime } from './slot-chooser';
import { isLive, longDayLabel, sourceLabel, statusActions, statusStyle, type CalendarEvent } from './view';
import { localParts } from '@/lib/availability/time';

type Mode = 'details' | 'reschedule' | 'cancel';

const MEETING: Record<string, string> = { phone: 'Phone call', video: 'Video call', in_person: 'In person' };

/**
 * Details of one booking with what the host can do next: call the homeowner,
 * open the lead, see their design, record held / no-show, reschedule (same
 * slot picker as the homeowner's) or cancel with an optional reason.
 */
export function EventSheet({
  event,
  calendarId,
  timeZone,
  canWork,
  allowOverride,
  nowMs,
  onClose,
}: {
  event: CalendarEvent | null;
  calendarId: string;
  timeZone: string;
  canWork: boolean;
  allowOverride: boolean;
  nowMs: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('details');
  const [chosen, setChosen] = useState<ChosenTime | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const key = event ? `${event.kind}:${event.id}` : '';

  useEffect(() => {
    setMode('details');
    setChosen(null);
    setReason('');
    setError(null);
    setNotice(null);
  }, [key]);

  if (!event) return <CalendarPanel open={false} onOpenChange={onClose} title="Appointment">{null}</CalendarPanel>;

  const s = statusStyle(event.kind, event.status);
  const live = isLive(event.kind, event.status);
  const canChange = canWork && live && event.kind !== 'visit' && event.startMs > nowMs;
  const canCancel = canWork && live && event.startMs > nowMs;
  const actions = canWork ? statusActions(event.kind, event.status, event.startMs, nowMs) : [];
  // The call time came and nobody picked up: text + email them a link to pick a new time (lead recovery).
  const canReportMissed = canWork && event.kind === 'appointment' && !!event.leadId && event.status === 'scheduled' && event.startMs <= nowMs;
  const missed = () => {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await reportMissedCall({ kind: event.kind, id: event.id });
      if (!r.ok) setError(r.error);
      else setNotice(r.message);
    });
  };
  const tel = telHref(event.phone);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? 'Something went wrong');
        return;
      }
      setMode('details');
      setChosen(null);
      setNotice(done);
    });
  };

  const footer =
    mode === 'reschedule' ? (
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { setMode('details'); setChosen(null); setError(null); }} disabled={pending}>Back</Button>
        <Button
          className="flex-1"
          disabled={!chosen || pending}
          onClick={() => chosen && run(() => rescheduleCalendarEvent({ kind: event.kind, id: event.id, startsAt: chosen.startsAt, override: chosen.override }), 'Rescheduled. The homeowner gets the new time.')}
        >
          {pending ? 'Saving…' : 'Move the call'}
        </Button>
      </div>
    ) : mode === 'cancel' ? (
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => { setMode('details'); setError(null); }} disabled={pending}>Keep it</Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={pending}
          onClick={() => run(() => cancelCalendarEvent({ kind: event.kind, id: event.id, reason: reason.trim() || undefined }), 'Cancelled.')}
        >
          {pending ? 'Cancelling…' : 'Cancel the call'}
        </Button>
      </div>
    ) : undefined;

  return (
    <CalendarPanel
      open
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={mode === 'reschedule' ? 'Pick a new time' : mode === 'cancel' ? 'Cancel this call?' : event.title}
      description={`${longDayLabel(localParts(event.startMs, timeZone).date)} · ${formatRange(event.startMs, event.endMs, timeZone)}`}
      footer={footer}
    >
      {error ? <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {notice ? <p className="mb-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" role="status">{notice}</p> : null}

      {mode === 'reschedule' ? (
        <SlotChooser
          calendarId={calendarId}
          calendarTimeZone={timeZone}
          reschedule={{ kind: event.kind, id: event.id }}
          allowOverride={allowOverride}
          value={chosen}
          onChange={setChosen}
        />
      ) : mode === 'cancel' ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {event.kind === 'visit'
              ? 'The visit is marked cancelled.'
              : event.kind === 'sales_appointment'
                ? `${event.title} gets a cancellation email.`
                : `${event.title} gets a cancellation text and email.`}
          </p>
          <label htmlFor="cancel-reason" className="text-sm font-medium">Reason (optional)</label>
          <Textarea id="cancel-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Homeowner asked to cancel" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
              <span aria-hidden className={cn('size-2 rounded-full', s.dot)} />
              {s.label}
            </span>
            {event.rescheduleCount > 0 ? <span className="text-xs text-muted-foreground">Rescheduled {event.rescheduleCount}×</span> : null}
            <span className="text-xs text-muted-foreground">{zoneLabel(event.startMs, timeZone)}</span>
          </div>

          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm">
            {event.subtitle ? (<><dt className="text-muted-foreground">{event.kind === 'sales_appointment' ? 'Company' : 'Project'}</dt><dd>{event.subtitle}</dd></>) : null}
            {event.city ? (<><dt className="text-muted-foreground">City</dt><dd>{event.city}</dd></>) : null}
            {event.contractorName ? (<><dt className="text-muted-foreground">Contractor</dt><dd>{event.contractorName}</dd></>) : null}
            {event.meetingType ? (<><dt className="text-muted-foreground">Meeting</dt><dd>{MEETING[event.meetingType] ?? event.meetingType}</dd></>) : null}
            {event.location && !['Phone call', 'Video call'].includes(event.location) ? (
              <><dt className="text-muted-foreground">Where</dt><dd className="break-words">{/^https:\/\//.test(event.location) ? <a href={event.location} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><Video className="size-3.5" aria-hidden />Join link</a> : event.location}</dd></>
            ) : null}
            {sourceLabel(event.source) ? (<><dt className="text-muted-foreground">Booked via</dt><dd>{sourceLabel(event.source)}</dd></>) : null}
            {event.cancelReason ? (<><dt className="text-muted-foreground">Reason</dt><dd>{event.cancelReason}</dd></>) : null}
          </dl>

          <div className="grid gap-2 sm:grid-cols-2">
            {tel ? (
              <a href={tel} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
                <Phone aria-hidden /> Call {fmtPhone(event.phone)}
              </a>
            ) : null}
            {event.email ? (
              <a href={`mailto:${event.email}`} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full min-w-0')}>
                <Mail aria-hidden /> <span className="truncate">Email</span>
              </a>
            ) : null}
          </div>

          {event.design ? (
            <section aria-labelledby="design-heading" className="space-y-2 rounded-xl border p-3">
              <h3 id="design-heading" className="text-sm font-semibold">Their design</h3>
              {event.design.photo ? (
                // Remote estimator photos (example designs) on the site's own domain; a plain img keeps this dependency-free.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.design.photo.url} alt={event.design.photo.alt} className="aspect-[4/3] w-full rounded-lg bg-muted object-cover" loading="lazy" />
              ) : null}
              {event.design.range ? <p className="text-sm"><span className="text-muted-foreground">Ballpark </span><span className="font-medium">{event.design.range}</span></p> : null}
              {event.design.lines.length ? (
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {event.design.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              ) : null}
              {event.design.designUrl ? (
                <a href={event.design.designUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Open their design <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </section>
          ) : null}

          {event.notes ? (
            <section className="space-y-1">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{event.notes}</p>
            </section>
          ) : null}

          {event.leadId || event.prospectId ? (
            <Link
              href={event.leadId ? `/app/leads/${event.leadId}` : `/app/calls/${event.prospectId}`}
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              {event.leadId ? 'Open the lead' : 'Open the prospect'}
            </Link>
          ) : null}

          {actions.length || canChange || canCancel || canReportMissed ? (
            <section aria-label="Actions" className="space-y-2 border-t pt-4">
              {canReportMissed ? (
                <div className="space-y-1">
                  <Button variant="outline" className="w-full" disabled={pending} onClick={missed} data-missed-call="">
                    <PhoneMissed aria-hidden /> Couldn’t reach them
                  </Button>
                  <p className="text-xs text-muted-foreground">Texts and emails {event.title.split(' ')[0] || 'them'} a link to pick a new time, and logs the attempt.</p>
                </div>
              ) : null}
              {actions.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {actions.map((a) => (
                    <Button
                      key={a.value}
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(() => setCalendarEventStatus({ kind: event.kind, id: event.id, status: a.value }), `Marked ${a.label.toLowerCase()}.`)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              {canChange ? (
                <Button variant="outline" className="w-full" disabled={pending} onClick={() => { setMode('reschedule'); setNotice(null); }}>
                  <CalendarClock aria-hidden /> Reschedule
                </Button>
              ) : null}
              {canCancel ? (
                <Button variant="destructive-outline" className="w-full" disabled={pending} onClick={() => { setMode('cancel'); setNotice(null); }}>
                  <XCircle aria-hidden /> Cancel
                </Button>
              ) : null}
            </section>
          ) : null}
          {event.kind === 'visit' ? (
            <p className="text-xs text-muted-foreground">On-site visits are booked from the lead. They block this calendar so no call lands on top of one.</p>
          ) : null}
        </div>
      )}
    </CalendarPanel>
  );
}
