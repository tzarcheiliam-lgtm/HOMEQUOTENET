import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { site } from '@/content/site';
import { industries } from '@/content/industries';
import { Container } from '@/components/marketing/primitives';
import { FaqJsonLd } from '@/components/marketing/faq';
import { WeeklyReport } from '@/components/marketing/mk-report';
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

const versus = [
  { them: 'You pay for every lead, good or bad', us: 'One flat monthly fee for the marketing work' },
  { them: 'The same inquiry can go to several contractors', us: 'We do not sell or resell leads. Campaigns run for your company' },
  { them: 'Reports stop at clicks and cost per lead', us: 'Reports follow spend, inquiries, booked estimates, shows and estimates sent' },
  { them: 'You race everyone else to the phone', us: 'A speed-to-lead follow-up system contacts new inquiries fast' },
];

const services = [
  { title: 'Strategy and setup', body: 'Targeting, offer and launch plan built around your trade, your area and the jobs you want.' },
  { title: 'Meta and Google ads', body: 'Campaigns created, managed, tested and optimized for you.' },
  { title: 'Creative and ad copy', body: 'Angles and copy written to get homeowners to raise their hand.' },
  { title: 'Landing page and lead capture', body: 'A dedicated page and form with qualification questions, so inquiries are worth calling.' },
  { title: 'Speed-to-lead follow-up', body: 'New inquiries are contacted fast so they do not go cold.' },
  { title: 'Appointment flow', body: 'Support moving qualified inquiries into scheduled estimates.' },
  { title: 'Tracking and reporting', body: 'Spend, leads, cost per lead, appointments and lead quality, in plain numbers.' },
  { title: 'Weekly optimization, monthly review', body: 'We tune campaigns every week and review the month with you.' },
];

const flow = [
  { n: '1', title: 'Ad', body: 'Your campaign reaches homeowners planning your kind of project.', you: false },
  { n: '2', title: 'Landing page', body: 'A page and form qualify the inquiry.', you: false },
  { n: '3', title: 'Follow-up', body: 'Our system contacts it fast.', you: false },
  { n: '4', title: 'Booked estimate', body: 'It lands on your calendar.', you: false },
  { n: '5', title: 'You close', body: 'You run the estimate and win the job.', you: true },
];

const weHandle = ['Campaigns and ad optimization', 'Landing page and funnel', 'Follow-up and booking support', 'Weekly reporting'];
const youHandle = ['Answer new inquiries quickly', 'Keep calendar time open', 'Show up and run the estimates', 'Tell us which estimates become jobs'];

