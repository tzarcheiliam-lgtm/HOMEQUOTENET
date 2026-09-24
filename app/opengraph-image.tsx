import { renderOgCard, ogSize } from '@/components/marketing/og-card';

/**
 * Site-wide fallback Open Graph image: funnels (/estimate/*), auth screens and
 * any other route outside (marketing), which has its own card. Without this,
 * iMessage/WhatsApp fall back to the favicon for a link preview.
 */

export const runtime = 'nodejs';
export const alt = 'HomeQuote Network — Qualified Contractor Leads';
export const size = ogSize;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderOgCard({
    headline: 'Qualified Contractor Leads',
    subline: 'Booked On Your Calendar',
  });
}
