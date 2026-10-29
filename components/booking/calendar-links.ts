/**
 * "Add to calendar" for a booked call: the event text and Google's prefilled
 * add-event link. Pure (no I/O), shared by the confirmation UI and the .ics
 * route so both describe the call the same way.
 */
import type { PublicBooking } from './types';

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** "Phone call with Pool Masters" / "Video call with a HomeQuote project specialist". */
export function callTitle(b: Pick<PublicBooking, 'meetingType' | 'hostName'> & { host?: PublicBooking['host'] }): string {
  const how = b.meetingType === 'video' ? 'Video call' : b.meetingType === 'in_person' ? 'Meeting' : 'Phone call';
  return `${how} with ${b.host?.displayName ?? b.hostName}`;
}

/** How the call happens, plus the link to change it. */
export function callDetails(
  b: Pick<PublicBooking, 'meetingType' | 'hostName' | 'phoneHint' | 'videoLink' | 'durationMinutes'> & { host?: PublicBooking['host'] },
  manageAbsoluteUrl: string | null,
): string {
  const from = b.host?.phoneDisplay ? ` from ${b.host.phoneDisplay}` : '';
  const how = b.meetingType === 'video'
    ? b.videoLink ? `Join the video call: ${b.videoLink}` : 'We will send the video link before the call.'
    : `${capitalize(b.host?.displayName ?? b.hostName)} will call you${b.phoneHint ? ` at the number ending ${b.phoneHint}` : ''}${from}.`;
  return [`${b.durationMinutes}-minute call. ${how}`, manageAbsoluteUrl ? `Reschedule or cancel: ${manageAbsoluteUrl}` : null].filter(Boolean).join('\n');
}

export function googleCalendarLink(b: PublicBooking, origin: string): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: callTitle(b),
    dates: `${stamp(Date.parse(b.startsAt))}/${stamp(Date.parse(b.endsAt))}`,
    details: callDetails(b, b.manageUrl ? `${origin}${b.manageUrl}` : null),
    location: b.meetingType === 'video' && b.videoLink ? b.videoLink : 'Phone call',
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
