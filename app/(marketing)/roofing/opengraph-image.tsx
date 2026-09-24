import { renderOgCard, ogSize } from '@/components/marketing/og-card';
import { roofingIndustry as industry } from '@/content/industries';

/*
  Required, not redundant: this route declares its own `openGraph` metadata,
  which replaces the parent layout's object and drops the inherited image.
*/
export const runtime = 'nodejs';
export const alt = `${industry.seo.ogHeadline} — HomeQuote Network`;
export const size = ogSize;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return renderOgCard({
    headline: industry.seo.ogHeadline,
    subline: industry.seo.ogSubline,
  });
}
