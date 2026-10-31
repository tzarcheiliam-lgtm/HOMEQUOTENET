'use server';

import { getProfile } from '@/lib/auth';
import { cleanDisplayName, isUuid, type VideoMeetingKind } from '@/lib/video/links';
import { mintJoinPass, type JoinPass } from '@/lib/video/livekit.server';
import { meetingForGuestToken, meetingForHost, windowFor, type VideoMeeting } from '@/lib/video/rooms.server';

export type JoinResult = { ok: true; pass: JoinPass } | { ok: false; error: string };

function refusal(m: VideoMeeting | null, role: 'host' | 'guest'): string | null {
  if (!m) return 'This video call link is not valid.';
  if (!m.videoRoom) return 'This meeting does not use a HomeQuote video room.';
  const w = windowFor(m, role);
  if (w.state === 'cancelled') return 'This meeting was cancelled.';
  if (w.state === 'ended') return 'This video call has ended.';
  if (w.state === 'too_early') return 'This video call is not open yet. Refresh the page closer to the start time.';
  return null;
}

/**
 * Join as the invited guest. The signed link is the only credential (no
 * account); the booking is re-read on every join, so a cancelled meeting's
 * link stops working.
 */
export async function joinVideoAsGuest(token: string, name: string): Promise<JoinResult> {
  if (typeof token !== 'string' || token.length > 80) return { ok: false, error: 'This video call link is not valid.' };
  const m = await meetingForGuestToken(token);
  const why = refusal(m, 'guest');
  if (why || !m) return { ok: false, error: why ?? 'This video call link is not valid.' };
  const pass = await mintJoinPass({ roomName: m.roomName, role: 'guest', name: cleanDisplayName(name, m.guestName || 'Guest') });
  return pass ? { ok: true, pass } : { ok: false, error: 'Video calls are not set up yet.' };
}

/** Join as the host: a signed-in, active user who can see the meeting (RLS). */
export async function joinVideoAsHost(kind: VideoMeetingKind, id: string): Promise<JoinResult> {
  const me = await getProfile();
  if (!me || !me.is_active) return { ok: false, error: 'Sign in to join this call.' };
  if ((kind !== 'sales_appointment' && kind !== 'appointment') || !isUuid(id)) return { ok: false, error: 'This video call link is not valid.' };
  const m = await meetingForHost(kind, id);
  const why = refusal(m, 'host');
  if (why || !m) return { ok: false, error: why ?? 'This video call link is not valid.' };
  const pass = await mintJoinPass({
    roomName: m.roomName,
    role: 'host',
    // Stable per person: a second tab replaces the first instead of showing them twice.
    identity: `host-${me.id}`,
    name: cleanDisplayName(me.full_name, 'HomeQuote'),
  });
  return pass ? { ok: true, pass } : { ok: false, error: 'Video calls are not set up yet.' };
}
