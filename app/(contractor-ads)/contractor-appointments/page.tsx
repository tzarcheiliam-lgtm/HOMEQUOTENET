import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck, CalendarCheck, MessageSquareText, Wrench } from 'lucide-react';
import { site, disclaimers } from '@/content/site';
import { campaignSnapshotStats } from '@/content/proof';
import { Container, Section, SectionHeading, Eyebrow, Disclosure } from '@/components/marketing/primitives';
import { CampaignSnapshotSection } from '@/components/marketing/campaign-proof';
import { FaqSection, FaqJsonLd } from '@/components/marketing/faq';
import { AttributionCapture } from '@/components/contractor-funnel/attribution';
import { MeasurementToggle, TrackedCta } from '@/components/contractor-funnel/tracking';
import { loadFunnelSettings } from '@/lib/contractor-funnel/settings.server';
import type { FaqItem } from '@/content/types';

export const metadata: Metadata = {
  title: 'More qualified homeowner appointments. Less chasing leads.',
  description:
    'HomeQuote Network generates homeowner interest, qualifies the project, follows up and books the appointment. You attend, estimate and close. Check whether your business is a fit.',
  // Paid-traffic page: keep it out of search so it never competes with the main site.
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

const CHECK_FIT = '/contractor-appointments/check-fit';
const ctaClass =
  'inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[var(--hq-accent)] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(61,125,255,0.6)] transition-colors hover:bg-[var(--hq-accent-bright)]';

const steps = [
  { icon: MessageSquareText, title: 'We generate homeowner interest', body: 'We run and pay for the advertising that gets homeowners asking about the projects you do.' },
  { icon: ClipboardCheck, title: 'We qualify the project', body: 'We confirm the homeowner, the project type and the service area before it counts as a booked appointment.' },
  { icon: CalendarCheck, title: 'We follow up and book', body: 'We follow up with the homeowner and book a specific day and time on your calendar.' },
  { icon: Wrench, title: 'You attend, estimate and close', body: 'You meet the homeowner, price the job and win it. Closing the work is yours.' },
];

const faqs: FaqItem[] = [
  { question: 'What counts as a booked appointment?', answer: 'A homeowner or property decision-maker, in your service area, asking about a project you agreed to take, who accepted a specific day and time. The full standard is on our Booked Appointment Standards page.' },
  { question: 'What does it cost?', answer: `${disclaimers.pricing} We confirm it with you in writing before anything runs.` },
  { question: 'Can you promise I will win jobs or get the same results?', answer: `No. The campaign figures on this page are one real campaign’s inquiry volume, not appointments or closed jobs, and results vary by market, budget, season and how you handle the estimate. ${disclaimers.noGuarantee}` },
  { question: 'What happens after I answer the questions?', answer: 'Your answers are saved. If they match what we can work with, you can pick a time for a call with HomeQuote right away. If we need to look closer, we review them and contact you. We do not book a call we are unsure about.' },
  { question: 'Is there a minimum revenue or ad budget to qualify?', answer: 'We do not set a revenue or budget requirement in this questionnaire. We look at the services you offer, where you work, your role, and whether your team has room for more appointments.' },
  { question: 'Who do I speak with on the call?', answer: 'Someone from HomeQuote Network. The call is to check market availability and answer your questions, and signing anything is a separate, written step.' },
];

const standards = [
  'You provide at least one of the trades we serve, or a trade we can review.',
  'You can describe the area where you work.',
  'You are an owner, partner, or the person responsible for marketing or sales.',
  'Your team has room for more homeowner appointments in the coming months.',
  'You would like to start within about three months.',
];

export default async function ContractorLandingPage() {
  const { pixelId } = await loadFunnelSettings();
  const trades = ['Pool contractors', 'Roofing', 'Residential remodeling / general contracting', 'Fencing and gates', 'HVAC installation / replacement'];

  return (
    <>
      <AttributionCapture />
      <FaqJsonLd items={faqs} />

      {/* HERO */}
      <section className="relative isolate overflow-hidden hq-grid">
        <div className="hq-glow" aria-hidden="true" />
        <Container className="relative py-16 sm:py-24">
          <div className="max-w-3xl">
            <Eyebrow>For contractors</Eyebrow>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              More qualified homeowner appointments. Less chasing leads.
            </h1>
            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)] sm:text-xl sm:leading-9">
              HomeQuote Network generates homeowner interest, qualifies the project, follows up and books the appointment. You attend, estimate and close the job.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3">
              <TrackedCta href={CHECK_FIT} pixelId={pixelId} location="hero" className={ctaClass}>
                Check My Fit <ArrowRight className="size-4" aria-hidden="true" />
              </TrackedCta>
              <p className="max-w-md text-sm leading-6 text-[var(--hq-text-dim)]">
                Answer a few questions (about 2 minutes). Eligible contractors can book a call right after.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <Section id="how-it-works">
        <SectionHeading eyebrow="How it works" title="We handle the front half. You handle the job." />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="hq-card p-6">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-accent-bright)]"><s.icon className="size-5" aria-hidden="true" /></span>
              <h3 className="mt-4 text-[15px] font-semibold"><span className="text-[var(--hq-text-dim)]">{i + 1}.</span> {s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* WHO WE SERVE */}
      <Section className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
        <SectionHeading eyebrow="Who we serve" title="Home-service contractors." lead="We work with contractors in these trades. If yours is not listed, tell us in the questionnaire and we will review it." />
        <ul className="mt-8 flex flex-wrap gap-3">
          {trades.map((t) => (
            <li key={t} className="rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface)] px-5 py-2.5 text-[15px] font-medium">{t}</li>
          ))}
        </ul>
      </Section>

      {/* PROOF + CTA */}
      <CampaignSnapshotSection />
      <Container className="py-16 sm:py-20">
        <p className="max-w-2xl text-base leading-7 text-[var(--hq-text-muted)]">
          {campaignSnapshotStats[0].value} inquiries is not {campaignSnapshotStats[0].value} appointments or jobs. See whether HomeQuote is a fit for your trade and area.
        </p>
        <TrackedCta href={CHECK_FIT} pixelId={pixelId} location="proof" className={`${ctaClass} mt-6`}>
          Check My Fit <ArrowRight className="size-4" aria-hidden="true" />
        </TrackedCta>
      </Container>

      {/* STANDARDS */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow="Qualification standards" title="What we look for." lead="There is no revenue or ad-budget minimum. Answers that do not clearly fit go to a person for review. They are not automatically turned away." />
          </div>
          <div className="lg:col-span-7">
            <ul className="space-y-3">
              {standards.map((s) => (
                <li key={s} className="hq-card flex gap-3 px-5 py-4 text-[15px] leading-7 text-[var(--hq-text)]">
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--hq-accent-bright)]" />{s}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-6 text-[var(--hq-text-dim)]">
              The standard for what counts as a booked homeowner appointment is on our <Link href="/lead-standards" className="text-[var(--hq-accent-bright)] underline">Booked Appointment Standards</Link> page.
            </p>
          </div>
        </div>
      </Section>

      <FaqSection items={faqs} />

      {/* FINAL CTA */}
      <Section className="border-t border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">See if your business is a fit.</h2>
          <p className="mt-4 text-lg leading-8 text-[var(--hq-text-muted)]">Answer a few questions. Eligible contractors can book a call right after.</p>
          <TrackedCta href={CHECK_FIT} pixelId={pixelId} location="final" className={`${ctaClass} mt-8`}>
            Check My Fit <ArrowRight className="size-4" aria-hidden="true" />
          </TrackedCta>
        </div>
        <Disclosure className="mt-12">{disclaimers.noGuarantee} {disclaimers.agreementGoverns}</Disclosure>
      </Section>

      <footer className="border-t border-[var(--hq-line)] py-8">
        <Container className="flex flex-col gap-3 text-sm text-[var(--hq-text-dim)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5">
            <Link href="/privacy" className="py-2 hover:text-[var(--hq-text)]">Privacy Policy</Link>
            <Link href="/terms" className="py-2 hover:text-[var(--hq-text)]">Terms</Link>
            <a href={`mailto:${site.contact.email}`} className="py-2 hover:text-[var(--hq-text)]">{site.contact.email}</a>
            <a href={`mailto:${site.contact.founderEmail}`} className="py-2 hover:text-[var(--hq-text)]">{site.contact.founderEmail}</a>
          </nav>
          <MeasurementToggle pixelId={pixelId} />
        </Container>
      </footer>
    </>
  );
}
