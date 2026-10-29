'use client';

import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';
import { CircleCheck, Loader2 } from 'lucide-react';
import { formatDayHeading, safeTimeZone } from '@/lib/booking/format';
import { AddToCalendar, CallHow, CallTime, ViewHeading } from './call-summary';
import { flowReducer, initialFlow } from './flow-state';
import { SlotPicker, SlotPickerSkeleton, type PickerExpansion } from './slot-picker';
import type { BookResponse, CallbackResponse, PublicBooking, SlotsResponse } from './types';
import { useViewerTimeZone } from './zone';
import './booking.css';

/**
 * "Book your free call": the whole homeowner booking step, on HomeQuote's own
 * calendar. Drop it into a funnel step with the grant the funnel's route
 * returned (a booking ticket, or contractorFunnelGrant() for the sales funnel):
 *
 *   <BookingFlow grant={ticket} onBooked={(b, metaEventId) => ...} />
 *
 * Load times -> tap one (confirm view, no request yet) -> "Confirm call" ->
 * "You're booked" with the call details, Add to calendar and the
 * reschedule / cancel link. Taken in the meantime -> back to fresh times with
 * the reason. "None of these times work?" records a callback request instead.
 * Every network call goes to /api/booking/** (same origin).
 */

export interface BookingFlowProps {
  grant: string;
  /** Shown above the times; the funnel's own step heading can replace it (heading={null}). */
  heading?: string | null;
  intro?: string | null;
  /** Heading level of the flow's own headings (2 inside a page that has an h1). */
  headingLevel?: 1 | 2 | 3;
  onBooked?: (booking: PublicBooking, metaEventId: string | null) => void;
  /** A call booked earlier (a refresh, a second tab): no tracking, just so the host page can match its own heading. */
  onAlreadyBooked?: (booking: PublicBooking) => void;
  /** Offer "None of these times work?" (default true). */
  allowCallback?: boolean;
  /** API base (tests / previews). */
  apiBase?: string;
  /** Skip "You're booked" heading + check when the host page shows its own. */
  hideBookedHeading?: boolean;
}

const UNAVAILABLE = 'Booking is temporarily unavailable. Please try again in a moment.';
/** The book request itself failed: say plainly that nothing was booked. */
const NOT_BOOKED = 'We couldn’t confirm your call. Nothing was booked yet. Tap Confirm call to try again.';

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
  try {
    return (await res.json()) as T;
  } catch {
    return { ok: false, error: 'unavailable', message: UNAVAILABLE } as T;
  }
}

