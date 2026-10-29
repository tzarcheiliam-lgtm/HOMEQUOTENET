'use client';

import { useEffect, useState } from 'react';
import {
  readMeasurement,
  scheduleTagLoad,
  trackSiteEvent,
  writeMeasurement,
  type TrackingConfig,
} from '@/components/adu-quiz/tracking';

export type SiteTrackingIds = { metaPixelId: string; googleTagId: string };

const cfgFor = (ids: SiteTrackingIds): TrackingConfig => ({ ...ids, measurementMode: 'opt_out' });

/**
 * Loads the ad pixel and Google tag on the marketing pages and reports phone_click and
 * apply_submit. Measurement is on by default and visitors can switch it off (footer toggle);
 * the choice is shared with /adu-quiz. Renders nothing; does nothing when no IDs are configured.
 */
export function SiteAnalytics({ ids }: { ids: SiteTrackingIds }) {
  useEffect(() => {
    if (!ids.metaPixelId && !ids.googleTagId) return;
    const cfg = cfgFor(ids);
    scheduleTagLoad(cfg);

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="tel:"]');
      if (link) trackSiteEvent(cfg, 'phone_click', 'PhoneClick', { page: location.pathname });
    };
    const onEvent = (e: Event) => {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name;
      if (name === 'apply_submit') trackSiteEvent(cfg, 'apply_submit', 'ContractorApplicationSubmit', { page: location.pathname });
    };
    document.addEventListener('click', onClick);
    window.addEventListener('hqn:site-event', onEvent);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('hqn:site-event', onEvent);
    };
  }, [ids]);
  return null;
}

/** Footer control: lets a visitor turn advertising measurement off (or back on). */
export function MeasurementToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => setOn(readMeasurement('opt_out')), []);
  if (on === null) return null;
  return (
    <p className="text-xs leading-6 text-[var(--hq-text-dim)]">
      Advertising measurement is {on ? 'on' : 'off'}.{' '}
      <button
        type="button"
        className="underline underline-offset-4 hover:text-[var(--hq-text)]"
        onClick={() => {
          writeMeasurement(!on);
          setOn(!on);
        }}
      >
        {on ? 'Turn off' : 'Turn on'}
      </button>
    </p>
  );
}
