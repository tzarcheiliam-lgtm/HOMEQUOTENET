import type { FunnelPhoto, FunnelPhotoVariant, FunnelSpec } from '@/lib/estimator/funnel/types';

/*
 * HomeQuote Network's simple mobile ADU funnel (experience 'funnel'): the
 * kitchen / bathroom shape (./homequote-kitchen-funnel.ts) for ADUs. A landing
 * page, three taps (two for a garage conversion), the contact step and the
 * booking step.
 *
 * - Type: Detached backyard ADU · Garage conversion · Attached addition ->
 *   the template's project (= the "adu" funnel's service values).
 * - Size (not for a garage conversion, always a studio): Studio (~400 sq ft) ·
 *   1 bedroom (~600) · 2 bedrooms (~800) -> small / medium / large.
 * - Finish: Standard / Luxe (every room's top finish; a 2 bed's bigger Luxe
 *   upgrade is the hidden luxe2bed answer).
 *
 * Prices: lib/adu/pricing-config.ts through lib/estimator/templates/adu.ts,
 * examples while pricesConfirmed is false.
 *
 * HomeQuote Network is a contractor-matching network, not a builder: no
 * licence, years or "we build" words; no reviews (it has none of its own).
 *
 * Photos (public/estimator/adu/funnel/<key>.webp + <key>-sm.webp,
 * scripts/generate-adu-funnel-photos.mjs): ONE house and backyard seen by the
 * same drone in the same light, and every photo on a path is an edit of the
 * photo the previous step showed, so the homeowner watches their own ADU take
 * shape (like the pool funnel). Every reachable combination has its own exact
 * photo; a pick that changes nothing (the 1 bed after the type step, which
 * shows the 1 bed; Standard after the size step, which shows Standard) keeps
 * the same photo. No fallbacks to another scene.
 */

const DIR = '/estimator/adu/funnel/';

type Kind = 'detached' | 'attached';
type Size = 'studio' | '1bed' | '2bed';

const photo = (key: string, alt: string): FunnelPhoto => ({ src: `${DIR}${key}.webp`, srcSm: `${DIR}${key}-sm.webp`, alt });

const KIND_WORDS: Record<Kind | 'garage', string> = {
  detached: 'A new detached backyard ADU',
  attached: 'A new single-story addition joined to the back of the house',
  garage: 'The garage converted into a studio ADU',
};
const SIZE_WORDS: Record<Size, string> = { studio: 'studio, about 400 sq ft', '1bed': 'one bedroom, about 600 sq ft', '2bed': 'two bedrooms, about 800 sq ft' };
const STANDARD_WORDS = 'stucco to match the house, white windows and a shingle roof';
const LUXE_WORDS = 'cedar siding, black-framed windows, a standing-seam metal roof and a small wood deck';

/** The standard ADU at a size: the type step's photo for the 1 bed, else its own size photo. */
function sizedPhoto(kind: Kind, size: Size): FunnelPhoto {
  return photo(size === '1bed' ? `type-${kind}` : `size-${kind}-${size}`, `${KIND_WORDS[kind]} (${SIZE_WORDS[size]}) with ${STANDARD_WORDS} (AI-generated example design)`);
}

function luxePhoto(kind: Kind, size: Size): FunnelPhoto {
  return photo(`finish-${kind}-${size}-luxe`, `${KIND_WORDS[kind]} (${SIZE_WORDS[size]}) with ${LUXE_WORDS} (AI-generated example design)`);
}

const GARAGE_STANDARD = photo('type-garage', `${KIND_WORDS.garage} with ${STANDARD_WORDS} (AI-generated example design)`);
const GARAGE_LUXE = photo('finish-garage-luxe', `${KIND_WORDS.garage} with ${LUXE_WORDS} (AI-generated example design)`);

const KINDS: Kind[] = ['detached', 'attached'];
const SIZES: Size[] = ['studio', '1bed', '2bed'];

/** Size step: the chosen type at each size. */
const SIZE_VARIANTS: FunnelPhotoVariant[] = KINDS.flatMap((type) => SIZES.map((size) => ({ when: { size, type }, photo: sizedPhoto(type, size) })));

/** Finish step: the exact ADU so far, Standard (the size step's photo) or Luxe (an edit of it). */
const FINISH_VARIANTS: FunnelPhotoVariant[] = [
  ...KINDS.flatMap((type) =>
    SIZES.flatMap((size) => [
      { when: { finish: 'standard', type, size }, photo: sizedPhoto(type, size) },
      { when: { finish: 'luxe', type, size }, photo: luxePhoto(type, size) },
    ]),
  ),
  // A garage conversion has no size step (always a studio).
  { when: { finish: 'standard', type: 'garage' }, photo: GARAGE_STANDARD },
  { when: { finish: 'luxe', type: 'garage' }, photo: GARAGE_LUXE },
];

