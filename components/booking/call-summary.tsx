'use client';

import { useEffect, useState, type ReactNode, type Ref } from 'react';
import { CalendarPlus, Phone, UserPlus, Video } from 'lucide-react';
import { formatDayHeading, formatRange, formatTime, zoneAbbreviation } from '@/lib/booking/format';
import { callLengthPhrase, saveNumberLabel } from '@/lib/booking/host-contact';
import { capitalize, googleCalendarLink } from './calendar-links';
import type { PublicBooking, PublicCalendar, PublicHostContact } from './types';
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

/**
 * How the call happens. With a host contact (the calendar's): "A quick
 * 10-minute call. Liam from Pool Masters will call you at the number ending
 * 0100." Without one: "A 30-minute phone call with Pool Masters. They'll call
 * you at the number ending 0100."
 */
export function CallHow({ meetingType, hostName, durationMinutes, phoneHint, videoLink, host = null }: {
  meetingType: PublicCalendar['meetingType']; hostName: string; durationMinutes: number; phoneHint: string | null; videoLink?: string | null;
  host?: PublicHostContact | null;
}) {
  const video = meetingType === 'video';
  const Icon = video ? Video : Phone;
  const ending = phoneHint ? <> at the number ending <span className="tabular-nums">{phoneHint}</span></> : null;
  return (
    <p className="bk-copy flex gap-3 text-[15.5px] leading-[23px] text-[var(--bk-text)]" data-booking-how="">
      <Icon aria-hidden className="mt-[3px] size-[17px] shrink-0 text-[var(--bk-muted)]" strokeWidth={2} />
      {host ? (
        <span>
          {callLengthPhrase(durationMinutes, video)}{video ? <> with {host.displayName}</> : null}.{' '}
          {video
            ? videoLink ? <>Join at <a className="font-medium text-[var(--bk-accent-ink)] underline underline-offset-2" href={videoLink} rel="noreferrer" target="_blank">{videoLink.replace(/^https:\/\//, '')}</a>.</> : 'You’ll get the video link before the call.'
            : <><span className="font-medium text-[var(--bk-ink)]">{host.displayName}</span> will call you{ending}.</>}
        </span>
      ) : (
        <span>
          A {durationMinutes}-minute {video ? 'video' : 'phone'} call with {hostName}.{' '}
          {video
            ? videoLink ? <>Join at <a className="font-medium text-[var(--bk-accent-ink)] underline underline-offset-2" href={videoLink} rel="noreferrer" target="_blank">{videoLink.replace(/^https:\/\//, '')}</a>.</> : 'You’ll get the video link before the call.'
            : <>{capitalize(pronoun(hostName))} will call you{ending}.</>}
        </span>
      )}
    </p>
  );
}

/** "a HomeQuote project specialist" -> "we"; a company -> "they". */
const pronoun = (hostName: string) => (/^a /.test(hostName) || hostName === 'HomeQuote' ? 'we' : 'they');

/**
 * The booked time, set large: the day over the start time, then the end and
 * the zone. "Tuesday, November 3" / "9:15 AM" / "to 9:25 AM PST".
 */
export function BookedTime({ startsAt, endsAt, timeZone }: { startsAt: string; endsAt: string; timeZone: string }) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  return (
    <p className="bk-when" data-booking-time="">
      <span className="block text-[15px] font-medium leading-[22px] text-[var(--bk-muted)]">{formatDayHeading(start, timeZone)}</span>
      <span className="mt-1 block text-[clamp(34px,10vw,40px)] font-[600] leading-[1.05] tracking-[-0.03em] tabular-nums text-[var(--bk-ink)]">{formatTime(start, timeZone)}</span>
      <span className="mt-1.5 block text-[15px] leading-[22px] tabular-nums text-[var(--bk-text)]">
        to {formatTime(end, timeZone)} {zoneAbbreviation(start, timeZone)}
      </span>
    </p>
  );
}

/**
 * "Save Liam's number": a contact card preview (logo, name, number) over one
 * primary button that opens the host's vCard. Served inline, so iOS and
 * Android show their own "Add contact" sheet; desktop browsers download it.
 * Opened only by the homeowner's own tap (never automatically: the booking's
 * network round trip ends the tap's user activation, and leaving the page
 * mid-celebration would be worse than one obvious button).
 */
export function HostContactCard({ host, primary = true }: { host: PublicHostContact; primary?: boolean }) {
  if (!host.vcardUrl || !host.phoneDisplay) return null;
  return (
    <div className="bk-contact" data-booking-contact="">
      <div className="flex items-center gap-3.5">
        <span className="bk-avatar" aria-hidden>
          {host.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small static logo; next/image adds nothing here
            <img src={host.photoUrl} alt="" width={56} height={56} decoding="async" />
          ) : (
            <span className="text-[20px] font-semibold text-[var(--bk-accent-ink)]">{(host.firstName ?? host.displayName).slice(0, 1)}</span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-[600] leading-[23px] tracking-[-0.01em] text-[var(--bk-ink)]">{host.displayName}</span>
          <span className="mt-0.5 block whitespace-nowrap text-[15px] leading-[21px] tabular-nums text-[var(--bk-text)]">{host.phoneDisplay}</span>
          <span className="block truncate text-[13.5px] leading-[19px] text-[var(--bk-muted)]">{host.org}</span>
        </span>
      </div>
      <a className={`${primary ? 'bk-slot' : 'bk-secondary w-full'} mt-4`} href={host.vcardUrl} data-booking-save-contact="">
        <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
        {saveNumberLabel(host)}
      </a>
      <p className="bk-copy mt-2.5 text-center text-[13.5px] leading-[19px] text-[var(--bk-muted)]">
        So you’ll know it’s us when we call.
      </p>
    </div>
  );
}

/** Google link + .ics (Apple, Outlook). Needs the manage token's links (right after booking, or on the manage page). */
export function AddToCalendar({ booking }: { booking: PublicBooking }) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  if (!booking.icsUrl || booking.status !== 'scheduled') return null;
  return (
    <div className="bk-add" data-booking-add-to-calendar=""><div className="bk-add-row">
      <a className="bk-secondary w-full" href={googleCalendarLink(booking, origin)} target="_blank" rel="noreferrer">
        <CalendarPlus aria-hidden className="size-[17px]" strokeWidth={2} />
        Add to Google Calendar
      </a>
      {/* No download attribute: iOS then offers "Add to Calendar" (the route serves it inline). */}
      <a className="bk-secondary w-full" href={booking.icsUrl}>
        <CalendarPlus aria-hidden className="size-[17px]" strokeWidth={2} />
        Add to Apple or Outlook
      </a>
    </div></div>
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
