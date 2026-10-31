import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { bookingLinkSecret, loadBooking } from '@/lib/booking/notify.server';
import {
  joinWindow,
  parseVideoGuestToken,
  usesVideoRoom,
  videoGuestPath,
  videoGuestToken,
  videoHostPath,
  videoRoomName,
  type JoinWindow,
  type VideoMeetingKind,
  type VideoRole,
} from './links';
import { videoRoomsEnabled } from './livekit.server';

/**
 * The meeting behind a video room, as the call pages need it. Loaded with the
 * service role (the guest has no session); the HOST path checks visibility
 * with the signed-in user's own client first (RLS), see meetingForHost.
 */
export interface VideoMeeting {
  kind: VideoMeetingKind;
  id: string;
  roomName: string;
  /** Still on (not cancelled / no-show / completed...). */
  live: boolean;
  /** Runs in a HomeQuote room (video, no own link, LiveKit configured). */
  videoRoom: boolean;
  /** The booker's own Zoom / Meet link, when the meeting has one. */
  ownLink: string | null;
  startMs: number;
  endMs: number;
  /** The guest's zone (what the guest page shows) and the calendar's (what the host page shows). */
  guestTimeZone: string;
  hostTimeZone: string;
  /** "Liam from HomeQuote" / "HomeQuote Network": who the guest is meeting. */
  hostLabel: string;
  /** The person invited (decision maker / homeowner), may be empty. */
  guestName: string;
  /** Company (sales) or project (homeowner), may be null. */
  subject: string | null;
  prospectId: string | null;
  leadId: string | null;
}

async function load(kind: VideoMeetingKind, id: string): Promise<VideoMeeting | null> {
  const b = await loadBooking(createAdminClient(), kind, id);
  if (!b) return null;
  return {
    kind,
    id,
    roomName: videoRoomName(kind, id),
    live: b.live,
    videoRoom: b.meetingType === 'video' && b.videoRoom,
    ownLink: b.meetingType === 'video' ? b.videoLink : null,
    startMs: b.startMs,
    endMs: b.endMs,
    guestTimeZone: b.guestTz,
    hostTimeZone: b.calendarTz,
    hostLabel: b.host?.displayName ?? b.hostName,
    guestName: b.guestName,
    subject: b.project,
    prospectId: b.prospectId,
    leadId: b.leadId,
  };
}

/** The meeting a guest link opens, or null for a bad / forged link or a missing meeting. */
export async function meetingForGuestToken(token: string): Promise<VideoMeeting | null> {
  const ref = parseVideoGuestToken(token, bookingLinkSecret());
  return ref ? load(ref.kind, ref.id) : null;
}

/**
 * The meeting for a signed-in host, or null when this user cannot see it.
 * Visibility is the user's own RLS read of the appointment row: whoever can
 * see the meeting in the CRM (the admin, the setter who booked it, the
 * contractor whose calendar it is) may host it.
 */
export async function meetingForHost(kind: VideoMeetingKind, id: string): Promise<VideoMeeting | null> {
  const supabase = await createClient();
  const table = kind === 'sales_appointment' ? 'prospect_sales_appointments' : 'appointments';
  const { data } = await supabase.from(table).select('id').eq('id', id).maybeSingle();
  if (!data) return null;
  return load(kind, id);
}

export function windowFor(m: VideoMeeting, role: VideoRole, nowMs = Date.now()): JoinWindow {
  return joinWindow(m, role, nowMs);
}

/**
 * Host + guest links for a meeting shown in a list (the sales appointments
 * page), or null when it does not run in a HomeQuote room. `ownLink` is the
 * booker's own link when known (a pasted https contact info); a booking-page
 * meeting whose calendar has its own link still gets the button, and the host
 * page then shows that link instead.
 */
export function videoLinksFor(
  kind: VideoMeetingKind,
  id: string,
  m: { meetingType: string | null | undefined; ownLink: string | null | undefined; live: boolean },
  site: string,
): { hostHref: string; guestUrl: string | null } | null {
  if (!m.live || !usesVideoRoom(m, videoRoomsEnabled())) return null;
  const token = videoGuestToken(kind, id, bookingLinkSecret());
  return { hostHref: videoHostPath(kind, id), guestUrl: token ? `${site}${videoGuestPath(token)}` : null };
}
