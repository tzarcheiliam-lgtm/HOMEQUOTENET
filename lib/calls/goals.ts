import type { ProspectDisposition } from '@/lib/types';
import { DM_REACHED_OUTCOMES } from './constants';

/**
 * The daily call goal, defined once: what counts as a call, pace, streaks,
 * milestones, personal bests and badges. Pure functions only — the data layer
 * (lib/data/call-stats.ts) feeds them rows, the HUD and stats page render the
 * result, and the tests pin the arithmetic.
 *
 * Every number here is a count of real logged calls. Nothing is estimated
 * except the pace projection, which says so.
 */

export const DEFAULT_DAILY_GOAL = 100;
export const MIN_DAILY_GOAL = 1;
export const MAX_DAILY_GOAL = 1000;
export const CALL_TZ = 'America/Los_Angeles';

/** The calling day the pace line is measured against: 8:00–17:00 Los Angeles. */
export const WORKDAY = { startHour: 8, endHour: 17 } as const;

/** Repeat logs on the same prospect/lead inside this window count once. */
export const DEDUPE_WINDOW_MS = 60_000;

/** One logged call, from either log (cold-call attempts or homeowner contact attempts). */
export interface CallEvent {
  at: string;
  /** The prospect or lead called; the dedupe key. */
  key: string | null;
  /** Cold-call outcome; null for a homeowner contact attempt (free text). */
  outcome: ProspectDisposition | null;
  source: 'prospect' | 'lead';
}

export function clampGoal(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_DAILY_GOAL;
  return Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, v));
}

/* ---- Time in the calling zone ---------------------------------------------- */

interface ZonedParts {
  key: string;
  hour: number;
  minute: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    fmtCache.set(timeZone, f);
  }
  return f;
}

export function zonedParts(date: Date, timeZone = CALL_TZ): ZonedParts {
  const p = Object.fromEntries(fmt(timeZone).formatToParts(date).map((x) => [x.type, x.value]));
  return {
    key: `${p.year}-${p.month}-${p.day}`,
    hour: p.hour === '24' ? 0 : Number(p.hour),
    minute: Number(p.minute),
  };
}

/** 'YYYY-MM-DD' of the calendar day `date` falls on in the zone. */
export function dayKey(date: Date | string, timeZone = CALL_TZ): string {
  return zonedParts(typeof date === 'string' ? new Date(date) : date, timeZone).key;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function shiftDay(key: string, days: number): string {
  return new Date(keyToUtc(key) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Monday–Friday. Weekends never break a streak. */
export function isWorkday(key: string): boolean {
  const dow = new Date(keyToUtc(key)).getUTCDay();
  return dow !== 0 && dow !== 6;
}

/** The last `n` day keys ending with `endKey`, oldest first. */
export function lastDays(endKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftDay(endKey, i - (n - 1)));
}

/* ---- Counting ------------------------------------------------------------- */

/**
 * Drops repeat logs on the same prospect/lead within the dedupe window, so
 * double-saving a call cannot pad the goal. The log itself is untouched;
 * this only decides what counts. Returns events oldest first.
 */
export function dedupeEvents<T extends Pick<CallEvent, 'at' | 'key'>>(
  events: T[],
  windowMs = DEDUPE_WINDOW_MS
): T[] {
  const sorted = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const lastKept = new Map<string, number>();
  const out: T[] = [];
  for (const e of sorted) {
    const t = Date.parse(e.at);
    if (e.key) {
      const prev = lastKept.get(e.key);
      if (prev !== undefined && t - prev < windowMs) continue;
      lastKept.set(e.key, t);
    }
    out.push(e);
  }
  return out;
}

export function countByDay(events: Pick<CallEvent, 'at'>[], timeZone = CALL_TZ): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) {
    const k = dayKey(e.at, timeZone);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Calls per hour of the day (index 0–23) on `key`. */
export function countByHour(
  events: Pick<CallEvent, 'at'>[],
  key: string,
  timeZone = CALL_TZ
): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const e of events) {
    const p = zonedParts(new Date(e.at), timeZone);
    if (p.key === key) hours[p.hour] += 1;
  }
  return hours;
}

