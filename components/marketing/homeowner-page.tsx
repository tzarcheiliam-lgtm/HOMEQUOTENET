import Link from 'next/link';
import { Plus } from 'lucide-react';
import { site } from '@/content/site';
import {
  homeownerProjects,
  homeownersUpdated,
  homeownersUpdatedIso,
  type HomeownerProject,
} from '@/content/homeowners';
import { baseOpenGraph } from '@/lib/site-metadata';
import type { Metadata } from 'next';
import { Container, Cta, Disclosure, Section, SectionHeading } from './primitives';
import { FaqJsonLd } from './faq';

export const REFERRAL_DISCLOSURE = `${site.name} is a referral and appointment-setting service, not a contractor. We do not perform construction work.`;

export function homeownerMetadata(
  path: string,
  seo: { title: string; description: string }
): Metadata {
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, title: `${seo.title} · ${site.name}`, description: seo.description, url: `${site.url}${path}` },
    twitter: { card: 'summary_large_image', title: `${seo.title} · ${site.name}`, description: seo.description },
  };
}

export function HomeownerCta({ project }: { project?: HomeownerProject }) {
  return (
    <div className="flex flex-wrap gap-3">
      {project?.quizHref ? (
        <Cta href={project.quizHref}>{project.cta}</Cta>
      ) : (
        <a
          href={`tel:${site.contact.phoneHref}`}
          className="inline-flex h-13 items-center justify-center rounded-full bg-[var(--hq-cta)] px-7 py-3.5 text-[15px] font-semibold text-[var(--hq-cta-ink)] hover:bg-[var(--hq-cta-hover)]"
        >
          {project?.cta ?? 'Call'} · {site.contact.phone}
        </a>
      )}
      <Cta href="/adu-estimator" variant="secondary">
        ADU price estimator
      </Cta>
    </div>
  );
}

function Breadcrumb({ project }: { project: HomeownerProject }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[var(--hq-text-dim)]">
      <Link href="/homeowners" className="hover:text-[var(--hq-text)]">For homeowners</Link>
      <span aria-hidden="true"> / </span>
      <span>{project.navLabel}</span>
    </nav>
  );
}

export function HomeownerProjectPage({ project }: { project: HomeownerProject }) {
  const url = `${site.url}/homeowners/${project.slug}`;
  const breadcrumbJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'For homeowners', item: `${site.url}/homeowners` },
      { '@type': 'ListItem', position: 2, name: project.navLabel, item: url },
    ],
  };
  const pageJson = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: project.h1,
    description: project.seo.description,
    dateModified: homeownersUpdatedIso,
    isPartOf: { '@id': `${site.url}/#website` },
    publisher: { '@id': `${site.url}/#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }} />
      <FaqJsonLd items={project.faq} />

      <div className="border-b border-[var(--hq-line)]">
        <Container>
          <div className="max-w-3xl py-14 sm:py-20">
            <Breadcrumb project={project} />
            <Disclosure className="mt-6">{REFERRAL_DISCLOSURE}</Disclosure>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{project.h1}</h1>
            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">{project.answer}</p>
            <div className="mt-8">
              <HomeownerCta project={project} />
            </div>
          </div>
        </Container>
      </div>

      <Section>
        <div className="max-w-3xl">
          <SectionHeading title="What changes the price" />
          <ul className="mt-6 space-y-4">
            {project.drivers.map((d) => (
              <li key={d.title} className="leading-7 text-[var(--hq-text-muted)]">
                <strong className="text-[var(--hq-text)]">{d.title}.</strong> {d.body}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section className="border-t border-[var(--hq-line)]">
        <div className="max-w-3xl">
          <SectionHeading title="California rules and permits" lead={project.rules.intro} />
          <ul className="mt-6 list-disc space-y-3 pl-5 leading-7 text-[var(--hq-text-muted)]">
            {project.rules.items.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-[var(--hq-text-dim)]">
            Source:{' '}
            <a href={project.rules.source.href} className="underline underline-offset-4 hover:text-[var(--hq-text)]" rel="noopener noreferrer" target="_blank">
              {project.rules.source.label}
            </a>
            . Last checked {homeownersUpdated}.
          </p>
        </div>
      </Section>

      <Section className="border-t border-[var(--hq-line)]">
        <div className="max-w-3xl">
          <SectionHeading title="How HomeQuote Network works for homeowners" />
          <ol className="mt-6 list-decimal space-y-3 pl-5 leading-7 text-[var(--hq-text-muted)]">
            <li>You tell us about your project.</li>
            <li>We help set up a free, no-obligation conversation with a contractor that serves your area.</li>
            <li>The contractor, an independent business, gives you their own estimate. You decide whether to hire anyone.</li>
          </ol>
          <p className="mt-6 leading-7 text-[var(--hq-text-muted)]">
            {REFERRAL_DISCLOSURE} Contractors pay us for booked appointments, which is how the service is free to you.
          </p>
        </div>
      </Section>

      <Section className="border-t border-[var(--hq-line)]">
        <div className="max-w-3xl">
          <SectionHeading title="Common questions" />
          <div className="mt-6 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
            {project.faq.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] font-semibold leading-7 text-[var(--hq-text)]">{item.question}</span>
                  <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--hq-line-strong)] text-[var(--hq-text-muted)] transition-transform duration-200 group-open:rotate-45">
                    <Plus className="size-3.5" aria-hidden="true" />
                  </span>
                </summary>
                <p className="pb-6 pr-12 text-sm leading-7 text-[var(--hq-text-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-10">
            <HomeownerCta project={project} />
            {project.quizHref ? (
              <p className="mt-3 text-xs leading-6 text-[var(--hq-text-dim)]">
                The next step asks for your contact details and your consent to be contacted. Nothing is sent until you agree.
              </p>
            ) : null}
          </div>
          <p className="mt-10 text-sm text-[var(--hq-text-dim)]">
            By the {site.name} team. Last updated {homeownersUpdated}. Cost and timeline information is general guidance, not a quote.
          </p>
        </div>
      </Section>
    </>
  );
}

export { homeownerProjects };
