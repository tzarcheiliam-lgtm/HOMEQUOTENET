import type { FunnelPhoto, FunnelSpec } from '@/lib/estimator/funnel/types';
import { POOL_MASTERS_CONFIGURATOR } from './pool-masters-configurator';

/*
 * Pool Masters LA's simple mobile funnel (experience 'funnel'): a landing page,
 * then three taps of choice (size, finish, extras), follow-up design steps
 * only when the extras ask for them, the contact step and the booking step.
 * Owner's brief: "too much going on = too many questions; it should feel
 * straightforward and simple" and, for the follow-ups, "keep it simple; these
 * are only design options shown if they choose it." Equipment and site
 * questions are left to the free on-site visit.
 *
 * Every option maps to the one-page configurator's models and rows
 * (./pool-masters-configurator.ts) and/or template answers, so prices come
 * from the same example price table (lib/estimator/templates/pool.ts; still
 * examples while pricesConfirmed is false).
 *
 * - Standard = the configurator's included design (white plaster, porcelain
 *   waterline tile, precast concrete coping, resurfaced deck, new pump and filter).
 * - Luxe = pebble, glass tile, porcelain coping (catalog option, enabled in
 *   ./pool-masters.ts), porcelain deck. Priced as plain rows: the Go Luxe
 *   bundle discount is never applied here.
 * - Extras: just the pool (3 steps) / a spa (+ "Choose your spa.": 4 steps) /
 *   the full backyard (spa, outdoor kitchen, fire feature, cabana: 7 steps).
 *   The follow-ups answer the template's optional spaStyle / kitchenStyle /
 *   coverStyle questions (what each build adds) or pick the fire feature.
 */

const DIR = '/estimator/pool-masters/configurator/';
const FUNNEL_DIR = '/estimator/pool-masters/funnel/';
const REAL = '/estimator/pool-masters/';

/** Shown if a to-scale plan image fails to load. */
const SIZE_FALLBACK = {
  src: `${DIR}aerial-resurface.webp`,
  srcSm: `${DIR}aerial-resurface-sm.webp`,
  alt: 'Drone view of a rectangular pool with a freshly resurfaced light concrete deck (example design)',
};

/** A follow-up option's photo in public/estimator/pool-masters/funnel/ (scripts/generate-pool-funnel-options.mjs). */
function optionPhoto(key: string, alt: string): FunnelPhoto {
  return { src: `${FUNNEL_DIR}${key}.webp`, srcSm: `${FUNNEL_DIR}${key}-sm.webp`, alt };
}

function sizePlan(id: string, dims: string): FunnelPhoto {
  return {
    src: `${FUNNEL_DIR}size-${id}.webp`,
    srcSm: `${FUNNEL_DIR}size-${id}-sm.webp`,
    widths: { sm: 800, full: 1200 },
    alt: `Top-down plan of a rectangular pool about ${dims} (to scale)`,
    fallback: SIZE_FALLBACK,
  };
}

