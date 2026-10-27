import type { SalesAppointmentStatus } from '@/lib/types';
import { CALL_TZ, WORKDAY, currentStreak, dayKey, isWorkday, shiftDay, zonedParts } from '@/lib/calls/goals';

/**
 * Setter money, defined once. Setters are paid for each contractor sales
 * meeting they booked that the owner then sells: a meeting is *booked* when
 * the setter logs it, *pending* until the owner records the outcome, and
 * *earned* only once it is marked sold (at the pay snapshot stored on it).
 * Pure functions: lib/data/setter-dashboard.ts feeds them rows, the dashboard
 * renders the result, tests/setter-money.test.ts pins the arithmetic.
 */

export interface Meeting {
  id: string;
  prospectId: string;
  companyName: string;
  partnerId: string | null;
  /** When it was booked. */
  bookedAt: string;
  scheduledAt: string;
  status: SalesAppointmentStatus;
  saleOutcome: 'sold' | 'not_sold' | null;
  saleDecidedAt: string | null;
  /** Pay snapshot, set when sold. */
  payAmount: number | null;
}

/** A meeting that never happened cannot be sold, so it is not pending. */
const DEAD: SalesAppointmentStatus[] = ['cancelled', 'no_show'];

export const isSold = (m: Meeting) => m.saleOutcome === 'sold';
export const isPending = (m: Meeting) => m.saleOutcome === null && !DEAD.includes(m.status);

/** Monday of the week `key` falls in (weeks run Monday–Sunday). */
export function weekStart(key: string): string {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
  return shiftDay(key, -((dow + 6) % 7));
}

export const monthOf = (key: string) => key.slice(0, 7);

/** Sum of pay for meetings sold with a decision date in [fromKey, toKey]. */
export function earnedBetween(meetings: Meeting[], fromKey: string, toKey: string, tz = CALL_TZ): number {
  let sum = 0;
  for (const m of meetings) {
    if (!isSold(m) || !m.saleDecidedAt) continue;
    const k = dayKey(m.saleDecidedAt, tz);
    if (k >= fromKey && k <= toKey) sum += m.payAmount ?? 0;
  }
  return Math.round(sum * 100) / 100;
}

export function bookedBetween(meetings: Meeting[], fromKey: string, toKey: string, tz = CALL_TZ): Meeting[] {
  return meetings.filter((m) => {
    const k = dayKey(m.bookedAt, tz);
    return k >= fromKey && k <= toKey;
  });
}

