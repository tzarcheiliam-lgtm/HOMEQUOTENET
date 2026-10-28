/**
 * Month-grid math for the sales-appointments calendar. Pure and time-zone safe:
 * every day is a 'YYYY-MM-DD' key in the calling workspace's zone, so a 9 PM
 * meeting never slides onto the next day for a viewer in UTC.
 */
import { CALL_TZ, dayKey, shiftDay } from '@/lib/calls/goals';

export type MonthKey = string; // 'YYYY-MM'

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** The month to show: `?month=` when valid, otherwise the month of `now` in the zone. */
export function monthFrom(raw: string | undefined, now: Date = new Date(), timeZone = CALL_TZ): MonthKey {
  if (raw && MONTH_RE.test(raw)) return raw;
  return dayKey(now, timeZone).slice(0, 7);
}

export function shiftMonth(month: MonthKey, by: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** 0 = Sunday … 6 = Saturday, for a day key. */
export function weekdayOf(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

/**
 * The days on screen for a month: whole weeks, Sunday first, from the week the
 * 1st falls in to the week the last day falls in (4–6 rows).
 */
export function monthGrid(month: MonthKey): string[] {
  const firstKey = `${month}-01`;
  const lastKey = shiftDay(`${shiftMonth(month, 1)}-01`, -1);
  const start = shiftDay(firstKey, -weekdayOf(firstKey));
  const end = shiftDay(lastKey, 6 - weekdayOf(lastKey));
  const days: string[] = [];
  for (let k = start; k <= end; k = shiftDay(k, 1)) days.push(k);
  return days;
}

/** The instant range to load for a grid: from the first visible day to the day after the last, padded a day for zones. */
export function gridRange(days: string[]): { from: string; to: string } {
  return {
    from: new Date(Date.parse(`${shiftDay(days[0], -1)}T00:00:00Z`)).toISOString(),
    to: new Date(Date.parse(`${shiftDay(days[days.length - 1], 2)}T00:00:00Z`)).toISOString(),
  };
}

/** Groups items by the day their time falls on in the zone, each day sorted by time. */
export function groupByDay<T extends { scheduled_at: string }>(items: T[], timeZone = CALL_TZ): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of items) {
    const k = dayKey(it.scheduled_at, timeZone);
    const list = out.get(k);
    if (list) list.push(it);
    else out.set(k, [it]);
  }
  for (const list of out.values()) list.sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  return out;
}

/**
 * Which day to open: the one asked for if it is on screen, else today if this is
 * the current month, else the first day with meetings, else the 1st.
 */
export function initialDay(month: MonthKey, todayKey: string, byDay: Map<string, unknown[]>, wanted?: string): string {
  if (wanted && wanted.startsWith(month)) return wanted;
  if (todayKey.startsWith(month)) return todayKey;
  const firstBusy = [...byDay.keys()].filter((k) => k.startsWith(month)).sort()[0];
  return firstBusy ?? `${month}-01`;
}