/* ---- Milestones and tiers ------------------------------------------------- */

export const MILESTONE_FRACTIONS = [0.1, 0.25, 0.5, 0.75, 1] as const;

export function milestonesFor(goal: number): number[] {
  return Array.from(new Set(MILESTONE_FRACTIONS.map((f) => Math.max(1, Math.round(goal * f)))));
}

/** The highest milestone passed going from `prev` to `next` calls, or null. */
export function milestoneCrossed(prev: number, next: number, goal: number): number | null {
  let hit: number | null = null;
  for (const m of milestonesFor(goal)) if (prev < m && next >= m) hit = m;
  return hit;
}

export function milestoneMessage(m: number, goal: number): string {
  if (m >= goal) return `Goal hit — ${goal} calls! 🏆`;
  const f = m / goal;
  if (f >= 0.75) return `${m} calls — the home stretch 🚀`;
  if (f >= 0.5) return `Halfway there — ${m} calls 🔥`;
  if (f >= 0.25) return `${m} calls — you're rolling ⚡`;
  return `${m} calls — warmed up 💪`;
}

/** 0 just started · 1 rolling · 2 hot · 3 goal hit (gold). */
export type GoalTier = 0 | 1 | 2 | 3;
export function tierFor(count: number, goal: number): GoalTier {
  const f = goal > 0 ? count / goal : 0;
  if (f >= 1) return 3;
  if (f >= 0.5) return 2;
  if (f >= 0.25) return 1;
  return 0;
}

/* ---- Pace ----------------------------------------------------------------- */

export interface Pace {
  /** before / during / after the 8–5 calling day. */
  phase: 'before' | 'during' | 'after';
  /** Calls by 17:00 at today's rate so far; null before the day starts. */
  projected: number | null;
  /** Calls per hour still needed to reach the goal; 0 once it is reached. */
  perHourNeeded: number;
  onPace: boolean;
}

export function paceFor(count: number, goal: number, now: Date, timeZone = CALL_TZ): Pace {
  const { hour, minute } = zonedParts(now, timeZone);
  const span = (WORKDAY.endHour - WORKDAY.startHour) * 60;
  const elapsed = Math.min(span, Math.max(0, hour * 60 + minute - WORKDAY.startHour * 60));
  const left = Math.max(0, goal - count);
  if (elapsed <= 0 && hour < WORKDAY.endHour) {
    return {
      phase: 'before',
      projected: null,
      perHourNeeded: Math.ceil(left / (span / 60)),
      onPace: count >= goal,
    };
  }
  if (elapsed >= span) {
    return { phase: 'after', projected: count, perHourNeeded: 0, onPace: count >= goal };
  }
  const projected = Math.round((count / elapsed) * span);
  const hoursLeft = (span - elapsed) / 60;
  return {
    phase: 'during',
    projected,
    perHourNeeded: left === 0 ? 0 : Math.ceil(left / hoursLeft),
    onPace: projected >= goal,
  };
}

export function paceMessage(p: Pace, count: number, goal: number): string {
  if (count >= goal) return count > goal ? `+${count - goal} bonus calls` : 'Goal hit for today';
  if (p.phase === 'before') return `Day starts at 8 AM · ${p.perHourNeeded}/hr gets you there`;
  if (p.phase === 'after') return `${goal - count} short today — tomorrow's a new board`;
  if (p.onPace) return `On pace for ${p.projected} by 5 PM`;
  return `Need ${p.perHourNeeded}/hr to hit ${goal}`;
}

/* ---- Streaks -------------------------------------------------------------- */

/**
 * Consecutive workdays that hit the goal, ending today. Today counts once it
 * is hit; until then it does not break the streak (the day is not over).
 * Weekends are skipped, and a weekend day that hit the goal still adds one.
 */
