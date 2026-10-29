/**
 * Pure time-zone labels for the booking UI (no React, no 'use client'), so
 * server components such as the in-app Calendar page can call them too.
 * components/booking/zone.ts re-exports them for the client components.
 */
import { zoneAbbreviation } from '@/lib/booking/format';

/** "Pacific Time (PDT)"; the IANA id when the runtime has no generic name. */
export function zoneLabel(ms: number, timeZone: string): string {
  const abbr = zoneAbbreviation(ms, timeZone);
  let generic = '';
  try {
    generic = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longGeneric' })
      .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    generic = '';
  }
  if (!generic || generic === abbr) return abbr || timeZone;
  return abbr && !/^GMT[+-]/.test(abbr) ? `${generic} (${abbr})` : generic;
}

/** "Los Angeles" from "America/Los_Angeles". */
export const zoneCity = (timeZone: string) => timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;

/** Same wall clock offset right now? (Different ids, same clock, need no switch.) */
export function sameClock(a: string, b: string, ms = Date.now()): boolean {
  if (a === b) return true;
  const f = (tz: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', day: 'numeric', hourCycle: 'h23' }).format(new Date(ms));
  try {
    return f(a) === f(b);
  } catch {
    return false;
  }
}
