import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { QUEUE_DISPOSITIONS } from '@/lib/calls/constants';
import { dayKey, shiftDay } from '@/lib/calls/goals';
import { fmtDateTime, fmtRelative } from '@/components/calls/format';
import {
  bookedBetween,
  bookingStreak,
  closeRate,
  earnedBetween,
  isPending,
  isSold,
  monthOf,
  records,
  setterBadges,
  weekStart,
  type Meeting,
  type SetterBadge,
} from '@/lib/setter/money';
import { chancesToBook, rankQueue, type QueueItem } from '@/lib/setter/queue';
import { isLeaderboardEnabled } from '@/lib/data/call-stats';
import { loadMeetings, loadPartners } from '@/lib/data/setter-money';

/**
 * Everything the setter's money dashboard shows. Reads use the service role,
 * always filtered to the signed-in setter (and, only when the leaderboard is
 * on, teammates' booking/earning totals — never their records).
 */

export interface SetterDashboardData {
  todayKey: string;
  payPerSale: number | null;
  weeklyGoal: number | null;
  earnedMonth: number;
  earnedAllTime: number;
  /** Booked meetings still waiting on a sale decision (not no-show/cancelled). */
  pendingCount: number;
  /** pendingCount × current rate; null when no rate is set. */
  pendingValue: number | null;
  weekBookings: number;
  todayBookings: number;
  streak: number;
  closeRate: number | null;
  bestWeekBookings: number;
  bestMonthEarned: number;
  /** Bests before this week / this month, so a new record can be called out. */
  prevBestWeekBookings: number;
  prevBestMonthEarned: number;
  lastWeek: { bookings: number; sold: number; earned: number; weekKey: string };
  badges: SetterBadge[];
  recentSold: { id: string; company: string; pay: number; decidedAt: string }[];
  upcoming: { id: string; company: string; scheduledAt: string; status: string }[];
  queue: QueueItem[];
  chances: number;
  /** Head-to-head, only while the leaderboard is on. */
  rivals: { id: string; name: string; weekBookings: number; monthEarned: number }[] | null;
}

const DAY = 86_400_000;

