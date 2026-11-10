import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { site } from '@/content/site';
import { industries } from '@/content/industries';
import { Container, Cta } from '@/components/marketing/primitives';
import { FaqJsonLd } from '@/components/marketing/faq';
import { baseOpenGraph } from '@/lib/site-metadata';

const title = 'HomeQuote Network | Marketing for Home-Service Contractors';
const description =
  'We run the marketing for pool, remodeling, roofing, fencing, HVAC and ADU contractors: ads, landing pages, follow-up and reporting, for a flat monthly management fee. No pay-per-lead.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, title, description, url: site.url },
  twitter: { card: 'summary_large_image', title, description },
};

/** What the monthly management fee covers. */
const services = [
  { title: 'Strategy and setup', body: 'Targeting, offer and launch plan built around your trade, your area and the jobs you want.' },
  { title: 'Meta and Google ads', body: 'Campaigns created, managed, tested and optimized for you.' },
  { title: 'Creative and ad copy', body: 'Angles and copy written to get homeowners to raise their hand.' },
  { title: 'Landing page and lead capture', body: 'A dedicated page and form with qualification questions, so the inquiries you get are worth calling.' },
  { title: 'Speed-to-lead follow-up', body: 'New inquiries are contacted fast so they do not go cold.' },
  { title: 'Appointment flow', body: 'Support moving qualified inquiries into scheduled estimates.' },
  { title: 'Tracking and reporting', body: 'Spend, leads, cost per lead, appointments and lead quality, in plain numbers.' },
  { title: 'Weekly optimization and monthly review', body: 'We tune campaigns every week and review the month with you.' },
];

const steps = [
  { when: 'Week 1', title: 'Onboarding and setup', body: 'We collect your brand assets, photos, service areas and access, and build the landing page and follow-up system.' },
  { when: 'Week 2', title: 'Launch', body: 'Campaigns go live and we check tracking end to end.' },
  { when: 'Week 3', title: 'Optimize', body: 'We adjust based on lead quality, cost per lead, booked appointments and follow-up results.' },
  { when: 'Week 4', title: 'Review', body: 'We go through performance together and plan month two.' },
];

const notThis = [
  { title: 'Not pay-per-lead', body: 'You pay a flat monthly management fee for the marketing work, not a price for each lead.' },
  { title: 'Not shared leads', body: 'We do not sell or resell leads. We run marketing for your company.' },
  { title: 'No ad spend markup', body: 'You pay ad spend directly to Meta or Google. We do not mark it up unless we agree otherwise in writing.' },
  { title: 'No guarantees we cannot keep', body: 'We do not promise jobs, revenue, lead volume or cost per lead. We build, run and optimize the system. You run the estimates and close.' },
];

const fit = {
  yes: [
    'Jobs with healthy margins',
    'A team that answers new inquiries quickly',
    'Budget set aside for ad spend',
    'A way to track which estimates turn into jobs',
  ],
  no: [
    'Low-margin or small repair work',
    'Slow follow-up on new inquiries',
    'No budget for advertising',
    'No tracking of estimates and closes',
  ],
};

const faq = [
  { question: 'Do you sell leads?', answer: 'No. We are a marketing company. We run ads, landing pages and follow-up for your business. We do not sell or resell leads, and we do not charge per lead.' },
  { question: 'How does pricing work?', answer: 'A flat monthly management fee for the marketing work, plus ad spend that you pay directly to Meta or Google. We confirm the details on a call before anything starts.' },
  { question: 'How long until my campaigns launch?', answer: 'We target launch within 7 to 10 business days after we receive your onboarding materials and platform access. Delays in getting us those materials delay the launch.' },
  { question: 'Is there a long contract?', answer: 'The initial term is 30 days, then it continues month to month until either side ends it in writing.' },
  { question: 'Do you guarantee results?', answer: 'No. Results depend on your market, pricing, availability and your own sales process. We do not guarantee closed jobs, revenue, lead volume or cost per lead.' },
  { question: 'Which trades do you work with?', answer: `${industries.map((i) => i.navLabel).join(', ')}.` },
];

