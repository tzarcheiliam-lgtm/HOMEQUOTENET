/**
 * Global, niche-independent site content.
 *
 * Everything a future niche page (fencing, roofing, ADUs, kitchens, baths,
 * outdoor living) shares lives here. Niche-specific copy lives in
 * `content/niches/*.ts` and is typed by `content/types.ts`.
 */

export const site = {
  name: 'HomeQuote Network',
  domain: 'homequotenet.com',
  url: 'https://homequotenet.com',
  founder: 'Liam Tzarchei',
  operator: 'Tzarchei Investments',
  tagline:
    'We run the marketing for home-service contractors: ads, landing pages, follow-up and reporting for a flat monthly management fee.',

  /** Default <title> and link-preview title for any route without its own. */
  defaultTitle: 'HomeQuote Network | Marketing for Home-Service Contractors',
  /** Default meta / Open Graph description for any route without its own. */
  description:
    'HomeQuote Network runs the marketing for pool, remodeling, roofing, fencing, HVAC and ADU contractors across Southern California: ads, landing pages, follow-up and reporting for a flat monthly management fee.',

  contact: {
    email: 'info@homequotenet.com',
    /** Second public address, shown beside `email`. */
    founderEmail: 'liam@homequotenet.com',
    phone: '747-217-5713',
    /** E.164, for tel: links. */
    phoneHref: '+17472175713',
    /**
     * 30-minute contractor call: the Check My Fit funnel, which books it on
     * HomeQuote's own sales calendar (lib/contractor-funnel/settings.server.ts).
     */
    booking: '/contractor-appointments/check-fit',
  },

  nav: [
    { label: 'What we run', href: '/#services' },
    { label: 'How it works', href: '/#how' },
    /* wideOnly: hidden in the desktop bar below 1280px, where the Industries
       menu needs the room. Always listed in the mobile sheet. */
    { label: 'Who it\u2019s for', href: '/#fit', wideOnly: true },
    { label: 'FAQ', href: '/#faq', wideOnly: true },
  ],

  footerLinks: {
    company: [
      { label: 'Contractor application', href: '/apply' },
      { label: 'Homeowners: book a visit', href: '/book' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },

  cta: {
    primary: 'Apply to Work With Us',
    /* Header-only: the short label keeps the nav on one line at 1024-1280px. */
    primaryShort: 'Apply',
    primaryHref: '/apply',
    secondary: 'See What We Run',
    secondaryHref: '/#services',
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
  /*
    Precise on purpose. We do book the appointment, so we cannot say
    "appointments are not guaranteed" — but attendance and outcomes are not ours
    to promise, and that line has to stay sharp.
  */
  noGuarantee:
    'HomeQuote Network does not guarantee closed jobs, revenue, lead volume, cost per lead, return on ad spend or profitability. Results depend on market conditions, pricing, availability and the contractor’s own sales process.',
  agreementGoverns:
    'Scope, fees, ad spend, term and cancellation are defined in each service agreement.',
  pricing:
    'Services are priced as a flat monthly management fee. Ad spend is paid separately, directly to the ad platform. Pricing is confirmed before launch.',
  systemPreview:
    'Example workflow — interface preview only. Not client data or reported results.',
} as const;
