import type { Metadata } from 'next';
import { poolNiche } from '@/content/niches/pool';
import { site } from '@/content/site';
import { Hero } from '@/components/marketing/hero';
import {
  ProblemSection,
  ProcessSection,
  ServicesSection,
  WhySection,
  OptionsSection,
  FitSection,
  FinalCta,
} from '@/components/marketing/sections';
import { LeadStandardSection } from '@/components/marketing/lead-standard-section';
import { ProjectStrip } from '@/components/marketing/project-strip';
import { SystemPreview } from '@/components/marketing/system-preview';
import { AfterApplySection } from '@/components/marketing/after-apply';
import { FaqSection, FaqJsonLd } from '@/components/marketing/faq';
import { ProofPlaceholderSection } from '@/components/marketing/proof-placeholder';

export const metadata: Metadata = {
  title: 'Pool Remodeling Appointments, Booked On Your Calendar.',
  description: poolNiche.seo.description,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${site.name} — Booked Pool Remodeling Appointments`,
    description: poolNiche.seo.description,
    url: site.url,
  },
};

/** Organization schema. Only verifiable facts — no ratings, no counts. */
function OrganizationJsonLd() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.url,
    founder: { '@type': 'Person', name: site.founder },
    parentOrganization: { '@type': 'Organization', name: site.operator },
    areaServed: poolNiche.markets.areas.map((area) => ({
      '@type': 'AdministrativeArea',
      name: area,
    })),
    description: site.tagline,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <FaqJsonLd items={poolNiche.faq} />

      <Hero niche={poolNiche} />
      <ProjectStrip />
      <ProblemSection niche={poolNiche} />
      <ProcessSection niche={poolNiche} />
      <ServicesSection niche={poolNiche} />
      <LeadStandardSection />
      <WhySection niche={poolNiche} />
      <SystemPreview />
      <ProofPlaceholderSection />
      <OptionsSection />
      <FitSection niche={poolNiche} />
      <AfterApplySection />
      <FaqSection items={poolNiche.faq} />
      <FinalCta />
    </>
  );
}
