import { ArrowRight, CalendarCheck } from 'lucide-react';
import { proof, campaignSnapshotStats, campaignSnapshotNote } from '@/content/proof';
import { site } from '@/content/site';
import { Section, SectionHeading, Cta, Eyebrow } from './primitives';
import { ExpandableImage } from './expandable-image';

/**
 * CAMPAIGN SNAPSHOT
 *
 * Sits immediately under the hero, because the first question a contractor has
 * after the pitch is "show me". The numbers are set as large type above the
 * screenshot rather than only inside it: on a phone the Ads Manager table is
 * far too dense to read at section width, so the figures have to survive on
 * their own, with the screenshot underneath as the thing that substantiates
 * them. Every figure here is transcribed from that screenshot — see the rule in
 * content/proof.ts before adding anything.
 */
export function CampaignSnapshotSection() {
  return (
    <Section
      id="campaign-snapshot"
      className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)]"
    >
      <SectionHeading
        eyebrow="Real campaign snapshot"
        title="Get in Front of Homeowners Looking to Remodel Their Pool."
        lead="We run the ads and pay for the traffic. This is one of our own pool-remodeling campaigns, exactly as it reads in Meta Ads Manager."
      />

      {/*
        Three stat cards on desktop, stacked on a phone. The value is set at a
        size that stays legible at 320px, and the reporting window is carried as
        a stat of its own so the dates are never separated from the figures.
      */}
      <dl className="mt-12 grid gap-4 sm:grid-cols-3">
        {campaignSnapshotStats.map((stat) => (
          <div key={stat.label} className="hq-card p-6 sm:p-7">
            <dt className="text-sm font-semibold text-[var(--hq-text-muted)]">
              {stat.label}
            </dt>
            <dd className="mt-2 text-[2rem] font-semibold leading-none tracking-tight text-[var(--hq-text)] sm:text-[2.25rem]">
              {stat.value}
            </dd>
            <p className="mt-3 text-sm leading-6 text-[var(--hq-text-dim)]">
              {stat.detail}
            </p>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <ExpandableImage
          image={proof.campaignSnapshot}
          sizes="(max-width: 1024px) 100vw, 1024px"
          label="Expand the Meta Ads Manager campaign snapshot"
          caption="Meta Ads Manager, Aug 17 – Sep 15, 2026. Tap to expand and read the full report."
        />
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-6 text-[var(--hq-text-dim)]">
        {campaignSnapshotNote}
      </p>
    </Section>
  );
}

/**
 * INTERESTED HOMEOWNER → BOOKED ESTIMATE
 *
 * The section that turns the inquiry count above into the thing a contractor
 * is actually buying. Two columns on desktop with the calendar carrying the
 * right-hand side; on a phone the definition has to be read first, so the text
 * stacks above the image.
 */
export function BookedEstimateSection() {
  return (
    <Section id="booked-estimate">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Text first in the DOM, so mobile stacks it above the calendar. */}
        <div>
          <Eyebrow>What you receive</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--hq-text)] sm:text-4xl">
            From Interested Homeowner to Booked Estimate.
          </h2>
          <p className="mt-5 text-pretty text-base leading-7 text-[var(--hq-text-muted)] sm:text-lg sm:leading-8">
            A booked appointment means a homeowner who makes the decisions,
            wants a pool remodeling project, and has agreed to a specific day
            and time. They&rsquo;re expecting you to discuss their project.
          </p>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 px-4 py-3.5">
            <CalendarCheck
              className="mt-0.5 size-4 shrink-0 text-[var(--hq-accent-bright)]"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-[var(--hq-text-muted)]">
              Appointments are booked against your service area, your project
              categories and the hours you are willing to run estimates.
            </p>
          </div>
        </div>

        <ExpandableImage
          image={proof.appointmentCalendar}
          sizes="(max-width: 1024px) 100vw, 512px"
          label="Expand the example appointment calendar"
          caption="Example appointment calendar."
        />
      </div>

      <div className="mt-12 flex flex-col gap-4 border-t border-[var(--hq-line)] pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base leading-7 text-[var(--hq-text-muted)]">
          Coverage is limited to one contractor per category per area.
        </p>
        <Cta href={site.cta.primaryHref} className="self-start sm:self-auto">
          Check Availability in Your Area
          <ArrowRight className="size-4" />
        </Cta>
      </div>
    </Section>
  );
}
