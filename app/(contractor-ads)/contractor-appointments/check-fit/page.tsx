import type { Metadata } from 'next';
import { site } from '@/content/site';
import { ContractorFunnel } from '@/components/contractor-funnel/funnel';
import { loadFunnelSettings } from '@/lib/contractor-funnel/settings.server';

export const metadata: Metadata = {
  title: 'Check My Fit',
  description: 'Answer a few questions to see whether HomeQuote Network is a fit for your contracting business.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckFitPage() {
  const settings = await loadFunnelSettings();
  return <ContractorFunnel pixelId={settings.pixelId} fallbackContactEmail={site.contact.email} />;
}
