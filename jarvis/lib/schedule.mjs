// Time helpers. Everything Jarvis schedules is in the owner's time zone (default America/Los_Angeles),
// computed with Intl so daylight-saving changes are handled without a date library.

/** Wall-clock parts of `date` in `tz`. */
export function localParts(date, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour) % 24;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour, minute: Number(parts.minute), second: Number(parts.second),
    minutesOfDay: hour * 60 + Number(parts.minute),
  };
}

/** Minutes `tz` is ahead of UTC at `date` (Los Angeles: -480 in winter, -420 in summer). */
export function tzOffsetMinutes(date, tz) {
  const p = localParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The UTC instant of local midnight starting the day `ymd` (YYYY-MM-DD) in `tz`. */
export function localMidnight(ymd, tz) {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  // Two passes settle the offset even on a DST-change day.
  let t = guess - tzOffsetMinutes(new Date(guess), tz) * 60000;
  t = guess - tzOffsetMinutes(new Date(t), tz) * 60000;
  return new Date(t);
}

/** Start and end (UTC) of "today" in `tz`. */
export function todayRange(now, tz) {
  const today = localParts(now, tz).date;
  const start = localMidnight(today, tz);
  const next = localParts(new Date(start.getTime() + 26 * 3600_000), tz).date; // safely inside tomorrow
  return { date: today, from: start, to: localMidnight(next, tz) };
}

/** "07:00" -> 420. Throws on anything else. */
export function parseClock(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error(`Time must look like 07:00 (got "${hhmm}")`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * The morning briefing is due once per local day, from its time until `graceMinutes` later. After an outage longer
 * than the grace period it is skipped for that day (a 2 pm "good morning" is noise).
 */
export function briefingDue(now, tz, hhmm, lastSentDate, graceMinutes = 180) {
  const p = localParts(now, tz);
  if (lastSentDate === p.date) return false;
  const at = parseClock(hhmm);
  return p.minutesOfDay >= at && p.minutesOfDay < at + graceMinutes;
}

/** Alerts about leads wait outside these hours (they show up in the morning briefing instead). */
export function withinActiveHours(now, tz, startHour = 7, endHour = 21) {
  const { hour } = localParts(now, tz);
  return hour >= startHour && hour < endHour;
}

/** "2 h", "15 min", "3 d". */
export function ago(fromIso, now) {
  const ms = now.getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

/** "9:30 AM" in `tz`. */
export function clockTime(iso, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
