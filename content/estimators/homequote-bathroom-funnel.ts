import type { FunnelPhoto, FunnelPhotoRule, FunnelPhotoVariant, FunnelSpec } from '@/lib/estimator/funnel/types';

/*
 * HomeQuote Network's simple mobile bathroom funnel (experience 'funnel'):
 * the Pool Masters shape (./pool-masters-funnel.ts) for bathrooms. A landing
 * page, three taps of choice (size, finish, layout), follow-up design steps
 * only when the picks ask for them, the contact step and the booking step.
 *
 * - Size: Guest / hall bath (5 x 8 ft) · Full bath (8 x 10 ft) · Primary
 *   suite (12 x 14 ft) -> the template's small / medium / large floor.
 * - Finish: Standard / Luxe -> shower tile, counter, floor, fixture finish
 *   (and, when the vanity step is skipped, the vanity).
 * - Layout: Walk-in shower · Tub & shower combo · Spa bath -> the template's
 *   bathing question.
 * - Follow-ups: "Choose your shower." when the layout has a walk-in shower
 *   (walk-in, spa bath); "Choose your tub." for the spa bath's freestanding
 *   tub; "Choose your vanity." for a full bath or primary suite (a guest bath
 *   gets a single vanity). 3 to 6 steps on a path.
 *
 * Every option maps to template answers (lib/estimator/templates/bathroom.ts,
 * optional showerStyle / tubStyle refinements, and the catalog's floating
 * double vanity turned on in ./homequote-bathroom.ts), so computeEstimate
 * prices it and the lead route re-prices it from the picks alone. Prices are
 * examples while pricesConfirmed is false.
 *
 * HomeQuote Network is a contractor-matching network, not a contractor: no
 * licence, years or "we build" words; no reviews (it has none of its own to
 * show). It connects homeowners with licensed local bathroom contractors.
 *
 * Photos: public/estimator/bathroom/funnel/<key>.webp (1800 px) + <key>-sm.webp
 * (1200 px), AI-generated example designs (scripts/generate-bath-funnel-photos.mjs).
 * Each one falls back to an existing bathroom style idea while its file is missing.
 */

const DIR = '/estimator/bathroom/funnel/';
const IDEAS = '/estimator/bathroom/';
const THUMBS = '/estimator/bathroom/thumbs/';

/** An existing AI style idea shown while a funnel photo is missing. */
const idea = (file: string, alt: string) => ({ src: file, alt });

function photo(key: string, alt: string, fallback: { src: string; alt: string }): FunnelPhoto {
  return { src: `${DIR}${key}.webp`, srcSm: `${DIR}${key}-sm.webp`, alt, fallback };
}

const SPA_IDEA = idea(`${IDEAS}style-classic-marble.webp`, 'Marble bathroom with a freestanding soaking tub and a separate glass shower (AI-generated example design)');
const WALKIN_IDEA = idea(`${IDEAS}style-green-zellige.webp`, 'Bathroom with a tiled walk-in glass shower and brushed gold fixtures (AI-generated example design)');
const CURBLESS_IDEA = idea(`${IDEAS}style-modern-spa.webp`, 'Bathroom with a curbless walk-in shower, a built-in bench and a niche (AI-generated example design)');
const COMBO_IDEA = idea(`${IDEAS}style-navy-hall.webp`, 'Hall bathroom with a tub-and-shower combo and a navy vanity (AI-generated example design)');
const STANDARD_IDEA = idea(`${IDEAS}style-warm-wood.webp`, 'Bathroom with white subway tile, a wood vanity and a white hexagon floor (AI-generated example design)');

type Size = 'guest' | 'full' | 'primary';
type Layout = 'walkin' | 'combo' | 'spa';
type Finish = 'standard' | 'luxe';

const SIZE_WORDS: Record<Size, string> = { guest: 'Small guest bathroom', full: 'Full bathroom', primary: 'Primary-suite bathroom' };
const LAYOUT_WORDS: Record<Layout, string> = {
  walkin: 'a glass walk-in shower',
  combo: 'a tub-and-shower combo',
  spa: 'a freestanding tub and a separate walk-in shower',
};
const FINISH_WORDS: Record<Finish, string> = {
  standard: 'ceramic tile, a stock vanity and chrome fixtures',
  luxe: 'large porcelain tile, quartz counters, brushed brass fixtures and a rain shower head',
};
const LAYOUT_FALLBACK: Record<Layout, Record<Finish, { src: string; alt: string }>> = {
  walkin: { standard: STANDARD_IDEA, luxe: WALKIN_IDEA },
  combo: { standard: COMBO_IDEA, luxe: COMBO_IDEA },
  spa: { standard: SPA_IDEA, luxe: SPA_IDEA },
};

