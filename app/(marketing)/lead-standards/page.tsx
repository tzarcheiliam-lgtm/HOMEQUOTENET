import type { Metadata } from 'next';
import { ArrowRight, Check, Minus } from 'lucide-react';
import {
  validLeadCriteria,
  notPromised,
  confirmedBeforeLaunch,
  disputeProcess,
} from '@/content/lead-standards';
import { site, disclaimers } from '@/content/site';
import {
  Container,
  Section,
  SectionHeading,
  Cta,
  Disclosure,
  Rule,
} from '@/components/marketing/primitives';

export const metadata: Metadata = {
  title: 'Lead Standards',
  description:
    'What counts as a valid lead at HomeQuote Network, what we do not promise, how invalid leads are disputed, and which terms are confirmed in writing before launch.',
  alternates: { canonical: '/lead-standards' },
  openGraph: {
    title: `Lead Standards · ${site.name}`,
    description:
      'What counts as a valid lead, what we do not promise, and how disputes are handled.',
    url: `${site.url}/lead-standards`,
  },
};

export default function LeadStandardsPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden hq-grid border-b border-[var(--hq-line)]">
        <div className="hq-glow" aria-hidden="true" />
        <Container className="relative">
          <div className="max-w-3xl py-20 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
              Lead standards
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              What counts as a valid lead.
            </h1>
            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
              You are paying for a defined thing. This page describes the general
              standard we work to, what is explicitly not promised, and how an
              invalid lead is handled. The governing version for your company is
              the standard written into your partner agreement.
            </p>
          </div>
        </Container>
      </section>

      {/* Criteria */}
      <Section>
        <SectionHeading
          title="The criteria"
          lead="A valid lead generally meets all of the following."
        />

        <ol className="mt-12 space-y-px overflow-hidden rounded-2xl border border-[var(--hq-line)] bg-[var(--hq-line)]">
          {validLeadCriteria.map((item, i) => (
            <li key={item.title} className="bg-[var(--hq-bg-raised)] p-6 sm:p-7">
              <div className="flex gap-5">
                <span className="font-mono text-sm font-semibold text-[var(--hq-accent-bright)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Not promised */}
      <Section className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              title="What a valid lead is not."
              lead="A valid lead is a qualified opportunity to win work. It is not a promise about what the homeowner will do next."
            />
          </div>
          <div className="lg:col-span-7">
            <ul className="space-y-4">
              {notPromised.map((item) => (
                <li
                  key={item}
                  className="flex gap-3.5 border-b border-[var(--hq-line)] pb-4 text-[15px] leading-7 text-[var(--hq-text-muted)]"
                >
                  <Minus
                    className="mt-2 size-3.5 shrink-0 text-[var(--hq-text-dim)]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-7 text-sm leading-6 text-[var(--hq-text-dim)]">
              {disclaimers.noGuarantee}
            </p>
          </div>
        </div>
      </Section>

      {/* Disputes */}
      <Section>
        <SectionHeading
          title="How invalid leads are handled."
          lead="If a lead does not meet the agreed standard, there is a defined process rather than a negotiation."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {disputeProcess.map((step) => (
            <div key={step.title} className="hq-card p-7">
              <h3 className="text-base font-semibold text-[var(--hq-accent-bright)]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <Disclosure className="mt-8">
          The dispute window, the evidence required, and whether a lead is
          replaced or credited are defined in your partner agreement. Those terms
          are agreed before launch, not after a dispute arises.
        </Disclosure>
      </Section>

      {/* Confirmed before launch */}
      <Section className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
        <SectionHeading
          title="Confirmed in writing before launch."
          lead="None of the following is left open once your programme starts."
        />

        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {confirmedBeforeLaunch.map((item) => (
            <div key={item.title}>
              <h3 className="flex items-center gap-2.5 text-base font-semibold">
                <Check
                  className="size-4 shrink-0 text-[var(--hq-accent-bright)]"
                  aria-hidden="true"
                />
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <Rule className="my-12" />

        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[15px] leading-7 text-[var(--hq-text-muted)]">
            Want the version that would apply to your company? Apply and we will
            send the standard, pricing, and proposed test volume for your market
            in writing.
          </p>
          <Cta href={site.cta.primaryHref}>
            {site.cta.primary}
            <ArrowRight className="size-4" />
          </Cta>
        </div>
      </Section>
    </>
  );
}
