/**
 * Campaign proof assets.
 *
 * These are screenshots of real HomeQuote Network campaign activity, kept
 * separate from content/photos.ts because that file is pool *project*
 * photography with its own positioning rules.
 *
 * RULE — nothing in this file may be extended with figures that are not
 * legible in the screenshot itself. The metrics below are transcribed from the
 * Meta Ads Manager view shown in `campaignSnapshot`; if the screenshot is
 * replaced, retranscribe them. Do not add conversion rates, close rates,
 * revenue or appointment counts that the image does not show.
 */

export type ProofImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export const proof = {
  /** Meta Ads Manager, last 30 days. Source: "CAMPAIGN SPEND.jpg". */
  campaignSnapshot: {
    src: '/images/proof/campaign-snapshot-meta-results.webp',
    width: 1365,
    height: 768,
    alt: 'HomeQuote Network campaign snapshot: a Meta Ads Manager report for August 17 to September 15, 2026 showing 450 pool-remodeling lead-form inquiries against $17,558.54 in ad spend across three ads.',
  },

  /** Illustrative week view. Source: "Lead Calendar Packed.png". */
  appointmentCalendar: {
    src: '/images/proof/example-appointment-calendar.webp',
    width: 1536,
    height: 1024,
    alt: 'Example contractor appointment calendar: a Monday-to-Friday week view with confirmed pool remodeling, resurfacing, tile and coping, equipment and backyard renovation estimates booked into morning and afternoon slots across Encino, Sherman Oaks, Woodland Hills, Thousand Oaks and Calabasas.',
  },
} as const satisfies Record<string, ProofImage>;

/**
 * The metrics shown in `campaignSnapshot`, transcribed. Nothing here is
 * computed, projected or rounded up.
 */
export const campaignSnapshotStats = [
  {
    value: '450',
    label: 'pool-remodeling inquiries',
    detail: 'Meta lead-form results over 30 days',
  },
  {
    value: '$17,558.54',
    label: 'ad spend',
    detail: 'Total spent across the ads in this report',
  },
  {
    value: '30 days',
    label: 'reporting window',
    detail: 'Aug 17 – Sep 15, 2026',
  },
] as const;

/** Stated wherever the snapshot appears. */
export const campaignSnapshotNote =
  'Figures are taken directly from the Meta Ads Manager report shown above, for August 17 – September 15, 2026. A lead-form inquiry is a homeowner enquiry, not a booked appointment. Past campaign activity is not a guarantee of future results, and results vary by market, budget and season.';
