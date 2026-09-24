import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { industries } from '@/content/industries';
import { Section, SectionHeading } from './primitives';
import { PoolPhoto } from './photo';

/**
 * Homepage industry cards. One per page in content/industries, so a new
 * industry shows up here as soon as it is added to that list.
 */
export function IndustriesSection() {
  return (
    <Section id="industries">
      <SectionHeading
        eyebrow="Industries"
        title="Built for the trades that sell big-ticket home projects."
        lead="The same system — demand, qualification, follow-up and booking — set up around the work your company actually does."
      />

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {industries.map((industry) => (
          <li key={industry.slug} className="sm:last:col-span-2 lg:last:col-span-1">
            <Link
              href={`/${industry.slug}`}
              className="hq-card hq-card-hover group flex h-full flex-col overflow-hidden"
            >
              <PoolPhoto
                photo={industry.imagery.hero}
                ratio="4 / 3"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 220px"
                className="rounded-none border-0 border-b border-[var(--hq-line)]"
                imgClassName={industry.imagery.heroPosition}
              />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-semibold text-[var(--hq-text)]">
                  {industry.navLabel}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-[var(--hq-text-muted)]">
                  {industry.cardDescription}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hq-accent-bright)]">
                  See how it works
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