const steps = [
  { when: 'Week 1', title: 'Onboarding and setup', body: 'We collect your brand assets, photos, service areas and access, and build the landing page and follow-up system.' },
  { when: 'Week 2', title: 'Launch', body: 'Campaigns go live and we check tracking end to end.' },
  { when: 'Week 3', title: 'Optimize', body: 'We adjust based on lead quality, cost per lead, booked appointments and follow-up results.' },
  { when: 'Week 4', title: 'Review', body: 'We go through performance together and plan month two.' },
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

const strip = ['Pool contractors', 'Remodelers', 'Roofers', 'Fencing', 'HVAC', 'ADU builders', 'General contractors'];

function Strip() {
  return (
    <div className="mk-strip-track">
      {[0, 1].map((c) =>
        strip.map((w, i) => (
          <span key={`${c}-${w}`} className={`mk-strip-item ${i % 2 ? 'o' : ''}`} aria-hidden={c === 1 ? true : undefined}>
            {w}
          </span>
        ))
      )}
    </div>
  );
}

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

      {/* Hero */}
      <section className="mk-hero">
        <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-28">
          <div className="lg:col-span-7">
            <h1 className="mk-display mk-rise text-[clamp(3rem,7.6vw,6.25rem)]">
              Stop buying leads. Hire a marketing team.
            </h1>
            <p className="mk-rise mt-7 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)] sm:text-xl sm:leading-9" style={{ ['--d' as string]: 3 }}>
              We run your ads, landing pages and follow-up for one flat monthly fee. No pay-per-lead.
              No shared leads. No ad-spend markup.
            </p>
            <div className="mk-rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ ['--d' as string]: 4 }}>
              <Link href={CTA_HREF} className="mk-btn mk-btn-gold">
                {CTA_LABEL}
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <a href="#services" className="mk-btn mk-btn-ghost">See what’s included</a>
            </div>
            <ul className="mk-trust mk-rise mt-8" style={{ ['--d' as string]: 5 }}>
              <li>Flat monthly fee</li>
              <li>30 days to start, then month to month</li>
              <li>Ad spend goes straight to Meta and Google</li>
            </ul>
          </div>
          <div className="lg:col-span-5">
            <WeeklyReport />
          </div>
        </Container>
      </section>

      {/* Trades strip */}
      <section className="mk-strip" aria-label="Trades we work with">
        <Strip />
      </section>

      {/* Versus */}
      <section className="py-24 sm:py-32">
        <Container>
          <h2 className="mk-display mk-reveal max-w-4xl text-[clamp(2.25rem,5vw,4rem)]">
            Lead services sell you inquiries. We run your marketing.
          </h2>
          <div className="mt-14">
            <div className="hidden pb-3 text-sm font-semibold md:grid md:grid-cols-2 md:gap-12">
              <p className="text-[var(--hq-text-dim)]">Typical lead services</p>
              <p className="text-[var(--hq-accent-bright)]">HomeQuote Network</p>
            </div>
            {versus.map((v) => (
              <div key={v.us} className="mk-vs-row mk-reveal">
                <p className="mk-vs-them text-[15px] leading-7">{v.them}</p>
                <p className="mk-vs-us text-[17px] leading-7">{v.us}</p>
              </div>
            ))}
            <div className="border-t border-[var(--hq-line)]" />
          </div>
        </Container>
      </section>

      {/* What we run */}
      <section id="services" className="scroll-mt-20 border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] py-24 sm:py-32">
        <Container>
          <h2 className="mk-display mk-reveal max-w-3xl text-[clamp(2.25rem,5vw,4rem)]">
            Everything that fills the calendar, handled.
          </h2>
          <ul className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <li key={s.title} className="mk-reveal border-t-2 border-[var(--hq-accent-bright)] pt-5">
                <p className="text-sm font-semibold text-[var(--hq-text-dim)]">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--hq-text-muted)]">{s.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* From ad to estimate, who does what */}
      <section className="py-24 sm:py-32">
        <Container>
          <h2 className="mk-display mk-reveal max-w-3xl text-[clamp(2.25rem,5vw,4rem)]">
            From ad to estimate. We run it, you close it.
          </h2>
          <ol className="mk-flow mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {flow.map((f) => (
              <li key={f.n} className="mk-reveal">
                <span className={`mk-node ${f.you ? 'you' : ''}`}>{f.n}</span>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--hq-text-muted)]">{f.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-20 grid gap-12 md:grid-cols-2">
            <div className="mk-reveal">
              <h3 className="text-lg font-semibold text-[var(--hq-accent-bright)]">HomeQuote handles</h3>
              <ul className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
                {weHandle.map((x) => <li key={x} className="py-3 text-[16px]">{x}</li>)}
              </ul>
            </div>
            <div className="mk-reveal">
              <h3 className="mk-gold-text text-lg font-semibold">You handle</h3>
              <ul className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
                {youHandle.map((x) => <li key={x} className="py-3 text-[16px]">{x}</li>)}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* First 30 days */}
      <section id="how" className="scroll-mt-20 border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] py-24 sm:py-32">
        <Container>
          <h2 className="mk-display mk-reveal max-w-3xl text-[clamp(2.25rem,5vw,4rem)]">Your first 30 days.</h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
            {steps.map((s) => (
              <li key={s.when} className="mk-reveal border-t-2 border-[var(--mk-gold)] pt-5">
                <p className="text-sm font-semibold mk-gold-text">{s.when}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[var(--hq-text-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Fit */}
      <section id="fit" className="scroll-mt-20 py-24 sm:py-32">
        <Container>
          <h2 className="mk-display mk-reveal max-w-3xl text-[clamp(2.25rem,5vw,4rem)]">We’d rather tell you if it won’t work.</h2>
          <div className="mt-14 grid gap-12 md:grid-cols-2">
            <div className="mk-reveal">
              <h3 className="text-lg font-semibold">A good fit</h3>
              <ul className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
                {fit.yes.map((x) => <li key={x} className="py-3 text-[16px] text-[var(--hq-text-muted)]">{x}</li>)}
              </ul>
            </div>
            <div className="mk-reveal">
              <h3 className="text-lg font-semibold">Probably not a fit</h3>
              <ul className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
                {fit.no.map((x) => <li key={x} className="py-3 text-[16px] text-[var(--hq-text-muted)]">{x}</li>)}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-[var(--hq-line)] py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <h2 className="mk-display text-[clamp(2.25rem,4.6vw,3.75rem)] lg:col-span-4">Questions contractors ask.</h2>
          <div className="divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] lg:col-span-8">
            {faq.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-lg font-semibold leading-7">{item.question}</span>
                  <span className="mt-1 text-xl text-[var(--hq-text-muted)] transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 text-[16px] leading-7 text-[var(--hq-text-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Close */}
      <section className="relative isolate overflow-hidden border-t border-[var(--hq-line)] py-28 sm:py-40">
        <div aria-hidden="true" className="absolute inset-x-0 -bottom-1/2 -z-10 mx-auto h-[40rem] w-[60rem] max-w-full rounded-full bg-[radial-gradient(circle,rgb(0_56_184/0.5),transparent_65%)]" />
        <Container className="text-center">
          <h2 className="mk-display mk-reveal mx-auto max-w-4xl text-[clamp(2.75rem,7vw,6rem)]">
            Find out if we’re a fit.
          </h2>
          <p className="mk-reveal mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--hq-text-muted)]">
            Answer a few questions. If it won’t work for your business, we’ll tell you.
          </p>
          <div className="mk-reveal mt-10 flex justify-center">
            <Link href={CTA_HREF} className="mk-btn mk-btn-gold">
              {CTA_LABEL}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-10 text-sm text-[var(--hq-text-dim)]">
            Homeowner?{' '}
            <Link href="/book" className="underline underline-offset-4 hover:text-[var(--hq-text)]">Book a remodeling appointment</Link>
          </p>
        </Container>
      </section>

      <StickyCta href={CTA_HREF} label={CTA_LABEL} />
    </div>
  );
}
