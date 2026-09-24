import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowDown,
  CalendarCheck,
  Check,
  ClipboardList,
  PhoneCall,
  UserRoundCheck,
} from 'lucide-react';
import type { IndustryPage } from '@/content/types';
import { proof, campaignSnapshotStats, campaignSnapshotNote } from '@/content/proof';
import { SERVICES_BY_NICHE } from '@/lib/validation/application';
import { Container, Section, SectionHeading, Cta, Pill, Eyebrow } from './primitives';
import { PhotoBackdrop } from './photo';
import { ExpandableImage } from './expandable-image';
import { ApplicationForm } from './application-form';

/*
  Sections used only by the industry landing pages. Shared sections (problems,
  process, services, why, FAQ, final CTA) come from sections.tsx and faq.tsx and
  take their copy as props, so the homepage and every industry page render
  through the same components.

  Proof rule: the campaign screenshot and the calendar come from a pool
  remodeling programme. On every other industry page they are captioned as an
  example of the system, never as results for that trade.
*/

const isPool = (industry: IndustryPage) => industry.key === 'pool';

/* ---- 1. Hero ------------------------------------------------------------ */

export function IndustryHero({ industry }: { industry: IndustryPage }) {
  return (
    <section className="relative isolate overflow-hidden">
      <PhotoBackdrop
        photo={industry.imagery.hero}
        scrim="hero"
        priority
        objectClassName={industry.imagery.heroPosition}
      />
      <Container className="relative">
        <div className="hq-rise max-w-3xl py-20 sm:py-24 lg:py-28">
          <Pill tone="accent">
            <span className="inline-block size-1.5 rounded-full bg-[var(--hq-accent-bright)] hq-pulse" />
            {industry.hero.eyebrow}
          </Pill>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--hq-text)] [text-shadow:0_1px_24px_rgb(2_20_40/0.6)] sm:text-5xl lg:text-[3.4rem]">
            {industry.hero.headline}
          </h1>

          <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
            {industry.hero.subheadline}
          </p>
          <p className="mt-5 text-[15px] leading-7 text-[var(--hq-text-muted)]">
            {industry.hero.support}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta href="#apply">
              {industry.cta}
              <ArrowRight className="size-4" />
            </Cta>
            <Cta href="#how-it-works" variant="secondary">
              See How It Works
            </Cta>
          </div>
        </div>

        <p className="relative pb-6 text-xs leading-5 text-[var(--hq-text-muted)]">
          {industry.imagery.disclosure}
        </p>
      </Container>
    </section>
  );
}

/* ---- 5. Proof: ad click to booked appointment --------------------------- */

