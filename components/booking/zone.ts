'use client';

import { useEffect, useState } from 'react';
import { safeTimeZone } from '@/lib/booking/format';

// Pure zone helpers live in ./zone-label (no 'use client'), so server components can call them too.
export { sameClock, zoneCity, zoneLabel } from './zone-label';

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
