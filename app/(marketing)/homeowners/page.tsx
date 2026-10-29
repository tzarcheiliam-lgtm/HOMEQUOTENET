import Link from 'next/link';
import { site } from '@/content/site';
import { homeownerHub, homeownerProjects } from '@/content/homeowners';
import { Container, Cta, Disclosure, Section } from '@/components/marketing/primitives';
import {
  REFERRAL_DISCLOSURE,
  homeownerMetadata,
} from '@/components/marketing/homeowner-page';

export const metadata = homeownerMetadata('/homeowners', homeownerHub.seo);

export default function HomeownersHubPage() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${site.url}/homeowners`,
    url: `${site.url}/homeowners`,
    name: homeownerHub.h1,
    isPartOf: { '@id': `${site.url}/#website` },
    publisher: { '@id': `${site.url}/#organization` },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
      <div className="border-b border-[var(--hq-line)]">
        <Container>
          <div className="max-w-3xl py-14 sm:py-20">
            <Disclosure>{REFERRAL_DISCLOSURE}</Disclosure>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{homeownerHub.h1}</h1>
            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">{homeownerHub.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Cta href="/homeowners/adu">Start with an ADU</Cta>
              <Cta href="/adu-estimator" variant="secondary">ADU price estimator</Cta>
            </div>
          </div>
        </Container>
      </div>
      <Section>
        <h2 className="text-2xl font-semibold tracking-tight">Choose your project</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {homeownerProjects.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/homeowners/${p.slug}`}
                className="block h-full rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 p-6 transition-colors hover:border-[var(--hq-line-strong)]"
              >
                <h3 className="text-lg font-semibold text-[var(--hq-text)]">{p.navLabel}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">{p.blurb}</p>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/adu-estimator"
              className="block h-full rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 p-6 transition-colors hover:border-[var(--hq-line-strong)]"
            >
              <h3 className="text-lg font-semibold text-[var(--hq-text)]">ADU price estimator</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">Get an instant starting price for an ADU or garage conversion.</p>
            </Link>
          </li>
        </ul>
        <p className="mt-10 max-w-3xl text-sm leading-7 text-[var(--hq-text-muted)]">
          Serving Los Angeles, Orange, Ventura, Riverside and San Bernardino counties. Contractors are independent businesses; check any license at cslb.ca.gov.
        </p>
      </Section>
    </>
  );
}