export function bookingsByDay(meetings: Meeting[], tz = CALL_TZ): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of meetings) {
    const k = dayKey(m.bookedAt, tz);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** Workdays in a row (ending today) with at least one booking; today never breaks it. */
export function bookingStreak(meetings: Meeting[], todayKey: string, tz = CALL_TZ): number {
  return currentStreak(bookingsByDay(meetings, tz), 1, todayKey);
}

/** Share of decided meetings that sold, or null with nothing decided. */
export function closeRate(meetings: Meeting[]): number | null {
  const decided = meetings.filter((m) => m.saleOutcome !== null);
  if (decided.length === 0) return null;
  return decided.filter(isSold).length / decided.length;
}

export interface WeekPace {
  /** Mon–Fri calling days used so far this week, fractional for today. */
  daysUsed: number;
  projected: number | null;
  perDayNeeded: number;
  onPace: boolean;
}

/** Pace toward the weekly booking goal over the 8–5, Monday–Friday week. */
export function weekPace(bookings: number, goal: number, now: Date, tz = CALL_TZ): WeekPace {
  const { key, hour, minute } = zonedParts(now, tz);
  const monday = weekStart(key);
  const span = (WORKDAY.endHour - WORKDAY.startHour) * 60;
  const todayFrac = isWorkday(key)
    ? Math.min(1, Math.max(0, (hour * 60 + minute - WORKDAY.startHour * 60) / span))
    : 0;
  let before = 0;
  for (let k = monday; k < key; k = shiftDay(k, 1)) if (isWorkday(k)) before += 1;
  const daysUsed = Math.min(5, before + todayFrac);
  const left = Math.max(0, goal - bookings);
  const daysLeft = Math.max(0, 5 - daysUsed);
  return {
    daysUsed,
    projected: daysUsed > 0 ? Math.round((bookings / daysUsed) * 5) : null,
    perDayNeeded: left === 0 ? 0 : daysLeft > 0 ? Math.ceil(left / daysLeft) : left,
    onPace: bookings >= goal || (daysUsed > 0 && (bookings / daysUsed) * 5 >= goal),
  };
}

export function weekPaceMessage(p: WeekPace, bookings: number, goal: number): string {
  if (bookings >= goal) return bookings > goal ? `${bookings - goal} over your goal this week 🔥` : 'Weekly goal hit 🎯';
  if (p.daysUsed >= 5) return `${goal - bookings} short this week — new week, new board`;
  if (p.projected !== null && p.onPace) return `On pace for ${p.projected} this week`;
  return `Book ${p.perDayNeeded} a day to hit ${goal}`;
}

/** Most bookings in any one week and most earned in any one month. */
export function records(meetings: Meeting[], tz = CALL_TZ): {
  bestWeekBookings: number;
  bestWeekKey: string | null;
  bestMonthEarned: number;
  bestMonthKey: string | null;
} {
  const weeks = new Map<string, number>();
  for (const m of meetings) {
    const w = weekStart(dayKey(m.bookedAt, tz));
    weeks.set(w, (weeks.get(w) ?? 0) + 1);
  }
  const months = new Map<string, number>();
  for (const m of meetings) {
    if (!isSold(m) || !m.saleDecidedAt) continue;
    const mo = monthOf(dayKey(m.saleDecidedAt, tz));
    months.set(mo, (months.get(mo) ?? 0) + (m.payAmount ?? 0));
  }
  let bestWeekKey: string | null = null;
  let bestWeekBookings = 0;
  for (const [k, v] of weeks) if (v > bestWeekBookings) [bestWeekKey, bestWeekBookings] = [k, v];
  let bestMonthKey: string | null = null;
  let bestMonthEarned = 0;
  for (const [k, v] of months) if (v > bestMonthEarned) [bestMonthKey, bestMonthEarned] = [k, v];
  return { bestWeekBookings, bestWeekKey, bestMonthEarned, bestMonthKey };
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

export interface SetterBadge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
}

export function setterBadges(meetings: Meeting[], tz = CALL_TZ): SetterBadge[] {
  const sold = meetings.filter(isSold);
  const byDay = bookingsByDay(meetings, tz);
  const rec = records(meetings, tz);
  const rate = closeRate(meetings);
  const decided = meetings.filter((m) => m.saleOutcome !== null).length;
  return [
    { id: 'first-booking', emoji: '📅', label: 'On the board', description: 'Book your first sales meeting', earned: meetings.length >= 1 },
    { id: 'first-sale', emoji: '💰', label: 'First sale', description: 'A meeting you booked gets sold', earned: sold.length >= 1 },
    { id: 'triple', emoji: '🎩', label: 'Hat trick', description: '3 meetings booked in one day', earned: Math.max(0, ...byDay.values()) >= 3 },
    { id: 'big-week', emoji: '🚀', label: 'Big week', description: '10 meetings booked in one week', earned: rec.bestWeekBookings >= 10 },
    { id: 'closer', emoji: '🤝', label: 'Deal maker', description: '5 of your meetings sold', earned: sold.length >= 5 },
    { id: 'quality', emoji: '🎯', label: 'Quality setter', description: 'Half your meetings sell (min 4 decided)', earned: decided >= 4 && (rate ?? 0) >= 0.5 },
    { id: 'thousand', emoji: '🏦', label: '$1K month', description: 'Earn $1,000 in one month', earned: rec.bestMonthEarned >= 1000 },
  ];
}
