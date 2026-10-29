/**
 * Display helpers for booking times. Hosts see the calendar's zone; homeowners
 * see their browser's zone. Always show the zone so nobody guesses.
 */

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(timeZone: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, ...opts });
    cache.set(key, f);
  }
  return f;
}

/** A zone we can format in, falling back when the browser sent something unknown. */
export function safeTimeZone(timeZone: string | null | undefined, fallback = 'America/Los_Angeles'): string {
  if (!timeZone) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return fallback;
  }
}

/** Short zone name at that instant, e.g. "PDT" / "PST" (DST-aware). */
export function zoneAbbreviation(ms: number, timeZone: string): string {
  const part = fmt(timeZone, { timeZoneName: 'short' }).formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName');
  return part?.value ?? timeZone;
}

/** "9:30 AM" */
export function formatTime(ms: number, timeZone: string): string {
  return fmt(timeZone, { hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
}

/** Day heading for the slot picker: "Tuesday, November 3". */
export function formatDayHeading(ms: number, timeZone: string): string {
  return fmt(timeZone, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(ms));
}

/** "Tue, Nov 3 · 9:30 AM PST" — confirmations, calendar cards, texts. */
export function formatSlot(ms: number, timeZone: string): string {
  const day = fmt(timeZone, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(ms));
  return `${day} · ${formatTime(ms, timeZone)} ${zoneAbbreviation(ms, timeZone)}`;
}

/** "9:30 – 10:00 AM PST" */
export function formatRange(startMs: number, endMs: number, timeZone: string): string {
  return `${formatTime(startMs, timeZone)} – ${formatTime(endMs, timeZone)} ${zoneAbbreviation(startMs, timeZone)}`;
}

/** Host view: the calendar's zone. */
export function formatForHost(ms: number, calendarTimeZone: string): string {
  return formatSlot(ms, safeTimeZone(calendarTimeZone));
}

/** Homeowner view: their own zone (the browser's), else the calendar's. */
export function formatForHomeowner(ms: number, inviteeTimeZone: string | null | undefined, calendarTimeZone: string): string {
  return formatSlot(ms, safeTimeZone(inviteeTimeZone, safeTimeZone(calendarTimeZone)));
}
