/**
 * Text-message wording for calendar bookings (confirmation, reschedule,
 * reminders, cancellation). Pure. Texts go out through the Mac bridge, whose
 * queue strips every link (lib/sms/rules.ts finalizeOutbound), so by default
 * the copy points to the confirmation email for the reschedule / cancel link.
 * Pass `link` only once the texting path allows first-party links.
 */
import { formatSlot, formatTime, safeTimeZone, zoneAbbreviation } from './format';
import { callMinutes, callWith, prettyPhone, type GuestMessageContext, type HomeownerNotice } from '@/lib/emails/booking';

export interface SmsCopyOptions {
  /** The guest has an email address (the manage link is in it). */
  hasEmail: boolean;
  /** Manage link to include in the text itself (only when links survive the queue). */
  link?: string | null;
  /** Their estimator design is in the confirmation email ("We emailed you your design."). */
  design?: boolean;
}

/**
 * With a host contact the text says who calls and from which number, so the
 * homeowner can save it ("Liam will call you at (310) 555-0100. Save
 * (747) 217-5713 so you know it's us."): the vCard link itself would be
 * stripped by the queue, so the number is spelled out (phones make it
 * tappable) and the email carries "Save Liam's number".
 */
export function bookingSms(notice: HomeownerNotice, c: GuestMessageContext, opts: SmsCopyOptions): string {
  const tz = safeTimeZone(c.timeZone);
  const when = formatSlot(c.startMs, tz);
  const hi = c.firstName?.trim() ? `Hi ${c.firstName.trim()}, ` : '';
  const phone = prettyPhone(c.phone);
  const host = c.host ?? null;
  const who = host ? host.firstName ?? host.displayName : null;
  const from = host ? prettyPhone(host.phone) : null;
  const mins = callMinutes(c.startMs, c.endMs);
  const what = host ? `${mins <= 15 ? 'quick ' : ''}${mins}-minute call` : 'call';
  const how = c.meetingType === 'video'
    ? ' It’s a video call; the link is in your email.'
    : host
      ? `${phone ? ` ${who} will call you at ${phone}.` : ` ${who} will call you.`}${from ? ` Save ${from} so you know it’s us.` : ''}`
      : phone ? ` We’ll call you at ${phone}.` : '';
  const change = opts.link
    ? ` Reschedule or cancel: ${opts.link}`
    : opts.hasEmail ? ' Need to reschedule or cancel? Use the link in your confirmation email.' : '';
  const name = callWith(c);
  const design = opts.design && opts.hasEmail ? ' We emailed you your design.' : '';
  switch (notice) {
    case 'confirmed':
      return host
        ? `${hi}you’re booked: a ${what} with ${name}, ${when}.${how}${design}${change}`
        : `${hi}your call with ${name} is booked for ${when}.${how}${design}${change}`;
    case 'rescheduled':
      return `${hi}your ${what} with ${name} is moved to ${when}.${how}${change}`;
    case 'reminder_24h':
      return `Reminder: your ${what} with ${name} is ${when}.${how}${change}`;
    case 'reminder_1h':
      return `Reminder: your ${what} with ${name} starts in about an hour, at ${formatTime(c.startMs, tz)} ${zoneAbbreviation(c.startMs, tz)}.${how}`;
    case 'cancelled':
      return `${hi}your call with ${name} on ${when} is cancelled.${opts.hasEmail ? ' Want a new time? Just reply to our email.' : ''}`;
  }
}
