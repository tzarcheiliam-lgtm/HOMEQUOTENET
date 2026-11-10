import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { site } from '@/content/site';
import { industries } from '@/content/industries';
import { Container } from '@/components/marketing/primitives';
import { FaqJsonLd } from '@/components/marketing/faq';
import { StickyCta } from '@/components/marketing/mk-sticky-cta';
import { baseOpenGraph } from '@/lib/site-metadata';
import './marketer.css';

const title = 'HomeQuote Network | Marketing for Home-Service Contractors';
const description =
  'Stop buying leads. We run the marketing for pool, remodeling, roofing, fencing, HVAC and ADU contractors: ads, landing pages, follow-up and reporting for a flat monthly fee. No pay-per-lead.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, title, description, url: site.url },
  twitter: { card: 'summary_large_image', title, description },
};

const CTA_HREF = site.contact.booking;
const CTA_LABEL = 'Check if we’re a fit';

const scope = [
  { item: 'Strategy and setup', body: 'Targeting, offer and launch plan built around your trade, your area and the jobs you want.' },
  { item: 'Meta and Google ads', body: 'Campaigns created, managed, tested and optimized for you.' },
  { item: 'Creative and ad copy', body: 'Angles and copy written to get homeowners to raise their hand.' },
  { item: 'Landing page and lead capture', body: 'A dedicated page and form with qualification questions, so inquiries are worth calling.' },
  { item: 'Speed-to-lead follow-up', body: 'New inquiries are contacted fast so they do not go cold.' },
  { item: 'Appointment flow', body: 'Support moving qualified inquiries into scheduled estimates.' },
  { item: 'Tracking and reporting', body: 'Spend, leads, cost per lead, appointments and lead quality, in plain numbers.' },
  { item: 'Weekly optimization, monthly review', body: 'We tune campaigns every week and go through the month with you.' },
];

const weeks = [
  { w: 'Week 1', title: 'Setup', body: 'We collect your brand assets, photos, service areas and access, and build the landing page and follow-up system.' },
  { w: 'Week 2', title: 'Launch', body: 'Campaigns go live and we check tracking end to end.' },
  { w: 'Week 3', title: 'Optimize', body: 'We adjust based on lead quality, cost per lead, booked appointments and follow-up results.' },
  { w: 'Week 4', title: 'Review', body: 'We go through performance together and plan month two.' },
];

const fit = {
  yes: ['Jobs with healthy margins', 'A team that answers new inquiries quickly', 'Budget set aside for ad spend', 'A way to track which estimates turn into jobs'],
  no: ['Low-margin or small repair work', 'Slow follow-up on new inquiries', 'No budget for advertising', 'No tracking of estimates and closes'],
};

const faq = [
  { question: 'Do you sell leads?', answer: 'No. We are a marketing company. We run ads, landing pages and follow-up for your business. We do not sell or resell leads, and we do not charge per lead.' },
  { question: 'How is this different from buying leads?', answer: 'With a lead service you pay per inquiry, and many of them sell the same inquiry to several contractors. With us you pay a flat monthly fee for marketing that is built and run for your company, tracked from ad spend all the way to estimates.' },
  { question: 'How does pricing work?', answer: 'A flat monthly management fee for the marketing work, plus ad spend that you pay directly to Meta or Google. We confirm the details on a call before anything starts.' },
  { question: 'How long until my campaigns launch?', answer: 'We target launch within 7 to 10 business days after we receive your onboarding materials and platform access. Delays in getting us those materials delay the launch.' },
  { question: 'Is there a long contract?', answer: 'The initial term is 30 days, then it continues month to month until either side ends it in writing.' },
  { question: 'Do you guarantee results?', answer: 'No. Results depend on your market, pricing, availability and your own sales process. We do not guarantee closed jobs, revenue, lead volume or cost per lead.' },
  { question: 'Which trades do you work with?', answer: `${industries.map((i) => i.navLabel).join(', ')}.` },
];

