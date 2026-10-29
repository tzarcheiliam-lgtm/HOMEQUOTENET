import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveExampleMedia, tradeMeta } from '@/components/estimator/builders/meta';
import { exampleFileExists } from '@/components/estimator/builders/example-files';
import { Estimator } from '@/components/estimator/estimator';
import { EstimatorFooter } from '@/components/estimator/shell/estimator-footer';
import { EstimatorHeader } from '@/components/estimator/shell/estimator-header';
import { EstimatorHero } from '@/components/estimator/shell/estimator-hero';
import { contractorFacts } from '@/components/estimator/shell/facts';
import { publicTemplate } from '@/lib/estimator/config';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';
import { rendersEnabled } from '@/lib/estimator/render';

/** "Pool remodel" -> "Pool Remodel" for page titles. */
const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** The id the header's "Start my design" link jumps to (no phone number to call). */
const BUILDER_ANCHOR = 'design';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ESTIMATOR_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) return { title: 'Estimator not found', robots: { index: false, follow: false } };
  const { template, contractor } = found;
  const meta = tradeMeta(template.trade);
  const title = `${titleCase(template.title)} Price Estimator · ${contractor.contractorName}`;
  const description = meta
    ? meta.description(template.projectNoun, contractor.contractorName)
    : `Get a ballpark price range for your ${template.projectNoun} from ${contractor.contractorName}, then book a free on-site consultation. A ballpark, not a quote.`;
  // Only a share picture that is actually there.
  const share = meta?.shareImage && exampleFileExists(meta.shareImage.url) ? meta.shareImage : null;
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
      ...(share ? { images: [{ url: share.url, width: 1200, height: 800, alt: share.alt }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, ...(share ? { images: [share.url] } : {}) },
  };
}

/**
 * The branded estimator page: the business's header (logo, license, tap to
 * call, or "Start my design" without a phone), a compact hero that names the
 * rewards (the live design, the ballpark price and, when renders are on, a
 * realistic photo), the estimator, and a quiet footer. No HomeQuote site
 * chrome. Trade-specific words come from the builder's plain data
 * (components/estimator/builders/meta.ts).
 */
export default async function EstimatorPage({ params }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  const { template, contractor } = found;
  const meta = tradeMeta(template.trade);
  const builder = meta !== null;
  // Server-only check (kie.ai key + signing secret); copy promising a realistic photo depends on it.
  const renders = rendersEnabled();
  const facts = contractorFacts(contractor);
  // Before the first answer (renders on): the example design and its photo, or the example clip, if the files exist.
  const example = meta && renders ? resolveExampleMedia(meta, exampleFileExists) : null;

  return (
    <>
      <EstimatorHeader contractor={contractor} facts={facts} startHref={builder ? `#${BUILDER_ANCHOR}` : undefined} />
      <main id="main" className="flex-1">
        <section className="relative isolate overflow-x-clip">
          <div className="hq-glow" aria-hidden="true" />
          {meta ? (
            <EstimatorHero
              rendersEnabled={renders}
              facts={facts}
              copy={renders ? meta.hero.withRenders : meta.hero.withoutRenders}
              factsLabel={`About ${contractor.contractorName}`}
            />
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
          <div
            id={builder ? BUILDER_ANCHOR : undefined}
            className={
              builder
                ? 'relative mx-auto w-full max-w-7xl scroll-mt-16 px-5 pb-28 pt-3 sm:scroll-mt-20 sm:px-8 sm:pt-6 lg:pb-20'
                : 'relative mx-auto w-full max-w-7xl px-5 pb-28 pt-10 sm:px-8 lg:pb-20'
            }
          >
            <Estimator template={publicTemplate(template, contractor)} contractor={contractor} rendersEnabled={renders} example={example} />
          </div>
        </section>
      </main>
      <EstimatorFooter contractor={contractor} />
    </>
  );
}
