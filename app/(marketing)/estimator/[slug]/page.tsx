import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/marketing/primitives';
import { Estimator } from '@/components/estimator/estimator';
import { publicTemplate } from '@/lib/estimator/config';
import { ESTIMATOR_SLUGS, getEstimator } from '@/lib/estimator/registry';

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
  const description = `Get a ballpark price range for your ${template.projectNoun} from ${contractor.contractorName}, then book a free on-site consultation. A ballpark, not a quote.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/estimator/${contractor.slug}` },
    // Example prices must not be indexed; the page opens up once the contractor confirms its prices.
    robots: template.pricesConfirmed ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'website', title, description },
  };
}

export default async function EstimatorPage({ params }: Props) {
  const { slug } = await params;
  const found = getEstimator(slug);
  if (!found) notFound();
  const { template, contractor } = found;
  // The live pool builder is the hero: a compact heading so the picture and the first question
  // sit above the fold (phones and a 900 px desktop screen).
  const builder = template.trade === 'pool';

  return (
    <section className="relative isolate overflow-x-clip hq-grid">
      <div className="hq-glow" aria-hidden="true" />
      {/* Wider than the default container: the live pool builder puts the picture beside the questions on desktop. */}
      <Container className={builder ? 'relative max-w-7xl pb-28 pt-5 sm:pt-8 lg:pb-20' : 'relative max-w-7xl pb-28 pt-14 sm:pt-20 lg:pb-20'}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
          {contractor.contractorName} · {contractor.licenseLabel}
        </p>
        {builder ? (
          <>
            <h1 className="mt-2 max-w-4xl text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              Design your {template.projectNoun} and see what it could cost
            </h1>
            <p className="mt-2 max-w-3xl text-pretty text-sm leading-6 text-[var(--hq-text-muted)] max-sm:hidden sm:text-base">
              Every pick updates the picture. About two minutes, then a ballpark price range and a free on-site consultation for a firm quote.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              What could your {template.projectNoun} cost?
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
              Answer a few quick questions and see a ballpark price range from {contractor.contractorName}. It takes about two
              minutes, and a free on-site consultation gets you a firm quote.
            </p>
          </>
        )}
        <div className={builder ? 'mt-4 sm:mt-6' : 'mt-10'}>
          <Estimator template={publicTemplate(template, contractor)} contractor={contractor} />
        </div>
      </Container>
    </section>
  );
}