export function BookingFlow({
  grant, heading = 'Book your free call', intro = null, headingLevel = 2, onBooked, onAlreadyBooked, allowCallback = true, apiBase = '/api/booking',
  hideBookedHeading = false,
}: BookingFlowProps) {
  const alreadyRef = useRef(onAlreadyBooked);
  alreadyRef.current = onAlreadyBooked;
  const uid = useId();
  const [s, dispatch] = useReducer(flowReducer, initialFlow);
  const viewerZone = useViewerTimeZone(s.calendar?.timeZone ?? 'America/Los_Angeles');
  const [zone, setZone] = useState<string | null>(null);
  const shownZone = zone ?? viewerZone;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // "Show more days" / "N more times" survive the trip to the confirm view and back.
  const [expanded, setExpanded] = useState<PickerExpansion>(() => ({ dayCount: 3, openDays: new Set() }));

  const load = useCallback(async (message?: string) => {
    try {
      const r = await call<SlotsResponse>(`${apiBase}/slots`, { headers: { 'X-Booking-Grant': grant } });
      if (r.ok) {
        dispatch({ type: 'loaded', calendar: r.calendar, slots: r.slots, booked: r.booked, callbackRequested: r.callbackRequested, contact: r.contact, message });
        if (r.booked) alreadyRef.current?.(r.booked);
      } else dispatch({ type: 'load_failed', message: r.message });
    } catch {
      dispatch({ type: 'load_failed', message: UNAVAILABLE });
    }
  }, [apiBase, grant]);

  useEffect(() => { void load(); }, [load]);

  // Focus follows the homeowner's own actions only (never the first load inside a funnel).
  // Back on the times with one picked: that time, so the place in a long list is kept.
  useEffect(() => {
    if (s.focusKey === 0) return;
    if (s.view === 'pick' && s.selected) {
      const option = rootRef.current?.querySelector<HTMLButtonElement>(`[data-slot-start="${s.selected}"]`);
      if (option) {
        option.focus({ preventScroll: true });
        option.scrollIntoView({ block: 'center' });
        return;
      }
    }
    headingRef.current?.focus({ preventScroll: false });
  }, [s.focusKey]); // eslint-disable-line react-hooks/exhaustive-deps -- focus moves once per homeowner action

  async function confirm() {
    if (!s.selected) return;
    dispatch({ type: 'submit' });
    try {
      const r = await call<BookResponse>(`${apiBase}/book`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant, startsAt: s.selected, timeZone: safeTimeZone(viewerZone) }),
      });
      if (r.ok) {
        dispatch({ type: 'booked', booking: r.booking });
        onBooked?.(r.booking, r.metaEventId);
      } else if (r.error === 'already_booked' && r.booking) {
        dispatch({ type: 'booked', booking: r.booking });
        onAlreadyBooked?.(r.booking);
      } else if (r.pickAnother) {
        dispatch({ type: 'pick_another', message: r.message });
        void load(r.message);
      } else {
        dispatch({ type: 'failed', message: r.error === 'unavailable' || !r.message ? NOT_BOOKED : r.message });
      }
    } catch {
      dispatch({ type: 'failed', message: NOT_BOOKED });
    }
  }

  async function sendCallback() {
    setSending(true);
    try {
      const r = await call<CallbackResponse>(`${apiBase}/callback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant, note: note.trim() || undefined }),
      });
      if (r.ok) dispatch({ type: 'callback_sent' });
      else dispatch({ type: 'failed', message: r.message });
    } catch {
      dispatch({ type: 'failed', message: UNAVAILABLE });
    } finally {
      setSending(false);
    }
  }

  function retry() {
    dispatch({ type: 'reload' });
    void load();
  }

  const cal = s.calendar;
  const dayLevel = Math.min(4, headingLevel + 1) as 2 | 3 | 4;
  const zoneChoices = cal ? [viewerZone, cal.timeZone] : [];
  const confirming = s.view === 'confirm' || s.view === 'booking';
  // Messages about the confirm step sit next to its button; the rest above the times.
  const alert = s.message && s.view !== 'unavailable' && !confirming ? s.message : null;
  const showPicker = (s.view === 'pick' || confirming) && !!cal && s.slots.length > 0;

  return (
    <div ref={rootRef} className="bk" data-booking-flow="" data-view={s.view}>
      {/* One live region for every outcome, present from the start so it is announced. */}
      <div role="status" aria-live="polite" className="sr-only">
        {s.view === 'booking' ? 'Booking your call…' : s.view === 'booked' && s.booking ? `You’re booked for ${formatDayHeading(Date.parse(s.booking.startsAt), shownZone)}.` : s.view === 'callback_sent' ? 'Callback requested.' : ''}
      </div>

      {(s.view === 'loading' || s.view === 'pick' || s.view === 'unavailable') && heading ? (
        <ViewHeading level={headingLevel} headingRef={headingRef}>{heading}</ViewHeading>
      ) : null}
      {(s.view === 'loading' || s.view === 'pick') && intro ? (
        <p className={`bk-copy text-[17px] leading-[25px] text-[var(--bk-text)] ${heading ? 'mt-3' : ''}`}>{intro}</p>
      ) : null}

      {alert ? <Alert className="mt-4">{alert}</Alert> : null}

      {s.view === 'loading' ? <div className={heading || intro ? 'mt-5' : ''}><SlotPickerSkeleton /></div> : null}

      {s.view === 'unavailable' ? (
        <div className="mt-4">
          <p role="alert" className="bk-copy text-[16px] leading-[24px] text-[var(--bk-text)]">{s.message}</p>
          <button type="button" className="bk-secondary mt-4 w-full" onClick={retry}>Try again</button>
          {allowCallback ? (
            <button type="button" className="bk-link mt-2 w-full justify-center" onClick={() => dispatch({ type: 'open_callback' })} data-booking-callback-open="">
              Ask us to call you instead
            </button>
          ) : null}
        </div>
      ) : null}

      {s.view === 'pick' && cal && !s.slots.length ? (
        <div className={heading || intro ? 'mt-5' : ''} data-booking-empty="">
          {!heading ? <span ref={headingRef} tabIndex={-1} className="sr-only">No open times</span> : null}
          <p className="bk-copy text-[16px] leading-[24px] text-[var(--bk-text)]">
            There are no open times in the next two weeks.{allowCallback ? ' Ask for a call and we’ll find a time with you.' : ''}
          </p>
          {allowCallback ? (
            <button type="button" className="bk-slot mt-5" onClick={() => dispatch({ type: 'open_callback' })} data-booking-callback-open="">
              Request a callback
            </button>
          ) : null}
        </div>
      ) : null}

      {/* The picker stays mounted (hidden) while confirming, so going back keeps its place. */}
      {showPicker && cal ? (
        <div className={heading ? 'mt-5' : intro ? 'mt-3' : ''} hidden={s.view !== 'pick'}>
          {!heading ? <span ref={s.view === 'pick' ? headingRef : undefined} tabIndex={-1} className="sr-only">Pick a time</span> : null}
          <SlotPicker
            slots={s.slots}
            timeZone={shownZone}
            zoneChoices={zoneChoices}
            onTimeZoneChange={setZone}
            selected={s.selected}
            onSelect={(start) => dispatch({ type: 'select', start })}
            headingLevel={dayLevel}
            expanded={expanded}
            onExpandedChange={setExpanded}
          />
          {allowCallback ? (
            <button type="button" className="bk-link mt-5" onClick={() => dispatch({ type: 'open_callback' })} data-booking-callback-open="">
              None of these times work?
            </button>
          ) : null}
        </div>
      ) : null}

      {confirming && cal && s.selected ? (
        <div className="bk-enter" data-booking-confirm="">
          <ViewHeading level={headingLevel} headingRef={headingRef}>Confirm your call</ViewHeading>
          <div className="mt-5">
            <CallTime startsAt={s.selected} endsAt={new Date(Date.parse(s.selected) + cal.durationMinutes * 60_000).toISOString()} timeZone={shownZone} />
          </div>
          <div className="mt-4">
            <CallHow meetingType={cal.meetingType} hostName={cal.hostName} durationMinutes={cal.durationMinutes} phoneHint={s.contact.phoneHint} />
          </div>
          {s.message ? <Alert className="mt-5">{s.message}</Alert> : null}
          <button
            type="button"
            className="bk-slot mt-6"
            onClick={() => void confirm()}
            aria-busy={s.view === 'booking' || undefined}
            disabled={s.view === 'booking'}
          >
            {s.view === 'booking' ? <><Loader2 aria-hidden className="size-[18px] motion-safe:animate-spin" />Booking your call…</> : 'Confirm call'}
          </button>
          <button type="button" className="bk-link mt-2 w-full justify-center" onClick={() => dispatch({ type: 'back' })} disabled={s.view === 'booking'}>
            Pick another time
          </button>
        </div>
      ) : null}

      {s.view === 'booked' && s.booking ? (
        <BookedView booking={s.booking} timeZone={shownZone} headingLevel={headingLevel} headingRef={headingRef} hideHeading={hideBookedHeading} />
      ) : null}

      {s.view === 'callback' ? (
        <form className="bk-enter" onSubmit={(e) => { e.preventDefault(); void sendCallback(); }} data-booking-callback="">
          <ViewHeading level={headingLevel} headingRef={headingRef}>Ask for a call instead</ViewHeading>
          <p className="bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]">
            We’ll call you{s.contact.phoneHint ? <> at the number ending <span className="tabular-nums">{s.contact.phoneHint}</span></> : null} to find a time that works.
          </p>
          <label htmlFor={`${uid}-note`} className="mt-5 block text-[15px] font-medium leading-[22px] text-[var(--bk-ink)]">
            Best time to reach you <span className="font-normal text-[var(--bk-muted)]">(optional)</span>
          </label>
          <input
            id={`${uid}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Weekday evenings, after 5"
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-[8px] bg-white px-3.5 text-[16px] text-[var(--bk-ink)] shadow-[inset_0_0_0_1px_var(--bk-hair)] outline-none placeholder:text-[var(--bk-muted)] focus-visible:shadow-[inset_0_0_0_1px_var(--bk-accent),0_0_0_3px_var(--bk-focus)]"
          />
          {s.message ? <Alert className="mt-4">{s.message}</Alert> : null}
          <button type="submit" className="bk-slot mt-5" disabled={sending} aria-busy={sending || undefined}>
            {sending ? <><Loader2 aria-hidden className="size-[18px] motion-safe:animate-spin" />Sending…</> : 'Request a callback'}
          </button>
          <button type="button" className="bk-link mt-2 w-full justify-center" onClick={() => dispatch({ type: 'back' })} disabled={sending}>
            {cal ? 'Back to the times' : 'Back'}
          </button>
        </form>
      ) : null}

      {s.view === 'callback_sent' ? (
        <div className="bk-enter" data-booking-callback-sent="">
          <CircleCheck aria-hidden className="mb-3 size-8 text-[var(--bk-accent)]" strokeWidth={1.8} />
          <ViewHeading level={headingLevel} headingRef={headingRef}>We’ll call you</ViewHeading>
          <p className="bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]">
            Thanks{s.contact.firstName ? `, ${s.contact.firstName}` : ''}. Someone will call you{s.contact.phoneHint ? <> at the number ending <span className="tabular-nums">{s.contact.phoneHint}</span></> : null} within one business day, usually sooner, to set up a time.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Alert({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`bk-copy rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07] ${className}`} data-booking-message="">
      {children}
    </p>
  );
}

/** "You're booked": the time, how the call happens, Add to calendar, and the change link. */
export function BookedView({ booking, timeZone, headingLevel = 2, headingRef, hideHeading = false }: {
  booking: PublicBooking; timeZone: string; headingLevel?: 1 | 2 | 3; headingRef?: React.Ref<HTMLHeadingElement>;
  /** The host page already says it (the sales funnel's own "Your call is booked." heading). */
  hideHeading?: boolean;
}) {
  // Sales calls (contractor prospects) get email only; homeowners get a text too.
  const emailOnly = booking.kind === 'sales';
  return (
    <div className="bk-enter" data-booking-booked="">
      {hideHeading ? null : (
        <>
          <CircleCheck aria-hidden className="mb-3 size-8 text-[var(--bk-accent)]" strokeWidth={1.8} />
          <ViewHeading level={headingLevel} headingRef={headingRef}>
            You’re booked{booking.firstName ? `, ${booking.firstName}` : ''}
          </ViewHeading>
        </>
      )}
      <div className={hideHeading ? '' : 'mt-5'}>
        <CallTime startsAt={booking.startsAt} endsAt={booking.endsAt} timeZone={timeZone} />
      </div>
      <div className="mt-4">
        <CallHow meetingType={booking.meetingType} hostName={booking.hostName} durationMinutes={booking.durationMinutes} phoneHint={booking.phoneHint} videoLink={booking.videoLink} />
      </div>
      <p className="bk-copy mt-3 text-[15px] leading-[22px] text-[var(--bk-muted)]">
        {emailOnly ? 'We’ll email you the details, and a reminder before the call.' : 'We’ll text and email you the details, and send a reminder before the call.'}
      </p>
      {booking.icsUrl ? <div className="mt-6"><AddToCalendar booking={booking} /></div> : null}
      {booking.manageUrl ? (
        <a className="bk-link mt-3" href={booking.manageUrl} data-booking-manage="">Reschedule or cancel</a>
      ) : (
        <p className="bk-copy mt-4 text-[15px] leading-[22px] text-[var(--bk-muted)]">
          Need to change it? Use the link in your confirmation email.
        </p>
      )}
    </div>
  );
}
