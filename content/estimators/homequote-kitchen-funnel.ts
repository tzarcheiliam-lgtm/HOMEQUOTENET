import type { FunnelPhoto, FunnelSpec } from '@/lib/estimator/funnel/types';

/*
 * HomeQuote Network's simple mobile kitchen funnel (experience 'funnel'): the
 * bathroom funnel's shape (./homequote-bathroom-funnel.ts) for kitchens. A
 * landing page, three taps of choice (size, finish, layout), follow-up design
 * steps only when they apply, the contact step and the booking step.
 *
 * - Size: Compact / galley (10 x 10 ft) · Medium (12 x 14 ft) · Large open
 *   kitchen (16 x 18 ft) -> the template's small / medium / large floor.
 * - Finish: Standard / Luxe -> cabinets, counter, backsplash, appliances,
 *   floor, lighting and hardware.
 * - Layout: L-shaped · U-shaped · Kitchen with island -> the template's layout.
 * - Follow-ups: "Choose your cabinets." (always: the cabinet colour is the
 *   biggest look decision of a kitchen); "Choose your island." only for the
 *   kitchen with island; "Choose your appliances." only for Luxe: the Standard
 *   finish already promises a stainless package, so asking would contradict
 *   the pick, while Luxe buyers choose between three real high-end packages
 *   (the biggest price swing of a luxe kitchen). 4 to 6 steps on a path.
 *
 * Every option maps to template answers (lib/estimator/templates/kitchen.ts,
 * with the optional islandStyle refinement), so computeEstimate prices it and
 * the lead route re-prices it from the picks alone. Prices are examples while
 * pricesConfirmed is false.
 *
 * HomeQuote Network is a contractor-matching network, not a contractor: no
 * licence, years or "we build" words; no reviews (it has none of its own to
 * show); no projects. It connects homeowners with licensed local kitchen
 * contractors.
 *
 * Photos: public/estimator/kitchen/funnel/<key>.webp (1800 px) + <key>-sm.webp
 * (1200 px), AI-generated example designs (scripts/generate-kitchen-funnel-photos.mjs).
 * Should a file go missing the screen shows its fallback: an illustrative stock
 * kitchen photo already on the site (content/industry-photos.ts, Unsplash
 * licence), labelled as such in its alt text.
 */

const DIR = '/estimator/kitchen/funnel/';
const STOCK = '/images/general-contractors/';

/** An illustrative stock photo shown while a funnel photo is missing (never presented as a finished job). */
const stock = (file: string, alt: string) => ({ src: `${STOCK}${file}`, alt: `${alt} (illustrative stock photo)` });

function photo(key: string, alt: string, fallback: { src: string; alt: string }): FunnelPhoto {
  return { src: `${DIR}${key}.webp`, srcSm: `${DIR}${key}-sm.webp`, alt, fallback };
}

const WOOD_ISLAND = stock('kitchen-remodel-wood-cabinets-island.webp', 'Bright kitchen with tall walnut cabinetry and pendant lights over an island');
const MARBLE_ISLAND = stock('open-kitchen-marble-island.webp', 'Open-plan kitchen with a large marble-topped island and white cabinets');
const OPEN_LIVING = stock('living-room-kitchen-wood-accents.webp', 'Open living room and kitchen with wood-panelled walls');

type Layout = 'l' | 'u' | 'island';
type Finish = 'standard' | 'luxe';

const LAYOUT_WORDS: Record<Layout, string> = {
  l: 'an L-shaped layout',
  u: 'a U-shaped layout',
  island: 'a large island',
};
const FINISH_WORDS: Record<Finish, string> = {
  standard: 'white shaker cabinets, quartz counters, a subway tile backsplash and stainless appliances',
  luxe: 'custom cabinets, quartzite counters, a full-height stone backsplash, a pro-style range and brass hardware',
};
const LAYOUT_FALLBACK: Record<Layout, Record<Finish, { src: string; alt: string }>> = {
  l: { standard: OPEN_LIVING, luxe: WOOD_ISLAND },
  u: { standard: OPEN_LIVING, luxe: WOOD_ISLAND },
  island: { standard: MARBLE_ISLAND, luxe: MARBLE_ISLAND },
};

/** The room photo for a layout and finish ("layout-island-luxe"): the same kitchen, the choice swapped. */
function layoutPhoto(layout: Layout, finish: Finish): FunnelPhoto {
  return photo(`layout-${layout}-${finish}`, `Remodeled kitchen with ${LAYOUT_WORDS[layout]}, ${FINISH_WORDS[finish]} (AI-generated example design)`, LAYOUT_FALLBACK[layout][finish]);
}

const byFinish = (layout: Layout) => ({ standard: layoutPhoto(layout, 'standard'), luxe: layoutPhoto(layout, 'luxe') });
const byLayout = (finish: Finish) => ({ l: layoutPhoto('l', finish), u: layoutPhoto('u', finish), island: layoutPhoto('island', finish) });

