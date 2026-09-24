import { renderOgCard, ogSize } from '@/components/marketing/og-card';

/**
 * Open Graph / social sharing image for the homepage and every marketing route
 * that does not declare its own (/lead-standards, /apply, /privacy, /terms).
 * The design lives in components/marketing/og-card.tsx; industry pages render
 * the same card with their own headline in their own opengraph-image.tsx.
 */

export const runtime = 'nodejs';
export const alt =
  'HomeQuote Network — Qualified Homeowner Appointments, Booked On Your Calendar.';
export const size = ogSize;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderOgCard({
    headline: 'Qualified Homeowner Appointments',
    subline: 'Booked On Your Calendar',
  });
}
