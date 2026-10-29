'use client';

import { useEffect, useState, type ReactNode, type Ref } from 'react';
import { CalendarPlus, Phone, Video } from 'lucide-react';
import { formatDayHeading, formatRange } from '@/lib/booking/format';
import { capitalize, googleCalendarLink } from './calendar-links';
import type { PublicBooking, PublicCalendar } from './types';
import './booking.css';

/**
 * Pieces shared by the booking flow and the manage page: the call's time
 * block, how the call happens, and "Add to calendar".
 */

/** "Tuesday, November 3" over "9:30 AM – 10:00 AM PST", in the viewer's zone. */
export function CallTime({ startsAt, endsAt, timeZone, struck = false }: { startsAt: string; endsAt: string; timeZone: string; struck?: boolean }) {
  const start = Date.parse(startsAt);
  return (
    <p className={struck ? 'text-[var(--bk-muted)] line-through decoration-1' : undefined} data-booking-time="">
      <span className="block text-[22px] font-[550] leading-[28px] tracking-[-0.015em] text-inherit">{formatDayHeading(start, timeZone)}</span>
      <span className="mt-0.5 block text-[17px] leading-[24px] tabular-nums text-[var(--bk-text)]">{formatRange(start, Date.parse(endsAt), timeZone)}</span>
    </p>
  );
}

/** "A 30-minute phone call with Pool Masters. They'll call you at the number ending 0100." */
export function CallHow({ meetingType, hostName, durationMinutes, phoneHint, videoLink }: {
  meetingType: PublicCalendar['meetingType']; hostName: string; durationMinutes: number; phoneHint: string | null; videoLink?: string | null;
}) {
  const video = meetingType === 'video';
  const Icon = video ? Video : Phone;
  return (
    <p className="bk-copy flex gap-3 text-[15.5px] leading-[23px] text-[var(--bk-text)]" data-booking-how="">
      <Icon aria-hidden className="mt-[3px] size-[17px] shrink-0 text-[var(--bk-muted)]" strokeWidth={2} />
      <span>
        A {durationMinutes}-minute {video ? 'video' : 'phone'} call with {hostName}.{' '}
        {video
          ? videoLink ? <>Join at <a className="font-medium text-[var(--bk-accent-ink)] underline underline-offset-2" href={videoLink} rel="noreferrer" target="_blank">{videoLink.replace(/^https:\/\//, '')}</a>.</> : 'You’ll get the video link before the call.'
          : <>{capitalize(pronoun(hostName))} will call you{phoneHint ? <> at the number ending <span className="tabular-nums">{phoneHint}</span></> : null}.</>}
      </span>
    </p>
  );
}

/** "a HomeQuote project specialist" -> "we"; a company -> "they". */
const pronoun = (hostName: string) => (/^a /.test(hostName) || hostName === 'HomeQuote' ? 'we' : 'they');

/** Google link + .ics (Apple, Outlook). Needs the manage token's links (right after booking, or on the manage page). */
export function AddToCalendar({ booking }: { booking: PublicBooking }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  if (!booking.icsUrl || booking.status !== 'scheduled') return null;
  return (
    <div className="flex flex-col gap-2.5" data-booking-add-to-calendar="">
      <a className="bk-secondary w-full" href={googleCalendarLink(booking, origin)} target="_blank" rel="noreferrer">
        <CalendarPlus aria-hidden className="size-[17px]" strokeWidth={2} />
        Add to Google Calendar
      </a>
      {/* No download attribute: iOS then offers "Add to Calendar" (the route serves it inline). */}
      <a className="bk-secondary w-full" href={booking.icsUrl}>
        <CalendarPlus aria-hidden className="size-[17px]" strokeWidth={2} />
        Add to Apple or Outlook
      </a>
    </div>
  );
}

/** A heading the flow focuses when the homeowner's action changed the view. */
export function ViewHeading({ children, level = 2, headingRef, id }: { children: ReactNode; level?: 1 | 2 | 3; headingRef?: Ref<HTMLHeadingElement>; id?: string }) {
  const H = `h${level}` as 'h1' | 'h2' | 'h3';
  return (
    <H ref={headingRef} id={id} tabIndex={-1} className="bk-heading text-[clamp(24px,6.6vw,28px)] font-[550] leading-[1.15] tracking-[-0.02em] text-[var(--bk-ink)] outline-none">
      {children}
    </H>
  );
}
