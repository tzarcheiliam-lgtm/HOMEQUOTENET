/**
 * Link-preview wording for homeowner funnels (/estimate/[slug]).
 *
 * The site-wide Open Graph card says "Qualified Contractor Leads", which is the
 * contractor pitch. A homeowner funnel shared in an ad or a message should
 * look like what the homeowner is about to do, so bathroom and kitchen funnels
 * get their own card. Any other funnel keeps the site-wide card.
 */
export type FunnelPreview = { headline: string; subline: string; chips: string[]; alt: string };

const CHIPS = ['Southern California', 'Free estimate request'];

const KINDS = {
  bathroom: {
    headline: 'Planning a Bathroom Remodel?',
    subline: 'Get a free estimate from a local pro',
    chips: CHIPS,
    alt: 'Planning a bathroom remodel? Get a free estimate from a local pro. HomeQuote Network',
  },
  kitchen: {
    headline: 'Planning a Kitchen Remodel?',
    subline: 'Get a free estimate from a local pro',
    chips: CHIPS,
    alt: 'Planning a kitchen remodel? Get a free estimate from a local pro. HomeQuote Network',
  },
} satisfies Record<string, FunnelPreview>;

/** Bathroom or kitchen, judged from the funnel's industry and slug. Null for everything else. */
export function funnelPreview(industry: string | null | undefined, slug: string): FunnelPreview | null {
  const text = `${industry ?? ''} ${slug}`.toLowerCase();
  const bath = /bath/.test(text);
  const kitchen = /kitchen/.test(text);
  // A funnel that mentions both (e.g. "Kitchen & bath") is not one or the other: keep the generic card.
  if (bath === kitchen) return null;
  return bath ? KINDS.bathroom : KINDS.kitchen;
}
