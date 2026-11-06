import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type Db = ReturnType<typeof createAdminClient>;

/** After the booked end, wait this long before calling it a no-show. */
export const NO_SHOW_GRACE_MS = 10 * 60_000;
const OPEN = ['scheduled', 'confirmed', 'rescheduled'];

/**
 * Automatic no-shows for VIDEO sales meetings (§52): the rep was in the
 * HomeQuote room, the contractor never joined, and the meeting is over (booked
 * end + 10 min). The meeting is set to `no_show`, which the existing
 * no-show follow-up texts (lib/sms/reminders.ts) already pick up. Phone and
 * in-person meetings, and video meetings the rep never opened, are left alone:
 * HomeQuote cannot know those did not happen. Runs from the 5-minute tick.
 */
export async function runVideoNoShows(opts: { db?: Db; now?: Date } = {}): Promise<{ checked: number; marked: string[] }> {
  const db = opts.db ?? createAdminClient();
  const now = (opts.now ?? new Date()).getTime();
  const { data, error } = await db
    .from('prospect_sales_appointments')
    .select('id, scheduled_at, ends_at')
    .eq('appointment_type', 'video')
    .in('status', OPEN)
    .gte('scheduled_at', new Date(now - 2 * 86_400_000).toISOString())
    .lte('scheduled_at', new Date(now - NO_SHOW_GRACE_MS).toISOString())
    .limit(200);
  if (error || !data?.length) return { checked: 0, marked: [] };
  const due = (data as { id: string; scheduled_at: string; ends_at: string | null }[]).filter((m) => {
    const end = m.ends_at ? Date.parse(m.ends_at) : Date.parse(m.scheduled_at) + 30 * 60_000;
    return now >= end + NO_SHOW_GRACE_MS;
  });
  if (!due.length) return { checked: 0, marked: [] };
  const { data: calls } = await db
    .from('video_calls')
    .select('ref_id, host_first_joined_at, guest_first_joined_at')
    .eq('kind', 'sales_appointment')
    .in('ref_id', due.map((m) => m.id));
  const rows = (calls ?? []) as { ref_id: string; host_first_joined_at: string | null; guest_first_joined_at: string | null }[];
  const marked: string[] = [];
  for (const m of due) {
    const mine = rows.filter((c) => c.ref_id === m.id);
    const hostCame = mine.some((c) => c.host_first_joined_at);
    const guestCame = mine.some((c) => c.guest_first_joined_at);
    if (!hostCame || guestCame) continue;
    const { data: upd } = await db
      .from('prospect_sales_appointments')
      .update({ status: 'no_show' })
      .eq('id', m.id)
      .in('status', OPEN)
      .select('id');
    if (upd?.length) marked.push(m.id);
  }
  return { checked: due.length, marked };
}
