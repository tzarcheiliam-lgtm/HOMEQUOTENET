import 'server-only';
import { buildCalendar } from '@/lib/calendar/ics';
import { salesMeetingUid } from '@/lib/calls/calendar-links';
import type { MailAttachment } from '@/lib/emails/gmail-message';

/** A calendar invite (.ics) for a booked sales meeting, attached to the confirmation email. */
export function meetingInvite(m: {
  id: string;
  scheduledAt: string;
  appointmentType: string | null;
  contactInfo: string | null;
  organizer: string;
  /** The guest's join link when the meeting runs in a HomeQuote video room. */
  videoUrl?: string | null;
}): MailAttachment {
  const start = Date.parse(m.scheduledAt);
  const how = m.appointmentType === 'video' ? 'Video call' : m.appointmentType === 'in_person' ? 'Meeting' : 'Phone call';
  return {
    filename: 'homequote-meeting.ics',
    contentType: 'text/calendar; charset=UTF-8; method=PUBLISH',
    content: buildCalendar(
      [
        {
          uid: salesMeetingUid(m.id),
          startMs: start,
          endMs: start + 30 * 60_000,
          summary: `${how} with Liam — HomeQuote Network`,
          description: `${m.videoUrl ? `Join the video call: ${m.videoUrl}\n` : ''}Booked by ${m.organizer}. Reply to the confirmation email to reschedule.`,
          location: m.videoUrl ?? m.contactInfo,
        },
      ],
      { name: 'HomeQuote Network', method: 'PUBLISH' }
    ),
  };
}
