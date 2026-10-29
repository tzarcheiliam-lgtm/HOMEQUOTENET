/**
 * Emails for HomeQuote-native calendar bookings (migration 0070): what the
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
  /**
   * Who calls (the calendar's host contact): "Liam from Pool Masters", "Liam",
   * the number the call comes from, and the absolute "Save Liam's number"
   * vCard link. Null = the wording names hostName.
   */
  host?: GuestHost | null;
  /**
   * Their estimator design ("Your design" block on the confirmation: photo,
   * picks, ballpark and the read-only share link). Texts can't carry links or
   * pictures through the Mac bridge, so the email carries it.
   */
  design?: EmailDesign | null;
}

/** The "Your design" block (lib/leads/design.server.ts LeadDesign, as the email shows it). */
export interface EmailDesign {
  /** "Your Luxe pool design" */
  heading: string;
  /** "Classic · Luxe · Zero-edge spa" */
  recap: string | null;
  /** "$85,000 – $110,000" */
  range: string | null;
  examplePrices: boolean;
  /** Absolute photo URL (http(s) only). */
  photoUrl: string | null;
  photoAlt: string;
  /** Absolute read-only design page. */
  url: string | null;
}

export interface GuestHost {
  displayName: string;
  firstName: string | null;
  /** E.164 the call comes from. */
  phone: string | null;
  /** Absolute vCard URL (GET /api/booking/contact/<id>.vcf). */
  vcardUrl: string | null;
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

/** HTML-escape plain text (for other email builders). */
export const escapeHtmlText = escapeHtml;

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

export const callMinutes = (startMs: number, endMs: number) => Math.max(1, Math.round((endMs - startMs) / 60_000));
const minutes = callMinutes;

/** Who the call is with, as the guest reads it: "Liam from Pool Masters", else the host's name. */
export const callWith = (c: Pick<GuestMessageContext, 'hostName' | 'host'>) => c.host?.displayName ?? c.hostName;

/** "Save Liam's number" / "Save our number". */
export const saveNumberText = (c: Pick<GuestMessageContext, 'host'>) => (c.host?.firstName ? `Save ${c.host.firstName}'s number` : 'Save our number');

/** How the call happens, in one sentence for the guest. */
export function howLine(c: Pick<GuestMessageContext, 'meetingType' | 'phone' | 'videoLink' | 'hostName' | 'host'>): string {
  if (c.meetingType === 'video') {
    const link = safeLink(c.videoLink);
    return link ? `It's a video call. Join here: ${link}` : `It's a video call. ${callWith(c)} will send you the link.`;
  }
  const phone = prettyPhone(c.phone);
  if (c.host) {
    const who = c.host.firstName ?? c.host.displayName;
    const from = prettyPhone(c.host.phone);
    return `${who} will call you${phone ? ` at ${phone}` : ''}${from ? ` from ${from}` : ''}.`;
  }
  return phone ? `We'll call you at ${phone}.` : `${c.hostName} will call you.`;
}

export interface Button { label: string; url: string }

/** The host's card under the buttons: name, number, "Save Liam's number". */
export interface ContactBlock { name: string; phone: string | null; label: string; url: string }

function contactHtml(b: ContactBlock): string {
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;width:100%;max-width:420px;border:1px solid #DCE4F2;border-radius:12px;"><tr><td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;">',
    `<div style="font-size:16px;font-weight:700;color:#0A1B3D;">${escapeHtml(b.name)}</div>`,
    b.phone ? `<div style="font-size:14px;color:#5B6B8C;margin-top:2px;">${escapeHtml(b.phone)}</div>` : '',
    `<div style="margin-top:12px;"><a href="${escapeHtml(b.url)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0038B8;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(b.label)}</a></div>`,
    '<div style="font-size:13px;color:#5B6B8C;margin-top:8px;">So you know it\'s us when we call.</div>',
    '</td></tr></table>',
  ].join('');
}

/** "Your design": the photo, the picks, the ballpark and a link to the read-only design page. */
export function designHtml(d: EmailDesign): string {
  const photo = safeLink(d.photoUrl);
  const url = safeLink(d.url);
  const img = photo
    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(d.photoAlt)}" width="420" style="display:block;width:100%;max-width:420px;height:auto;border-radius:10px;border:0;margin:0 0 12px 0;">`
    : '';
  const pic = img && url ? `<a href="${escapeHtml(url)}" style="text-decoration:none;">${img}</a>` : img;
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;width:100%;max-width:420px;"><tr><td style="font-family:Arial,Helvetica,sans-serif;">',
    `<div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#5B6B8C;margin:0 0 8px 0;">${escapeHtml(d.heading)}</div>`,
    pic,
    d.recap ? `<div style="font-size:16px;font-weight:700;color:#0A1B3D;">${escapeHtml(d.recap)}</div>` : '',
    d.range ? `<div style="font-size:15px;color:#0A1B3D;margin-top:2px;">Ballpark ${escapeHtml(d.range)}<span style="color:#5B6B8C;"> · not a quote${d.examplePrices ? ', example prices' : ''}</span></div>` : '',
    url ? `<div style="margin-top:10px;"><a href="${escapeHtml(url)}" style="font-size:15px;font-weight:700;color:#0038B8;">See your design</a></div>` : '',
    '</td></tr></table>',
  ].join('');
}

