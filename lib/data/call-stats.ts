import 'server-only';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProspectDisposition, UserRole } from '@/lib/types';
import { computeMetrics, dayBoundsInZone, type CallerMetrics } from '@/lib/calls/metrics';
import {
  CALL_TZ,
  DEFAULT_DAILY_GOAL,
  badgesFor,
  clampGoal,
  comboCount,
  countByDay,
  countByHour,
  currentStreak,
  dayKey,
  dedupeEvents,
  lastDays,
  personalBests,
  shiftDay,
  type Badge,
  type CallEvent,
  type PersonalBest,
} from '@/lib/calls/goals';
import { DM_REACHED_OUTCOMES } from '@/lib/calls/constants';

/**
 * Numbers for the calling HUD, the stats page and the team board.
 *
 * Reads go through the service role on purpose, always filtered to an explicit
 * user id: call-attempt RLS only shows attempts on prospects a caller still
 * holds, so a reassigned prospect would silently erase calls from their own
 * goal and streak. Callers of these functions decide whose numbers may be read
 * (yourself; anyone, for an admin; the board, when the leaderboard is on).
 *
 * A call is either log: a cold-call attempt (prospect_call_attempts) or a
 * homeowner contact attempt (lead_activities, type contact_attempt).
 */

const PAGE = 1000;
type Db = ReturnType<typeof createAdminClient>;

/** Start of the zone day `days` days before today (one spare day for DST). */
function sinceDaysAgo(days: number, now = new Date()): string {
  const { start } = dayBoundsInZone(now, CALL_TZ);
  return new Date(start.getTime() - (days + 1) * 86_400_000).toISOString();
}

async function pageAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

interface AttemptRow {
  prospect_id: string;
  caller_id: string;
  outcome: ProspectDisposition;
  created_at: string;
}
interface ContactRow {
  lead_id: string;
  actor_id: string;
  created_at: string;
}

/** Both logs as one list of CallEvents per user, since `since`. */
async function loadEvents(
  db: Db,
  since: string,
  userId: string | null
): Promise<Map<string, CallEvent[]>> {
  const [attempts, contacts] = await Promise.all([
    pageAll<AttemptRow>((from, to) => {
      let q = db
        .from('prospect_call_attempts')
        .select('prospect_id, caller_id, outcome, created_at')
        .gte('created_at', since);
      if (userId) q = q.eq('caller_id', userId);
      return q.order('created_at', { ascending: true }).range(from, to);
    }),
    pageAll<ContactRow>((from, to) => {
      let q = db
        .from('lead_activities')
        .select('lead_id, actor_id, created_at')
        .eq('type', 'contact_attempt')
        .gte('created_at', since);
      if (userId) q = q.eq('actor_id', userId);
      return q.order('created_at', { ascending: true }).range(from, to);
    }),
  ]);
  const byUser = new Map<string, CallEvent[]>();
  const push = (uid: string | null, e: CallEvent) => {
    if (!uid) return;
    const list = byUser.get(uid) ?? [];
    list.push(e);
    byUser.set(uid, list);
  };
  for (const a of attempts)
    push(a.caller_id, { at: a.created_at, key: a.prospect_id, outcome: a.outcome, source: 'prospect' });
  for (const c of contacts)
    push(c.actor_id, { at: c.created_at, key: c.lead_id, outcome: null, source: 'lead' });
  for (const [uid, list] of byUser) byUser.set(uid, dedupeEvents(list));
  return byUser;
}

async function goalFor(db: Db, userId: string): Promise<number> {
  const { data, error } = await db
    .from('profiles')
    .select('daily_call_goal')
    .eq('id', userId)
    .maybeSingle();
  // Before migration 0060 the column does not exist: fall back to the default.
  if (error || !data) return DEFAULT_DAILY_GOAL;
  return clampGoal((data as { daily_call_goal?: number }).daily_call_goal ?? DEFAULT_DAILY_GOAL);
}

