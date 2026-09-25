'use client';

import { useEffect } from 'react';
import { trackUpsell } from '@/lib/growth/track';

/**
 * Emits upsell_viewed once per card per page load when at least half of a
 * `[data-upsell-type]` card is on screen.
 */
export function UpsellViewTracker({ contractorId }: { contractorId: string }) {
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>('[data-upsell-type]');
    if (!cards.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const type = (entry.target as HTMLElement).dataset.upsellType;
          if (type) trackUpsell('upsell_viewed', contractorId, type);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [contractorId]);
  return null;
}
