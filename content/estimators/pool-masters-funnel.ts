import type { FunnelPhoto, FunnelSpec } from '@/lib/estimator/funnel/types';
import { POOL_MASTERS_CONFIGURATOR } from './pool-masters-configurator';

/*
 * Pool Masters LA's simple mobile funnel (experience 'funnel'): a landing page,
 * then exactly three taps of choice (size, finish, extras), the contact step
 * and the booking step. Owner's brief: "too much going on = too many
 * questions; it should feel straightforward and simple." Equipment and site
 * questions are left to the free on-site visit.
 *
 * Every option maps to the one-page configurator's models and rows
 * (./pool-masters-configurator.ts), so prices come from the same example
 * price table (lib/estimator/templates/pool.ts; still examples while
 * pricesConfirmed is false) and the photos are its pre-rendered files.
 *
 * - Standard = the configurator's included design (white plaster, porcelain
 *   waterline tile, concrete coping, resurfaced deck, new pump and filter).
 * - Luxe = pebble, glass tile + travertine coping, porcelain deck. Priced as
 *   plain rows: the Go Luxe bundle discount is never applied here.
 * - Extras: just the pool / + raised spa / + spa, outdoor kitchen, patio cover
 *   and fire bowls.
 */

const DIR = '/estimator/pool-masters/configurator/';
const FUNNEL_DIR = '/estimator/pool-masters/funnel/';

/** Shown if a to-scale plan image fails to load. */
const SIZE_FALLBACK = {
  src: `${DIR}aerial-resurface.webp`,
  srcSm: `${DIR}aerial-resurface-sm.webp`,
  alt: 'Drone view of a rectangular pool with a freshly resurfaced light concrete deck (example design)',
};

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
        { id: 'standard', title: 'Standard', subtitle: 'Plaster, porcelain tile, concrete coping' },
        {
          id: 'luxe',
          title: 'Luxe',
          subtitle: 'Pebble, glass tile, travertine, porcelain deck',
          rows: ['pebble', 'edge_glass_travertine', 'deck_porcelain'],
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
        { id: 'spa', title: 'Add a spa', short: 'With spa', subtitle: 'Raised spa with a spillover', rows: ['spa'] },
        {
          id: 'backyard',
          title: 'The full backyard',
          short: 'Full backyard',
          subtitle: 'Spa, kitchen, patio cover, fire bowls',
          rows: ['spa', 'outdoor_kitchen', 'patio_cover', 'fire_bowls'],
        },
      ],
      // e.g. aerial-resurface, aerial-porcelain-pebble-spa, aerial-resurface-spa-yard.
      photo: { kind: 'view', view: 'aerial' },
      cta: 'Get my estimate',
    },
  ],
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