export async function isLeaderboardEnabled(): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from('call_workspace_settings')
    .select('leaderboard_enabled')
    .maybeSingle();
  if (error || !data) return false;
  return Boolean((data as { leaderboard_enabled: boolean }).leaderboard_enabled);
}

/* ---- HUD snapshot ---------------------------------------------------------- */

export interface GoalSnapshot {
  userId: string;
  goal: number;
  todayKey: string;
  /** Calls counted toward today's goal (deduped). */
  today: number;
  streak: number;
  /** Decision-maker conversations in a row, ending with the latest call. */
  combo: number;
  bookedToday: number;
  /** Today's last calls per key, so the client applies the same dedupe. */
  recent: { key: string; at: string }[];
  /** Last 7 days, oldest first: calls, DM conversations, bookings. */
  week: { key: string; calls: number; dms: number; booked: number }[];
  /** When the server computed this; a new value means fresh numbers. */
  asOf: string;
}

const isDm = (o: ProspectDisposition | null) => !!o && DM_REACHED_OUTCOMES.includes(o);

/** Cached per request so the layout HUD and the page share one read. */
export const getGoalSnapshot = cache(async (userId: string): Promise<GoalSnapshot> => {
  const db = createAdminClient();
  const now = new Date();
  const todayKey = dayKey(now);
  const [goal, byUser] = await Promise.all([goalFor(db, userId), loadEvents(db, sinceDaysAgo(45, now), userId)]);
  const events = byUser.get(userId) ?? [];
  const todays = events.filter((e) => dayKey(e.at) === todayKey);
  const calls = countByDay(events);
  const dms = countByDay(events.filter((e) => isDm(e.outcome)));
  const booked = countByDay(events.filter((e) => e.outcome === 'appointment_booked'));
  const cutoff = now.getTime() - 5 * 60_000;
  return {
    userId,
    goal,
    todayKey,
    today: todays.length,
    streak: currentStreak(calls, goal, todayKey),
    combo: comboCount(todays.filter((e) => e.source === 'prospect')),
    bookedToday: booked.get(todayKey) ?? 0,
    recent: todays
      .filter((e) => e.key && Date.parse(e.at) >= cutoff)
      .map((e) => ({ key: e.key as string, at: e.at })),
    week: lastDays(todayKey, 7).map((k) => ({
      key: k,
      calls: calls.get(k) ?? 0,
      dms: dms.get(k) ?? 0,
      booked: booked.get(k) ?? 0,
    })),
    asOf: now.toISOString(),
  };
});

/* ---- Stats page ------------------------------------------------------------ */

export interface CallStats {
  goal: number;
  todayKey: string;
  today: number;
  streak: number;
  hourlyToday: number[];
  /** Best earlier day, hour by hour, as the "ghost" to beat. */
  hourlyBest: number[];
  bestDayKey: string | null;
  /** This week and the three before it, Monday-aligned, oldest first, ending today. */
  days: { key: string; calls: number }[];
  funnelToday: CallerMetrics;
  /** Average per calling day over the 7 days before today. */
  funnelWeekAvg: { attempts: number; dmConversations: number; interested: number; appointmentsBooked: number };
  bests: PersonalBest[];
  badges: Badge[];
  bookingsAllTime: number;
}

