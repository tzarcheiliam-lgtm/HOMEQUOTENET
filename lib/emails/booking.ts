/**
 * Emails for HomeQuote-native calendar bookings (migration 0068): what the
 * homeowner (or contractor prospect, for sales calls) gets on booking,
 * reschedule, cancel and the 24 h / 1 h reminders, and what the host gets on
 * booking, reschedule and cancel. Pure: no I/O, so previews and tests render
 * exactly what is sent. Times always carry their zone abbreviation.
 */
import { buildCalendar } from '@/lib/calendar/ics';
import { formatRange, formatSlot, safeTimeZone } from '@/lib/booking/format';
import type { MailAttachment } from '@/lib/emails/gmail-message';

export type HomeownerNotice = 'confirmed' | 'rescheduled' | 'reminder_24h' | 'reminder_1h' | 'cancelled';
export type HostNotice = 'booked' | 'rescheduled' | 'cancelled';

export interface BookingEmail {
  subject: string;
  html: string;
  text: string;
}

/** What the guest sees. Every string is plain text; links must be http(s). */
export interface GuestMessageContext {
  firstName: string | null;
  /** Who the call is with: "HomeQuote", "Pool Masters LA", "HomeQuote Network". */
  hostName: string;
  startMs: number;
  endMs: number;
  /** The guest's zone (their browser's), else the calendar's. */
  timeZone: string;
  meetingType: 'phone' | 'video';
  /** The number we will call (phone calls). */
  phone: string | null;
  videoLink: string | null;
  /** Self-service reschedule / cancel page (null when no link can be made). */
  manageUrl: string | null;
  /** "Add to calendar" (.ics) link. */
  icsUrl: string | null;
  previousStartMs?: number | null;
}

export interface HostMessageContext {
  hostFirstName: string | null;
  calendarName: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  /** Project / company line ("Bathroom remodel", "Acme Pools"). */
  project: string | null;
  notes: string | null;
  /** How it was booked ("Website funnel", "Booked by the team"). */
  sourceLabel: string | null;
  startMs: number;
  endMs: number;
  /** The calendar's zone. */
  timeZone: string;
  previousStartMs?: number | null;
  cancelReason?: string | null;
  cancelledByGuest?: boolean;
  /** Absolute link into the app (lead or prospect page). */
  appUrl: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** Only http(s) links are ever written into an email. */
export function safeLink(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** "+13105550100" -> "(310) 555-0100"; anything else as typed. */
export function prettyPhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? '').trim();
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d.length === 10 ? d : null;
  return ten ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : raw;
}

const minutes = (startMs: number, endMs: number) => Math.max(1, Math.round((endMs - startMs) / 60_000));

/** How the call happens, in one sentence for the guest. */
export function howLine(c: Pick<GuestMessageContext, 'meetingType' | 'phone' | 'videoLink' | 'hostName'>): string {
  if (c.meetingType === 'video') {
    const link = safeLink(c.videoLink);
    return link ? `It's a video call. Join here: ${link}` : `It's a video call. ${c.hostName} will send you the link.`;
  }
  const phone = prettyPhone(c.phone);
  return phone ? `We'll call you at ${phone}.` : `${c.hostName} will call you.`;
}

interface Button { label: string; url: string }

function shell(paragraphs: string[], buttons: Button[], footer: string): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px 0;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
  const cells = buttons
    .map((b, i) => `<td style="border-radius:8px;background:${i === 0 ? '#0038B8' : '#EEF3FC'};"><a href="${escapeHtml(b.url)}" style="display:inline-block;padding:12px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${i === 0 ? '#ffffff' : '#0038B8'};text-decoration:none;border-radius:8px;">${escapeHtml(b.label)}</a></td>`)
    .join('<td style="width:10px;"></td>');
  const row = buttons.length ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr>${cells}</tr></table>` : '';
  return [
    '<div style="margin:0;padding:0;background:#ffffff;color:#0A1B3D;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;">',
    '<div style="max-width:600px;margin:0;padding:4px 0;">',
    body,
    row,
    '<div style="margin-top:16px;border-top:1px solid #DCE4F2;padding-top:12px;font-size:13px;color:#5B6B8C;">',
    escapeHtml(footer),
    '</div></div></div>',
  ].join('');
}

function textOf(paragraphs: string[], buttons: Button[], footer: string): string {
  return [...paragraphs, ...buttons.map((b) => `${b.label}: ${b.url}`), `—\n${footer}`].join('\n\n');
}

/** The guest's email for one notice. */
export function buildGuestBookingEmail(notice: HomeownerNotice, c: GuestMessageContext): BookingEmail {
  const tz = safeTimeZone(c.timeZone);
  const when = formatSlot(c.startMs, tz);
  const hi = c.firstName?.trim() ? `Hi ${c.firstName.trim()},` : 'Hi,';
  const length = `${minutes(c.startMs, c.endMs)}-minute ${c.meetingType === 'video' ? 'video' : 'phone'} call`;
  const detail = `When: ${when}\nLength: ${length} (${formatRange(c.startMs, c.endMs, tz)})`;
  const manage = safeLink(c.manageUrl);
  const ics = safeLink(c.icsUrl);
  const buttons: Button[] = [];
  if (notice !== 'cancelled' && manage) buttons.push({ label: 'Reschedule or cancel', url: manage });
  if (notice !== 'cancelled' && ics) buttons.push({ label: 'Add to calendar', url: ics });
  const change = manage ? null : 'Need to change it? Just reply to this email.';

  let subject: string;
  let lines: string[];
  switch (notice) {
    case 'confirmed':
      subject = `Your call with ${c.hostName} is booked: ${when}`;
      lines = [hi, `You're all set. Your call with ${c.hostName} is booked.`, detail, howLine(c)];
      break;
    case 'rescheduled': {
      const was = c.previousStartMs ? ` (it was ${formatSlot(c.previousStartMs, tz)})` : '';
      subject = `Your call with ${c.hostName} moved to ${when}`;
      lines = [hi, `Your call with ${c.hostName} has a new time${was}.`, detail, howLine(c)];
      break;
    }
    case 'reminder_24h':
      subject = `Reminder: your call with ${c.hostName} is coming up (${when})`;
      lines = [hi, `A quick reminder that your call with ${c.hostName} is coming up.`, detail, howLine(c)];
      break;
    case 'reminder_1h':
      subject = `Starting soon: your call with ${c.hostName} at ${when}`;
      lines = [hi, `Your call with ${c.hostName} starts in about an hour.`, detail, howLine(c)];
      break;
    case 'cancelled':
      subject = `Your call with ${c.hostName} is cancelled`;
      lines = [hi, `Your call with ${c.hostName} on ${when} is cancelled.`, 'Want a new time? Just reply to this email and we will set one up.'];
      break;
  }
  if (notice !== 'cancelled' && change) lines.push(change);
  const footer = c.hostName.toLowerCase().includes('homequote') ? 'HomeQuote Network · homequotenet.com' : `${c.hostName} · booked through HomeQuote Network`;
  return { subject, html: shell(lines, buttons, footer), text: textOf(lines, buttons, footer) };
}

