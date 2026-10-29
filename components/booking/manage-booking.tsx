'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatDayHeading, formatTime } from '@/lib/booking/format';
import { AddToCalendar, CallHow, CallTime, ViewHeading } from './call-summary';
import { SlotPicker, SlotPickerSkeleton } from './slot-picker';
import type { ManageResponse, ManageSlotsResponse, PublicBooking, PublicSlot } from './types';
import { useViewerTimeZone } from './zone';
import './booking.css';

/**
 * The homeowner's manage page body (/booking/manage/<token>, no login): the
 * booked time, then Reschedule (the same picker, the current time marked) or
 * Cancel (optional reason). A call that is past, held or cancelled is shown
 * read-only. Every change goes through /api/booking/manage/<token>.
 */

type Mode = 'view' | 'pick' | 'confirm' | 'cancel';

const UNAVAILABLE = 'This is temporarily unavailable. Please try again in a moment.';

export function ManageBooking({ token, initial }: { token: string; initial: PublicBooking }) {
  const uid = useId();
  const [booking, setBooking] = useState(initial);
  const [mode, setMode] = useState<Mode>('view');
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const viewerZone = useViewerTimeZone(booking.inviteeTimeZone ?? booking.timeZone);
  const shownZone = zone ?? viewerZone;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const base = `/api/booking/manage/${encodeURIComponent(token)}`;

  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [mode, done]);

  function go(next: Mode) {
    moved.current = true;
    setMessage(null);
    setMode(next);
  }

  async function loadSlots(keepMessage = false) {
    setSlots(null);
    if (!keepMessage) setMessage(null);
    try {
      const res = await fetch(`${base}/slots`, { cache: 'no-store', credentials: 'same-origin' });
      const r = (await res.json()) as ManageSlotsResponse;
      if (r.ok) setSlots(r.slots);
      else { setSlots([]); setMessage(r.message); }
    } catch {
      setSlots([]);
      setMessage(UNAVAILABLE);
    }
  }

  async function change(body: Record<string, unknown>, success: (b: PublicBooking) => string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      const r = (await res.json()) as ManageResponse;
      if (r.ok) {
        moved.current = true;
        setBooking(r.booking);
        setDone(success(r.booking));
        setMode('view');
        setSelected(null);
      } else if (r.pickAnother) {
        setSelected(null);
        setMode('pick');
        setMessage(r.message);
        void loadSlots(true);
      } else {
        setMessage(r.message || UNAVAILABLE);
      }
    } catch {
      setMessage(UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  const cancelled = booking.status === 'cancelled';
  // canChange comes from the server (scheduled and still ahead), so render needs no clock.
  const past = !cancelled && !booking.canChange && booking.status === 'scheduled';
  const durationMs = Date.parse(booking.endsAt) - Date.parse(booking.startsAt);

  return (
    <div className="bk" data-booking-manage="" data-mode={mode}>
      <div role="status" aria-live="polite" className="sr-only">{done ?? ''}</div>

      {mode === 'view' ? (
        <>
          <ViewHeading level={1} headingRef={headingRef}>
            {cancelled ? 'Your call is cancelled' : past ? 'Your call' : `Your call with ${booking.hostName}`}
          </ViewHeading>
          {done ? <p className="bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]" data-booking-done="">{done}</p> : null}
          <div className="mt-6">
            <CallTime startsAt={booking.startsAt} endsAt={booking.endsAt} timeZone={shownZone} struck={cancelled} />
          </div>
          {!cancelled ? (
            <div className="mt-4">
              <CallHow meetingType={booking.meetingType} hostName={booking.hostName} durationMinutes={booking.durationMinutes} phoneHint={booking.phoneHint} videoLink={booking.videoLink} />
            </div>
          ) : null}
          {message ? <p role="alert" className="bk-copy mt-4 rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07]">{message}</p> : null}

          {booking.canChange ? (
            <>
              <div className="mt-6"><AddToCalendar booking={booking} /></div>
              <div className="mt-8 flex flex-col gap-2.5">
                <button type="button" className="bk-slot" onClick={() => { go('pick'); void loadSlots(); }} data-booking-reschedule="">
                  Reschedule
                </button>
                <button type="button" className="bk-secondary w-full" onClick={() => go('cancel')} data-booking-cancel-open="">
                  Cancel call
                </button>
              </div>
            </>
          ) : (
            <p className="bk-copy mt-6 text-[15.5px] leading-[23px] text-[var(--bk-muted)]" data-booking-readonly="">
              {cancelled
                ? `Changed your mind? Contact ${booking.hostName} to set up a new time.`
                : past ? 'This call’s time has passed, so it can’t be changed here.' : 'This call can’t be changed online.'}
            </p>
          )}
        </>
      ) : null}

      {mode === 'pick' ? (
        <div className="bk-enter">
          <ViewHeading level={1} headingRef={headingRef}>Pick a new time</ViewHeading>
          <p className="bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]">
            Now: {formatDayHeading(Date.parse(booking.startsAt), shownZone)} at <span className="tabular-nums">{formatTime(Date.parse(booking.startsAt), shownZone)}</span>
          </p>
          {message ? <p role="alert" className="bk-copy mt-4 rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07]">{message}</p> : null}
          <div className="mt-6">
            {slots === null ? <SlotPickerSkeleton /> : slots.length ? (
              <SlotPicker
                slots={slots}
                timeZone={shownZone}
                zoneChoices={[viewerZone, booking.timeZone]}
                onTimeZoneChange={setZone}
                current={booking.startsAt}
                selected={selected}
                onSelect={(start) => { setSelected(start); go('confirm'); }}
                headingLevel={2}
              />
            ) : !message ? (
              <p className="bk-copy text-[16px] leading-[24px] text-[var(--bk-text)]">There are no other open times in the next two weeks.</p>
            ) : null}
          </div>
          <button type="button" className="bk-link mt-5 w-full justify-center" onClick={() => go('view')}>Keep my current time</button>
        </div>
      ) : null}

      {mode === 'confirm' && selected ? (
        <div className="bk-enter">
          <ViewHeading level={1} headingRef={headingRef}>Move your call?</ViewHeading>
          <div className="mt-6">
            <CallTime startsAt={selected} endsAt={new Date(Date.parse(selected) + durationMs).toISOString()} timeZone={shownZone} />
          </div>
          <p className="bk-copy mt-3 text-[15.5px] leading-[23px] text-[var(--bk-muted)]">
            Instead of {formatDayHeading(Date.parse(booking.startsAt), shownZone)} at <span className="tabular-nums">{formatTime(Date.parse(booking.startsAt), shownZone)}</span>.
          </p>
          {message ? <p role="alert" className="bk-copy mt-4 rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07]">{message}</p> : null}
          <button
            type="button"
            className="bk-slot mt-6"
            disabled={busy}
            aria-disabled={busy || undefined}
            onClick={() => void change({ action: 'reschedule', startsAt: selected }, (b) => `Done. Your call is now ${formatDayHeading(Date.parse(b.startsAt), shownZone)} at ${formatTime(Date.parse(b.startsAt), shownZone)}.`)}
          >
            {busy ? <><Loader2 aria-hidden className="size-[18px] motion-safe:animate-spin" />Moving your call…</> : 'Move my call'}
          </button>
          <button type="button" className="bk-link mt-2 w-full justify-center" disabled={busy} onClick={() => go('pick')}>Pick another time</button>
        </div>
      ) : null}

      {mode === 'cancel' ? (
        <form className="bk-enter" onSubmit={(e) => { e.preventDefault(); void change({ action: 'cancel', reason: reason.trim() || undefined }, () => 'Nobody will call you at that time.'); }}>
          <ViewHeading level={1} headingRef={headingRef}>Cancel this call?</ViewHeading>
          <div className="mt-6">
            <CallTime startsAt={booking.startsAt} endsAt={booking.endsAt} timeZone={shownZone} />
          </div>
          <label htmlFor={`${uid}-reason`} className="mt-6 block text-[15px] font-medium leading-[22px] text-[var(--bk-ink)]">
            Reason <span className="font-normal text-[var(--bk-muted)]">(optional)</span>
          </label>
          <textarea
            id={`${uid}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="mt-2 w-full resize-none rounded-[8px] bg-white px-3.5 py-3 text-[16px] leading-[23px] text-[var(--bk-ink)] shadow-[inset_0_0_0_1px_var(--bk-hair)] outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--bk-accent),0_0_0_3px_var(--bk-focus)]"
          />
          {message ? <p role="alert" className="bk-copy mt-4 rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07]">{message}</p> : null}
          <button type="submit" className="bk-secondary bk-danger mt-6 w-full" disabled={busy} aria-disabled={busy || undefined} data-booking-cancel-confirm="">
            {busy ? <><Loader2 aria-hidden className="size-[18px] motion-safe:animate-spin" />Cancelling…</> : 'Cancel call'}
          </button>
          <button type="button" className="bk-link mt-2 w-full justify-center" disabled={busy} onClick={() => go('view')}>Keep my call</button>
        </form>
      ) : null}
    </div>
  );
}