/*
 * Every step after the size shows the room the homeowner picked (size) with
 * their earlier picks still in it (finish, layout), so the design visibly
 * accumulates. Files: the primary suite keeps the original keys
 * ("layout-walkin-luxe"); the smaller rooms add the size ("layout-walkin-luxe-guest").
 * A combination without its own photo falls back to the nearest one
 * (the layout first, then the nearest size, then the finish), e.g. a guest bath's
 * spa bath (a site-visit item there) shows the full bath's spa photo.
 */
const sized = (key: string, size: Size) => (size === 'primary' ? key : `${key}-${size}`);

/** The room photo files that exist per size: [layout, finish]. */
const ROOMS: Record<Size, [Layout, Finish][]> = {
  guest: [['walkin', 'standard'], ['walkin', 'luxe'], ['combo', 'standard'], ['combo', 'luxe']],
  full: [['walkin', 'standard'], ['walkin', 'luxe'], ['combo', 'standard'], ['combo', 'luxe'], ['spa', 'standard'], ['spa', 'luxe']],
  primary: [['walkin', 'standard'], ['walkin', 'luxe'], ['combo', 'standard'], ['combo', 'luxe'], ['spa', 'standard'], ['spa', 'luxe']],
};
const SIZES: Size[] = ['guest', 'full', 'primary'];

/** The room photo for a size, layout and finish ("layout-walkin-luxe-guest"). */
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

/**
 * Follow-ups match the layout first (never an island on an L path, never a tub on a walk-in path), then the
 * size (the nearest one, as the layout step shows), then the finish.
 */
const FOLLOW_BY = [{ stepId: 'layout' }, { stepId: 'size', ordered: true }, { stepId: 'finish' }];

/** The follow-up option a room photo already shows (frameless shower, soaking tub): that room photo itself. */
function roomAs(stepId: string, optionId: string, layouts: Layout[]): FunnelPhotoVariant[] {
  return ROOM_VARIANTS.filter((v) => layouts.includes(v.when.layout as Layout)).map((v) => ({ when: { ...v.when, [stepId]: optionId }, photo: v.photo }));
}

/**
 * Follow-up photos edited from a room photo, per [size, layout, finish] that has
 * them. The primary suite's luxe set keeps its original key ("shower-curbless");
 * the others add the room ("shower-curbless-walkin-luxe-full").
 */
function edits(stepId: string, optionId: string, rooms: [Size, Layout, Finish][], alt: string, fallback: { src: string; alt: string }): FunnelPhotoVariant[] {
  return rooms.map(([size, layout, finish]) => {
    const original = size === 'primary' && finish === 'luxe';
    return {
      when: { [stepId]: optionId, size, layout, finish },
      photo: photo(original ? `${stepId}-${optionId}` : `${stepId}-${optionId}-${layout}-${finish}-${size}`, alt, fallback),
    };
  });
}

/** Shower options with their own photo (curbless, bench): edits of these walk-in rooms. */
const SHOWER_ROOMS: [Size, Layout, Finish][] = [
  ['primary', 'walkin', 'luxe'],
  ['full', 'walkin', 'standard'],
  ['full', 'walkin', 'luxe'],
  ['guest', 'walkin', 'standard'],
  ['guest', 'walkin', 'luxe'],
];
/** Tub options with their own photo (clawfoot, stone): edits of these spa rooms. */
const TUB_ROOMS: [Size, Layout, Finish][] = [
  ['primary', 'spa', 'luxe'],
  ['full', 'spa', 'luxe'],
];

function sizePlan(id: string, dims: string, room: string, fallback: { src: string; alt: string }): FunnelPhoto {
  return photo(`size-${id}`, `Top-down plan of a ${room} about ${dims} (to scale, AI-generated)`, fallback);
}

/** Every bathroom the funnel designs starts here: a full remodel of the shower or tub, vanity, floor and walls. */
const BASE_SCOPE = ['bathing', 'vanity', 'floor', 'walls'];

