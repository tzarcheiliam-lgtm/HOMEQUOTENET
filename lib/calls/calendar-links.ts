/**
 * "Add to Google / Apple Calendar" for sales appointments booked with contractor
 * prospects. Pure: no I/O, safe in client components.
 *
 * Duplicates are avoided two ways. Apple Calendar (and any .ics client) matches
 * the event's UID, so adding the same meeting again updates it in place. Google's
 * "add event" link cannot recognise an event it already has, so the app records
 * each add (sales_appointment_calendar_adds, migration 0066) and stops offering
 * the button for a meeting that is already there.
 */

export type CalendarProvider = 'google' | 'apple';

/** One meeting, shared by the confirmation-email invite and the Apple download so both are the same event. */
export const salesMeetingUid = (appointmentId: string) => `sales-meeting-${appointmentId}@homequotenet.com`;

export const SALES_MEETING_MINUTES = 30;

export interface SalesMeetingInput {
  id: string;
  prospectId: string;
  companyName: string;
  decisionMakerName: string | null;
  phone: string | null;
  scheduledAt: string;
  timeZone: string;
  appointmentType: string | null;
  contactInfo: string | null;
  notes: string | null;
  /** The rep's join link when the meeting runs in a HomeQuote video room (lib/video). */
  videoUrl?: string | null;
}

export interface SalesMeetingEvent {
  uid: string;
  startMs: number;
  endMs: number;
  title: string;
  details: string;
  location: string | null;
  url: string;
}

const HOW: Record<string, string> = { phone: 'Phone call', video: 'Video call', in_person: 'Meeting' };

export function salesMeetingEvent(a: SalesMeetingInput, siteUrl: string): SalesMeetingEvent {
  const startMs = Date.parse(a.scheduledAt);
  const how = HOW[a.appointmentType ?? ''] ?? 'Sales call';
  const who = a.decisionMakerName ? ` (${a.decisionMakerName})` : '';
  const url = `${siteUrl.replace(/\/$/, '')}/app/calls/${a.prospectId}`;
  const details = [
    `${how} with ${a.companyName}${who}.`,
    a.videoUrl ? `Join the video call: ${a.videoUrl}` : null,
    a.phone ? `Phone: ${a.phone}` : null,
    a.contactInfo ? `Contact: ${a.contactInfo}` : null,
    a.notes ? `Notes: ${a.notes}` : null,
    `Open in HomeQuote: ${url}`,
  ]
    .filter(Boolean)
    .join('\n');
  return {
    uid: salesMeetingUid(a.id),
    startMs,
    endMs: startMs + SALES_MEETING_MINUTES * 60_000,
    title: `${how}: ${a.companyName}${who}`,
    details,
    // A video link or address goes in the location; a phone call shows the number.
    location: a.videoUrl ?? a.contactInfo ?? a.phone ?? null,
    url,
  };
}

const utcStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Google Calendar's prefilled "add event" page. */
export function googleCalendarUrl(e: SalesMeetingEvent, timeZone: string): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${utcStamp(e.startMs)}/${utcStamp(e.endMs)}`,
    details: e.details,
    ctz: timeZone,
  });
  if (e.location) q.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Google Calendar opened on the day of `iso` (in the meeting's time zone), to find an event already added. */
export function googleDayUrl(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `https://calendar.google.com/calendar/r/day/${get('year')}/${get('month')}/${get('day')}`;
}

/**
 * Where this meeting stands in one calendar:
 * - `none`: not added yet
 * - `added`: added for the current time
 * - `moved`: added, but the meeting has since been rescheduled
 */
export type CalendarAddState = 'none' | 'added' | 'moved';

export function calendarAddState(addedFor: string | null | undefined, scheduledAt: string): CalendarAddState {
  if (!addedFor) return 'none';
  return Date.parse(addedFor) === Date.parse(scheduledAt) ? 'added' : 'moved';
}
