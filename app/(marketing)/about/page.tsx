import type { Metadata } from 'next';
import Link from 'next/link';
import { site, disclaimers } from '@/content/site';
import { homeContent } from '@/content/home';
import { Container, Cta } from '@/components/marketing/primitives';
import { baseOpenGraph } from '@/lib/site-metadata';

const title =
  'About HomeQuote Network | Qualified Remodeling Appointments in Southern California';
const description =
  'HomeQuote Network is a Southern California referral and appointment-setting service connecting homeowners with licensed contractors for ADUs, remodels, roofing, fencing, HVAC and pools.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/about' },
  openGraph: {
    ...baseOpenGraph,
    title,
    description,
    url: `${site.url}/about`,
  },
  twitter: { card: 'summary_large_image', title, description },
};

function AboutPageJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${site.url}/about`,
    url: `${site.url}/about`,
    name: 'About HomeQuote Network',
    isPartOf: { '@id': `${site.url}/#website` },
    about: { '@id': `${site.url}/#organization` },
    mainEntity: { '@id': `${site.url}/#organization` },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

const h2 = 'mt-12 text-2xl font-semibold tracking-tight text-[var(--hq-text)]';
const p = 'mt-4 text-pretty leading-8 text-[var(--hq-text-muted)]';

export default function AboutPage() {
  return (
    <>
      <AboutPageJsonLd />
      <div className="border-b border-[var(--hq-line)]">
        <Container>
          <div className="max-w-3xl py-16 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
              About
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              About HomeQuote Network
            </h1>
            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
              HomeQuote Network is a lead-generation service that books
              qualified homeowner appointments for California remodeling
              contractors. We are a referral and appointment-setting service,
              not a contractor, and we do not perform construction work.
            </p>
          </div>
        </Container>
      </div>

      <Container>
        <div className="max-w-3xl pb-20 pt-4">
          <h2 className={h2}>What we do</h2>
          <ul className="mt-4 space-y-4 leading-8 text-[var(--hq-text-muted)]">
            <li>
              <strong className="text-[var(--hq-text)]">For homeowners:</strong>{' '}
              tell us about your project (ADU, kitchen, bath, roof, fence, HVAC
              or pool). We help you set up a conversation with a contractor
              that serves your area, with no obligation to hire anyone.
            </li>
            <li>
              <strong className="text-[var(--hq-text)]">For contractors:</strong>{' '}
              we generate interest from homeowners, qualify them, and book
              appointments on your calendar. You pay per qualified booked
              appointment. See our{' '}
              <Link
                href="/lead-standards"
                className="text-[var(--hq-accent-bright)] underline-offset-4 hover:underline"
              >
                booked appointment standards
              </Link>
              .
            </li>
          </ul>

          <h2 className={h2}>Who runs it</h2>
          <p className={p}>
            {site.name} is operated by {site.legalName}, doing business as{' '}
            {site.name}. Founded by {site.founder}.
          </p>

          <h2 className={h2}>Where we work</h2>
          <p className={p}>
            {homeContent.markets.areas.join(', ').replace(/, ([^,]*)$/, ' and $1')}
            , California.
          </p>

          <h2 className={h2}>How we work with contractors</h2>
          <p className={p}>
            Contractors are independent businesses. {site.name} does not
            guarantee estimates, sales or results. Contractors pay {site.name}{' '}
            for booked appointments, and we disclose that.
          </p>
          <p className={p}>{disclaimers.agreementGoverns}</p>

          <h2 className={h2}>Contact</h2>
          <p className={p}>
            <a
              href={`mailto:${site.contact.email}`}
              className="text-[var(--hq-accent-bright)] underline-offset-4 hover:underline"
            >
              {site.contact.email}
            </a>
            {' · '}
            <a
              href={`tel:${site.contact.phoneHref}`}
              className="text-[var(--hq-accent-bright)] underline-offset-4 hover:underline"
            >
              {site.contact.phone}
            </a>
          </p>

          <p className="mt-10 text-sm leading-6 text-[var(--hq-text-dim)]">
            {site.tradeNameLine}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Cta href={site.cta.primaryHref}>{site.cta.primary}</Cta>
            <Cta href="/lead-standards" variant="secondary">
              Appointment standards
            </Cta>
          </div>
        </div>
      </Container>
    </>
  );
}
