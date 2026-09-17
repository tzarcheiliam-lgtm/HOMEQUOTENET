import Link from 'next/link';
import { ArrowRight, Check, Minus } from 'lucide-react';
import {
  validLeadCriteria,
  notPromised,
  guaranteeScope,
} from '@/content/lead-standards';
import { disclaimers } from '@/content/site';
import { photos } from '@/content/photos';
import { PoolPhoto } from './photo';
import { Section, SectionHeading, Disclosure } from './primitives';

/**
 * Homepage version of the booked-appointment standard. The full detail (dispute
 * process, what is confirmed before launch) lives on /lead-standards.
 */
export function LeadStandardSection() {
  return (
    <Section id="lead-standards">
      <SectionHeading
        eyebrow="Appointment standards"
        title="What counts as a qualified booked appointment?"
        lead="This is the part most arrangements leave vague. It is the first thing we put in writing, because it is the thing you are actually paying for."
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-[var(--hq-line)] bg-[var(--hq-line)]">
            {validLeadCriteria.map((item) => (
              <li key={item.title} className="bg-[var(--hq-bg-raised)] p-6">
                <div className="flex gap-4">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--hq-accent-glow)] text-[var(--hq-accent-bright)]">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--hq-text)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--hq-text-muted)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* The counterweight: what is explicitly not promised. */}
        <div className="lg:col-span-5">
          <div className="hq-card sticky top-24 p-8">
            <h3 className="text-base font-semibold text-[var(--hq-text)]">
              What we do not promise
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--hq-text-muted)]">
              A booked appointment is a scheduled opportunity. It is not a
              guaranteed attendance, estimate, or sale.
            </p>
            <ul className="mt-6 space-y-3">
              {notPromised.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-6 text-[var(--hq-text-muted)]"
                >
                  <Minus
                    className="mt-1.5 size-3 shrink-0 text-[var(--hq-text-dim)]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/lead-standards"
              className="mt-6 inline-flex items-center gap-2 py-2 text-sm font-semibold text-[var(--hq-accent-bright)] hover:underline"
            >
              Read the full appointment standard
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/*
        A detail shot, not a wide scene: the section is about precision, and a
        close frame of a water feature says that better than another backyard.
      */}
      <PoolPhoto
        photo={photos.fireWaterBowl}
        ratio="21 / 9"
        sizes="(max-width: 1024px) 92vw, 1120px"
        className="mt-12"
      />

      <Disclosure className="mt-8">{disclaimers.agreementGoverns}</Disclosure>
    </Section>
  );
}
