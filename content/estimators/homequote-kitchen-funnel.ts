import type { FunnelPhoto, FunnelPhotoRule, FunnelPhotoVariant, FunnelSpec } from '@/lib/estimator/funnel/types';

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

type Size = 'compact' | 'medium' | 'large';
type Layout = 'l' | 'u' | 'island';
type Finish = 'standard' | 'luxe';

const SIZE_WORDS: Record<Size, string> = { compact: 'Compact kitchen', medium: 'Medium kitchen', large: 'Large open kitchen' };
const LAYOUT_WORDS: Record<Layout, string> = {
  l: 'an L-shaped layout',
  u: 'a U-shaped layout',
  island: 'an island',
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

/*
 * Every step after the size shows the kitchen the homeowner picked (size) with
 * their earlier picks still in it (finish, layout), so the design visibly
 * accumulates. Files: the large kitchen keeps the original keys
 * ("layout-island-luxe"); the smaller ones add the size ("layout-l-standard-compact").
 * A combination without its own photo falls back to the nearest one
 * (the layout first, then the nearest size, then the finish), e.g. an island in a
 * compact kitchen (a site-visit item) shows the medium island kitchen.
 */
const sized = (key: string, size: Size) => (size === 'large' ? key : `${key}-${size}`);

/** The room photo files that exist per size: [layout, finish]. */
const ROOMS: Record<Size, [Layout, Finish][]> = {
  compact: [['l', 'standard'], ['l', 'luxe'], ['u', 'standard'], ['u', 'luxe']],
  medium: [['l', 'standard'], ['l', 'luxe'], ['u', 'standard'], ['u', 'luxe'], ['island', 'standard'], ['island', 'luxe']],
  large: [['l', 'standard'], ['l', 'luxe'], ['u', 'standard'], ['u', 'luxe'], ['island', 'standard'], ['island', 'luxe']],
};
const SIZES: Size[] = ['compact', 'medium', 'large'];

/** The room photo for a size, layout and finish ("layout-l-standard-compact"). */
function layoutPhoto(size: Size, layout: Layout, finish: Finish): FunnelPhoto {
  return photo(sized(`layout-${layout}-${finish}`, size), `${SIZE_WORDS[size]} with ${LAYOUT_WORDS[layout]}, ${FINISH_WORDS[finish]} (AI-generated example design)`, LAYOUT_FALLBACK[layout][finish]);
}

const ROOM_VARIANTS: FunnelPhotoVariant[] = SIZES.flatMap((size) =>
  ROOMS[size].map(([layout, finish]) => ({ when: { size, layout, finish }, photo: layoutPhoto(size, layout, finish) })),
);

/** The room photos as a step's rule: the finish step follows size + layout, the layout step size + finish. */
function roomRule(other: 'layout' | 'finish'): FunnelPhotoRule {
  // The other pick first: a room that cannot have the layout (site visit) shows the nearest size that has it.
  return { kind: 'variants', by: [{ stepId: other }, { stepId: 'size', ordered: true }], photos: ROOM_VARIANTS };
}

/** A follow-up option the room photo already shows: that room photo itself, for the rooms `match` picks. */
function roomAs(stepId: string, optionId: string, match: (layout: Layout, finish: Finish) => boolean): FunnelPhotoVariant[] {
  return ROOM_VARIANTS.filter((v) => match(v.when.layout as Layout, v.when.finish as Finish)).map((v) => ({ when: { ...v.when, [stepId]: optionId }, photo: v.photo }));
}

/**
 * Follow-up photos edited from a room photo, per [size, layout, finish] that has
 * them. The large luxe island kitchen keeps its original key ("cabinets-wood");
 * the others add the room ("cabinets-wood-island-standard-medium").
 */
function edits(stepId: string, optionId: string, rooms: [Size, Layout, Finish][], alt: string, fallback: { src: string; alt: string }): FunnelPhotoVariant[] {
  return rooms.map(([size, layout, finish]) => {
    const original = size === 'large' && layout === 'island' && finish === 'luxe';
    const key = stepId === 'island' ? `${stepId}-${optionId}-${finish}-${size}` : `${stepId}-${optionId}-${layout}-${finish}-${size}`;
    return { when: { [stepId]: optionId, size, layout, finish }, photo: photo(original ? `${stepId}-${optionId}` : key, alt, fallback) };
  });
}

/**
 * No U-shaped kitchen has its own wood / two-tone photo yet: a U path shows the L-shaped one of the
 * nearest size (two runs of the same cabinets) rather than an island kitchen. Listed after the exact photos.
 */
const uAsL = (vs: FunnelPhotoVariant[]): FunnelPhotoVariant[] => vs.filter((v) => v.when.layout === 'l').map((v) => ({ ...v, when: { ...v.when, layout: 'u' } }));

/**
 * Follow-ups match the layout first (never an island on an L path, never a tub on a walk-in path), then the
 * size (the nearest one, as the layout step shows), then the finish.
 */
const FOLLOW_BY = [{ stepId: 'layout' }, { stepId: 'size', ordered: true }, { stepId: 'finish' }];

/** Wood and two-tone cabinets with their own photo: edits of these rooms. */
const WOOD_ROOMS: [Size, Layout, Finish][] = [
  ['large', 'island', 'luxe'],
  ['medium', 'island', 'standard'],
  ['medium', 'island', 'luxe'],
  ['medium', 'l', 'standard'],
  ['compact', 'l', 'standard'],
];
const TWOTONE_ROOMS: [Size, Layout, Finish][] = [
  ['medium', 'island', 'standard'],
  ['medium', 'island', 'luxe'],
  ['medium', 'l', 'standard'],
  ['compact', 'l', 'standard'],
];
/** Prep island and island sink: edits of these island kitchens (a standard island path shows the luxe one of its size). */
const ISLAND_ROOMS: [Size, Layout, Finish][] = [
  ['large', 'island', 'luxe'],
  ['medium', 'island', 'luxe'],
];

/** The appliance close-ups of the large kitchen's cooking wall (also shown for a medium kitchen). */
function applianceCloseUp(id: string, alt: string, fallback: { src: string; alt: string }): FunnelPhotoVariant[] {
  const p = photo(`appliances-${id}`, alt, fallback);
  return [{ when: { appliances: id, size: 'large' }, photo: p }, { when: { appliances: id, size: 'medium' }, photo: p }];
}

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
      // The kitchen picked on step 1 in each finish, with the layout picked next (the island until then).
      photo: roomRule('layout'),
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
      // e.g. layout-l-luxe-compact: the layout in the kitchen and finish picked before.
      photo: roomRule('finish'),
    },
    // ---- Follow-ups: only when they apply (design options; one tap each).
    {
      id: 'cabinets',
      label: 'Choose your cabinets.',
      defaultOption: 'white',
      options: [
        { id: 'white', title: 'White', short: 'White cabinets', subtitle: 'Bright painted white', answers: { cabinetFinish: ['white'] } },
        { id: 'wood', title: 'Warm wood', short: 'Wood cabinets', subtitle: 'Stained oak or walnut', answers: { cabinetFinish: ['wood'] } },
        { id: 'twotone', title: 'Two-tone', short: 'Two-tone cabinets', subtitle: 'White and wood together', answers: { cabinetFinish: ['two_tone'] } },
      ],
      // The kitchen so far in each colour. White = the room photo on a standard path (white shaker) and on a
      // luxe L / U path (soft-white); two-tone = the room photo on a luxe island path (white perimeter, oak island).
      photo: {
        kind: 'variants',
        by: FOLLOW_BY,
        photos: [
          // (The medium luxe island is stone, so that kitchen reads white too; the large one has an oak island.)
          ...roomAs('cabinets', 'white', (layout, finish) => finish === 'standard' || layout !== 'island').concat(
            roomAs('cabinets', 'white', (layout, finish) => layout === 'island' && finish === 'luxe').filter((v) => v.when.size === 'medium'),
          ),
          { when: { cabinets: 'white', size: 'large', layout: 'island', finish: 'luxe' }, photo: photo('cabinets-white', 'Kitchen with soft-white painted cabinets on the walls and the island, and brass hardware (AI-generated example design)', MARBLE_ISLAND) },
          ...edits('cabinets', 'wood', WOOD_ROOMS, 'Kitchen with warm white-oak wood cabinets (AI-generated example design)', WOOD_ISLAND),
          ...uAsL(edits('cabinets', 'wood', WOOD_ROOMS, 'Kitchen with warm white-oak wood cabinets (AI-generated example design)', WOOD_ISLAND)),
          ...roomAs('cabinets', 'twotone', (layout, finish) => layout === 'island' && finish === 'luxe').filter((v) => v.when.size === 'large'),
          ...edits('cabinets', 'twotone', TWOTONE_ROOMS, 'Kitchen with two-tone cabinets: soft-white and white-oak wood together (AI-generated example design)', OPEN_LIVING),
          ...uAsL(edits('cabinets', 'twotone', TWOTONE_ROOMS, 'Kitchen with two-tone cabinets: soft-white and white-oak wood together (AI-generated example design)', OPEN_LIVING)),
        ],
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
      // The island kitchen so far with each island: the seating island = the room photo itself.
      photo: {
        kind: 'variants',
        by: FOLLOW_BY,
        photos: [
          ...roomAs('island', 'seating', (layout) => layout === 'island'),
          ...edits('island', 'prep', ISLAND_ROOMS, 'Prep island with deep drawers and a stone top, no seating (AI-generated example design)', MARBLE_ISLAND),
          ...edits('island', 'sink', ISLAND_ROOMS, 'Kitchen island with a sink and a tall faucet, and counter stools (AI-generated example design)', WOOD_ISLAND),
        ],
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
      // Large and medium: a closer view of the large kitchen's cooking wall, so the three packages read apart on a phone.
      // Compact: the compact luxe kitchen itself (pro range = the room photo), the other packages edited from the U-shaped one.
      photo: {
        kind: 'variants',
        by: [{ stepId: 'size', ordered: true }, { stepId: 'layout' }],
        photos: [
          ...applianceCloseUp('stainless', 'Cooking wall with a stainless slide-in range, a stainless chimney hood, a stainless French-door fridge and dishwasher (AI-generated example design)', WOOD_ISLAND),
          ...applianceCloseUp('pro', 'Cooking wall with a six-burner pro-style range under a white plaster hood and a paneled fridge column (AI-generated example design)', WOOD_ISLAND),
          ...applianceCloseUp('panel', 'Cooking wall with built-in wall ovens, a flush induction cooktop and appliances hidden behind cabinet panels (AI-generated example design)', MARBLE_ISLAND),
          ...roomAs('appliances', 'pro', (layout, finish) => finish === 'luxe').filter((v) => v.when.size === 'compact'),
          { when: { appliances: 'stainless', size: 'compact', layout: 'u' }, photo: photo('appliances-stainless-u-compact', 'Compact kitchen with a stainless range, chimney hood, French-door fridge and dishwasher (AI-generated example design)', WOOD_ISLAND) },
          { when: { appliances: 'panel', size: 'compact', layout: 'u' }, photo: photo('appliances-panel-u-compact', 'Compact kitchen with a flush induction cooktop, a wall oven and appliances hidden behind cabinet panels (AI-generated example design)', MARBLE_ISLAND) },
        ],
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
  // "Your design: Full bath · Luxe · Walk-in shower" under the photo from step 2 on (the design they are building).
  designRecap: { label: 'Your design' },
  photoNote: 'Photos are AI-generated example designs, not finished projects.',
  designDescription: 'Three quick picks, then a ballpark price for your {noun} and a free in-home consultation with a licensed local contractor, through {name}.',
};
