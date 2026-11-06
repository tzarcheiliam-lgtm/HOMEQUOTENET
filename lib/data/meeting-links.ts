import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { bookingLinkSecret } from '@/lib/booking/notify.server';
import { siteUrl } from '@/lib/calendar/config';
import { GUEST_EARLY_MS, LATE_MS, isUuid, videoGuestPath, videoGuestToken, videoHostPath } from '@/lib/video/links';

export type MeetingLinkStatus = 'open' | 'upcoming' | 'ended' | 'cancelled';

export interface MeetingLinkRow {
  id: string;
  guestName: string | null;
  guestContact: string | null;
  prospectId: string | null;
  company: string | null;
  hostName: string | null;
  hostId: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  createdAt: string;
  status: MeetingLinkStatus;
  guestUrl: string | null;
  hostPath: string;
}

export function linkStatus(r: { cancelledAt: string | null; startsAt: string; endsAt: string }, nowMs = Date.now()): MeetingLinkStatus {
  if (r.cancelledAt) return 'cancelled';
  if (nowMs < Date.parse(r.startsAt) - GUEST_EARLY_MS) return 'upcoming';
  if (nowMs > Date.parse(r.endsAt) + LATE_MS) return 'ended';
  return 'open';
}

/**
 * The signed-in rep's meeting links from the last two weeks and anything still
 * ahead (admins see everyone's, through RLS). Empty before migration 0075.
 */
export async function listMeetingLinks(): Promise<{ rows: MeetingLinkRow[]; ready: boolean }> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('meeting_links')
    .select('id, host_id, guest_name, guest_contact, prospect_id, starts_at, ends_at, time_zone, cancelled_at, created_at, host:profiles!meeting_links_host_id_fkey(full_name), prospect:contractor_prospects(company_name)')
    .gte('ends_at', since)
    .order('starts_at', { ascending: false })
    .limit(60);
  if (error) return { rows: [], ready: false };
  const secret = bookingLinkSecret();
  const site = siteUrl();
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  const rows = ((data ?? []) as unknown as {
    id: string; host_id: string; guest_name: string | null; guest_contact: string | null; prospect_id: string | null;
    starts_at: string; ends_at: string; time_zone: string | null; cancelled_at: string | null; created_at: string;
    host: { full_name: string | null } | { full_name: string | null }[] | null;
    prospect: { company_name: string | null } | { company_name: string | null }[] | null;
  }[]).map((r) => {
    const token = videoGuestToken('link', r.id, secret);
    return {
      id: r.id,
      guestName: r.guest_name,
      guestContact: r.guest_contact,
      prospectId: r.prospect_id,
      company: one(r.prospect)?.company_name ?? null,
      hostName: one(r.host)?.full_name ?? null,
      hostId: r.host_id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      timeZone: r.time_zone || 'America/Los_Angeles',
      createdAt: r.created_at,
      status: linkStatus({ cancelledAt: r.cancelled_at, startsAt: r.starts_at, endsAt: r.ends_at }),
      guestUrl: token ? `${site}${videoGuestPath(token)}` : null,
      hostPath: videoHostPath('link', r.id),
    };
  });
  // Open first, then upcoming (soonest first), then the rest (newest first).
  const rank: Record<MeetingLinkStatus, number> = { open: 0, upcoming: 1, ended: 2, cancelled: 3 };
  rows.sort((a, b) => rank[a.status] - rank[b.status] || (a.status === 'upcoming' ? Date.parse(a.startsAt) - Date.parse(b.startsAt) : Date.parse(b.startsAt) - Date.parse(a.startsAt)));
  return { rows, ready: true };
}

/** Prefill for "Video link" from a prospect page: who to address and how to reach them. */
export async function prospectInvitee(id: string | undefined): Promise<{ id: string; company: string; name: string | null; contact: string | null } | null> {
  if (!id || !isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('contractor_prospects')
    .select('id, company_name, decision_maker_name, decision_maker_email, email, phone')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const p = data as { id: string; company_name: string; decision_maker_name: string | null; decision_maker_email: string | null; email: string | null; phone: string | null };
  // Text first (reps send these from their phone), then email.
  return { id: p.id, company: p.company_name, name: p.decision_maker_name || null, contact: p.phone || p.decision_maker_email || p.email || null };
}