export async function getSetterDashboard(userId: string): Promise<SetterDashboardData> {
  const db = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayKey = dayKey(now);
  const monday = weekStart(todayKey);
  const lastMonday = shiftDay(monday, -7);
  const month = monthOf(todayKey);

  const [allMeetings, partners, leaderboard, callbacks, warm, fresh, homeowner] = await Promise.all([
    loadMeetings({ db }),
    loadPartners(db),
    isLeaderboardEnabled(),
    db
      .from('contractor_prospects')
      .select('id, company_name, phone, next_callback_at, decision_maker_name')
      .eq('assigned_to', userId)
      .is('archived_at', null)
      .in('disposition', QUEUE_DISPOSITIONS)
      .lte('next_callback_at', nowIso) // also excludes prospects with no callback set
      .order('next_callback_at', { ascending: true })
      .limit(25),
    db
      .from('contractor_prospects')
      .select('id, company_name, phone, follow_up_at, last_contacted_at, decision_maker_name, disposition')
      .eq('assigned_to', userId)
      .is('archived_at', null)
      .in('disposition', ['interested', 'follow_up_required'])
      .order('last_contacted_at', { ascending: true, nullsFirst: true })
      .limit(40),
    db
      .from('contractor_prospects')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .is('archived_at', null)
      .eq('disposition', 'new'),
    db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .in('status', ['new', 'contact_attempted']),
  ]);

  const me = partners.find((p) => p.id === userId);
  const payPerSale = me?.payPerSale ?? null;
  const mine: Meeting[] = allMeetings.filter((m) => m.partnerId === userId);
  const rec = records(mine);
  const pending = mine.filter(isPending);

  /* ---- Queue ---- */
  const items: QueueItem[] = [];
  const in48h = now.getTime() + 2 * DAY;
  for (const m of mine) {
    const t = Date.parse(m.scheduledAt);
    if (m.status === 'scheduled' && m.saleOutcome === null && t > now.getTime() && t <= in48h) {
      items.push({
        kind: 'confirm',
        id: `confirm-${m.id}`,
        title: m.companyName,
        detail: `Meeting ${fmtDateTime(m.scheduledAt)} — confirm it so it happens (and can sell)`,
        href: '/app/calls/appointments',
        at: m.scheduledAt,
      });
    }
  }
  for (const p of (callbacks.data ?? []) as { id: string; company_name: string; phone: string | null; next_callback_at: string; decision_maker_name: string | null }[]) {
    items.push({
      kind: 'callback',
      id: `callback-${p.id}`,
      title: p.company_name,
      detail: `Promised a callback ${fmtRelative(p.next_callback_at).toLowerCase()}${p.decision_maker_name ? ` · ask for ${p.decision_maker_name}` : ''}`,
      href: `/app/calls/${p.id}`,
      at: p.next_callback_at,
      phone: p.phone,
    });
  }
  const weekAgo = now.getTime() - 7 * DAY;
  for (const p of (warm.data ?? []) as {
    id: string;
    company_name: string;
    phone: string | null;
    follow_up_at: string | null;
    last_contacted_at: string | null;
    decision_maker_name: string | null;
    disposition: string;
  }[]) {
    const last = p.last_contacted_at ? Date.parse(p.last_contacted_at) : 0;
    if (last < weekAgo) {
      items.push({
        kind: 'slipped',
        id: `slipped-${p.id}`,
        title: p.company_name,
        detail: `Said they were interested — no call since ${fmtRelative(p.last_contacted_at).toLowerCase()}`,
        href: `/app/calls/${p.id}`,
        at: p.last_contacted_at,
        phone: p.phone,
      });
    } else if (!p.follow_up_at || Date.parse(p.follow_up_at) <= now.getTime()) {
      items.push({
        kind: 'hot',
        id: `hot-${p.id}`,
        title: p.company_name,
        detail: `${p.disposition === 'interested' ? 'Interested' : 'Follow-up due'}${p.decision_maker_name ? ` · ${p.decision_maker_name}` : ''} — book the meeting`,
        href: `/app/calls/${p.id}`,
        at: p.follow_up_at ?? p.last_contacted_at,
        phone: p.phone,
      });
    }
  }
  // No-shows / cancellations in the last 14 days that have not been rebooked.
  const rebooked = new Set(mine.filter((m) => !['no_show', 'cancelled'].includes(m.status)).map((m) => m.prospectId));
  for (const m of mine) {
    const t = Date.parse(m.scheduledAt);
    if (['no_show', 'cancelled'].includes(m.status) && m.saleOutcome === null && t > now.getTime() - 14 * DAY && !rebooked.has(m.prospectId)) {
      items.push({
        kind: 'rescue',
        id: `rescue-${m.id}`,
        title: m.companyName,
        detail: `${m.status === 'no_show' ? 'No-show' : 'Cancelled'} ${fmtRelative(m.scheduledAt).toLowerCase()} — rebook it`,
        href: `/app/calls/${m.prospectId}`,
        at: m.scheduledAt,
      });
    }
  }
  if ((homeowner.count ?? 0) > 0) {
    items.push({
      kind: 'homeowner',
      id: 'homeowner',
      title: `${homeowner.count} homeowner ${homeowner.count === 1 ? 'lead' : 'leads'} still open`,
      detail: 'New or not reached yet — call the next one',
      href: '/app/leads/next',
      at: null,
    });
  }
  if ((fresh.count ?? 0) > 0) {
    items.push({
      kind: 'fresh',
      id: 'fresh',
      title: `${fresh.count} contractors never called`,
      detail: 'Fresh prospects in your list — start a power hour',
      href: '/app/calls/dial',
      at: null,
    });
  }
  // One row per prospect: its most urgent reason wins.
  const seen = new Set<string>();
  const queue = rankQueue(items).filter((i) => {
    const key = i.href;
    if (i.kind === 'homeowner' || i.kind === 'fresh' || i.kind === 'confirm') return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* ---- Rivals ---- */
  let rivals: SetterDashboardData['rivals'] = null;
  if (leaderboard) {
    rivals = partners
      .filter((p) => p.id !== userId && (p.role === 'setter' || p.role === 'caller'))
      .map((p) => {
        const theirs = allMeetings.filter((m) => m.partnerId === p.id);
        return {
          id: p.id,
          name: p.name,
          weekBookings: bookedBetween(theirs, monday, todayKey).length,
          monthEarned: earnedBetween(theirs, `${month}-01`, todayKey),
        };
      })
      .sort((a, b) => b.monthEarned - a.monthEarned || b.weekBookings - a.weekBookings);
  }

  const lastWeekEnd = shiftDay(monday, -1);
  const soldLastWeek = mine.filter(
    (m) => isSold(m) && m.saleDecidedAt && dayKey(m.saleDecidedAt) >= lastMonday && dayKey(m.saleDecidedAt) <= lastWeekEnd
  );

  return {
    todayKey,
    payPerSale,
    weeklyGoal: me?.weeklyBookingGoal ?? null,
    earnedMonth: earnedBetween(mine, `${month}-01`, todayKey),
    earnedAllTime: earnedBetween(mine, '0000-01-01', '9999-12-31'),
    pendingCount: pending.length,
    pendingValue: payPerSale === null ? null : Math.round(pending.length * payPerSale * 100) / 100,
    weekBookings: bookedBetween(mine, monday, todayKey).length,
    todayBookings: bookedBetween(mine, todayKey, todayKey).length,
    streak: bookingStreak(mine, todayKey),
    closeRate: closeRate(mine),
    bestWeekBookings: rec.bestWeekBookings,
    bestMonthEarned: rec.bestMonthEarned,
    prevBestWeekBookings: records(mine.filter((m) => dayKey(m.bookedAt) < monday)).bestWeekBookings,
    prevBestMonthEarned: records(mine.filter((m) => !m.saleDecidedAt || dayKey(m.saleDecidedAt) < `${month}-01`)).bestMonthEarned,
    lastWeek: {
      weekKey: lastMonday,
      bookings: bookedBetween(mine, lastMonday, lastWeekEnd).length,
      sold: soldLastWeek.length,
      earned: earnedBetween(mine, lastMonday, lastWeekEnd),
    },
    badges: setterBadges(mine),
    recentSold: mine
      .filter((m) => isSold(m) && m.saleDecidedAt && Date.parse(m.saleDecidedAt) > now.getTime() - 14 * DAY)
      .map((m) => ({ id: m.id, company: m.companyName, pay: m.payAmount ?? 0, decidedAt: m.saleDecidedAt as string })),
    upcoming: mine
      .filter((m) => Date.parse(m.scheduledAt) > now.getTime() && !['cancelled', 'no_show'].includes(m.status))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 5)
      .map((m) => ({ id: m.id, company: m.companyName, scheduledAt: m.scheduledAt, status: m.status })),
    queue,
    chances: chancesToBook(queue),
    rivals,
  };
}