export function designText(d: EmailDesign): string {
  const url = safeLink(d.url);
  return [
    `${d.heading}:`,
    d.recap,
    d.range ? `Ballpark ${d.range} (not a quote${d.examplePrices ? ', example prices' : ''})` : null,
    url ? `See your design: ${url}` : null,
  ].filter(Boolean).join('\n');
}

export function shell(paragraphs: string[], buttons: Button[], footer: string, contact: ContactBlock | null = null, design: EmailDesign | null = null): string {
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
    design ? designHtml(design) : '',
    contact ? contactHtml(contact) : '',
    '<div style="margin-top:16px;border-top:1px solid #DCE4F2;padding-top:12px;font-size:13px;color:#5B6B8C;">',
    escapeHtml(footer),
    '</div></div></div>',
  ].join('');
}

export function textOf(paragraphs: string[], buttons: Button[], footer: string, contact: ContactBlock | null = null, design: EmailDesign | null = null): string {
  const card = contact ? [`${contact.label}: ${contact.url}`] : [];
  const block = design ? [designText(design)] : [];
  return [...paragraphs, ...buttons.map((b) => `${b.label}: ${b.url}`), ...block, ...card, `—\n${footer}`].join('\n\n');
}

/** The guest's email for one notice. */
export function buildGuestBookingEmail(notice: HomeownerNotice, c: GuestMessageContext): BookingEmail {
  const tz = safeTimeZone(c.timeZone);
  const when = formatSlot(c.startMs, tz);
  const hi = c.firstName?.trim() ? `Hi ${c.firstName.trim()},` : 'Hi,';
  const mins = minutes(c.startMs, c.endMs);
  const with_ = callWith(c);
  const length = `${mins}-minute ${c.meetingType === 'video' ? 'video' : 'phone'} call`;
  const detail = `When: ${when}\nLength: ${length} (${formatRange(c.startMs, c.endMs, tz)})`;
  const manage = safeLink(c.manageUrl);
  const ics = safeLink(c.icsUrl);
  const vcard = safeLink(c.host?.vcardUrl);
  const buttons: Button[] = [];
  if (notice !== 'cancelled' && manage) buttons.push({ label: 'Reschedule or cancel', url: manage });
  if (notice !== 'cancelled' && ics) buttons.push({ label: 'Add to calendar', url: ics });
  const change = manage ? null : 'Need to change it? Just reply to this email.';
  // "Save Liam's number" on the confirmation and the reminders (the call is coming), never on a cancellation.
  const contact: ContactBlock | null = notice !== 'cancelled' && vcard && c.host
    ? { name: c.host.displayName, phone: prettyPhone(c.host.phone), label: saveNumberText(c), url: vcard }
    : null;
  const quick = mins <= 15 ? 'quick ' : '';

  let subject: string;
  let lines: string[];
  switch (notice) {
    case 'confirmed':
      subject = `Your call with ${with_} is booked: ${when}`;
      lines = [hi, c.host ? `You're all set for a ${quick}${mins}-minute call with ${with_}.` : `You're all set. Your call with ${with_} is booked.`, detail, howLine(c)];
      break;
    case 'rescheduled': {
      const was = c.previousStartMs ? ` (it was ${formatSlot(c.previousStartMs, tz)})` : '';
      subject = `Your call with ${with_} moved to ${when}`;
      lines = [hi, `Your call with ${with_} has a new time${was}.`, detail, howLine(c)];
      break;
    }
    case 'reminder_24h':
      subject = `Reminder: your call with ${with_} is coming up (${when})`;
      lines = [hi, `A quick reminder that your call with ${with_} is coming up.`, detail, howLine(c)];
      break;
    case 'reminder_1h':
      subject = `Starting soon: your call with ${with_} at ${when}`;
      lines = [hi, `Your call with ${with_} starts in about an hour.`, detail, howLine(c)];
      break;
    case 'cancelled':
      subject = `Your call with ${with_} is cancelled`;
      lines = [hi, `Your call with ${with_} on ${when} is cancelled.`, 'Want a new time? Just reply to this email and we will set one up.'];
      break;
  }
  if (notice !== 'cancelled' && change) lines.push(change);
  const footer = c.hostName.toLowerCase().includes('homequote') ? 'HomeQuote Network · homequotenet.com' : `${c.hostName} · booked through HomeQuote Network`;
  // Their design on the confirmation (and a reschedule's new confirmation), never on reminders or a cancellation.
  const design = (notice === 'confirmed' || notice === 'rescheduled') && c.design ? c.design : null;
  return { subject, html: shell(lines, buttons, footer, contact, design), text: textOf(lines, buttons, footer, contact, design) };
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
