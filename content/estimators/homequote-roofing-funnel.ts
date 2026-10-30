import type { FunnelPhoto, FunnelSpec, FunnelStep } from '@/lib/estimator/funnel/types';
import type { RoofMaterial } from '@/lib/estimator/roofing/pricing-config';
import { ROOF_COLORS, colorQuestionId } from '@/lib/estimator/templates/roofing';

/*
 * HomeQuote Network's roof replacement funnel (experience 'funnel'): the
 * bathroom / kitchen shape, with one screen first that is theirs alone:
 *
 * 1. "Where's your home?" (FunnelSpec.addressFirst): the Google address
 *    field; the server measures the roof from above (Google Solar API: sloped
 *    area, pitch, sections) and shows "We found your roof." with Google's
 *    unmodified satellite photo. No measurement (no coverage, no key): "How
 *    big is your home?" (three bands) instead. Not asked again on the contact step.
 * 2. "Choose your roof." Asphalt shingle · Tile · Standing-seam metal.
 * 3. "Choose your colour." three colours of the picked material (one colour
 *    step per material, shown only for its material).
 * Then the contact step and the booking step, where "See it on your house"
 * repaints the roof on a photo they take of their own home (kie.ai, after the
 * lead is saved: the render route's per-lead / per-visitor / daily limits).
 *
 * Prices: ../../lib/estimator/roofing/pricing-config.ts (examples). The lead
 * route prices the verified measurement (or the band); the picks only choose
 * the material.
 *
 * HomeQuote Network is a contractor-matching network, not a contractor: no
 * licence, years, "we build" words or reviews of its own.
 *
 * Photos: public/estimator/roofing/funnel/roof-<material>-<colour>.webp
 * (+ -sm), every one an edit of ONE master house photo so it is the same home
 * with a new roof (scripts/generate-roofing-funnel-photos.mjs). Until a file
 * exists the step shows a drawing of the same house in that roof
 * (public/estimator/roofing/placeholder/, scripts/roofing-placeholders.py).
 */

const DIR = '/estimator/roofing/funnel/';
const DRAWINGS = '/estimator/roofing/placeholder/';

const MATERIAL_WORDS: Record<RoofMaterial, string> = {
  asphalt: 'architectural asphalt shingles',
  tile: 'concrete roof tile',
  metal: 'a standing-seam metal roof',
};

/** The colour a material step shows (its first colour). */
const FIRST_COLOR: Record<RoofMaterial, string> = { asphalt: 'charcoal', tile: 'terracotta', metal: 'matte_black' };

/** The house with this roof: the photo, and the drawing of the same house while the photo does not exist. */
function roofPhoto(material: RoofMaterial, color: string): FunnelPhoto {
  const label = ROOF_COLORS[material].find((c) => c.id === color)?.label.toLowerCase() ?? color;
  const key = `roof-${material}-${color}`;
  return {
    src: `${DIR}${key}.webp`,
    srcSm: `${DIR}${key}-sm.webp`,
    alt: `A Southern California home with a new ${label} roof of ${MATERIAL_WORDS[material]} (AI-generated example design)`,
    fallback: { src: `${DRAWINGS}${material}-${color}.svg`, alt: `Drawing of a home with a ${label} roof of ${MATERIAL_WORDS[material]}` },
  };
}

/** "Choose your colour." for one material, shown only when that material is picked. */
function colorStep(material: RoofMaterial): FunnelStep {
  return {
    id: colorQuestionId(material),
    label: 'Choose your colour.',
    showWhen: { stepId: 'material', anyOf: [material] },
    defaultOption: FIRST_COLOR[material],
    options: ROOF_COLORS[material].map((c) => ({ id: c.id, title: c.label, subtitle: c.note ?? '', answers: { [colorQuestionId(material)]: [c.id] } })),
    photo: { kind: 'option', photos: Object.fromEntries(ROOF_COLORS[material].map((c) => [c.id, roofPhoto(material, c.id)])) },
  };
}