export function currentStreak(counts: Map<string, number>, goal: number, todayKey: string): number {
  let streak = 0;
  const earliest = [...counts.keys()].sort()[0];
  let k = todayKey;
  if ((counts.get(k) ?? 0) >= goal) streak += 1;
  k = shiftDay(k, -1);
  for (let i = 0; i < 400 && earliest && k >= earliest; i++, k = shiftDay(k, -1)) {
    const hit = (counts.get(k) ?? 0) >= goal;
    if (hit) streak += 1;
    else if (isWorkday(k)) break;
  }
  return streak;
}

/** The longest run of goal days anywhere in `counts`, on the same rules. */
export function longestStreak(counts: Map<string, number>, goal: number, todayKey: string): number {
  const keys = [...counts.keys()].sort();
  if (keys.length === 0) return 0;
  let best = 0;
  let run = 0;
  for (let k = keys[0]; k <= todayKey; k = shiftDay(k, 1)) {
    const hit = (counts.get(k) ?? 0) >= goal;
    if (hit) run += 1;
    else if (isWorkday(k) && k !== todayKey) run = 0;
    best = Math.max(best, run);
  }
  return best;
}

/* ---- Combos and bests ----------------------------------------------------- */

/** Decision-maker conversations in a row at the end of `events` (oldest first). */
export function comboCount(events: Pick<CallEvent, 'outcome'>[]): number {
  let n = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const o = events[i].outcome;
    if (o && DM_REACHED_OUTCOMES.includes(o)) n += 1;
    else break;
  }
  return n;
}

export const COMBO_THRESHOLD = 3;

/** Shortest time (ms) any day took to log `n` calls in a row, or null. */
export function fastestRun(
  events: Pick<CallEvent, 'at'>[],
  n: number,
  timeZone = CALL_TZ,
  onlyKey?: string
): number | null {
  const byDay = new Map<string, number[]>();
  for (const e of events) {
    const k = dayKey(e.at, timeZone);
    if (onlyKey && k !== onlyKey) continue;
    const list = byDay.get(k) ?? [];
    list.push(Date.parse(e.at));
    byDay.set(k, list);
  }
  let best: number | null = null;
  for (const times of byDay.values()) {
    times.sort((a, b) => a - b);
    for (let i = 0; i + n - 1 < times.length; i++) {
      const span = times[i + n - 1] - times[i];
      if (best === null || span < best) best = span;
    }
  }
  return best;
}

export interface PersonalBest {
  id: 'calls' | 'dms' | 'streak' | 'fastest25' | 'bookings';
  label: string;
  value: number | null;
  /** Display string, e.g. "38 min" for a time. */
  display: string;
  /** The day it was set, when it is a single-day record. */
  dayKey: string | null;
  /** Set (or tied above zero) today. */
  newToday: boolean;
}