export async function getCallStats(userId: string): Promise<CallStats> {
  const db = createAdminClient();
  const now = new Date();
  const todayKey = dayKey(now);
  const [goal, byUser, booked] = await Promise.all([
    goalFor(db, userId),
    loadEvents(db, sinceDaysAgo(90, now), userId),
    db
      .from('prospect_call_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('caller_id', userId)
      .eq('outcome', 'appointment_booked'),
  ]);
  const events = byUser.get(userId) ?? [];
  const calls = countByDay(events);

  // The ghost: the best day before today.
  let bestDayKey: string | null = null;
  let bestCount = 0;
  for (const [k, v] of calls) {
    if (k !== todayKey && v > bestCount) {
      bestDayKey = k;
      bestCount = v;
    }
  }

  const prospectEvents = events.filter((e) => e.source === 'prospect') as (CallEvent & {
    outcome: ProspectDisposition;
  })[];
  const asAttempts = (list: typeof prospectEvents) =>
    list.map((e) => ({ outcome: e.outcome, created_at: e.at }));
  const todays = prospectEvents.filter((e) => dayKey(e.at) === todayKey);
  const weekKeys = new Set(lastDays(shiftDay(todayKey, -1), 7));
  const weekList = prospectEvents.filter((e) => weekKeys.has(dayKey(e.at)));
  const activeDays = Math.max(1, new Set(weekList.map((e) => dayKey(e.at))).size);
  const week = computeMetrics(asAttempts(weekList));
  const bookingsAllTime = booked.count ?? 0;

  return {
    goal,
    todayKey,
    today: calls.get(todayKey) ?? 0,
    streak: currentStreak(calls, goal, todayKey),
    hourlyToday: countByHour(events, todayKey),
    hourlyBest: bestDayKey ? countByHour(events, bestDayKey) : Array.from({ length: 24 }, () => 0),
    bestDayKey,
    days: lastDays(todayKey, mondayOffset(todayKey) + 1 + 21).map((k) => ({ key: k, calls: calls.get(k) ?? 0 })),
    funnelToday: computeMetrics(asAttempts(todays)),
    funnelWeekAvg: {
      attempts: week.attempts / activeDays,
      dmConversations: week.dmConversations / activeDays,
      interested: week.interested / activeDays,
      appointmentsBooked: week.appointmentsBooked / activeDays,
    },
    bests: personalBests(events, goal, todayKey),
    badges: badgesFor({ events, goal, todayKey, bookingsAllTime }),
    bookingsAllTime,
  };
}

/** Days since Monday (0 on a Monday). */
function mondayOffset(key: string): number {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
  return (dow + 6) % 7;
}

/* ---- Team board ------------------------------------------------------------ */

export interface BoardRow {
  id: string;
  name: string;
  role: UserRole;
  goal: number;
  today: number;
  week: number;
  bookedWeek: number;
  streak: number;
}

/**
 * Everyone in the calling workspace, today and this week (Monday on), most
 * calls first. Shown to admins always and to callers/setters only when the
 * leaderboard switch is on.
 */
export async function getTeamBoard(): Promise<BoardRow[]> {
  const db = createAdminClient();
  const now = new Date();
  const todayKey = dayKey(now);
  const mondayKey = lastDays(todayKey, mondayOffset(todayKey) + 1)[0];

  const [profilesRes, byUser] = await Promise.all([
    db
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'caller', 'setter'])
      .eq('account_status', 'active')
      .is('deleted_at', null),
    loadEvents(db, sinceDaysAgo(45, now), null),
  ]);
  const profiles = (profilesRes.data ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    daily_call_goal?: number;
  }[];

  return profiles
    .map((p) => {
      const events = byUser.get(p.id) ?? [];
      const calls = countByDay(events);
      const goal = clampGoal(p.daily_call_goal ?? DEFAULT_DAILY_GOAL);
      const thisWeek = events.filter((e) => dayKey(e.at) >= mondayKey);
      return {
        id: p.id,
        name: p.full_name || p.email || 'Teammate',
        role: p.role,
        goal,
        today: calls.get(todayKey) ?? 0,
        week: thisWeek.length,
        bookedWeek: thisWeek.filter((e) => e.outcome === 'appointment_booked').length,
        streak: currentStreak(calls, goal, todayKey),
      };
    })
    // Admins appear only once they have actually called this week.
    .filter((r) => r.role !== 'admin' || r.week > 0)
    .sort((a, b) => b.today - a.today || b.week - a.week || a.name.localeCompare(b.name));
}
