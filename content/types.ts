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
  | 'sun';

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
