import { renderOgCard, ogSize } from '@/components/marketing/og-card';
import { getFunnel } from '@/lib/funnels/server';
import { funnelPreview } from '@/lib/funnels/preview';

/*
  Link-preview card for /estimate/[slug]. Bathroom and kitchen funnels get a
  homeowner card ("Planning a Kitchen Remodel?"); every other funnel gets the
  same site-wide card as before. Reads the funnel's industry, so a new bathroom
  or kitchen funnel needs no code change.
*/
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'HomeQuote Network';
export const size = ogSize;
export const contentType = 'image/png';

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = await getFunnel(slug).then((f) => f?.config.industry, () => undefined);
  const preview = funnelPreview(industry, slug);
  if (preview) return renderOgCard({ headline: preview.headline, subline: preview.subline, chips: preview.chips });
  return renderOgCard({ headline: 'Qualified Contractor Leads', subline: 'Booked On Your Calendar' });
}
