import type { Metadata } from 'next';
import { site } from '@/content/site';
import { Container } from '@/components/marketing/primitives';
import { AduEstimator } from '@/components/marketing/adu-estimator';
import { baseOpenGraph } from '@/lib/site-metadata';
import { FaqJsonLd } from '@/components/marketing/faq';
import { REFERRAL_DISCLOSURE } from '@/components/marketing/homeowner-page';
import { Disclosure } from '@/components/marketing/primitives';

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

const faq = [
  {
    question: 'How accurate is the ADU price estimate?',
    answer:
      'It is a starting price based on your choices, not a quote. Final cost depends on your lot, utility connections, local permit fees and the contractor you hire.',
  },
  {
    question: 'Does the estimator cost anything?',
    answer: 'No. The estimator is free to use and carries no obligation to hire anyone.',
  },
  {
    question: 'Is HomeQuote Network a contractor?',
    answer:
      'No. HomeQuote Network is a referral and appointment-setting service. We do not perform construction work.',
  },
];

const webAppJson = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ADU Price Estimator',
  url: `${site.url}/adu-estimator`,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  description:
    'Answer a few questions and get an instant starting price for a new detached ADU or a garage conversion, with a monthly payment calculator.',
  isAccessibleForFree: true,
  provider: { '@id': `${site.url}/#organization` },
};

export default function AduEstimatorPage() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJson) }} />
    <FaqJsonLd items={faq} />
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
    <Container className="pb-20">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">Common questions</h2>
        <dl className="mt-6 space-y-6">
          {faq.map((item) => (
            <div key={item.question}>
              <dt className="font-semibold text-[var(--hq-text)]">{item.question}</dt>
              <dd className="mt-2 text-sm leading-7 text-[var(--hq-text-muted)]">{item.answer}</dd>
            </div>
          ))}
        </dl>
        <Disclosure className="mt-8">{REFERRAL_DISCLOSURE}</Disclosure>
      </div>
    </Container>
    </>
  );
}
