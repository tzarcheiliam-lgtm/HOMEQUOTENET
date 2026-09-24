import type { Photo } from './photos';
import type { ServiceNicheKey } from '@/lib/validation/application';

/**
 * The shape of a vertical/niche. Adding fencing, roofing, ADUs, kitchens,
 * bathrooms, or outdoor living means adding one file in `content/niches/`
 * that satisfies this type — no new components required.
 */

export type ServiceCard = {
  /** Short, scannable name. */
  title: string;
  /** One line a contractor would recognise as their own work. */
  description: string;
  /** Lucide icon name, resolved in components/marketing/icon.tsx. */
  icon: IconName;
};

export type IconName =
  | 'waves'
  | 'paintRoller'
  | 'grid'
  | 'settings'
  | 'layers'
  | 'squareStack'
  | 'sparkles'
  | 'trees'
  | 'sun'
  // General contracting
  | 'house'
  | 'chefHat'
  | 'bath'
  | 'building'
  | 'warehouse'
  | 'ruler'
  | 'hammer'
  | 'construction'
  // Roofing
  | 'droplets'
  | 'cloudRain'
  | 'clipboardCheck'
  | 'wrench'
  // Fencing
  | 'fence'
  | 'doorOpen'
  | 'arrowLeftRight'
  | 'shield'
  | 'columns'
  // HVAC
  | 'snowflake'
  | 'flame'
  | 'thermometer'
  | 'fan'
  | 'airVent'
  | 'wind'
  | 'leaf'
  | 'gauge';

/*
  NOTE: the industry landing pages (/pool-contractors, /roofing, …) are typed
  by `IndustryPage` at the bottom of this file. `Niche` remains the model the
  homepage renders from.
*/

export type FaqItem = {
  question: string;
  answer: string;
};

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

export type FitList = {
  fit: string[];
  notFit: string[];
};

export type Niche = {
  /** URL segment, e.g. "pool-contractors". */
  slug: string;
  /** Internal key. */
  key: string;
  /** e.g. "Pool Remodeling" */
  label: string;
  /** e.g. "pool remodeling contractors" */
  audience: string;

  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    support: string;
    trustLine: string;
  };

  /** Counties / metros the programme currently covers. */
  markets: {
    region: string;
    areas: string[];
    note: string;
  };

  problems: { title: string; description: string }[];
  process: ProcessStep[];
  services: ServiceCard[];
  reasons: { title: string; description: string }[];
  audienceFit: FitList;
  faq: FaqItem[];

  seo: {
    title: string;
    description: string;
  };
};

/* ---- Industry landing pages -------------------------------------------- */

/**
 * One industry landing page (/pool-contractors, /general-contractors,
 * /roofing, /fencing, /hvac). Every section component on those pages takes
 * this object, so adding an industry is one file in `content/industries/`
 * plus a four-line route file.
 */
export type IndustryPage = {
  /** Key into SERVICES_BY_NICHE in lib/validation/application.ts. */
  key: ServiceNicheKey;
  /** URL segment, without the slash. */
  slug: string;
  /** Industries menu, footer, and homepage card label. */
  navLabel: string;
  /** One line under the homepage card title. */
  cardDescription: string;
  /** Lower-case trade noun used inside sentences, e.g. "roofing". */
  trade: string;
  /** Plural buyer, e.g. "roofing companies". */
  audience: string;

  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    support: string;
  };

  /** The page's one CTA label, e.g. "Get More Roofing Appointments". */
  cta: string;

  pains: {
    title: string;
    lead: string;
    items: { title: string; description: string }[];
  };

  steps: ProcessStep[];

  services: {
    lead: string;
    items: ServiceCard[];
  };

  /** Trade-specific line in the "We don't stop at the lead" section. */
  appointmentNote: string;

  reasons: { title: string; description: string }[];
  faq: FaqItem[];

  imagery: {
    hero: Photo;
    /** Tailwind object-position classes for the hero crop. */
    heroPosition: string;
    gallery: [Photo, Photo, Photo];
    /** Stated under the hero photo. */
    disclosure: string;
  };

  seo: {
    title: string;
    description: string;
    /** Two-line social card text. */
    ogHeadline: string;
    ogSubline: string;
  };
};