export const POOL_MASTERS_FUNNEL: FunnelSpec = {
  landing: {
    // One line on a phone (Buildoly's bar); the Inland Empire = Riverside and San Bernardino counties.
    announcement: 'Serving LA, OC, Ventura & the Inland Empire',
    headline: 'Backyard pools, remodeled just for you',
    subline: 'Design your pool in 60 seconds and get a ballpark price, with a free on-site estimate.',
    cta: 'Design your pool',
    heroPhoto: { src: `${DIR}evening-pebble-fire-spa.webp`, srcSm: `${DIR}evening-pebble-fire-spa-sm.webp` },
    heroAlt: 'A remodeled pool and raised spa at dusk with a deep blue pebble finish and two lit fire bowls (example design)',
    // Real Pool Masters LA jobs, unedited (permission granted).
    projects: POOL_MASTERS_CONFIGURATOR.projects?.filter((p) =>
      ['hilltop-pool-spa-baja-shelf', 'long-pool-raised-spa', 'covered-outdoor-kitchen'].some((name) => p.src.includes(name)),
    ),
  },
  steps: [
    {
      id: 'size',
      label: 'Select your pool size.',
      defaultOption: 'classic',
      options: [
        { id: 'compact', title: 'Compact', subtitle: 'About 24 × 12 ft', model: 'small' },
        { id: 'classic', title: 'Classic', subtitle: 'About 30 × 15 ft', model: 'medium' },
        { id: 'estate', title: 'Estate', subtitle: 'About 36 × 18 ft or larger', model: 'large' },
      ],
      photo: {
        kind: 'option',
        photos: {
          compact: sizePlan('compact', '24 × 12 ft'),
          classic: sizePlan('classic', '30 × 15 ft'),
          estate: sizePlan('estate', '36 × 18 ft'),
        },
      },
    },
    {
      id: 'finish',
      label: 'Choose your finish.',
      options: [
        // The configurator's base design, with the coping named for what it is (precast concrete).
        { id: 'standard', title: 'Standard', subtitle: 'Plaster, standard tile, precast coping', answers: { coping: ['concrete'] } },
        {
          id: 'luxe',
          title: 'Luxe',
          subtitle: 'Pebble, glass tile, porcelain coping and deck',
          // Glass tile from the edge row, then porcelain coping in place of its travertine.
          rows: ['pebble', 'edge_glass_travertine', 'deck_porcelain'],
          answers: { coping: ['porcelain'] },
        },
      ],
      // poolside-plaster-classic vs poolside-pebble-premium (+ "-spa" once a spa is picked).
      photo: { kind: 'view', view: 'poolside' },
    },
    {
      id: 'extras',
      label: 'Add the extras.',
      options: [
        { id: 'pool', title: 'Just the pool', short: 'Pool only', subtitle: 'No spa or backyard extras' },
        // The spa step names the spa on the price card.
        { id: 'spa', title: 'Add a spa', short: '', subtitle: 'Pool and a spa', rows: ['spa'] },
        {
          id: 'backyard',
          title: 'The full backyard',
          short: '',
          subtitle: 'Spa, outdoor kitchen, fire and shade',
          rows: ['spa', 'outdoor_kitchen', 'patio_cover'],
        },
      ],
      // e.g. aerial-resurface, aerial-porcelain-pebble-spa, aerial-resurface-spa-yard.
      photo: { kind: 'view', view: 'aerial' },
    },
    // ---- Follow-ups: only when "Add the extras." asks for them (design options; one tap each).
    {
      id: 'spa',
      label: 'Choose your spa.',
      showWhen: { stepId: 'extras', anyOf: ['spa', 'backyard'] },
      defaultOption: 'raised',
      options: [
        { id: 'flush', title: 'Flush spa', subtitle: 'Level with the pool, spills in', answers: { spaStyle: ['flush'] } },
        { id: 'raised', title: 'Raised spa', subtitle: 'Dark-tile wall with a spillway', answers: { spaStyle: ['raised'] } },
        { id: 'zero_edge', title: 'Zero-edge spa', subtitle: 'Overflows on all four sides', answers: { spaStyle: ['zero_edge'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          flush: optionPhoto('spa-flush', 'Poolside view of the pool with a flush spa set level with the water, spilling gently into the pool (example design)'),
          raised: {
            src: `${DIR}poolside-pebble-premium-spa.webp`,
            srcSm: `${DIR}poolside-pebble-premium-spa-sm.webp`,
            alt: 'Poolside view of the pool with a raised dark-tile spa and a spillway (example design)',
          },
          zero_edge: optionPhoto('spa-zero-edge', 'Poolside view of the pool with a zero-edge spa brimming over its dark-tile walls (example design)'),
        },
      },
    },
    {
      id: 'kitchen',
      label: 'Choose your outdoor kitchen.',
      showWhen: { stepId: 'extras', anyOf: ['backyard'] },
      defaultOption: 'full',
      options: [
        { id: 'grill', title: 'Grill island', subtitle: 'Built-in grill and counter', answers: { kitchenStyle: ['grill'] } },
        { id: 'full', title: 'Full kitchen', subtitle: 'Grill, sink and bar seating', answers: { kitchenStyle: ['full'] } },
        { id: 'chef', title: "Chef's kitchen", subtitle: 'Everything, plus a pizza oven', answers: { kitchenStyle: ['chef'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          // Real Pool Masters job (unedited).
          grill: { src: `${REAL}outdoor-kitchen-slab-counter.webp`, alt: 'Built-in stainless grill and stone counter by Pool Masters LA' },
          full: optionPhoto('kitchen-full', 'Outdoor kitchen with a grill, a stone island with a sink and bar stools, from above (example design)'),
          // PLACEHOLDER until scripts/generate-pool-funnel-options.mjs makes kitchen-chef (kie.ai credits ran out):
          // the real kitchen bar of this yard, no pizza oven yet.
          chef: { src: `${REAL}covered-outdoor-kitchen-bar.webp`, alt: 'Outdoor kitchen bar with stools under a pergola with pendant lights' },
        },
      },
    },
    {
      id: 'fire',
      label: 'Choose your fire feature.',
      showWhen: { stepId: 'extras', anyOf: ['backyard'] },
      defaultOption: 'bowls',
      options: [
        { id: 'pit', title: 'Fire pit', subtitle: 'A built-in gathering spot', rows: ['fire_pit'] },
        { id: 'fireplace', title: 'Outdoor fireplace', short: 'Fireplace', subtitle: 'A built fireplace wall', addAnswers: { extras: ['fireplace'] } },
        { id: 'bowls', title: 'Fire bowls', subtitle: 'A pair on the pool edge', rows: ['fire_bowls'] },
      ],
      photo: {
        kind: 'option',
        photos: {
          pit: { src: `${REAL}fire-pit-stone-wall-seating.webp`, alt: 'Round fire pit beside built-in bench seating by Pool Masters LA' },
          fireplace: optionPhoto('fire-fireplace', 'The pool at dusk with a modern outdoor fireplace wall beyond the far end (example design)'),
          bowls: {
            src: `${DIR}evening-pebble-fire-spa.webp`,
            srcSm: `${DIR}evening-pebble-fire-spa-sm.webp`,
            alt: 'The pool at dusk with two lit fire bowls at the far end (example design)',
          },
        },
      },
    },
    {
      id: 'cabana',
      label: 'Choose your cabana.',
      showWhen: { stepId: 'extras', anyOf: ['backyard'] },
      defaultOption: 'lounge',
      options: [
        { id: 'pergola', title: 'Pergola', subtitle: 'Open beams, filtered shade', answers: { coverStyle: ['pergola'] } },
        { id: 'cabana', title: 'Cabana', subtitle: 'Roofed, with flowing curtains', answers: { coverStyle: ['cabana'] } },
        { id: 'lounge', title: 'Covered lounge', subtitle: 'Solid roof, lights and a fan', answers: { coverStyle: ['covered_lounge'] } },
      ],
      photo: {
        kind: 'option',
        photos: {
          pergola: { src: `${REAL}covered-lounge-pool-dusk.webp`, alt: 'Louvered pergola over a lounge beside a pool by Pool Masters LA' },
          // PLACEHOLDER until scripts/generate-pool-funnel-options.mjs makes cabana-curtains (kie.ai credits ran out):
          // this yard's real pergola, no curtains yet.
          cabana: { src: `${REAL}covered-outdoor-kitchen-bar.webp`, alt: 'Shaded pergola with pendant lights in the same backyard' },
          lounge: optionPhoto('cabana-lounge', 'Covered outdoor lounge with sofas under a dark patio cover, from above (example design)'),
        },
      },
    },
  ],
  // The last step on the path (3 for just the pool, 4 with a spa, 7 for the full backyard).
  finalCta: 'Get my estimate',
  // The steps' lines name the real coping, spa, kitchen, fire and shade picks; the configurator rows only approximate them.
  summaryReplacesGroups: ['edge', 'features', 'backyard'],
  contactStep: {
    eyebrow: 'Last step',
    headline: 'Your estimate is ready.',
    subline: 'Where should we send it?',
    cta: 'Get my estimate',
    // Name, email, phone, home address, then this (owner: ask it, in words that make sense).
    homeowner: { label: 'Are you the homeowner?', yes: 'Yes', no: 'No' },
    trustLine: 'Licensed & insured · CSLB #1112793',
  },
  bookingStep: {
    headline: 'Book your free call',
    priceEyebrow: '{options}',
    priceNote: 'Ballpark price, not a quote. Your firm price is set at your free on-site visit.',
    financingLabel: 'Financing available',
    // DEMO ONLY (?demo=financing): example terms for "or from $649/mo*" on the price card.
    // Replace with Pool Masters' real lender terms before showing a payment to everyone.
    exampleFinancing: {
      apr: 8.99,
      months: 180,
      label: 'or from {monthly}/mo*',
      disclosure:
        '*Example only: {apr} APR for {months} months, {perThousand}/mo per $1,000 financed, with approved credit. Not an offer of credit; actual terms from Pool Masters’ lending partners may differ.',
    },
    // {minutes} / {host} come from the booking calendar: "a quick 10-minute call with Liam from Pool Masters".
    bookingTitle: 'Pick a time for a quick {minutes}-minute call with {host}.',
    callPrompt: 'Prefer to talk now? Call',
  },
  configurator: POOL_MASTERS_CONFIGURATOR,
  // Footer only (owner: no badge on the photos).
  photoNote: 'Photos show example designs, AI-assisted from Pool Masters projects.',
};
