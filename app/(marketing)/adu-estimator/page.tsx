import type { Metadata } from 'next';
import { site } from '@/content/site';
import { Container } from '@/components/marketing/primitives';
import { AduEstimator } from '@/components/marketing/adu-estimator';
import { baseOpenGraph } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: 'ADU Price Estimator',
  description:
    'Answer a few questions and get an instant starting price for a new detached ADU or a garage conversion, with a monthly payment calculator.',
  alternates: { canonical: '/adu-estimator' },
  robots: { index: true, follow: true },
  openGraph: {
    ...baseOpenGraph,
    title: `ADU Price Estimator · ${site.name}`,
    description: 'Get an instant starting price for an ADU or garage conversion.',
    url: `${site.url}/adu-estimator`,
  },
  twitter: { card: 'summary_large_image', title: `ADU Price Estimator · ${site.name}` },
};

export default function AduEstimatorPage() {
  return (
    <section className="relative isolate overflow-x-clip hq-grid">
      <div className="hq-glow" aria-hidden="true" />
      <Container className="relative pb-28 pt-14 sm:pt-20 lg:pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
          ADU price estimator
        </p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          What could your ADU cost?
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
          Choose what you are building, pick your finishes and tell us about your property. Your starting price updates
          as you go.
        </p>
        <div className="mt-10">
          <AduEstimator />
        </div>
      </Container>
    </section>
  );
}
