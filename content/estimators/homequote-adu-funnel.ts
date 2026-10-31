import type { FunnelPhoto, FunnelPhotoVariant, FunnelSpec } from '@/lib/estimator/funnel/types';
import { ADU_MODELS, type AduModel, upgradeAnswers } from '@/lib/estimator/templates/adu';

/*
 * HomeQuote Network's simple mobile ADU funnel (experience 'funnel'), in
 * Buildoly's quote-flow format (buildoly.com/design): "STEP n OF 5", a photo
 * card, one question, white option cards (title + grey line), Continue.
 *
 * 1. "Select a model.": Studio · One bedroom · Two bedroom · Three bedroom ·
 *    Garage conversion (HomeQuote gets those leads too). Photo: a furnished 3D
 *    cutaway of the model with the roof off: the same building the finish step shows (its footprint, front door, windows and path), all in one style.
 * 2. "Choose your finish.": Standard / Luxe. Photo: THAT model built in the
 *    same backyard (same house, drone and light), Standard or Luxe.
 * 3. "Design your kitchen.": Standard / Upgraded. Photo: the inside of the
 *    same ADU, its Standard or Luxe finish (white vs black window frames).
 * 4. "Design your bathroom.": Standard / Upgraded. Photo: the bathroom of the
 *    same ADU in its finish.
 * 5. "Choose your storage.": Standard / More closet space, only for a model
 *    with a bedroom; a studio or garage conversion is four steps.
 *
 * Every option maps to template answers (lib/estimator/templates/adu.ts), so
 * computeEstimate prices it from lib/adu/pricing-config.ts and the lead route
 * re-prices it from the picks alone. Prices are examples while
 * pricesConfirmed is false.
 *
 * HomeQuote Network is a contractor-matching network, not a builder: no
 * licence, years or "we build" words; no reviews (it has none of its own).
 *
 * Photos: public/estimator/adu/funnel/<key>.webp + <key>-sm.webp
 * (scripts/generate-adu-funnel-photos.mjs). Every reachable combination has its
 * own exact photo, each an edit of the photo it follows in its chain; no
 * fallbacks to another scene.
 */

const DIR = '/estimator/adu/funnel/';

const photo = (key: string, alt: string): FunnelPhoto => ({ src: `${DIR}${key}.webp`, srcSm: `${DIR}${key}-sm.webp`, alt });

const MODEL_WORDS: Record<AduModel, string> = {
  studio: 'studio ADU, about 350 sq ft',
  '1bed': 'one-bedroom ADU, about 500 sq ft',
  '2bed': 'two-bedroom ADU, about 750 sq ft',
  '3bed': 'three-bedroom ADU, about 1,000 sq ft',
  garage: 'garage converted to a studio, about 400 sq ft',
};
const STANDARD_WORDS = 'stucco, white windows and a shingle roof';
// Minimal (owner: the first luxe, with cedar and a deck, was too much): the same house, three changes.
const LUXE_WORDS = 'smooth white stucco, black windows and door and a slim standing-seam metal roof';

/** Step 1: the model as a furnished 3D cutaway (roof off) of the same building the finish step shows. */
const PLANS = Object.fromEntries(
  ADU_MODELS.map((m) => [m, photo(`plan-${m}`, `Furnished 3D cutaway of a ${MODEL_WORDS[m]}, roof off, the same building as the next photo (AI-generated example design)`)]),
) as Record<AduModel, FunnelPhoto>;