function sizePlan(id: string, dims: string, room: string, fallback: { src: string; alt: string }): FunnelPhoto {
  return photo(`size-${id}`, `Top-down plan of a ${room} about ${dims} (to scale, AI-generated)`, fallback);
}

export const HOMEQUOTE_KITCHEN_FUNNEL: FunnelSpec = {
  landing: {
    // Truthful network line: HomeQuote matches homeowners with licensed local contractors (it is not one).
    announcement: 'Matched with licensed local kitchen pros',
    headline: 'Kitchens, remodeled just for you',
    subline: 'Design your kitchen in 60 seconds and get a ballpark price, with a free in-home consultation.',
    cta: 'Design your kitchen',
    heroPhoto: { src: `${DIR}layout-island-luxe.webp`, srcSm: `${DIR}layout-island-luxe-sm.webp` },
    heroAlt: 'A remodeled open kitchen with a large island, custom cabinets, quartzite counters and a pro-style range (AI-generated example design)',
    heroFallback: MARBLE_ISLAND,
    // The current HomeQuote horizontal logo, cropped to the artwork so it reads at header size.
    logo: { aspect: 1200 / 283 },
    // No projects (the network has no jobs of its own) and no reviews (none of its own to show).
  },
  steps: [
    {
      id: 'size',
      label: 'Select your kitchen.',
      defaultOption: 'medium',
      options: [
        { id: 'compact', title: 'Compact / galley', short: 'Compact kitchen', subtitle: 'About 10 × 10 ft', answers: { size: ['small'] } },
        { id: 'medium', title: 'Medium', short: 'Medium kitchen', subtitle: 'About 12 × 14 ft', answers: { size: ['medium'] } },
        { id: 'large', title: 'Large open kitchen', short: 'Large kitchen', subtitle: 'About 16 × 18 ft', answers: { size: ['large'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          compact: sizePlan('compact', '10 × 10 ft', 'compact galley kitchen', OPEN_LIVING),
          medium: sizePlan('medium', '12 × 14 ft', 'medium kitchen', WOOD_ISLAND),
          large: sizePlan('large', '16 × 18 ft', 'large open kitchen with an island', MARBLE_ISLAND),
        },
      },
      // Plan drawings on white, whole (one zoom for all three, so they stay to scale with each other).
      photoFit: 'contain',
      photoZoom: 1,
      photoBackdrop: 'white',
    },
    {
      id: 'finish',
      label: 'Choose your finish.',
      options: [
        {
          id: 'standard',
          title: 'Standard',
          subtitle: 'Shaker cabinets, quartz counters, stainless appliances',
          answers: {
            cabinets: ['stock'],
            counter: ['quartz'],
            backsplash: ['subway'],
            appliances: ['stainless'],
            floor: ['porcelain'],
            lighting: ['recessed'],
            hardware: ['nickel'],
          },
        },
        {
          id: 'luxe',
          title: 'Luxe',
          subtitle: 'Custom cabinets, quartzite counters, pro-style range, brass hardware',
          // The appliances step (Luxe only) refines the pro range.
          answers: {
            cabinets: ['custom'],
            counter: ['quartzite'],
            backsplash: ['slab'],
            appliances: ['pro'],
            floor: ['hardwood'],
            lighting: ['designer'],
            hardware: ['brass'],
          },
        },
      ],
      // The same kitchen in each finish, with the layout picked next (the island until then).
      photo: { kind: 'matrix', stepId: 'layout', photos: { standard: byLayout('standard'), luxe: byLayout('luxe') } },
    },
    {
      id: 'layout',
      label: 'Choose your layout.',
      defaultOption: 'island',
      options: [
        { id: 'l', title: 'L-shaped', subtitle: 'Cabinets on two walls', answers: { layout: ['l_shape'] } },
        { id: 'u', title: 'U-shaped', subtitle: 'Cabinets on three walls', answers: { layout: ['u_shape'] } },
        { id: 'island', title: 'Kitchen with island', short: 'Island kitchen', subtitle: 'Wall cabinets plus an island', answers: { layout: ['island'] } },
      ],
      // e.g. layout-island-luxe: the layout in the finish picked before.
      photo: { kind: 'matrix', stepId: 'finish', photos: { l: byFinish('l'), u: byFinish('u'), island: byFinish('island') } },
    },
    // ---- Follow-ups: only when they apply (design options; one tap each).
    {
      id: 'cabinets',
      label: 'Choose your cabinets.',
      defaultOption: 'white',
      options: [
        { id: 'white', title: 'White', short: 'White cabinets', subtitle: 'Bright painted white', answers: { cabinetFinish: ['white'] } },
        { id: 'wood', title: 'Warm wood', short: 'Wood cabinets', subtitle: 'Stained oak or walnut', answers: { cabinetFinish: ['wood'] } },
        { id: 'twotone', title: 'Two-tone', short: 'Two-tone cabinets', subtitle: 'White with a wood island', answers: { cabinetFinish: ['two_tone'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          white: photo('cabinets-white', 'Kitchen with soft-white painted cabinets on the walls and the island, and brass hardware (AI-generated example design)', MARBLE_ISLAND),
          wood: photo('cabinets-wood', 'Kitchen with warm white-oak wood cabinets on the walls and the island (AI-generated example design)', WOOD_ISLAND),
          twotone: photo('cabinets-twotone', 'Kitchen with two-tone cabinets: soft-white cabinets on the walls and a white-oak island (AI-generated example design)', OPEN_LIVING),
        },
      },
    },
    {
      id: 'island',
      label: 'Choose your island.',
      showWhen: { stepId: 'layout', anyOf: ['island'] },
      defaultOption: 'seating',
      options: [
        { id: 'prep', title: 'Prep island', subtitle: 'Extra counter and storage', answers: { islandStyle: ['prep'] } },
        { id: 'seating', title: 'Seating island with waterfall edge', short: 'Waterfall island', subtitle: 'Stools, stone down both ends', answers: { islandStyle: ['seating'] } },
        { id: 'sink', title: 'Island with sink', short: 'Island sink', subtitle: 'The sink moves to the island', answers: { islandStyle: ['sink'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          prep: photo('island-prep', 'Compact white-oak prep island with deep drawers and a stone top, no seating (AI-generated example design)', MARBLE_ISLAND),
          seating: photo('island-seating', 'Kitchen island with waterfall quartzite edges and three counter stools (AI-generated example design)', MARBLE_ISLAND),
          sink: photo('island-sink', 'Kitchen island with a sink and a brass faucet, waterfall edges and counter stools (AI-generated example design)', WOOD_ISLAND),
        },
      },
    },
    {
      id: 'appliances',
      label: 'Choose your appliances.',
      // Standard already says stainless appliances; Luxe chooses between three high-end packages.
      showWhen: { stepId: 'finish', anyOf: ['luxe'] },
      defaultOption: 'pro',
      options: [
        { id: 'stainless', title: 'Stainless package', short: 'Stainless appliances', subtitle: 'Range, fridge and dishwasher', answers: { appliances: ['stainless'] } },
        { id: 'pro', title: 'Pro range & hood', subtitle: 'Pro-style range and a big hood', answers: { appliances: ['pro'] } },
        { id: 'panel', title: 'Panel-ready built-ins', short: 'Built-in appliances', subtitle: 'Hidden behind cabinet panels', answers: { appliances: ['panel'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          stainless: photo('appliances-stainless', 'Kitchen with a stainless slide-in range, a stainless chimney hood and a French-door fridge (AI-generated example design)', WOOD_ISLAND),
          pro: photo('appliances-pro', 'Kitchen with a pro-style range under a white plaster hood and a built-in fridge column (AI-generated example design)', WOOD_ISLAND),
          panel: photo('appliances-panel', 'Kitchen with a built-in fridge behind cabinet panels and a flush induction cooktop (AI-generated example design)', MARBLE_ISLAND),
        },
      },
    },
  ],
  // The last step on the path (4 to 6 steps).
  finalCta: 'Get my estimate',
  baseAnswers: {
    project: ['full'],
    paint: ['paint'],
  },
  // Every room photo is shown whole on a blurred copy of itself (3:2 photos in a wider card).
  photoFrame: { fit: 'contain', zoom: 1, backdrop: 'blur' },
  contactStep: {
    eyebrow: 'Last step',
    headline: 'Your estimate is ready.',
    subline: 'Where should we send it?',
    cta: 'Get my estimate',
    homeowner: { label: 'Are you the homeowner?', yes: 'Yes', no: 'No' },
    // Facts about the service only (never a licence or years of the network's own).
    trustLine: 'Free in-home consultation · Licensed local pros · No obligation',
  },
  bookingStep: {
    headline: 'Book your free call',
    priceEyebrow: '{options}',
    priceNote: 'Ballpark price, not a quote. A licensed local contractor sets your firm price at a free in-home consultation.',
    // {minutes} / {host} come from the HomeQuote team calendar: "A quick 10-minute call. Liam from HomeQuote will call you ...".
    bookingTitle: 'A quick {minutes}-minute call. {host} will call you at the time you pick.',
    noRangeText: 'Priced at your free in-home consultation',
    followUpText: 'A HomeQuote project specialist will call you shortly to talk through your design and set up a free in-home consultation with a licensed local contractor.',
    reviewText: 'We book free consultations online with homeowners. Your details are saved, and the {name} team will review them before we can confirm a fit.',
  },
  // Every funnel photo is in public/ (a missing one would show its stock fallback, whose alt text says so).
  photoNote: 'Photos are AI-generated example designs, not finished projects.',
  designDescription: 'Three quick picks, then a ballpark price for your {noun} and a free in-home consultation with a licensed local contractor, through {name}.',
};