export const HOMEQUOTE_ROOFING_FUNNEL: FunnelSpec = {
  landing: {
    announcement: 'Matched with licensed local roofing pros',
    headline: 'Your new roof, priced in 60 seconds',
    subline: 'Enter your address, we measure your roof from above, you pick the look. Then a free inspection with a licensed local roofer.',
    cta: 'Price my roof',
    heroPhoto: { src: `${DIR}roof-tile-terracotta.webp`, srcSm: `${DIR}roof-tile-terracotta-sm.webp` },
    heroAlt: 'A Southern California home with a new terracotta tile roof (AI-generated example design)',
    heroFallback: { src: '/images/roofing/spanish-tile-roof-stucco-home.webp', alt: 'Stucco home with a Spanish tile roof (illustrative stock photo)' },
    logo: { aspect: 1200 / 283 },
  },
  addressFirst: {
    kind: 'roof',
    label: 'Where’s your home?',
    subline: 'We’ll measure your roof from above.',
    cta: 'Find my roof',
    foundLabel: 'We found your roof.',
    bandLabel: 'How big is your home?',
    notFoundText: 'We couldn’t measure this roof from above, so we’ll size it from your home.',
    photo: {
      src: `${DIR}house-before.webp`,
      srcSm: `${DIR}house-before-sm.webp`,
      alt: 'A Southern California home with an old, worn roof (AI-generated example)',
      fallback: { src: '/images/roofing/new-home-dark-shingle-roof.webp', alt: 'Home with a dark shingle roof (illustrative stock photo)' },
    },
  },
  steps: [
    {
      id: 'material',
      label: 'Choose your roof.',
      defaultOption: 'asphalt',
      options: [
        { id: 'asphalt', title: 'Asphalt shingle', subtitle: 'Architectural shingles, the most popular', answers: { material: ['asphalt'] } },
        { id: 'tile', title: 'Tile', subtitle: 'Concrete tile, the classic California look', answers: { material: ['tile'] } },
        { id: 'metal', title: 'Standing-seam metal', short: 'Metal', subtitle: 'Clean lines, lasts the longest', answers: { material: ['metal'] } },
      ],
      photo: {
        kind: 'option',
        photos: { asphalt: roofPhoto('asphalt', 'charcoal'), tile: roofPhoto('tile', 'terracotta'), metal: roofPhoto('metal', 'matte_black') },
      },
    },
    colorStep('asphalt'),
    colorStep('tile'),
    colorStep('metal'),
  ],
  finalCta: 'Get my estimate',
  baseAnswers: { project: ['replace'], size: ['medium'] },
  // House photos whole, on a blurred copy of themselves (3:2 photos in a wider card).
  photoFrame: { fit: 'contain', zoom: 1, backdrop: 'blur' },
  contactStep: {
    eyebrow: 'Last step',
    headline: 'Your estimate is ready.',
    subline: 'Where should we send it?',
    cta: 'Get my estimate',
    homeowner: { label: 'Are you the homeowner?', yes: 'Yes', no: 'No' },
    trustLine: 'Free roof inspection · Licensed local roofers · No obligation',
  },
  bookingStep: {
    headline: 'Book your free call',
    priceEyebrow: '{options}',
    priceNote: 'Ballpark price, not a quote. A licensed local roofer sets your firm price after a free inspection.',
    bookingTitle: 'A quick {minutes}-minute call. {host} will call you at the time you pick.',
    noRangeText: 'Priced at your free roof inspection',
    followUpText: 'A HomeQuote project specialist will call you shortly to talk through your roof and set up a free inspection with a licensed local roofer.',
    reviewText: 'We book free inspections online with homeowners. Your details are saved, and the {name} team will review them before we can confirm a fit.',
  },
  designRecap: { label: 'Your roof' },
  photoNote: 'Photos are AI-generated example designs, not finished projects. Satellite imagery © Google.',
  designDescription: 'Enter your address, pick your roof, and get a ballpark price for your {noun} and a free inspection with a licensed local roofer, through {name}.',
};