export const HOMEQUOTE_ADU_FUNNEL: FunnelSpec = {
  landing: {
    // Truthful network line: HomeQuote matches homeowners with licensed local builders (it is not one).
    announcement: 'Matched with licensed local ADU builders',
    headline: 'Backyard ADUs, designed just for you',
    subline: 'Design your ADU in 60 seconds and get a ballpark price, with a free consultation.',
    cta: 'Design your ADU',
    heroPhoto: { src: `${DIR}finish-detached-1bed-luxe.webp`, srcSm: `${DIR}finish-detached-1bed-luxe-sm.webp` },
    heroAlt: 'A new detached backyard ADU with cedar siding, black-framed windows and a metal roof, behind a single-story house (AI-generated example design)',
    // The current HomeQuote horizontal logo, cropped to the artwork so it reads at header size.
    logo: { aspect: 1200 / 283 },
    // No projects (the network has no jobs of its own) and no reviews (none of its own to show).
  },
  steps: [
    {
      id: 'type',
      label: 'What would you like to build?',
      defaultOption: 'detached',
      options: [
        { id: 'detached', title: 'Detached backyard ADU', short: 'Detached ADU', subtitle: 'A new home of its own in the yard', answers: { project: ['detached'] } },
        // Always a studio: the garage keeps its footprint (the size step is skipped).
        { id: 'garage', title: 'Garage conversion', subtitle: 'Turn the garage into a studio', answers: { project: ['garage'], size: ['small'] } },
        { id: 'attached', title: 'Attached addition', subtitle: 'New rooms joined to the house', answers: { project: ['attached'] } },
      ],
      // Each type at 1 bed (a garage: the studio), standard finish, on the same lot.
      photo: {
        kind: 'option',
        photos: {
          detached: sizedPhoto('detached', '1bed'),
          garage: GARAGE_STANDARD,
          attached: sizedPhoto('attached', '1bed'),
        },
      },
    },
    {
      id: 'size',
      label: 'Choose your size.',
      showWhen: { stepId: 'type', anyOf: ['detached', 'attached'] },
      defaultOption: '1bed',
      options: [
        { id: 'studio', title: 'Studio', subtitle: 'About 400 sq ft', answers: { size: ['small'] } },
        { id: '1bed', title: '1 bedroom', subtitle: 'About 600 sq ft', answers: { size: ['medium'] } },
        { id: '2bed', title: '2 bedrooms', subtitle: 'About 800 sq ft', answers: { size: ['large'] } },
      ],
      photo: { kind: 'variants', by: [{ stepId: 'type' }], photos: SIZE_VARIANTS },
    },
    {
      id: 'finish',
      label: 'Choose your finish.',
      options: [
        { id: 'standard', title: 'Standard', subtitle: 'Stucco, white windows, shingle roof', answers: { finish: ['standard'], luxe2bed: ['no'] } },
        { id: 'luxe', title: 'Luxe', subtitle: 'Cedar siding, black windows, metal roof, top finishes inside', answers: { finish: ['luxe'], luxe2bed: ['yes'] } },
      ],
      photo: { kind: 'variants', by: [{ stepId: 'type' }, { stepId: 'size', ordered: true }], photos: FINISH_VARIANTS },
    },
  ],
  finalCta: 'Get my estimate',
  // Every photo is the same 3:2 drone view, shown whole on a blurred copy of itself.
  photoFrame: { fit: 'contain', zoom: 1, backdrop: 'blur' },
  contactStep: {
    eyebrow: 'Last step',
    headline: 'Your estimate is ready.',
    subline: 'Where should we send it?',
    cta: 'Get my estimate',
    homeowner: { label: 'Are you the homeowner?', yes: 'Yes', no: 'No' },
    // Facts about the service only (never a licence or years of the network's own).
    trustLine: 'Free consultation · Licensed local builders · No obligation',
  },
  bookingStep: {
    headline: 'Book your free call',
    priceEyebrow: '{options}',
    priceNote: 'Ballpark price, not a quote. A licensed local ADU builder sets your firm price after a free consultation and a look at your lot.',
    // {minutes} / {host} come from the HomeQuote team calendar: "A quick 10-minute call. Liam from HomeQuote will call you ...".
    bookingTitle: 'A quick {minutes}-minute call. {host} will call you at the time you pick.',
    noRangeText: 'Priced at your free consultation',
    followUpText: 'A HomeQuote project specialist will call you shortly to talk through your ADU and set up a free consultation with a licensed local builder.',
    reviewText: 'We book free consultations online with homeowners. Your details are saved, and the {name} team will review them before we can confirm a fit.',
  },
  // "Your design: Detached ADU · 1 bedroom · Luxe" under the photo from step 2 on (the ADU they are building).
  designRecap: { label: 'Your design' },
  photoNote: 'Photos are AI-generated example designs, not finished projects.',
  designDescription: 'Three quick picks, then a ballpark price for your {noun} and a free consultation with a licensed local builder, through {name}.',
};
