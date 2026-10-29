'use client';

import { useEffect, useState } from 'react';
import { safeTimeZone, zoneAbbreviation } from '@/lib/booking/format';

/**
 * The homeowner sees times in their own (browser) zone, always labelled, and
 * may switch to the calendar's zone when the two differ. The server render
 * and the first client render use the fallback, so hydration matches; the
 * browser zone is read after mount (it only changes text, never layout size).
 */
export function useViewerTimeZone(fallback: string): string {
  const [zone, setZone] = useState(() => safeTimeZone(fallback));
  useEffect(() => {
    try {
      const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browser) setZone(safeTimeZone(browser, safeTimeZone(fallback)));
    } catch {
      /* keep the fallback */
    }
  }, [fallback]);
  return zone;
}

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
