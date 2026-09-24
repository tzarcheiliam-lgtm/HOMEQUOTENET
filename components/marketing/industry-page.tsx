import type { Metadata } from 'next';
import type { IndustryPage } from '@/content/types';
import { site } from '@/content/site';
import {
  ProblemSection,
  ProcessSection,
  ServicesSection,
  WhySection,
  FinalCta,
} from './sections';
import { FaqSection, FaqJsonLd } from './faq';
import {
  IndustryHero,
  ResultsProofSection,
  AppointmentSettingSection,
  IndustryApplySection,
  PhotoCredits,
} from './industry-sections';

/** Title, description, canonical and Open Graph for an industry route. */
export function industryMetadata(industry: IndustryPage): Metadata {
  const url = `${site.url}/${industry.slug}`;
  return {
    title: industry.seo.title,
    description: industry.seo.description,
    alternates: { canonical: `/${industry.slug}` },
    openGraph: {
      title: `${industry.seo.title} · ${site.name}`,
      description: industry.seo.description,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${industry.seo.title} · ${site.name}`,
      description: industry.seo.description,
    },
  };
}

/** Service schema: what the page offers and to whom. No ratings or counts. */
function ServiceJsonLd({ industry }: { industry: IndustryPage }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: industry.seo.title,
    description: industry.seo.description,
    url: `${site.url}/${industry.slug}`,
    serviceType: 'Contractor lead generation and appointment setting',
    audience: { '@type': 'BusinessAudience', name: industry.navLabel },
    areaServed: { '@type': 'AdministrativeArea', name: 'Southern California' },
    provider: { '@type': 'Organization', name: site.name, url: site.url },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

/**
 * The shared ten-section industry landing page:
 * hero → pain points → how it works → services → proof → appointment setting
 * → why → application (CTA) → FAQ → final CTA.
 */
export function IndustryLandingPage({ industry }: { industry: IndustryPage }) {
  return (
    <>
      <ServiceJsonLd industry={industry} />
      <FaqJsonLd items={industry.faq} />

      <IndustryHero industry={industry} />
      <ProblemSection
        eyebrow="The problem"
        title={industry.pains.title}
        lead={industry.pains.lead}
        items={industry.pains.items}
      />
      <ProcessSection
        steps={industry.steps}
        title="One system, from first click to booked estimate."
        lead="Your service area, project types, qualification standard and pricing are agreed in writing before anything runs. Then the system works in four steps."
      />
      <ServicesSection
        items={industry.services.items}
        lead={industry.services.lead}
        gallery={industry.imagery.gallery}
      />
      <ResultsProofSection industry={industry} />
      <AppointmentSettingSection industry={industry} />
      <WhySection
        reasons={industry.reasons}
        photo={null}
        title={`Why ${industry.audience} use HomeQuote.`}
      />
      <IndustryApplySection industry={industry} />
      <FaqSection items={industry.faq} />
      <FinalCta
        photo={industry.imagery.hero}
        objectClassName={industry.imagery.heroPosition}
        title="See If Your Area Is Available."
        lead={`Tell us which ${industry.trade} projects you want, where you work, and how many more appointments your team can handle.`}
        ctaLabel={industry.cta}
        ctaHref="#apply"
      />
      <PhotoCredits industry={industry} />
    </>
  );
}
