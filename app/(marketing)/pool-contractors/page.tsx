import type { Metadata } from 'next';
import { ArrowRight, Check, Phone } from 'lucide-react';
import { poolNiche } from '@/content/niches/pool';
import { site, disclaimers } from '@/content/site';
import { validLeadCriteria, notPromised } from '@/content/lead-standards';
import {
  Container,
  Section,
  SectionHeading,
  Cta,
  Pill,
  Disclosure,
} from '@/components/marketing/primitives';
import { ContentIcon } from '@/components/marketing/icon';
import { ProcessSection, FitSection } from '@/components/marketing/sections';
import { FaqSection, FaqJsonLd } from '@/components/marketing/faq';
import { ApplicationForm } from '@/components/marketing/application-form';
import { TestimonialPlaceholder } from '@/components/marketing/proof-placeholder';

export const metadata: Metadata = {
  title: poolNiche.seo.title,
  description: poolNiche.seo.description,
  alternates: { canonical: '/pool-contractors' },
  openGraph: {
    title: `${poolNiche.seo.title} · ${site.name}`,
    description: poolNiche.seo.description,
    url: `${site.url}/pool-contractors`,
  },
};

/**
 * Cold-call follow-up landing page.
 *
 * Deliberately shorter and more direct than the homepage: the visitor has
 * already spoken to someone, so this page confirms the offer, states the terms,
 * and puts the application in front of them without another click.
 */
export default function PoolContractorsPage() {
  return (
    <>
      <FaqJsonLd items={poolNiche.faq} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden hq-grid">
        <div className="hq-glow" aria-hidden="true" />
        <Container className="relative">
          <div className="hq-rise max-w-3xl py-20 sm:py-24">
            <Pill tone="accent">
              <Phone className="size-3" aria-hidden="true" />
              For contractors we have spoken with
            </Pill>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.07] tracking-tight sm:text-5xl">
              Pool remodeling leads in {poolNiche.markets.region}. Pay per valid
              lead.
            </h1>

            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
              Here is the whole offer in one paragraph: we agree on what a valid
              lead looks like, we send matching homeowner opportunities in your
              approved service area, you pay for the valid ones delivered, and
              you handle the estimate and the close.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                'No monthly marketing retainer required to start',
                'You pay for the qualified opportunity, not the closed job',
                'Project types and service area agreed in writing before launch',
                'Start with a defined test volume for your market',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-7">
                  <Check
                    className="mt-1 size-4 shrink-0 text-[var(--hq-accent-bright)]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Cta href="#apply">
                {site.cta.primary}
                <ArrowRight className="size-4" />
              </Cta>
              <Cta href="#standards" variant="secondary">
                What counts as a valid lead
              </Cta>
            </div>

            <p className="mt-6 text-sm leading-6 text-[var(--hq-text-dim)]">
              {poolNiche.hero.trustLine}
            </p>
          </div>
        </Container>
      </section>

      {/* Coverage */}
      <Section className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] !py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
              Initial coverage
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {poolNiche.markets.areas.map((area) => (
                <span
                  key={area}
                  className="rounded-lg border border-[var(--hq-line)] bg-[var(--hq-surface)] px-3 py-1.5 text-sm text-[var(--hq-text-muted)]"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[var(--hq-text-dim)]">
            {poolNiche.markets.note}
          </p>
        </div>
      </Section>

      {/* Projects */}
      <Section id="projects">
        <SectionHeading
          eyebrow="Project types"
          title="The work you can receive."
          lead="Pick the categories you want. Anything outside them is filtered out before it reaches you."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {poolNiche.services.map((service) => (
            <div key={service.title} className="hq-card hq-card-hover flex items-start gap-4 p-5">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-accent-bright)]">
                <ContentIcon name={service.icon} className="size-5" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold">{service.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--hq-text-muted)]">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <ProcessSection niche={poolNiche} />

      {/* Lead standards — condensed */}
      <Section id="standards">
        <SectionHeading
          eyebrow="Lead standards"
          title="What counts as a valid lead."
          lead="This is what you are paying for, written down before you commit to anything."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="hq-card p-8">
            <h3 className="text-base font-semibold">A valid lead generally means</h3>
            <ul className="mt-6 space-y-3.5">
              {validLeadCriteria.map((item) => (
                <li key={item.title} className="flex gap-3 text-sm leading-6">
                  <Check
                    className="mt-1 size-4 shrink-0 text-[var(--hq-accent-bright)]"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="font-medium">{item.title}</span>
                    <span className="text-[var(--hq-text-muted)]">
                      {' '}
                      — {item.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hq-card p-8">
            <h3 className="text-base font-semibold">What we do not promise</h3>
            <ul className="mt-6 space-y-3">
              {notPromised.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-6 text-[var(--hq-text-muted)]"
                >
                  <span
                    className="mt-3 inline-block size-1 shrink-0 rounded-full bg-[var(--hq-text-dim)]"
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

        <Disclosure className="mt-8">{disclaimers.agreementGoverns}</Disclosure>
      </Section>

      <TestimonialPlaceholder />

      <FitSection niche={poolNiche} />

      {/* Embedded application */}
      <Section id="apply">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <SectionHeading
                eyebrow="Apply"
                title="Check lead availability in your market."
                lead="Tell us what projects you want, where you work, and how many additional opportunities your team can handle. It takes about two minutes."
              />
              <div className="mt-8 space-y-4">
                {[
                  'We review your application against current availability.',
                  'A short call to confirm project types, area, and capacity.',
                  'Lead standards, pricing, and test volume in writing.',
                ].map((line, i) => (
                  <div key={line} className="flex gap-3.5">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--hq-line-strong)] text-xs font-semibold text-[var(--hq-accent-bright)]">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-6 text-[var(--hq-text-muted)]">
                      {line}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="hq-card p-6 sm:p-9">
              <ApplicationForm />
            </div>
          </div>
        </div>
      </Section>

      <FaqSection items={poolNiche.faq} />
    </>
  );
}
