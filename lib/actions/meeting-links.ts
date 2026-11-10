'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCallWorkspace } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { bookingLinkSecret } from '@/lib/booking/notify.server';
import { siteUrl } from '@/lib/calendar/config';
import { isUuid, videoGuestPath, videoGuestToken, videoHostPath } from '@/lib/video/links';
import { videoRoomsEnabled } from '@/lib/video/livekit.server';

/**
 * Meeting links (/app/meetings, migration 0075): an ad-hoc HomeQuote video
 * room the rep can send to anyone. Writes go through the rep's own client, so
 * RLS decides (admins, callers, setters; a non-admin only for themselves).
 */

/** A "now" link stays open this long (plus the usual 2 h grace), so a prospect who opens it later today still gets in. */
const NOW_MINUTES = 240;

const schema = z.object({
  guestName: z.string().trim().max(80, 'Keep the name to 80 characters').optional().transform((v) => v || null),
  guestContact: z.string().trim().max(200, 'Keep the phone or email to 200 characters').optional().transform((v) => v || null),
  prospectId: z.string().optional().transform((v) => (v && isUuid(v) ? v : null)),
  /** ISO time, or empty for "now". */
  startsAt: z.string().optional().transform((v) => v || null),
  minutes: z.coerce.number().int().min(15).max(240).default(30),
  timeZone: z.string().max(64).optional().transform((v) => v || 'America/Los_Angeles'),
});

export type CreateLinkResult =
  | { ok: true; id: string; guestUrl: string; hostPath: string; startsAt: string | null; timeZone: string }
  | { ok: false; error: string };

function validZone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'America/Los_Angeles';
  }
}

export async function createMeetingLink(input: {
  guestName?: string;
  guestContact?: string;
  prospectId?: string;
  startsAt?: string;
  minutes?: number;
  timeZone?: string;
}): Promise<CreateLinkResult> {
  const me = await requireCallWorkspace();
  if (!videoRoomsEnabled()) return { ok: false, error: 'Video calls are not set up yet (LiveKit settings are missing in Vercel).' };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the details and try again.' };
  const v = parsed.data;
  const now = Date.now();
  let startMs = now;
  let endMs = now + NOW_MINUTES * 60_000;
  if (v.startsAt) {
    const t = Date.parse(v.startsAt);
    if (!Number.isFinite(t)) return { ok: false, error: 'Pick a valid date and time.' };
    if (t < now - 15 * 60_000) return { ok: false, error: 'That time has already passed. Pick a later time, or choose “Now”.' };
    if (t > now + 180 * 86_400_000) return { ok: false, error: 'Pick a time within the next 6 months.' };
    startMs = t;
    endMs = t + v.minutes * 60_000;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meeting_links')
    .insert({
      host_id: me.id,
      guest_name: v.guestName,
      guest_contact: v.guestContact,
      prospect_id: v.prospectId,
      starts_at: new Date(startMs).toISOString(),
      ends_at: new Date(endMs).toISOString(),
      time_zone: validZone(v.timeZone),
    })
    .select('id')
    .single();
  if (error || !data) {
    const missing = error?.code === '42P01' || /meeting_links/.test(error?.message ?? '');
    return { ok: false, error: missing ? 'Meeting links need database migration 0075 first.' : 'Could not create the link. Try again.' };
  }
  const token = videoGuestToken('link', data.id, bookingLinkSecret());
  if (!token) return { ok: false, error: 'Video links are not configured (BOOKING_LINK_SECRET).' };
  revalidatePath('/app/meetings');
  return {
    ok: true,
    id: data.id,
    guestUrl: `${siteUrl()}${videoGuestPath(token)}`,
    hostPath: videoHostPath('link', data.id),
    startsAt: v.startsAt ? new Date(startMs).toISOString() : null,
    timeZone: validZone(v.timeZone),
  };
}

/** Cancel a link: its guest page then says the meeting was cancelled. */
export async function cancelMeetingLink(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireCallWorkspace();
  if (!isUuid(id)) return { ok: false, error: 'Unknown link.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meeting_links')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', id)
    .is('cancelled_at', null)
    .select('id');
  revalidatePath('/app/meetings');
  if (error) return { ok: false, error: 'Could not cancel the link.' };
  return data?.length ? { ok: true } : { ok: false, error: 'That link was already cancelled or is not yours.' };
}