/** Step 2: the model in the backyard. The one bedroom keeps its first key ("type-detached"). */
const STANDARD_KEY: Record<AduModel, string> = {
  studio: 'size-detached-studio',
  '1bed': 'type-detached',
  '2bed': 'size-detached-2bed',
  '3bed': 'size-detached-3bed',
  garage: 'type-garage',
};
const LUXE_KEY: Record<AduModel, string> = {
  studio: 'finish-detached-studio-luxe',
  '1bed': 'finish-detached-1bed-luxe',
  '2bed': 'finish-detached-2bed-luxe',
  '3bed': 'finish-detached-3bed-luxe',
  garage: 'finish-garage-luxe',
};
const exterior = (m: AduModel, finish: 'standard' | 'luxe') =>
  photo(finish === 'standard' ? STANDARD_KEY[m] : LUXE_KEY[m], `A new ${MODEL_WORDS[m]} behind a single-story house, with ${finish === 'standard' ? STANDARD_WORDS : LUXE_WORDS} (AI-generated example design)`);
const FINISH_VARIANTS: FunnelPhotoVariant[] = ADU_MODELS.flatMap((model) =>
  (['standard', 'luxe'] as const).map((finish) => ({ when: { model, finish }, photo: exterior(model, finish) })),
);

/** Steps 3 to 5: the inside of the same ADU in its finish. */
const FINISH_INSIDE = { standard: 'white window frames and a grey plank floor', luxe: 'black window frames and a warm oak floor' } as const;
const KITCHEN_VARIANTS: FunnelPhotoVariant[] = (['standard', 'luxe'] as const).flatMap((finish) => [
  { when: { finish, kitchen: 'standard' }, photo: photo(`kitchen-${finish}`, `ADU kitchen with white cabinets and stainless appliances, ${FINISH_INSIDE[finish]} (AI-generated example design)`) },
  { when: { finish, kitchen: 'upgraded' }, photo: photo(`kitchen-${finish}-upgraded`, `ADU kitchen with oak cabinets, a full quartz backsplash and premium appliances, ${FINISH_INSIDE[finish]} (AI-generated example design)`) },
]);
const BATH_VARIANTS: FunnelPhotoVariant[] = (['standard', 'luxe'] as const).flatMap((finish) => [
  { when: { finish, bath: 'standard' }, photo: photo(`bath-${finish}`, `ADU bathroom with a tub and shower in white subway tile, ${FINISH_INSIDE[finish]} (AI-generated example design)`) },
  { when: { finish, bath: 'upgraded' }, photo: photo(`bath-${finish}-upgraded`, `ADU bathroom with a walk-in glass shower in large porcelain tile, ${FINISH_INSIDE[finish]} (AI-generated example design)`) },
]);
const STORAGE_VARIANTS: FunnelPhotoVariant[] = (['standard', 'luxe'] as const).flatMap((finish) => [
  { when: { finish, storage: 'standard' }, photo: photo(`bedroom-${finish}`, `ADU bedroom with two built-in wardrobe closets, ${FINISH_INSIDE[finish]} (AI-generated example design)`) },
  { when: { finish, storage: 'more' }, photo: photo(`bedroom-${finish}-more`, `ADU bedroom with three built-in wardrobe closets, ${FINISH_INSIDE[finish]} (AI-generated example design)`) },
]);

