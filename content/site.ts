/**
 * Global, niche-independent site content.
 *
 * Everything a future niche page (fencing, roofing, ADUs, kitchens, baths,
 * outdoor living) shares lives here. Niche-specific copy lives in
 * `content/niches/*.ts` and is typed by `content/types.ts`.
 */

export const site = {
  name: 'HomeQuote Network',
  domain: 'www.homequotenetwork.com',
  url: 'https://www.homequotenetwork.com',
  founder: 'Liam Tzarchei',
  operator: 'Tzarchei Investments',
  tagline: 'Qualified homeowner leads for home-service contractors. Pay per valid lead.',

  contact: {
    email: 'homequotenetwork@gmail.com',
    phone: '747-217-5713',
    /** E.164, for tel: links. */
    phoneHref: '+17472175713',
    /** 30-minute contractor call. */
    booking: 'https://calendly.com/homequotenetwork/30min',
  },

  nav: [
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Projects', href: '/#projects' },
    { label: 'Lead standards', href: '/lead-standards' },
    { label: 'Working together', href: '/#options' },
    { label: 'FAQ', href: '/#faq' },
  ],

  footerLinks: {
    company: [
      { label: 'Pool contractors', href: '/pool-contractors' },
      { label: 'Lead standards', href: '/lead-standards' },
      { label: 'Contractor application', href: '/apply' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },

  cta: {
    primary: 'Check Lead Availability',
    primaryHref: '/apply',
    secondary: 'See How It Works',
    secondaryHref: '/#how-it-works',
    managed: 'Discuss Managed Growth',
    managedHref: '/apply?track=managed',
  },
} as const;

/**
 * Guards the form's fallback error message, which offers an email address to
 * fall back to. Never point a prospect at a placeholder inbox.
 */
export const hasRealContactEmail = !site.contact.email.includes('REPLACE_ME');

/**
 * Standing compliance rules for every page. These are deliberately blunt so
 * that future copy edits don't drift into claims the business can't support.
 */
export const disclaimers = {
  noGuarantee:
    'HomeQuote Network does not guarantee estimates, appointments, sales, revenue, or profitability. Contractors are responsible for contacting, estimating, and closing their own leads.',
  agreementGoverns:
    'Final qualification, duplicate, replacement, exclusivity, and dispute terms are defined in each partner agreement.',
  pricing:
    'Lead pricing depends on project types, market, qualification requirements, expected volume, and exclusivity. Pricing is confirmed before launch.',
  systemPreview:
    'Example workflow — interface preview only. Not client data or reported results.',
} as const;
