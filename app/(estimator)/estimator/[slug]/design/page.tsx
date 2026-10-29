import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Funnel } from '@/components/estimator/funnel/funnel';
import { missingFunnelPhotos } from '@/components/estimator/funnel/photo-files';
import { initialFromSearch } from '@/components/estimator/funnel/state';
import { publicTemplate } from '@/lib/estimator/config';
import { funnelSpecFor } from '@/lib/estimator/funnel/engine';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Only contractors on the simple funnel have this page. */
export function generateStaticParams() {
  return ESTIMATOR_SLUGS.filter((slug) => {
    const found = getEstimator(slug);
    return found ? funnelSpecFor(found.contractor) !== null : false;
  }).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) return { title: 'Estimator not found', robots: { index: false, follow: false } };
  const { template, contractor } = found;
  return {
    title: { absolute: `Design your ${template.projectNoun} · ${contractor.contractorName}` },
    description: `Three quick picks, then a ballpark price for your ${template.projectNoun} from ${contractor.contractorName} and a free on-site estimate.`,
    // The questions are one step of the landing page: that is the page to index (once prices are confirmed).
    alternates: { canonical: `/estimator/${contractor.slug}` },
    robots: { index: false, follow: true },
  };
}

/**
 * The funnel's questions (?step=1..n), then contact (?step=contact) and
 * booking (?step=book). The screen and picks come from the URL so a refresh
 * or a shared link opens the same screen on first paint.
 */
export default async function FunnelDesignPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  const { template, contractor } = found;
  const spec = funnelSpecFor(contractor);
  // Other contractors run the builder or the configurator on their main page.
  if (!spec) redirect(`/estimator/${contractor.slug}`);
  const initial = initialFromSearch(spec, await searchParams);
  return (
    <Funnel
      slug={contractor.slug}
      spec={spec}
      contractor={contractor}
      template={publicTemplate(template, contractor)}
      initialScreen={initial.screen}
      initialSelection={initial.selection}
      fromUrl={initial.fromUrl}
      missingPhotos={missingFunnelPhotos(spec)}
      homeHref={`/estimator/${contractor.slug}`}
    />
  );
}
