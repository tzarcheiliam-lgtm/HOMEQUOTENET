'use client';

import { useEffect, useState } from 'react';
import { localParts } from '@/lib/availability/time';

/**
 * The red "now" line across today's column. Starts from the server's clock
 * (so the first client render matches), then follows the browser's, once a
 * minute. Hidden on other days and outside the visible hours.
 */
export function NowLine({
  date,
  timeZone,
  startHour,
  endHour,
  pxPerMinute,
  initialNowMs,
}: {
  date: string;
  timeZone: string;
  startHour: number;
  endHour: number;
  pxPerMinute: number;
  initialNowMs: number;
}) {
  const nowMs = useNow(initialNowMs);
  const here = localParts(nowMs, timeZone);
  if (here.date !== date) return null;
  const minute = here.minuteOfDay;
  if (minute < startHour * 60 || minute > endHour * 60) return null;
  return (
    <div
      aria-hidden
      data-calendar-now=""
      className="pointer-events-none absolute inset-x-0 z-20 h-0 border-t-2 border-red-500"
      style={{ top: (minute - startHour * 60) * pxPerMinute }}
    >
      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
    </div>
  );
}

/** The current time, ticking each minute. */
export function useNow(initialNowMs: number): number {
  const [now, setNow] = useState(initialNowMs);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