export default function HomePage() {
  return (
    <>
      <FaqJsonLd items={faq} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: site.name,
            url: site.url,
            logo: `${site.url}/brand/homequote-logo-primary-horizontal-transparent.png`,
            description,
          }),
        }}
      />

      {/* Hero */}
      <section className="border-b border-[var(--hq-line)]">
        <Container className="grid gap-14 py-20 sm:py-28 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-32">
          <div className="lg:col-span-7">
            <h1 className="text-balance text-[clamp(2.75rem,6.6vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              We run the marketing for home-service contractors.
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)] sm:text-xl sm:leading-9">
              Ads, landing pages, follow-up and reporting, handled for a flat monthly
              management fee. No pay-per-lead. No shared leads.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Cta href={site.cta.primaryHref}>
                {site.cta.primary}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Cta>
              <Cta href={site.cta.secondaryHref} variant="secondary">
                {site.cta.secondary}
              </Cta>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="hq-card p-7">
              <p className="text-sm font-semibold">Included in the monthly fee</p>
              <ul className="mt-5 divide-y divide-[var(--hq-line)]">
                {['Meta and Google ad management', 'Landing page and lead capture', 'Speed-to-lead follow-up', 'Tracking and weekly reporting', 'Weekly optimization and monthly review'].map((x) => (
                  <li key={x} className="py-3 text-[15px] text-[var(--hq-text-muted)]">{x}</li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-5 text-[var(--hq-text-dim)]">
                Ad spend is paid directly to the ad platform and is separate from the management fee.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* What we run */}
      <section id="services" className="scroll-mt-20 py-24 sm:py-32">
        <Container>
          <h2 className="max-w-3xl text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
            What we run for you.
          </h2>
          <ul className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <li key={s.title} className="border-t border-[var(--hq-line-strong)] pt-5">
                <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--hq-text-muted)]">{s.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* How we work */}
      <section id="how" className="scroll-mt-20 border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] py-24 sm:py-32">
        <Container>
          <h2 className="max-w-3xl text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
            Your first 30 days.
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
            {steps.map((s) => (
              <li key={s.when}>
                <p className="text-sm font-semibold text-[var(--hq-accent-bright)]">{s.when}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--hq-text-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* What this is not */}
      <section className="py-24 sm:py-32">
        <Container>
          <h2 className="max-w-3xl text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
            Straight answers about how we work.
          </h2>
          <ul className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {notThis.map((n) => (
              <li key={n.title} className="border-t border-[var(--hq-line-strong)] pt-5">
                <h3 className="text-xl font-semibold tracking-tight">{n.title}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-7 text-[var(--hq-text-muted)]">{n.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Fit */}
      <section id="fit" className="scroll-mt-20 border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] py-24 sm:py-32">
        <Container>
          <h2 className="max-w-3xl text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em]">
            Who this works for.
          </h2>
          <div className="mt-14 grid gap-12 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold">A good fit</h3>
              <ul className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
                {fit.yes.map((x) => <li key={x} className="py-3 text-[15px] text-[var(--hq-text-muted)]">{x}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Probably not a fit</h3>
              <ul className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
                {fit.no.map((x) => <li key={x} className="py-3 text-[15px] text-[var(--hq-text-muted)]">{x}</li>)}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <h2 className="text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] lg:col-span-4">
            Questions contractors ask.
          </h2>
          <div className="divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] lg:col-span-8">
            {faq.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-base font-semibold leading-7">{item.question}</span>
                  <span className="mt-1 text-[var(--hq-text-muted)] transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 text-[15px] leading-7 text-[var(--hq-text-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Close */}
      <section className="border-t border-[var(--hq-line)] py-24 sm:py-32">
        <Container className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <h2 className="max-w-2xl text-balance text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
            Let us run your marketing.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta href={site.cta.primaryHref}>
              {site.cta.primary}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Cta>
            <Link href="/book" className="py-3 text-sm font-semibold text-[var(--hq-text-muted)] underline-offset-4 hover:text-[var(--hq-text)] hover:underline">
              Homeowner? Book a remodeling appointment
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
