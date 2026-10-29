/**
 * Text-message wording for calendar bookings (confirmation, reschedule,
 * reminders, cancellation). Pure. Texts go out through the Mac bridge, whose
 * queue strips every link (lib/sms/rules.ts finalizeOutbound), so by default
 * the copy points to the confirmation email for the reschedule / cancel link.
 * Pass `link` only once the texting path allows first-party links.
 */
import { formatSlot, formatTime, safeTimeZone, zoneAbbreviation } from './format';
import { prettyPhone, type GuestMessageContext, type HomeownerNotice } from '@/lib/emails/booking';

export interface SmsCopyOptions {
  /** The guest has an email address (the manage link is in it). */
  hasEmail: boolean;
  /** Manage link to include in the text itself (only when links survive the queue). */
  link?: string | null;
}

export function bookingSms(notice: HomeownerNotice, c: GuestMessageContext, opts: SmsCopyOptions): string {
  const tz = safeTimeZone(c.timeZone);
  const when = formatSlot(c.startMs, tz);
  const hi = c.firstName?.trim() ? `Hi ${c.firstName.trim()}, ` : '';
  const phone = prettyPhone(c.phone);
  const how = c.meetingType === 'video' ? ' It’s a video call; the link is in your email.' : phone ? ` We’ll call you at ${phone}.` : '';
  const change = opts.link
    ? ` Reschedule or cancel: ${opts.link}`
    : opts.hasEmail ? ' Need to reschedule or cancel? Use the link in your confirmation email.' : '';
  switch (notice) {
    case 'confirmed':
      return `${hi}your call with ${c.hostName} is booked for ${when}.${how}${change}`;
    case 'rescheduled':
      return `${hi}your call with ${c.hostName} is moved to ${when}.${how}${change}`;
    case 'reminder_24h':
      return `Reminder: your call with ${c.hostName} is ${when}.${how}${change}`;
    case 'reminder_1h':
      return `Reminder: your call with ${c.hostName} starts in about an hour, at ${formatTime(c.startMs, tz)} ${zoneAbbreviation(c.startMs, tz)}.${how}`;
    case 'cancelled':
      return `${hi}your call with ${c.hostName} on ${when} is cancelled.${opts.hasEmail ? ' Want a new time? Just reply to our email.' : ''}`;
  }
}
