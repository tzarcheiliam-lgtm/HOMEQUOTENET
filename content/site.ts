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
  /** Registered entity. HomeQuote Network is its trade name (DBA). */
  legalName: 'Tzarchei Investments LLC',
  /** Sitewide referral-service disclosure (footer, homeowner pages). */
  tradeNameLine:
    'HomeQuote Network is a trade name of Tzarchei Investments LLC. We are a referral service, not a contractor.',
  tagline:
    'Qualified booked appointments for home-service contractors. Pay per appointment we set on your calendar.',

  /** Default <title> and link-preview title for any route without its own. */
  defaultTitle: 'HomeQuote Network | Qualified Contractor Leads',
  /** Default meta / Open Graph description for any route without its own. */
  description:
    'HomeQuote Network delivers qualified homeowner leads and booked estimate appointments to remodeling, roofing, fencing, HVAC and pool contractors across Southern California.',

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
    { label: 'For homeowners', href: '/homeowners' },
    { label: 'How it works', href: '/#how-it-works' },
    /* wideOnly: hidden in the desktop bar below 1280px, where the Industries
       menu needs the room. Always listed in the mobile sheet. */
    { label: 'Projects', href: '/#projects', wideOnly: true },
    { label: 'Appointment standards', href: '/lead-standards' },
    { label: 'Working together', href: '/#options', wideOnly: true },
    { label: 'FAQ', href: '/#faq', wideOnly: true },
  ],

  footerLinks: {
    company: [
      { label: 'About', href: '/about' },
      { label: 'Appointment standards', href: '/lead-standards' },
      { label: 'Contractor application', href: '/apply' },
    ],
    homeowners: [
      { label: 'All homeowner guides', href: '/homeowners' },
      { label: 'ADUs', href: '/homeowners/adu' },
      { label: 'Kitchen remodels', href: '/homeowners/kitchen-remodel' },
      { label: 'Bathroom remodels', href: '/homeowners/bathroom-remodel' },
      { label: 'Pool remodels', href: '/homeowners/pool-remodel' },
      { label: 'ADU price estimator', href: '/adu-estimator' },
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
    'Final qualification, duplicate, cancellation, rescheduling, no-show, replacement, and dispute terms are defined in each partner agreement.',
  pricing:
    'Pricing per booked appointment depends on project types, market, qualification requirements, and expected volume. Pricing is confirmed before launch.',
  systemPreview:
    'Example workflow — interface preview only. Not client data or reported results.',
} as const;