function FlowStep({
  n,
  icon,
  title,
  children,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="hq-card p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-accent-bright)]">
          {icon}
        </span>
        <span className="font-mono text-xs font-semibold tracking-wider text-[var(--hq-text-dim)]">
          {n}
        </span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-[var(--hq-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">{children}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1 text-[var(--hq-text-dim)] lg:hidden" aria-hidden="true">
      <ArrowDown className="size-4" />
    </div>
  );
}

/**
 * Campaign screenshot → homeowner inquiry → qualification and follow-up →
 * booked calendar. On a phone it stacks in that order with arrows; on desktop
 * the two screenshots flank the two middle steps.
 */
export function ResultsProofSection({ industry }: { industry: IndustryPage }) {
  const pool = isPool(industry);

  return (
    <Section
      id="proof"
      className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]"
    >
      <SectionHeading
        eyebrow="The HomeQuote system"
        title="From Ad Click to Booked Appointment."
        lead="HomeQuote builds the system between the first homeowner inquiry and your calendar. Here is what that looks like end to end."
      />

      {pool ? (
        <dl className="mt-12 grid gap-4 sm:grid-cols-3">
          {campaignSnapshotStats.map((stat) => (
            <div key={stat.label} className="hq-card p-6">
              <dt className="text-sm font-semibold text-[var(--hq-text-muted)]">{stat.label}</dt>
              <dd className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-[var(--hq-text)]">
                {stat.value}
              </dd>
              <p className="mt-3 text-sm leading-6 text-[var(--hq-text-dim)]">{stat.detail}</p>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-12 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15rem_minmax(0,1fr)] lg:gap-6">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
            <span className="font-mono text-[var(--hq-accent-bright)]">01</span>
            Example campaign activity
          </p>
          <ExpandableImage
            image={proof.campaignSnapshot}
            sizes="(max-width: 1024px) 100vw, 460px"
            label="Expand the example campaign report"
            caption={
              pool
                ? 'A HomeQuote pool-remodeling campaign report. Tap to expand.'
                : `A HomeQuote pool-remodeling campaign report, shown as an example of how the system runs. It is not a ${industry.trade} campaign or ${industry.trade} results. Tap to expand.`
            }
          />
        </div>

        <FlowArrow />

        <div className="space-y-4 lg:pt-8">
          <FlowStep n="02" icon={<ClipboardList className="size-4" />} title="Homeowner inquiry">
            The homeowner submits their project details, service type and location.
          </FlowStep>
          <FlowArrow />
          <FlowStep n="03" icon={<PhoneCall className="size-4" />} title="Qualification & follow-up">
            We check fit against your standard and follow up until a time is agreed.
          </FlowStep>
        </div>

        <FlowArrow />

        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
            <span className="font-mono text-[var(--hq-accent-bright)]">04</span>
            Booked on the calendar
          </p>
          <ExpandableImage
            image={proof.appointmentCalendar}
            sizes="(max-width: 1024px) 100vw, 460px"
            label="Expand the example appointment calendar"
            caption={
              pool
                ? 'Example of appointments generated through the HomeQuote system. Tap to expand.'
                : 'Example of appointments generated through the HomeQuote system, from a pool remodeling programme. Tap to expand.'
            }
          />
        </div>
      </div>

      <p className="mt-8 max-w-3xl text-sm leading-6 text-[var(--hq-text-dim)]">
        {campaignSnapshotNote}
      </p>
    </Section>
  );
}

/* ---- 6. Appointment setting -------------------------------------------- */

export function AppointmentSettingSection({ industry }: { industry: IndustryPage }) {
  const points = [
    {
      icon: PhoneCall,
      title: 'Follow-up',
      text: 'Repeated, timely contact until the homeowner either books or says no.',
    },
    {
      icon: UserRoundCheck,
      title: 'Qualification',
      text: 'Service area, project type and fit checked against your written standard.',
    },
    {
      icon: CalendarCheck,
      title: 'Appointment setting',
      text: 'A specific date and time, booked into the availability you set.',
    },
  ];

  return (
    <Section id="appointment-setting">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <Eyebrow>More than leads</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--hq-text)] sm:text-4xl">
            We Don’t Stop at the Lead.
          </h2>
          <p className="mt-5 text-pretty text-base leading-7 text-[var(--hq-text-muted)] sm:text-lg sm:leading-8">
            Getting a homeowner’s information is only the first step. HomeQuote
            can handle follow-up, qualification, and appointment setting, so you
            receive opportunities further down the funnel.
          </p>

          <ul className="mt-8 space-y-5">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-accent-bright)]">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--hq-text)]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--hq-text-muted)]">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-[var(--hq-accent-dim)] bg-[var(--hq-accent-glow)] px-5 py-4">
            <p className="text-sm leading-6 text-[var(--hq-text)]">{industry.appointmentNote}</p>
          </div>

          <Link
            href="/lead-standards"
            className="mt-6 inline-flex items-center gap-1.5 py-1.5 text-sm font-semibold text-[var(--hq-accent-bright)] hover:underline"
          >
            What counts as a qualified booked appointment
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="lg:col-span-7">
          <ExpandableImage
            image={proof.appointmentCalendar}
            sizes="(max-width: 1024px) 100vw, 660px"
            label="Expand the example appointment calendar"
            caption={
              isPool(industry)
                ? 'HomeQuote booking system in action: an example contractor calendar. Tap to expand.'
                : 'HomeQuote booking system in action: an example contractor calendar from a pool remodeling programme. Tap to expand.'
            }
          />
        </div>
      </div>
    </Section>
  );
}

/* ---- 8. Application ----------------------------------------------------- */

export function IndustryApplySection({ industry }: { industry: IndustryPage }) {
  return (
    <Section id="apply" className="border-t border-[var(--hq-line)]">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <SectionHeading
              eyebrow={industry.cta}
              title="See if your area is available."
              lead={`Tell us which ${industry.trade} projects you want, where you work, and how many more appointments your team can run. It takes about two minutes.`}
            />
            <ul className="mt-8 space-y-3">
              {[
                'We review your application against current availability.',
                'A short call to confirm project types, area and capacity.',
                'The appointment standard, pricing and volume in writing.',
              ].map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-6 text-[var(--hq-text-muted)]">
                  <Check className="mt-1 size-4 shrink-0 text-[var(--hq-accent-bright)]" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <div className="hq-card p-6 sm:p-9">
            <ApplicationForm services={SERVICES_BY_NICHE[industry.key]} />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---- Photo credits ------------------------------------------------------ */

/** Small-print credit line for any stock photography on the page. */
export function PhotoCredits({ industry }: { industry: IndustryPage }) {
  const credited = [industry.imagery.hero, ...industry.imagery.gallery].filter(
    (photo) => photo.credit
  );
  if (!credited.length) return null;

  return (
    <Container>
      <p className="pb-10 text-xs leading-6 text-[var(--hq-text-dim)]">
        Photography via Unsplash:{' '}
        {credited.map((photo, i) => (
          <span key={photo.src}>
            {i > 0 ? ', ' : null}
            <a
              href={photo.credit!.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-[var(--hq-text-muted)] hover:underline"
            >
              {photo.credit!.name}
            </a>
          </span>
        ))}
        .
      </p>
    </Container>
  );
}