export default function HomePage() {
  return (
    <div className="mk">
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

      {/* Hero: the page opens as a quote */}
      <section className="mk-gold">
        <Container className="grid gap-14 py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
          <div className="lg:col-span-7">
            <h1 className="mk-display mk-rise text-[clamp(3.25rem,8.4vw,7rem)]">
              Stop buying leads. Hire a marketing team.
            </h1>
            <p className="mk-rise mt-8 max-w-xl text-pretty text-lg leading-8 sm:text-xl sm:leading-9" style={{ ['--d' as string]: 3 }}>
              We run your ads, landing pages and follow-up for one flat monthly fee. No pay-per-lead,
              no shared leads, no ad-spend markup.
            </p>
            <div className="mk-rise mt-10 flex flex-col gap-4 sm:flex-row sm:items-center" style={{ ['--d' as string]: 4 }}>
              <Link href={CTA_HREF} className="mk-btn mk-btn-navy">
                {CTA_LABEL}
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <a href="#scope" className="mk-link py-3 text-base font-semibold">See what the fee covers</a>
            </div>
          </div>

          <div className="mk-rise lg:col-span-5" style={{ ['--d' as string]: 5 }}>
            <div className="mk-sheet">
              <div className="flex items-baseline justify-between border-b-2 border-[var(--navy)] pb-3">
                <p className="font-[family-name:var(--font-sora)] text-4xl font-bold tracking-[-0.04em]">Quote</p>
                <p className="text-sm font-semibold">HomeQuote Network</p>
              </div>
              <div className="pt-2">
                <div className="mk-sheet-line"><span className="k">Prepared for</span><span className="l" /><span className="v">Your company</span></div>
                <div className="mk-sheet-line"><span className="k">Scope</span><span className="l" /><span className="v">Ads, page, follow-up, reports</span></div>
                <div className="mk-sheet-line"><span className="k">Management fee</span><span className="l" /><span className="v">Flat, every month</span></div>
                <div className="mk-sheet-line"><span className="k">Ad spend</span><span className="l" /><span className="v">You pay Meta or Google</span></div>
                <div className="mk-sheet-line"><span className="k">Per-lead charges</span><span className="l" /><span className="v">None</span></div>
                <div className="mk-sheet-line"><span className="k">Term</span><span className="l" /><span className="v">30 days, then monthly</span></div>
              </div>
              <div className="mt-8 min-h-[6.5rem] pr-36 text-xs leading-5 text-[var(--ink-soft)]">
                Sample layout. Your fee and details are confirmed on a call before anything starts.
              </div>
              <div className="mk-stamp" aria-hidden="true">Not per lead</div>
            </div>
          </div>
        </Container>
      </section>

      {/* Two ways to pay */}
      <section className="mk-mist py-24 sm:py-32">
        <Container>
          <h2 className="mk-h2 max-w-3xl">Two ways to pay for marketing.</h2>
          <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-14">
            <div className="mk-receipt them">
              <p className="text-lg font-bold">A lead service</p>
              <div className="mt-3">
                <div className="row"><span>Lead 1</span><span className="l" /><span>per lead</span></div>
                <div className="row"><span>Lead 2</span><span className="l" /><span>per lead</span></div>
                <div className="row"><span>Lead 3 (also sent to 2 other contractors)</span><span className="l" /><span>per lead</span></div>
                <div className="row"><span>Lead 4</span><span className="l" /><span>per lead</span></div>
              </div>
              <div className="total flex justify-between gap-4"><span>Total</span><span>Depends on the month</span></div>
              <p className="mt-5 text-xs leading-5">Illustration of how many lead services bill. Not a specific company.</p>
            </div>

            <div className="mk-receipt">
              <p className="text-lg font-bold">HomeQuote Network</p>
              <div className="mt-3">
                <div className="row"><span>Marketing management</span><span className="l" /><span className="font-semibold">Flat monthly fee</span></div>
                <div className="row"><span>Ad spend</span><span className="l" /><span className="font-semibold">Paid by you to Meta or Google</span></div>
                <div className="row"><span>Per-lead charges</span><span className="l" /><span className="font-semibold">None</span></div>
                <div className="row"><span>Shared leads</span><span className="l" /><span className="font-semibold">None</span></div>
              </div>
              <div className="total flex justify-between gap-4"><span>Management fee</span><span>Same every month</span></div>
            </div>
          </div>
          <p className="mt-12 max-w-2xl text-pretty text-lg leading-8 text-[var(--ink-soft)]">
            Many lead services sell the same inquiry to several contractors. We do not sell or resell
            leads. We run the marketing for your company and report from ad spend all the way to estimates.
          </p>
        </Container>
      </section>

      {/* Scope of work */}
      <section id="scope" className="mk-paper scroll-mt-20 py-24 sm:py-32">
        <Container>
          <h2 className="mk-h2 max-w-3xl">What the monthly fee covers.</h2>
          <div className="mt-14">
            {scope.map((s) => (
              <div key={s.item} className="mk-scope-row">
                <h3 className="text-xl font-bold tracking-tight">{s.item}</h3>
                <p className="col-span-2 row-start-2 max-w-xl text-[16px] leading-7 text-[var(--ink-soft)] md:col-span-1 md:row-start-auto">{s.body}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--blue)]">
                  <Check className="size-5" aria-hidden="true" /> Included
                </span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-[var(--ink-soft)]">Ad spend is separate and paid directly to the ad platform.</p>
        </Container>
      </section>

      {/* First 30 days */}
      <section id="how" className="mk-on-navy scroll-mt-20 py-24 sm:py-32">
        <Container>
          <h2 className="mk-h2 max-w-3xl">Your first 30 days.</h2>
          <div className="mk-gantt mt-14" role="img" aria-label="Setup in week 1, launch in week 2, optimization in weeks 3 and 4, review in week 4">
            <span />
            {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w) => <span key={w} className="h">{w}</span>)}
            <span className="lab">Setup</span><span className="bar" style={{ gridColumn: '2 / 3' }} /><span style={{ gridColumn: '3 / 6' }} />
            <span className="lab">Launch</span><span style={{ gridColumn: '2 / 3' }} /><span className="bar" style={{ gridColumn: '3 / 4' }} /><span style={{ gridColumn: '4 / 6' }} />
            <span className="lab">Optimize</span><span style={{ gridColumn: '2 / 4' }} /><span className="bar" style={{ gridColumn: '4 / 6' }} />
            <span className="lab">Review</span><span style={{ gridColumn: '2 / 5' }} /><span className="bar" style={{ gridColumn: '5 / 6' }} />
          </div>
          <ol className="mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            {weeks.map((s) => (
              <li key={s.w}>
                <h3 className="text-xl font-bold tracking-tight">{s.w}: {s.title}</h3>
                <p className="mt-2 text-[16px] leading-7 text-white/80">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-12 text-lg font-semibold">After that it runs month to month.</p>
        </Container>
      </section>

      {/* Fit */}
      <section id="fit" className="mk-paper scroll-mt-20 py-24 sm:py-32">
        <Container>
          <h2 className="mk-h2 max-w-3xl">We’d rather tell you if it won’t work.</h2>
          <div className="mt-14 grid gap-14 md:grid-cols-2">
            <ul>
              {fit.yes.map((x) => (
                <li key={x} className="flex items-center gap-4 border-t-2 border-[var(--navy)] py-5 text-lg font-semibold last:border-b-2">
                  <Check className="size-6 shrink-0 text-[var(--blue)]" aria-hidden="true" /> {x}
                </li>
              ))}
            </ul>
            <ul>
              {fit.no.map((x) => (
                <li key={x} className="flex items-center gap-4 border-t-2 border-[var(--navy)] py-5 text-lg text-[var(--ink-soft)] last:border-b-2">
                  <X className="size-6 shrink-0" aria-hidden="true" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="mk-mist scroll-mt-20 py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <h2 className="mk-h2 lg:col-span-4">Questions contractors ask.</h2>
          <div className="lg:col-span-8">
            {faq.map((item) => (
              <details key={item.question} className="group border-t-2 border-[var(--navy)] last:border-b-2">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-xl font-bold leading-7 tracking-tight">{item.question}</span>
                  <span className="mt-0.5 text-2xl leading-none transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 text-[16px] leading-7 text-[var(--ink-soft)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Close */}
      <section className="mk-gold py-24 sm:py-36">
        <Container className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <h2 className="mk-display max-w-3xl text-[clamp(3rem,8vw,6.5rem)]">Find out if we’re a fit.</h2>
          <div className="max-w-sm">
            <p className="text-lg leading-8">Answer a few questions. If it won’t work for your business, we’ll tell you.</p>
            <Link href={CTA_HREF} className="mk-btn mk-btn-navy mt-6">
              {CTA_LABEL}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <p className="mt-6 text-sm">
              Homeowner?{' '}
              <Link href="/book" className="mk-link font-semibold">Book a remodeling appointment</Link>
            </p>
          </div>
        </Container>
      </section>

      <StickyCta href={CTA_HREF} label={CTA_LABEL} />
    </div>
  );
}
