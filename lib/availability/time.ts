/** Time-zone helpers for availability. Everything internal is UTC milliseconds; local wall-clock is only for rules. */

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export interface LocalParts {
  /** yyyy-mm-dd */
  date: string;
  /** 0 = Sunday */
  weekday: number;
  minuteOfDay: number;
}

function partsOf(ms: number, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of dtf(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out;
}

export function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

export function localParts(ms: number, timeZone: string): LocalParts {
  const p = partsOf(ms, timeZone);
  const date = `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  return { date, weekday: weekdayOfDate(date), minuteOfDay: p.hour * 60 + p.minute };
}

/** Day of week (0 = Sunday) of a calendar date, independent of any zone. */
export function weekdayOfDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * UTC ms of a local wall-clock time. On a spring-forward gap the time is pushed
 * forward (the instant that really exists); on a fall-back overlap the first
 * occurrence is used.
 */
export function zonedToUtc(date: string, minuteOfDay: number, timeZone: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const hh = Math.floor(minuteOfDay / 60);
  const mm = minuteOfDay % 60;
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  // Candidate offsets around the instant; pick one whose local rendering matches.
  const offsets = new Set<number>();
  for (const probe of [naive - 36e5 * 14, naive, naive + 36e5 * 14]) {
    const p = partsOf(probe, timeZone);
    offsets.add(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(probe / 1000) * 1000);
  }
  const candidates = [...offsets].map((off) => naive - off).sort((a, b) => a - b);
  for (const c of candidates) {
    const p = partsOf(c, timeZone);
    if (p.year === y && p.month === m && p.day === d && p.hour * 60 + p.minute === minuteOfDay) return c;
  }
  // Non-existent local time (DST gap): use the earlier offset so the result lands after the gap.
  return candidates[0] !== undefined ? candidates[candidates.length - 1] : naive;
}

/**
 * Parse an `<input type="datetime-local">` value ("2026-10-20T14:00") as wall
 * time in `timeZone`. Values that already carry a zone ("Z" / "+hh:mm") are
 * honored as-is. Returns null for anything unparsable.
 */
export function parseWallTime(value: string, timeZone: string): number | null {
  const v = value.trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(v)) {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(v);
  if (!m) return null;
  const hh = Number(m[2]);
  const mm = Number(m[3]);
  if (hh > 23 || mm > 59) return null;
  const [y, mo, d] = m[1].split('-').map(Number);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return zonedToUtc(m[1], hh * 60 + mm, timeZone);
}
