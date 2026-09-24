import {
  ArrowRight,
  Check,
  X,
  ShieldCheck,
  MapPinned,
  FileText,
  Activity,
  Zap,
  SlidersHorizontal,
  UserRound,
  Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Niche, ProcessStep, ServiceCard } from '@/content/types';
import { site, disclaimers } from '@/content/site';
import { photos, type Photo } from '@/content/photos';
import { PoolPhoto, PhotoBackdrop } from './photo';
import {
  Section,
  SectionHeading,
  Cta,
  Disclosure,
  Container,
} from './primitives';
import { ContentIcon } from './icon';

/* ---- 2. Problem --------------------------------------------------------- */

export function ProblemSection({
  items,
  eyebrow = 'The gap',
  title = 'Most contractor marketing sells activity, not appointments.',
  lead = 'These are the five issues contractors describe most often. None of them are unusual, and all of them come down to the same thing: paying for work that is not measured in homeowners who want an estimate.',
}: {
  items: { title: string; description: string }[];
  eyebrow?: string;
  title?: string;
  lead?: string;
}) {
  return (
    <Section id="problem">
      <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />

      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--hq-line)] bg-[var(--hq-line)] sm:grid-cols-2 lg:grid-cols-3">
        {items.map((problem) => (
          <div
            key={problem.title}
            className="bg-[var(--hq-bg-raised)] p-7"
          >
            <h3 className="text-base font-semibold text-[var(--hq-text)]">
              {problem.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
              {problem.description}
            </p>
          </div>
        ))}

        {/* Closing cell: states the alternative rather than attacking anyone. */}
        <div className="bg-[var(--hq-surface)] p-7">
          <h3 className="text-base font-semibold text-[var(--hq-accent-bright)]">
            The alternative
          </h3>
          <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
            Agree on what a qualified appointment looks like. We find the
            homeowner, qualify them, and book them into your calendar. You pay
            for the appointments that met the standard, and keep full control of
            the estimate and the close.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ---- 3. How it works ---------------------------------------------------- */

export function ProcessSection({
  steps,
  title = 'Four steps, agreed before anything runs.',
  lead = 'No part of this starts until the terms in step one are written down and confirmed by both sides.',
}: {
  steps: ProcessStep[];
  title?: string;
  lead?: string;
}) {
  return (
    <Section id="how-it-works" className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
      <SectionHeading eyebrow="How it works" title={title} lead={lead} />

      <ol className="mt-14 grid gap-6 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li
            key={step.step}
            className="hq-card hq-card-hover relative p-7"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold tracking-wider text-[var(--hq-accent-bright)]">
                {step.step}
              </span>
              {i < steps.length - 1 ? (
                <ArrowRight
                  className="size-4 text-[var(--hq-text-dim)] lg:hidden"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-[var(--hq-text)]">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---- 4. Project types --------------------------------------------------- */

export function ServicesSection({
  items,
  lead = 'You select the categories you want. Leads are filtered to those categories and to your approved service area before they reach you.',
  gallery,
}: {
  items: ServiceCard[];
  lead?: string;
  /** Optional row of three trade photos above the cards. */
  gallery?: readonly Photo[];
}) {
  return (
    <Section id="projects">
      <SectionHeading
        eyebrow="Project types"
        title="The work you can receive."
        lead={lead}
      />

      {gallery?.length ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {gallery.map((photo) => (
            <PoolPhoto
              key={photo.src}
              photo={photo}
              ratio="4 / 3"
              sizes="(max-width: 640px) 92vw, 30vw"
              zoom
            />
          ))}
        </div>
      ) : null}

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((service) => (
          <article
            key={service.title}
            className="hq-card hq-card-hover group p-6"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-accent-bright)] transition-colors group-hover:border-[var(--hq-accent-dim)]">
              <ContentIcon name={service.icon} className="size-5" />
            </span>
            <h3 className="mt-5 text-base font-semibold text-[var(--hq-text)]">
              {service.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
              {service.description}
            </p>
          </article>
        ))}
      </div>

      <Disclosure className="mt-8">
        Project categories outside this list can be discussed during the
        application call. Categories are confirmed in your agreement before
        launch.
      </Disclosure>
    </Section>
  );
}

/* ---- 6. Why HomeQuote Network ------------------------------------------- */

const reasonIcons: LucideIcon[] = [
  ShieldCheck,
  MapPinned,
  FileText,
  Activity,
  Zap,
  SlidersHorizontal,
  UserRound,
  Boxes,
];

export function WhySection({
  reasons,
  photo = photos.aerial,
  title = 'Operational commitments, not claims.',
  lead = 'Everything below is something we do, define, or hand over. There are no performance promises in this list, because performance depends on your pricing, your speed, and your sales process as much as on the appointment.',
}: {
  reasons: { title: string; description: string }[];
  /** Pass null to render the section without a photograph. */
  photo?: Photo | null;
  title?: string;
  lead?: string;
}) {
  return (
    <Section id="why" className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
      <SectionHeading
        eyebrow="Why HomeQuote Network"
        title={title}
        lead={lead}
      />

      {/*
        An overhead frame reads as a plan view, which is the right note beside
        claims about tracking and defined service areas.
      */}
      {photo ? (
      <PoolPhoto
        photo={photo}
        ratio="21 / 9"
        sizes="(max-width: 1024px) 92vw, 1120px"
        className="mt-12"
      />
      ) : null}

      <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map((reason, i) => {
          const Icon = reasonIcons[i % reasonIcons.length];
          return (
            <div key={reason.title}>
              <Icon
                className="size-5 text-[var(--hq-accent-bright)]"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-base font-semibold text-[var(--hq-text)]">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
                {reason.description}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---- 8. Two ways to work with us ---------------------------------------- */

export function OptionsSection() {
  const payPerAppointment = [
    'No monthly marketing retainer required to test',
    'We qualify the homeowner, not you',
    'Booked to a specific date and time in your calendar',
    'Defined project types and service area',
    'A written qualification standard',
    'Start with an agreed number of appointments',
  ];

  const managed = [
    'Advertising management',
    'Landing pages and lead forms',
    'CRM setup',
    'Automated SMS and email follow-up',
    'Speed-to-lead systems',
    'Appointment booking infrastructure',
    'Pipeline tracking and reporting',
    'Ongoing campaign optimization',
  ];

  return (
    <Section id="options">
      <SectionHeading
        eyebrow="Working together"
        title="Two ways to work with us."
        lead="Almost every contractor should start with the first one."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-12">
        {/* Primary offer — visually dominant. */}
        <div className="relative min-w-0 lg:col-span-7">
          <div
            className="absolute -inset-px rounded-[15px] bg-gradient-to-b from-[var(--hq-accent)]/40 to-transparent"
            aria-hidden="true"
          />
          <div className="hq-card relative h-full p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-[var(--hq-text)]">
                Pay Per Booked Appointment
              </h3>
              <span className="rounded-full border border-[var(--hq-accent-dim)] bg-[var(--hq-accent-glow)] px-3 py-1 text-xs font-semibold text-[var(--hq-accent-bright)]">
                Recommended starting option
              </span>
            </div>

            <p className="mt-4 text-[15px] leading-7 text-[var(--hq-text-muted)]">
              You pay for qualified homeowner appointments booked into your
              calendar in your approved service area. Payment is for the
              appointment meeting the agreed standard, not for whether the
              homeowner buys.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {payPerAppointment.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-[var(--hq-text)]">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-[var(--hq-accent-bright)]"
                    aria-hidden="true"
                  />
                  <span className="leading-6">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9">
              <Cta
                href={site.cta.primaryHref}
                className="w-full whitespace-normal text-center sm:w-auto sm:whitespace-nowrap"
              >
                {site.cta.primary}
                <ArrowRight className="size-4 shrink-0" />
              </Cta>
            </div>

            <p className="mt-6 text-sm leading-6 text-[var(--hq-text-dim)]">
              {disclaimers.pricing}
            </p>
          </div>
        </div>

        {/* Secondary offer — present, deliberately quieter. */}
        <div className="min-w-0 lg:col-span-5">
          <div className="hq-card h-full border-dashed p-6 sm:p-8">
            <h3 className="text-xl font-semibold tracking-tight text-[var(--hq-text)]">
              Managed Growth System
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
              Need more than appointments? We can also build and manage the
              entire customer-acquisition system. This is an optional engagement
              for established contractors and is not required to receive
              appointments.
            </p>

            <ul className="mt-7 space-y-2.5">
              {managed.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm text-[var(--hq-text-muted)]"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-[var(--hq-text-dim)]"
                    aria-hidden="true"
                  />
                  <span className="leading-6">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Cta
                href={site.cta.managedHref}
                variant="secondary"
                size="md"
                className="w-full"
              >
                {site.cta.managed}
              </Cta>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---- 9. Who this is for ------------------------------------------------- */

export function FitSection({ niche }: { niche: Niche }) {
  return (
    <Section id="fit" className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
      <SectionHeading
        eyebrow="Fit"
        title="Who this is for."
        lead="We would rather tell you it is not a fit on the first call than book appointments your team cannot attend."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="hq-card p-8">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-[var(--hq-text)]">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--hq-accent-glow)] text-[var(--hq-accent-bright)]">
              <Check className="size-3.5" aria-hidden="true" />
            </span>
            Best fit
          </h3>
          <ul className="mt-6 space-y-3.5">
            {niche.audienceFit.fit.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--hq-text)]">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-[var(--hq-accent-bright)]"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hq-card p-8">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-[var(--hq-text)]">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--hq-surface-2)] text-[var(--hq-text-dim)]">
              <X className="size-3.5" aria-hidden="true" />
            </span>
            Not a fit
          </h3>
          <ul className="mt-6 space-y-3.5">
            {niche.audienceFit.notFit.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-6 text-[var(--hq-text-muted)]"
              >
                <X
                  className="mt-0.5 size-4 shrink-0 text-[var(--hq-text-dim)]"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ---- 11. Final CTA ------------------------------------------------------ */

export function FinalCta({
  photo = photos.nightPool,
  objectClassName = 'object-[50%_60%]',
  title = 'See If Your Market Is Available.',
  lead = 'Tell us what projects you want, where you work, and how many additional opportunities your team can handle.',
  ctaLabel = site.cta.primary,
  ctaHref = site.cta.primaryHref,
}: {
  photo?: Photo;
  objectClassName?: string;
  title?: string;
  lead?: string;
  ctaLabel?: string;
  ctaHref?: string;
} = {}) {
  return (
    <section className="relative isolate overflow-hidden border-t border-[var(--hq-line)]">
      {/* The one place a photograph carries the whole section. */}
      <PhotoBackdrop photo={photo} scrim="band" objectClassName={objectClassName} />
      <Container className="relative">
        <div className="py-24 text-center sm:py-32">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-[var(--hq-text)] sm:text-5xl">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
            {lead}
          </p>
          <div className="mt-10 flex justify-center">
            <Cta href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="size-4" />
            </Cta>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-[var(--hq-text-dim)]">
            Applying does not create an agreement or an obligation. We review the
            application, confirm availability in your area, and follow up.
          </p>
        </div>
      </Container>
    </section>
  );
}
