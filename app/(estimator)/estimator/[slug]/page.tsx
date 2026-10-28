import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Estimator } from '@/components/estimator/estimator';
import { HERO_IMAGES } from '@/components/estimator/scene/hero-images';
import { EstimatorFooter } from '@/components/estimator/shell/estimator-footer';
import { EstimatorHeader } from '@/components/estimator/shell/estimator-header';
import { EstimatorHero } from '@/components/estimator/shell/estimator-hero';
import { contractorFacts } from '@/components/estimator/shell/facts';
import { publicTemplate } from '@/lib/estimator/config';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';
import { rendersEnabled } from '@/lib/estimator/render';

/** "Pool remodel" -> "Pool Remodel" for page titles. */
const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ESTIMATOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) return { title: 'Estimator not found', robots: { index: false, follow: false } };
  const { template, contractor } = found;
  const title = `${titleCase(template.title)} Price Estimator · ${contractor.contractorName}`;
  const description =
    template.trade === 'pool'
      ? `Design your ${template.projectNoun} with ${contractor.contractorName}, watch it come to life and get a ballpark price range, then book a free on-site consultation. A ballpark, not a quote.`
      : `Get a ballpark price range for your ${template.projectNoun} from ${contractor.contractorName}, then book a free on-site consultation. A ballpark, not a quote.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/estimator/${contractor.slug}` },
    // Example prices must not be indexed; the page opens up once the contractor confirms its prices.
    robots: template.pricesConfirmed ? { index: true, follow: true } : { index: false, follow: false },
    // Shared links preview as the contractor's builder, not the site-wide HomeQuote defaults (the design
    // illustration, so a preview never promises a photo while renders are off).
    openGraph: {
      type: 'website',
      title,
      description,
      ...(template.trade === 'pool' ? { images: [{ url: HERO_IMAGES.illustration, width: 1200, height: 800, alt: 'A pool design made in this builder' }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, ...(template.trade === 'pool' ? { images: [HERO_IMAGES.illustration] } : {}) },
  };
}

/**
 * The contractor-branded estimator page: the contractor's header (logo,
 * license, tap to call), a compact hero that names the rewards (the live
 * design, the ballpark price and, when renders are on, a realistic photo),
 * the estimator, and a quiet footer. No HomeQuote site chrome.
 */
export default async function EstimatorPage({ params }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  const { template, contractor } = found;
  const builder = template.trade === 'pool';
  // Server-only check (kie.ai key + signing secret); copy promising a realistic photo depends on it.
  const renders = rendersEnabled();
  const facts = contractorFacts(contractor.slug);

  return (
    <>
      <EstimatorHeader contractor={contractor} facts={facts} />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-x-clip">
          <div className="hq-glow" aria-hidden="true" />
          {builder ? (
            <EstimatorHero rendersEnabled={renders} facts={facts} />
          ) : (
            <div className="relative mx-auto w-full max-w-7xl px-5 pt-14 sm:px-8 sm:pt-20">
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                What could your {template.projectNoun} cost?
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
                Answer a few quick questions and see a ballpark price range from {contractor.contractorName}. It takes about two
                minutes, and a free on-site consultation gets you a firm quote.
              </p>
            </div>
          )}
          {/* Same side padding as the marketing Container: the builder's pinned picture bleeds into it (-mx-5 / sm:-mx-8). */}
          <div className={builder ? 'relative mx-auto w-full max-w-7xl px-5 pb-28 pt-3 sm:px-8 sm:pt-6 lg:pb-20' : 'relative mx-auto w-full max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:pb-20'}>
            <Estimator template={publicTemplate(template, contractor)} contractor={contractor} rendersEnabled={renders} />
          </div>
        </section>
      </main>
      <EstimatorFooter contractor={contractor} />
    </>
  );
}