export const HOMEQUOTE_BATHROOM_FUNNEL: FunnelSpec = {
  landing: {
    // Truthful network line: HomeQuote matches homeowners with licensed local contractors (it is not one).
    announcement: 'Matched with licensed local bathroom pros',
    headline: 'Bathrooms, remodeled just for you',
    subline: 'Design your bathroom in 60 seconds and get a ballpark price, with a free in-home consultation.',
    cta: 'Design your bathroom',
    heroPhoto: { src: `${DIR}layout-spa-luxe.webp`, srcSm: `${DIR}layout-spa-luxe-sm.webp` },
    heroAlt: 'A remodeled primary bathroom with a freestanding soaking tub, a glass walk-in shower and warm porcelain tile (AI-generated example design)',
    heroFallback: {
      src: '/estimator/hero/bath-example-photo.webp',
      alt: 'A remodeled bathroom with a glass walk-in shower and a floating vanity (AI-generated example design)',
    },
    // The current HomeQuote horizontal logo, cropped to the artwork so it reads at header size.
    logo: { aspect: 1200 / 283 },
    // No projects (the network has no jobs of its own) and no reviews (none of its own to show).
  },
  steps: [
    {
      id: 'size',
      label: 'Select your bathroom.',
      defaultOption: 'full',
      options: [
        { id: 'guest', title: 'Guest / hall bath', short: 'Guest bath', subtitle: 'About 5 × 8 ft', answers: { size: ['small'] } },
        { id: 'full', title: 'Full bath', subtitle: 'About 8 × 10 ft', answers: { size: ['medium'] } },
        { id: 'primary', title: 'Primary suite', subtitle: 'About 12 × 14 ft', answers: { size: ['large'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          guest: sizePlan('guest', '5 × 8 ft', 'guest or hall bathroom', COMBO_IDEA),
          full: sizePlan('full', '8 × 10 ft', 'full bathroom', STANDARD_IDEA),
          primary: sizePlan('primary', '12 × 14 ft', 'primary suite bathroom', SPA_IDEA),
        },
      },
      // Plan drawings on white, whole (zoom 1: the primary suite's plan fills the photo's height, so any zoom cut it off).
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
          subtitle: 'Ceramic tile, stock vanity, chrome fixtures',
          answers: { showerTile: ['subway'], counter: ['quartz_white'], floor: ['hex_mosaic'], metal: ['chrome'], vanity: ['single'], vanityFinish: ['white'] },
        },
        {
          id: 'luxe',
          title: 'Luxe',
          subtitle: 'Large porcelain tile, quartz, brushed brass, rain head, LED mirror',
          // A guest bath (no vanity step) gets a floating vanity with the luxe finish.
          answers: { showerTile: ['large_porcelain'], counter: ['marble_look'], floor: ['large_stone'], metal: ['brushed_gold'], vanity: ['floating'], vanityFinish: ['wood'] },
          addAnswers: { scope: ['extras'], extras: ['rain_head', 'led_mirror'] },
        },
      ],
      // The room picked on step 1 in each finish, with the layout picked next (a walk-in shower until then).
      photo: roomRule('layout'),
    },
    {
      id: 'layout',
      label: 'Choose your layout.',
      defaultOption: 'walkin',
      options: [
        { id: 'walkin', title: 'Walk-in shower', subtitle: 'A glass shower, no tub', answers: { bathing: ['walk_in'] } },
        { id: 'combo', title: 'Tub & shower combo', short: 'Tub & shower', subtitle: 'A new tub with a shower over it', answers: { bathing: ['tub_shower'] } },
        { id: 'spa', title: 'Spa bath', subtitle: 'Freestanding tub + walk-in shower', answers: { bathing: ['tub_and_shower'] } },
      ],
      // e.g. layout-spa-luxe-full: the layout in the room and finish picked before.
      photo: roomRule('finish'),
    },
    // ---- Follow-ups: only when the picks ask for them (design options; one tap each).
    {
      id: 'shower',
      label: 'Choose your shower.',
      showWhen: { stepId: 'layout', anyOf: ['walkin', 'spa'] },
      defaultOption: 'frameless',
      options: [
        { id: 'frameless', title: 'Frameless glass', subtitle: 'Clear glass panel, low curb', answers: { showerStyle: ['frameless'] } },
        { id: 'curbless', title: 'Curbless walk-in', short: 'Curbless shower', subtitle: 'Level floor, no step in', answers: { showerStyle: ['curbless'] } },
        {
          id: 'bench',
          title: 'Bench & niche',
          subtitle: 'A tiled seat and a built-in shelf',
          answers: { showerStyle: ['frameless'] },
          addAnswers: { scope: ['extras'], extras: ['bench', 'niche'] },
        },
      ],
      // The room so far with each shower: frameless = the room photo itself.
      photo: {
        kind: 'variants',
        by: FOLLOW_BY,
        photos: [
          ...roomAs('shower', 'frameless', ['walkin', 'spa']),
          ...edits('shower', 'curbless', SHOWER_ROOMS, 'Curbless walk-in shower with the floor tile running level into it (AI-generated example design)', CURBLESS_IDEA),
          ...edits('shower', 'bench', SHOWER_ROOMS, 'Walk-in shower with a tiled bench and a recessed niche (AI-generated example design)', idea(`${THUMBS}option-extras-bench.webp`, 'Walk-in shower with a tiled bench (AI-generated example design)')),
        ],
      },
    },
    {
      id: 'tub',
      label: 'Choose your tub.',
      showWhen: { stepId: 'layout', anyOf: ['spa'] },
      defaultOption: 'soaking',
      options: [
        { id: 'soaking', title: 'Soaking tub', subtitle: 'Deep, modern freestanding tub', answers: { tubStyle: ['soaking'] } },
        { id: 'clawfoot', title: 'Clawfoot tub', subtitle: 'A classic tub on feet', answers: { tubStyle: ['clawfoot'] } },
        { id: 'stone', title: 'Sculpted stone tub', short: 'Stone tub', subtitle: 'Solid stone-resin, carved look', answers: { tubStyle: ['stone'] } },
      ],
      // The spa room so far with each tub: soaking = the room photo itself.
      photo: {
        kind: 'variants',
        by: FOLLOW_BY,
        photos: [
          ...roomAs('tub', 'soaking', ['spa']),
          ...edits('tub', 'clawfoot', TUB_ROOMS, 'Classic clawfoot tub on metal feet (AI-generated example design)', SPA_IDEA),
          ...edits('tub', 'stone', TUB_ROOMS, 'Sculpted stone freestanding tub (AI-generated example design)', SPA_IDEA),
        ],
      },
    },
    {
      id: 'vanity',
      label: 'Choose your vanity.',
      // A guest bath gets a single vanity (set by the finish).
      showWhen: { stepId: 'size', anyOf: ['full', 'primary'] },
      defaultOption: 'double',
      options: [
        { id: 'single', title: 'Single vanity', subtitle: 'One sink, about 30–48 in', answers: { vanity: ['single'] } },
        { id: 'double', title: 'Double vanity', subtitle: 'Two sinks, about 60–72 in', answers: { vanity: ['double'] } },
        { id: 'floating', title: 'Floating double vanity', subtitle: 'Two sinks, wall-mounted, open below', answers: { vanity: ['floating_double'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          single: photo('vanity-single', 'Floating walnut single vanity with one sink and a round brass mirror (AI-generated example design)', idea(`${THUMBS}option-vanity-single.webp`, 'Single-sink vanity (AI-generated example design)')),
          double: photo('vanity-double', 'Walnut double vanity on legs with two sinks and two round brass mirrors (AI-generated example design)', idea(`${THUMBS}option-vanity-double.webp`, 'Double vanity with two sinks (AI-generated example design)')),
          floating: photo('vanity-floating', 'Floating walnut double vanity, open below, with two sinks and two round brass mirrors (AI-generated example design)', idea(`${THUMBS}option-vanity-floating.webp`, 'Floating wall-mounted vanity (AI-generated example design)')),
        },
      },
    },
  ],
  // The last step on the path (3 to 6 steps).
  finalCta: 'Get my estimate',
  baseAnswers: {
    project: ['full'],
    package: ['custom'],
    scope: BASE_SCOPE,
    paint: ['soft_white'],
  },
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
  // Every room photo is shown whole (3:2 photos in a wider card: 'cover' cut off the top and bottom), on a blurred copy of itself.
  photoFrame: { fit: 'contain', zoom: 1, backdrop: 'blur' },
  // "Your design: Full bath · Luxe · Walk-in shower" under the photo from step 2 on (the design they are building).
  designRecap: { label: 'Your design' },
  photoNote: 'Photos are AI-generated example designs, not finished projects.',
  designDescription: 'Three quick picks, then a ballpark price for your {noun} and a free in-home consultation with a licensed local contractor, through {name}.',
};
