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
    'Qualified booked appointments for home-service contractors. Pay per appointment we set on your calendar.',

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
    { label: 'Appointment standards', href: '/lead-standards' },
    { label: 'Working together', href: '/#options' },
    { label: 'FAQ', href: '/#faq' },
  ],

  footerLinks: {
    company: [
      { label: 'Pool contractors', href: '/pool-contractors' },
      { label: 'Appointment standards', href: '/lead-standards' },
      { label: 'Contractor application', href: '/apply' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },

  cta: {
    primary: 'Check Appointment Availability',
    /*
      Header-only. The full label pushes the nav onto two lines at 1024-1280px
      once "Appointment standards" is in the bar; in the header the surrounding
      nav already supplies the context.
    */
    primaryShort: 'Check Availability',
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
  /*
    Precise on purpose. We do book the appointment, so we cannot say
    "appointments are not guaranteed" — but attendance and outcomes are not ours
    to promise, and that line has to stay sharp.
  */
  noGuarantee:
    'HomeQuote Network does not guarantee attendance, estimates, sales, revenue, or profitability. We guarantee that anything billed as a booked appointment met the agreed qualification and scheduling standard when delivered. Attending the appointment, estimating, and closing the job are the contractor’s responsibility.',
  agreementGoverns:
    'Final qualification, duplicate, cancellation, rescheduling, no-show, replacement, exclusivity, and dispute terms are defined in each partner agreement.',
  pricing:
    'Pricing per booked appointment depends on project types, market, qualification requirements, expected volume, and exclusivity. Pricing is confirmed before launch.',
  systemPreview:
    'Example workflow — interface preview only. Not client data or reported results.',
} as const;