export const HOMEQUOTE_ADU_FUNNEL: FunnelSpec = {
  landing: {
    // Truthful network line: HomeQuote matches homeowners with licensed local builders (it is not one).
    announcement: 'Matched with licensed local ADU builders',
    headline: 'Backyard ADUs, designed just for you',
    subline: 'Design your ADU in 60 seconds and get a ballpark price, with a free consultation.',
    cta: 'Design your ADU',
    heroPhoto: { src: `${DIR}finish-detached-1bed-luxe.webp`, srcSm: `${DIR}finish-detached-1bed-luxe-sm.webp` },
    heroAlt: 'A new detached backyard ADU with smooth white stucco, black windows and a slim metal roof, behind a single-story house (AI-generated example design)',
    // The current HomeQuote horizontal logo, cropped to the artwork so it reads at header size.
    logo: { aspect: 1200 / 283 },
    // No projects (the network has no jobs of its own) and no reviews (none of its own to show).
  },
  steps: [
    {
      id: 'model',
      label: 'Select a model.',
      defaultOption: '1bed',
      options: [
        { id: 'studio', title: 'Studio', subtitle: '1 bath, about 350 sq ft', answers: { project: ['detached'], model: ['studio'] } },
        { id: '1bed', title: 'One bedroom', subtitle: '1 bath, about 500 sq ft', answers: { project: ['detached'], model: ['1bed'] } },
        { id: '2bed', title: 'Two bedroom', subtitle: '1 or 2 baths, about 750 sq ft', answers: { project: ['detached'], model: ['2bed'] } },
        { id: '3bed', title: 'Three bedroom', subtitle: '2 baths, about 1,000 sq ft', answers: { project: ['detached'], model: ['3bed'] } },
        { id: 'garage', title: 'Garage conversion', subtitle: 'Studio, about 400 sq ft', answers: { project: ['garage'], model: ['garage'] } },
      ],
      photo: { kind: 'option', photos: PLANS },
      // The plans on their white card, whole (like Buildoly's).
      photoFit: 'contain',
      photoZoom: 1,
      photoBackdrop: 'white',
    },
    {
      id: 'finish',
      label: 'Choose your finish.',
      options: [
        { id: 'standard', title: 'Standard', subtitle: 'Shingle roof, white windows', answers: { finish: ['standard'] } },
        { id: 'luxe', title: 'Luxe', subtitle: 'Metal roof, black windows, smooth stucco', answers: { finish: ['luxe'], ...upgradeAnswers('finish') } },
      ],
      photo: { kind: 'variants', by: [{ stepId: 'model' }], photos: FINISH_VARIANTS },
    },
    {
      id: 'kitchen',
      label: 'Design your kitchen.',
      options: [
        { id: 'standard', title: 'Standard kitchen', subtitle: 'White cabinets, GE-style appliances', answers: { kitchen: ['standard'] } },
        { id: 'upgraded', title: 'Upgraded kitchen', subtitle: 'Oak cabinets, premium appliances', answers: { kitchen: ['upgraded'], ...upgradeAnswers('kitchen') } },
      ],
      photo: { kind: 'variants', by: [{ stepId: 'finish' }], photos: KITCHEN_VARIANTS },
    },
    {
      id: 'bath',
      label: 'Design your bathroom.',
      options: [
        { id: 'standard', title: 'Standard bathroom', subtitle: 'Tub and shower, white subway tile', answers: { bath: ['standard'] } },
        { id: 'upgraded', title: 'Upgraded bathroom', subtitle: 'Walk-in glass shower, large porcelain tile', answers: { bath: ['upgraded'], ...upgradeAnswers('bath') } },
      ],
      photo: { kind: 'variants', by: [{ stepId: 'finish' }], photos: BATH_VARIANTS },
    },
    {
      id: 'storage',
      label: 'Choose your storage.',
      // Only a model with a bedroom: a studio or garage conversion is four steps.
      showWhen: { stepId: 'model', anyOf: ['1bed', '2bed', '3bed'] },
      options: [
        { id: 'standard', title: 'Standard storage', subtitle: 'Two built-in wardrobe closets', answers: { storage: ['standard'] } },
        { id: 'more', title: 'More closet space', subtitle: 'Three built-in wardrobe closets', answers: { storage: ['more'], ...upgradeAnswers('storage') } },
      ],
      photo: { kind: 'variants', by: [{ stepId: 'finish' }], photos: STORAGE_VARIANTS },
    },
  ],
  finalCta: 'Get my estimate',
  // Steps 2 to 5: the photo fills the card, as on Buildoly (step 1 sets its own white card for the plans).
  photoFrame: { fit: 'cover' },
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
  // No "Your design" line under the photo: Buildoly's steps have none (the price card still recaps the picks).
  photoNote: 'Photos are AI-generated example designs, not finished projects.',
  designDescription: 'A few quick picks, then a ballpark price for your {noun} and a free consultation with a licensed local builder, through {name}.',
};