/** The host's (calendar member's) email for one change. */
export function buildHostBookingEmail(notice: HostNotice, c: HostMessageContext): BookingEmail {
  const tz = safeTimeZone(c.timeZone);
  const when = formatSlot(c.startMs, tz);
  const hi = c.hostFirstName?.trim() ? `Hi ${c.hostFirstName.trim()},` : 'Hi,';
  const who = c.guestName.trim() || 'A homeowner';
  const facts = [
    `When: ${when} (${formatRange(c.startMs, c.endMs, tz)})`,
    `Calendar: ${c.calendarName}`,
    `Name: ${who}`,
    c.guestPhone ? `Phone: ${prettyPhone(c.guestPhone)}` : null,
    c.guestEmail ? `Email: ${c.guestEmail}` : null,
    c.project ? `Project: ${c.project}` : null,
    c.sourceLabel ? `Booked via: ${c.sourceLabel}` : null,
    c.notes ? `Notes: ${c.notes}` : null,
  ].filter(Boolean).join('\n');
  let subject: string;
  let lead: string;
  switch (notice) {
    case 'booked':
      subject = `New call booked: ${who}, ${when}`;
      lead = `${who} booked a call on the ${c.calendarName} calendar.`;
      break;
    case 'rescheduled':
      subject = `Call moved: ${who}, now ${when}`;
      lead = `${who}'s call was moved${c.previousStartMs ? ` from ${formatSlot(c.previousStartMs, tz)}` : ''} to ${when}.`;
      break;
    case 'cancelled':
      subject = `Call cancelled: ${who}, ${when}`;
      lead = `${c.cancelledByGuest ? `${who} cancelled their call` : `${who}'s call was cancelled`}${c.cancelReason ? `. Reason: ${c.cancelReason}` : '.'}`;
      break;
  }
  const link = safeLink(c.appUrl);
  const buttons = link ? [{ label: 'Open in HomeQuote', url: link }] : [];
  const lines = [hi, lead, facts];
  const footer = 'HomeQuote Network · you get this because you host this calendar.';
  return { subject, html: shell(lines, buttons, footer), text: textOf(lines, buttons, footer) };
}

/** Stable calendar UID for a booking (sales calls reuse the 0066 meeting UID so adds update in place). */
export const bookingUid = (kind: 'appointment' | 'sales_appointment', id: string) =>
  kind === 'sales_appointment' ? `sales-meeting-${id}@homequotenet.com` : `booking-${id}@homequotenet.com`;

/** The .ics for a booking: one event, cancelled when the call is cancelled. SEQUENCE follows reschedules. */
export function bookingIcs(e: {
  kind: 'appointment' | 'sales_appointment';
  id: string;
  startMs: number;
  endMs: number;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  sequence: number;
  cancelled?: boolean;
  nowMs?: number;
}): string {
  return buildCalendar(
    [{
      uid: bookingUid(e.kind, e.id),
      startMs: e.startMs,
      endMs: e.endMs,
      summary: e.title,
      description: e.description ?? null,
      location: e.location ?? null,
      url: safeLink(e.url),
      status: e.cancelled ? 'CANCELLED' : 'CONFIRMED',
      sequence: e.sequence,
    }],
    { name: 'HomeQuote Network', method: e.cancelled ? 'CANCEL' : 'PUBLISH', nowMs: e.nowMs, feed: false }
  );
}

export function bookingIcsAttachment(e: Parameters<typeof bookingIcs>[0]): MailAttachment {
  return {
    filename: 'homequote-call.ics',
    contentType: `text/calendar; charset=UTF-8; method=${e.cancelled ? 'CANCEL' : 'PUBLISH'}`,
    content: bookingIcs(e),
  };
}
