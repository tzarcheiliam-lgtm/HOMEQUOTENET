'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarPlus, CircleCheck, Home, Loader2, Phone } from 'lucide-react';
import { formatDayHeading } from '@/lib/booking/format';
import { BookedTime, CallTime, ViewHeading } from './call-summary';
import { SlotPicker, type PickerExpansion } from './slot-picker';
import { useViewerTimeZone } from './zone';
import './booking.css';

/**
 * The visit booking page's flow (/booking/visit/<link>), texted after the voice note:
 * describe the project -> pick a time -> confirm -> "You're booked".
 * kind 'visit' = the free in-home estimate on the contractor's availability; 'call' = a quick call when no contractor
 * is on the lead yet. All booking goes to POST /api/booking/visit, which re-checks everything.
 */

export interface VisitFlowData {
  firstName: string | null;
  project: string | null;
  kind: 'visit' | 'call';
  who: string;
  minutes: number;
  timeZone: string;
  slots: { start: string; end: string }[];
}

interface Booked { kind: 'visit' | 'call'; who: string; startsAt: string; endsAt: string; minutes: number; firstName: string | null }
type View = 'describe' | 'pick' | 'confirm' | 'booking' | 'booked' | 'ended';

const MIN = 10;
const MAX = 800;
const FAILED = 'We couldn’t confirm it. Nothing was booked yet. Please try again.';

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function googleLink(b: Booked): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: b.kind === 'visit' ? `Free in-home estimate with ${b.who}` : `Call with ${b.who}`,
    dates: `${stamp(b.startsAt)}/${stamp(b.endsAt)}`,
    details: b.kind === 'visit' ? 'Free in-home estimate for your project. Reply R to our text to change the time.' : `${b.minutes}-minute call about your project. Reply R to our text to change the time.`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function VisitBookingFlow({ grant, initial }: { grant: string; initial: VisitFlowData }) {
  const uid = useId();
  const [data, setData] = useState(initial);
  const [view, setView] = useState<View>('describe');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);
  const [expanded, setExpanded] = useState<PickerExpansion>(() => ({ dayCount: 3, openDays: new Set() }));
  const viewerZone = useViewerTimeZone(data.timeZone);
  const [zone, setZone] = useState<string | null>(null);
  const shownZone = zone ?? viewerZone;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    headingRef.current?.focus({ preventScroll: false });
  }, [view]);

  const visit = data.kind === 'visit';
  const trimmed = description.trim();
  const end = selected ? new Date(Date.parse(selected) + data.minutes * 60_000).toISOString() : null;

  async function confirm() {
    if (!selected) return;
    setView('booking');
    setMessage(null);
    try {
      const res = await fetch('/api/booking/visit', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant, startsAt: selected, description: trimmed }),
      });
      const r = await res.json().catch(() => ({ ok: false, message: FAILED }));
      if (r.ok) { setBooked(r.booking); setView('booked'); return; }
      setMessage(r.message ?? FAILED);
      if (r.page?.state === 'open') { setData(r.page); setSelected(null); setView('pick'); return; }
      if (r.error === 'description') { setView('describe'); return; }
      if (['invalid', 'closed', 'already_booked', 'no_times'].includes(r.error)) { setView('ended'); return; }
      setView('confirm');
    } catch {
      setMessage(FAILED);
      setView('confirm');
    }
  }

  return (
    <div className="bk" data-visit-booking="" data-view={view}>
      <div role="status" aria-live="polite" className="sr-only">
        {view === 'booking' ? 'Booking…' : view === 'booked' && booked ? `You’re booked for ${formatDayHeading(Date.parse(booked.startsAt), shownZone)}.` : ''}
      </div>

      {view === 'describe' ? (
        <form className="bk-enter" onSubmit={(e) => { e.preventDefault(); if (trimmed.length >= MIN) { setMessage(null); setView('pick'); } }}>
          <ViewHeading level={1} headingRef={headingRef}>
            {data.firstName ? `Hi ${data.firstName}, tell us about your project` : 'Tell us about your project'}
          </ViewHeading>
          <p className="bk-copy mt-3 text-[17px] leading-[25px] text-[var(--bk-text)]">
            A few words on what you’re looking to do, so {visit ? `${data.who} comes` : 'we come'} prepared. Then pick a time for your {visit ? 'free in-home estimate' : 'call'}.
          </p>
          <label htmlFor={`${uid}-desc`} className="mt-6 block text-[15px] font-medium leading-[22px] text-[var(--bk-ink)]">
            What would you like done?
          </label>
          <textarea
            id={`${uid}-desc`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX}
            rows={5}
            required
            minLength={MIN}
            aria-describedby={`${uid}-desc-hint`}
            placeholder={data.project ? `e.g. Full ${data.project}: what’s there now, what you’d like instead, any timing` : 'e.g. Redo the main bathroom: walk-in shower instead of the tub, new vanity, hoping to start in spring'}
            className="mt-2 w-full rounded-[8px] bg-white px-3.5 py-3 text-[16px] leading-[24px] text-[var(--bk-ink)] shadow-[inset_0_0_0_1px_var(--bk-hair)] outline-none placeholder:text-[var(--bk-muted)] focus-visible:shadow-[inset_0_0_0_1px_var(--bk-accent),0_0_0_3px_var(--bk-focus)]"
          />
          <p id={`${uid}-desc-hint`} className="mt-1.5 flex justify-between text-[14px] leading-[20px] text-[var(--bk-muted)]">
            <span>{trimmed.length < MIN ? 'A sentence or two is plenty.' : 'Thanks, that helps.'}</span>
            <span className="tabular-nums">{description.length}/{MAX}</span>
          </p>
          {message ? <Alert className="mt-4">{message}</Alert> : null}
          <button type="submit" className="bk-slot mt-5" disabled={trimmed.length < MIN}>Pick a time</button>
        </form>
      ) : null}

      {view === 'pick' ? (
        <div className="bk-enter">
          <ViewHeading level={1} headingRef={headingRef}>{visit ? 'Pick a time for your free estimate' : 'Pick a time for a quick call'}</ViewHeading>
          <p className="bk-copy mt-3 text-[17px] leading-[25px] text-[var(--bk-text)]">
            {visit ? `${data.who} comes to your place to see the project and give you real numbers. About an hour.` : `A ${data.minutes}-minute call with ${data.who} to go over your project.`}
          </p>
          {message ? <Alert className="mt-4">{message}</Alert> : null}
          <div className="mt-5">
            <SlotPicker
              slots={data.slots}
              timeZone={shownZone}
              zoneChoices={[viewerZone, data.timeZone]}
              onTimeZoneChange={setZone}
              selected={selected}
              onSelect={(start) => { setSelected(start); setMessage(null); setView('confirm'); }}
              headingLevel={2}
              expanded={expanded}
              onExpandedChange={setExpanded}
            />
          </div>
          <button type="button" className="bk-link mt-5" onClick={() => setView('describe')}>Edit project details</button>
        </div>
      ) : null}

      {(view === 'confirm' || view === 'booking') && selected && end ? (
        <div className="bk-enter" data-visit-confirm="">
          <ViewHeading level={1} headingRef={headingRef}>{visit ? 'Confirm your free estimate' : 'Confirm your call'}</ViewHeading>
          <div className="mt-5"><CallTime startsAt={selected} endsAt={end} timeZone={shownZone} /></div>
          <How visit={visit} who={data.who} minutes={data.minutes} className="mt-4" />
          <div className="bk-rule mt-5 pt-5">
            <p className="text-[14px] font-medium leading-[20px] text-[var(--bk-muted)]">Your project</p>
            <p className="bk-copy mt-1 whitespace-pre-line text-[15.5px] leading-[23px] text-[var(--bk-text)]">{trimmed}</p>
          </div>
          {message ? <Alert className="mt-5">{message}</Alert> : null}
          <button type="button" className="bk-slot mt-6" onClick={() => void confirm()} disabled={view === 'booking'} aria-busy={view === 'booking' || undefined}>
            {view === 'booking' ? <><Loader2 aria-hidden className="size-[18px] motion-safe:animate-spin" />Booking…</> : visit ? 'Book my free estimate' : 'Book my call'}
          </button>
          <button type="button" className="bk-link mt-2 w-full justify-center" onClick={() => setView('pick')} disabled={view === 'booking'}>Pick another time</button>
        </div>
      ) : null}

      {view === 'booked' && booked ? (
        <div className="bk-enter" data-visit-booked="">
          <span className="bk-check" aria-hidden><CircleCheck className="size-[26px]" strokeWidth={2} /></span>
          <ViewHeading level={1} headingRef={headingRef}>You’re booked{booked.firstName ? `, ${booked.firstName}` : ''}</ViewHeading>
          <div className="mt-5"><BookedTime startsAt={booked.startsAt} endsAt={booked.endsAt} timeZone={shownZone} /></div>
          <How visit={booked.kind === 'visit'} who={booked.who} minutes={booked.minutes} className="bk-rule mt-5 pt-5" />
          <p className="bk-copy mt-4 text-[15px] leading-[22px] text-[var(--bk-muted)]">
            We’ll text you a confirmation now, then a reminder the day before and the morning of. Need a different time? Just reply R to our text.
          </p>
          <a className="bk-secondary mt-5 w-full" href={googleLink(booked)} target="_blank" rel="noreferrer">
            <CalendarPlus aria-hidden className="size-[18px]" strokeWidth={2} />Add to Google Calendar
          </a>
        </div>
      ) : null}

      {view === 'ended' ? (
        <div className="bk-enter">
          <ViewHeading level={1} headingRef={headingRef}>{message?.startsWith('You’re already booked') ? 'You’re already booked' : 'This link isn’t active'}</ViewHeading>
          <p className="bk-copy mt-3 text-[16px] leading-[24px] text-[var(--bk-text)]">{message}</p>
        </div>
      ) : null}
    </div>
  );
}

function How({ visit, who, minutes, className = '' }: { visit: boolean; who: string; minutes: number; className?: string }) {
  const Icon = visit ? Home : Phone;
  return (
    <p className={`bk-copy flex gap-3 text-[15.5px] leading-[23px] text-[var(--bk-text)] ${className}`}>
      <Icon aria-hidden className="mt-[3px] size-[17px] shrink-0 text-[var(--bk-muted)]" strokeWidth={2} />
      <span>{visit
        ? <>Free in-home estimate with <span className="font-medium text-[var(--bk-ink)]">{who}</span>, about an hour at your place.</>
        : <>A {minutes}-minute call with <span className="font-medium text-[var(--bk-ink)]">{who}</span>. They’ll call you at the number you gave us.</>}</span>
    </p>
  );
}

function Alert({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`bk-copy rounded-[8px] bg-[#fdf3e7] px-4 py-3 text-[15px] leading-[22px] text-[#6b3d07] ${className}`}>{children}</p>
  );
}
