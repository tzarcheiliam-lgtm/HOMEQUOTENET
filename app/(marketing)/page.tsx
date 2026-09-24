import type { Metadata } from 'next';
import { homeContent, homePhotos } from '@/content/home';
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
import { IndustriesSection } from '@/components/marketing/industries-section';
import { SystemPreview } from '@/components/marketing/system-preview';
import { AfterApplySection } from '@/components/marketing/after-apply';
import { FaqSection, FaqJsonLd } from '@/components/marketing/faq';
import { ProofPlaceholderSection } from '@/components/marketing/proof-placeholder';
import {
  CampaignSnapshotSection,
  BookedEstimateSection,
} from '@/components/marketing/campaign-proof';

export const metadata: Metadata = {
  title: homeContent.seo.title,
  description: homeContent.seo.description,
  alternates: { canonical: '/' },
  openGraph: {
    title: `${site.name} — ${homeContent.seo.title}`,
    description: homeContent.seo.description,
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
    areaServed: homeContent.markets.areas.map((area) => ({
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
      <FaqJsonLd items={homeContent.faq} />

      <Hero
        niche={homeContent}
        photo={homePhotos.hero}
        objectClassName={homePhotos.heroPosition}
        disclosure={homePhotos.disclosure}
      />
      <CampaignSnapshotSection />
      <BookedEstimateSection />
      <ProjectStrip
        {...homePhotos.strip}
        caption="Kitchens and baths, additions and whole-home remodels, plus roofing, HVAC, fencing and pools. You choose the categories we book for you."
      />
      <IndustriesSection />
      <ProblemSection items={homeContent.problems} />
      <ProcessSection steps={homeContent.process} />
      <ServicesSection items={homeContent.services} />
      <LeadStandardSection photo={homePhotos.standards} />
      <WhySection reasons={homeContent.reasons} photo={homePhotos.why} />
      <SystemPreview />
      <ProofPlaceholderSection />
      <OptionsSection />
      <FitSection niche={homeContent} />
      <AfterApplySection />
      <FaqSection items={homeContent.faq} />
      <FinalCta photo={homePhotos.finalCta} objectClassName="object-[50%_50%]" />
    </>
  );
}