function maxDay(m: Map<string, number>, excludeKey?: string): { key: string | null; value: number } {
  let key: string | null = null;
  let value = 0;
  for (const [k, v] of m) {
    if (k === excludeKey) continue;
    if (v > value) {
      key = k;
      value = v;
    }
  }
  return { key, value };
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

/**
 * Records over the events given (oldest first, already deduped). A record is
 * "new today" when today beats every earlier day — so the first day ever
 * logged is a new record, which is true.
 */
export function personalBests(
  events: CallEvent[],
  goal: number,
  todayKey: string,
  timeZone = CALL_TZ
): PersonalBest[] {
  const calls = countByDay(events, timeZone);
  const dmEvents = events.filter((e) => e.outcome && DM_REACHED_OUTCOMES.includes(e.outcome));
  const dms = countByDay(dmEvents, timeZone);
  const books = countByDay(
    events.filter((e) => e.outcome === 'appointment_booked'),
    timeZone
  );

  const record = (
    id: PersonalBest['id'],
    label: string,
    m: Map<string, number>
  ): PersonalBest => {
    const all = maxDay(m);
    const before = maxDay(m, todayKey);
    const today = m.get(todayKey) ?? 0;
    return {
      id,
      label,
      value: all.value || null,
      display: String(all.value),
      dayKey: all.key,
      newToday: today > 0 && today > before.value,
    };
  };

  const streakNow = currentStreak(calls, goal, todayKey);
  const streakBest = longestStreak(calls, goal, todayKey);
  const fastToday = fastestRun(events, 25, timeZone, todayKey);
  const fastBefore = fastestRun(
    events.filter((e) => dayKey(e.at, timeZone) !== todayKey),
    25,
    timeZone
  );
  const fastest = fastToday !== null && (fastBefore === null || fastToday < fastBefore) ? fastToday : fastBefore;

  return [
    record('calls', 'Most calls in a day', calls),
    record('dms', 'Most decision-makers in a day', dms),
    record('bookings', 'Most bookings in a day', books),
    {
      id: 'streak',
      label: 'Longest goal streak',
      value: streakBest || null,
      display: `${streakBest} ${streakBest === 1 ? 'day' : 'days'}`,
      dayKey: null,
      newToday:
        (calls.get(todayKey) ?? 0) >= goal &&
        streakNow > longestStreak(calls, goal, shiftDay(todayKey, -1)),
    },
    {
      id: 'fastest25',
      label: 'Fastest 25 calls',
      value: fastest,
      display: formatDuration(fastest),
      dayKey: null,
      newToday: fastToday !== null && (fastBefore === null || fastToday < fastBefore),
    },
  ];
}

/* ---- Badges --------------------------------------------------------------- */

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
}

export function badgesFor(input: {
  events: CallEvent[];
  goal: number;
  todayKey: string;
  bookingsAllTime: number;
  timeZone?: string;
}): Badge[] {
  const tz = input.timeZone ?? CALL_TZ;
  const calls = countByDay(input.events, tz);
  const best = maxDay(calls).value;
  const streak = longestStreak(calls, input.goal, input.todayKey);
  const early = new Map<string, number>();
  for (const e of input.events) {
    const p = zonedParts(new Date(e.at), tz);
    if (p.hour < 10) early.set(p.key, (early.get(p.key) ?? 0) + 1);
  }
  const bookingsByDay = countByDay(
    input.events.filter((e) => e.outcome === 'appointment_booked'),
    tz
  );
  const dmTotal = input.events.filter((e) => e.outcome && DM_REACHED_OUTCOMES.includes(e.outcome)).length;

  return [
    { id: 'first-goal', emoji: '🎯', label: 'First goal day', description: `Hit ${input.goal} calls in one day`, earned: best >= input.goal },
    { id: 'streak-3', emoji: '🔥', label: 'Heater', description: '3-day goal streak', earned: streak >= 3 },
    { id: 'streak-5', emoji: '🌋', label: 'Full week', description: '5-day goal streak', earned: streak >= 5 },
    { id: 'early-bird', emoji: '🌅', label: 'Early bird', description: '25 calls before 10 AM', earned: maxDay(early).value >= 25 },
    { id: 'marathon', emoji: '🏃', label: 'Marathon', description: '150 calls in one day', earned: best >= 150 },
    { id: 'talker', emoji: '🗣️', label: 'Conversation starter', description: '100 decision-maker conversations', earned: dmTotal >= 100 },
    { id: 'first-booking', emoji: '💰', label: 'First booking', description: 'Book a sales appointment', earned: input.bookingsAllTime >= 1 },
    { id: 'closer', emoji: '🤝', label: 'Closer', description: '10 appointments booked', earned: input.bookingsAllTime >= 10 },
    { id: 'hat-trick', emoji: '🎩', label: 'Hat trick', description: '3 bookings in one day', earned: maxDay(bookingsByDay).value >= 3 },
  ];
}
