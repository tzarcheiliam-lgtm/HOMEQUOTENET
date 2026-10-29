import type { ConfiguratorPhoto, ConfiguratorSpec, ConfiguratorView } from '@/lib/estimator/configurator/types';

/*
 * Pool Masters LA's one-page configurator: pick the size, pick the finish, pick
 * the upgrades. Every row maps to the pool template's question/option ids
 * (lib/estimator/templates/pool.ts), so prices come from the same example price
 * table as the step-by-step builder (still examples: pricesConfirmed false).
 *
 * "Included" (the base design) is a solid refresh: plaster interior, porcelain
 * waterline tile with concrete coping, a resurfaced deck sized to the pool, and
 * a new variable-speed pump and filter. Rectangle shape only (the photos show a
 * rectangle; the site visit measures the real pool).
 *
 * Go Luxe bundles 6 upgrades (pebble, glass tile, travertine coping, porcelain
 * deck, spa, fire bowls) for 10% off the sum of their example prices. At the
 * medium size that is about $48,900–$81,300 of upgrades for about
 * $44,100–$73,100 (saving about $4,800–$8,200). The 10% is an example figure for
 * the contractor to confirm with the prices.
 *
 * Prices are for remodelling an existing pool (the size cards describe the
 * pool the homeowner has), not a new build.
 *
 * Photos are pre-rendered: public/estimator/pool-masters/configurator/<key>.webp
 * (1800 px) and <key>-sm.webp (1200 px), 78 keys, all edited from one real Pool
 * Masters job (the same yard from three angles) by
 * scripts/generate-pool-configurator-photos.mjs (kie.ai edits) and
 * scripts/pool-configurator-composite.py (composites and recolours). A missing
 * file falls back to the view's real photo. The pool's size is not in the
 * photos: the size cards and the to-scale plan on the photo show it.
 */

const DIR = '/estimator/pool-masters/configurator/';
const REAL = '/estimator/pool-masters/';

const SPA = { id: 'spa', options: [{ token: 'spa', rows: ['spa'] }, { token: '', rows: [] }] };

/*
 * Every view shows the picks it can (the same yard from three angles): the pebble
 * finish and the spa show everywhere; the deck and the backyard from above; the
 * waterline tile and coping poolside; LED lights and fire bowls at dusk.
 * Baja shelf, water bowls, fire pit, turf and equipment are priced, not pictured
 * (the rows say so).
 */
const VIEWS: ConfiguratorView[] = [
  {
    id: 'aerial',
    label: 'Aerial',
    dimensions: [
      {
        id: 'deck',
        options: [
          { token: 'pavers', rows: ['deck_pavers'] },
          { token: 'porcelain', rows: ['deck_porcelain'] },
          { token: 'resurface', rows: [] },
        ],
      },
      // Quartz reads as light water from above; only pebble changes the colour there.
      { id: 'water', options: [{ token: 'pebble', rows: ['pebble'] }, { token: '', rows: [] }] },
      SPA,
      {
        id: 'yard',
        options: [
          { token: 'yard', rows: [], allOf: ['outdoor_kitchen', 'patio_cover'] },
          { token: 'kitchen', rows: ['outdoor_kitchen'] },
          { token: 'cover', rows: ['patio_cover'] },
          { token: '', rows: [] },
        ],
      },
    ],
    fallback: {
      src: `${REAL}overhead-pool-turf-bands-pavers.webp`,
      alt: 'Drone view of a Pool Masters LA pool with a spa, pavers and turf bands',
    },
  },
  {
    id: 'poolside',
    label: 'Poolside',
    dimensions: [
      {
        id: 'finish',
        options: [
          { token: 'quartz', rows: ['quartz'] },
          { token: 'pebble', rows: ['pebble'] },
          { token: 'plaster', rows: [] },
        ],
      },
      {
        id: 'edge',
        options: [
          { token: 'premium', rows: ['edge_glass_travertine'] },
          { token: 'stone', rows: ['edge_stone'] },
          { token: 'classic', rows: [] },
        ],
      },
      SPA,
    ],
    fallback: {
      src: `${REAL}pool-umbrella-spa-baja-shelf.webp`,
      alt: 'Sunny hilltop pool and spa by Pool Masters LA with a white umbrella and loungers on the Baja shelf',
    },
  },
  {
    id: 'evening',
    label: 'Evening',
    dimensions: [
      // Colour LEDs set the water colour at night; otherwise a pebble pool reads deep blue.
      { id: 'water', options: [{ token: 'led', rows: ['led_lights'] }, { token: 'pebble', rows: ['pebble'] }, { token: '', rows: [] }] },
      { id: 'fire', options: [{ token: 'fire', rows: ['fire_bowls'] }, { token: '', rows: [] }] },
      SPA,
    ],
    fallback: {
      src: `${REAL}night-led-pool-spa.webp`,
      alt: 'Pool and spa by Pool Masters LA glowing with LED lights at dusk',
    },
  },
];

const DECK_ALT: Record<string, string> = {
  resurface: 'a freshly resurfaced light concrete deck',
  pavers: 'a new deck of large pale stone pavers',
  porcelain: 'a new deck of large-format pale porcelain tile',
};
const FINISH_ALT: Record<string, string> = {
  plaster: 'bright white plaster that makes the water light blue',
  quartz: 'pale grey quartz finish with a soft aqua water colour',
  pebble: 'dark blue pebble finish that makes the water a deep lagoon blue',
};
const EDGE_ALT: Record<string, string> = {
  classic: 'white porcelain waterline tile and a concrete coping',
  premium: 'blue glass waterline tile and travertine coping',
  stone: 'natural split-face stone waterline tile and flagstone coping',
};
const YARD_ALT: Record<string, string> = {
  yard: 'an outdoor kitchen with a grill, island and bar stools beside a dark patio cover',
  kitchen: 'an open-air outdoor kitchen with a grill, island and bar stools',
  cover: 'a dark patio cover over an outdoor lounge',
};

/** Alt text per image key (example designs; the page labels them once as AI-assisted). */
function altFor(key: string): string {
  const [view, ...tokens] = key.split('-');
  const has = (t: string) => tokens.includes(t);
  if (view === 'aerial') {
    const [deck] = tokens;
    const parts = [`Drone view of a rectangular pool${has('pebble') ? ' with a dark pebble finish' : ''} and ${DECK_ALT[deck]}`];
    if (has('spa')) parts.push('a raised spa in dark tile');
    const yard = ['yard', 'kitchen', 'cover'].find(has);
    if (yard) parts.push(YARD_ALT[yard]);
    return `${parts.join(', ')} (example design)`;
  }
  if (view === 'poolside') {
    const [finish, edge] = tokens;
    return `Poolside view of a rectangular pool with ${FINISH_ALT[finish]}, ${EDGE_ALT[edge]}${has('spa') ? ', and a raised spa with a spillover' : ''} (example design)`;
  }
  const parts = [`The same pool at dusk${has('pebble') ? ', its pebble finish a deep blue' : ''}`];
  parts.push(has('led') ? 'glowing with colour LED pool lights' : 'with a warm white pool light');
  if (has('spa')) parts.push('a lit raised spa in the foreground');
  if (has('fire')) parts.push('two lit fire bowls at the far end');
  return `${parts.join(', ')} (example design)`;
}

function photoMatrix(views: ConfiguratorView[]): Record<string, ConfiguratorPhoto> {
  const out: Record<string, ConfiguratorPhoto> = {};
  for (const v of views) {
    const keys = v.dimensions
      .reduce<string[][]>((acc, d) => acc.flatMap((t) => d.options.map((o) => [...t, o.token])), [[]])
      .map((tokens) => [v.id, ...tokens.filter(Boolean)].join('-'));
    for (const key of keys) out[key] = { src: `${DIR}${key}.webp`, alt: altFor(key) };
  }
  return out;
}

export const POOL_MASTERS_CONFIGURATOR: ConfiguratorSpec = {
  title: 'Reimagine your pool',
  intro: 'Remodel pricing for the pool you have. Pick its size, a finish and the upgrades you want: the photos and the price change as you go.',
  defaultModel: 'medium',
  models: [
    {
      id: 'small',
      name: 'Compact',
      tagline: 'Existing pools up to about 24 × 12 ft',
      dimensions: '24 × 12 ft',
      answers: { shape: ['rectangle'], size: ['small'], deckSize: ['small'] },
    },
    {
      id: 'medium',
      name: 'Classic',
      tagline: 'Existing pools around 30 × 15 ft',
      dimensions: '30 × 15 ft',
      answers: { shape: ['rectangle'], size: ['medium'], deckSize: ['medium'] },
    },
    {
      id: 'large',
      name: 'Estate',
      tagline: 'Existing pools around 36 × 18 ft or larger',
      dimensions: '36 × 18 ft',
      answers: { shape: ['rectangle'], size: ['large'], deckSize: ['large'] },
    },
  ],
  views: VIEWS,
  baseAnswers: {
    project: ['remodel'],
    package: ['custom'],
    scope: ['surface', 'tile_coping', 'deck', 'equipment'],
    equipment: ['pump_filter'],
  },
  groups: [
    {
      id: 'finish',
      title: 'Pool finish',
      view: 'poolside',
      kind: 'single',
      rows: [
        { id: 'plaster', label: 'White plaster', note: 'Classic, bright blue water', answers: { surface: ['plaster'] }, included: true },
        { id: 'quartz', label: 'Quartz', note: 'Smoother, longer-lasting, soft aqua', answers: { surface: ['quartz'] } },
        { id: 'pebble', label: 'Pebble', note: 'Natural texture, deep lagoon blue', answers: { surface: ['pebble'] } },
      ],
    },
    {
      id: 'edge',
      title: 'Tile & coping',
      view: 'poolside',
      kind: 'single',
      rows: [
        {
          id: 'edge_classic',
          label: 'Porcelain tile, concrete coping',
          answers: { tile: ['porcelain'], coping: ['concrete'] },
          included: true,
        },
        { id: 'edge_glass_travertine', label: 'Glass tile, travertine coping', answers: { tile: ['glass'], coping: ['travertine'] } },
        { id: 'edge_stone', label: 'Natural stone tile and coping', answers: { tile: ['stone'], coping: ['stone'] } },
      ],
    },
    {
      id: 'deck',
      title: 'Deck',
      view: 'aerial',
      kind: 'single',
      rows: [
        { id: 'deck_resurface', label: 'Resurface the existing deck', answers: { deck: ['resurface'] }, included: true },
        { id: 'deck_pavers', label: 'New stone pavers', answers: { deck: ['pavers'] } },
        { id: 'deck_porcelain', label: 'New porcelain deck', note: 'Large-format, stays cooler underfoot', answers: { deck: ['porcelain'] } },
      ],
    },
    {
      id: 'features',
      title: 'Pool features',
      view: 'aerial',
      kind: 'multi',
      rows: [
        // The photos show a raised spa: spaStyle raised (spa + raised = the example $18k-35k).
        { id: 'spa', label: 'Spa', note: 'Raised spa with a spillover', answers: { scope: ['features'], features: ['spa'], spaStyle: ['raised'] } },
        { id: 'baja', label: 'Baja shelf', note: 'Shallow lounging ledge', answers: { scope: ['features'], features: ['baja'] } },
        { id: 'fire_bowls', label: 'Fire bowls', note: 'A pair on the pool edge', answers: { scope: ['features'], features: ['fire'] }, view: 'evening' },
        { id: 'water_bowls', label: 'Water bowls', note: 'A pair spilling into the pool', answers: { scope: ['features'], features: ['water'] } },
        { id: 'led_lights', label: 'Colour LED lights', note: 'Two lights, set any colour', answers: { scope: ['features'], features: ['lighting'] }, view: 'evening' },
      ],
    },
    {
      id: 'backyard',
      title: 'Backyard',
      view: 'aerial',
      kind: 'multi',
      rows: [
        { id: 'outdoor_kitchen', label: 'Outdoor kitchen', note: 'Grill, counter and storage', answers: { project: ['backyard'], extras: ['kitchen'] } },
        { id: 'patio_cover', label: 'Patio cover', note: 'Shade over the lounge', answers: { project: ['backyard'], extras: ['patio_cover'] } },
        { id: 'fire_pit', label: 'Fire pit', note: 'Built-in, with seating', answers: { project: ['backyard'], extras: ['fire_pit'] } },
        { id: 'turf_planting', label: 'Turf and planting', answers: { project: ['backyard'], extras: ['turf_planting'] } },
      ],
    },
    {
      id: 'equipment',
      title: 'Equipment',
      kind: 'multi',
      note: 'A new variable-speed pump and filter is included.',
      rows: [
        { id: 'heater', label: 'Heater', note: 'Swim more of the year', answers: { equipment: ['heater'] } },
        { id: 'automation', label: 'Automation', note: 'Run it all from your phone', answers: { equipment: ['automation'] } },
        { id: 'salt', label: 'Salt system', note: 'Softer water, less chlorine', answers: { equipment: ['salt'] } },
      ],
    },
  ],
  bundle: {
    id: 'luxe',
    label: 'Go Luxe',
    headline: 'Our six signature upgrades, bundled for 10% less.',
    rows: ['pebble', 'edge_glass_travertine', 'deck_porcelain', 'spa', 'fire_bowls'],
    discountPct: 0.1,
    includes: ['Pebble finish', 'Glass waterline tile', 'Travertine coping', 'Porcelain deck', 'Raised spa', 'Pair of fire bowls'],
  },
  photos: photoMatrix(VIEWS),
  photoNote: 'Photos show example designs (AI-assisted, based on Pool Masters projects), not your yard.',
  // Real Pool Masters LA jobs, unedited (permission granted): the "Recent projects" strip.
  projects: [
    { src: `${DIR}projects/hilltop-pool-spa-baja-shelf.webp`, alt: 'Hilltop pool and spa with a Baja shelf by Pool Masters LA', caption: 'Hilltop pool, spa and Baja shelf' },
    { src: `${DIR}projects/long-pool-raised-spa.webp`, alt: 'Long pool with a raised spa by Pool Masters LA', caption: 'Long pool with a raised spa' },
    { src: `${DIR}projects/led-pool-spa-night.webp`, alt: 'Pool and spa lit with LED lights at night by Pool Masters LA', caption: 'LED lighting at night' },
    { src: `${DIR}projects/overhead-pool-blue-umbrellas.webp`, alt: 'Overhead view of a pool with blue umbrellas by Pool Masters LA', caption: 'Pool deck from above' },
    { src: `${DIR}projects/covered-outdoor-kitchen.webp`, alt: 'Covered outdoor kitchen next to a pool by Pool Masters LA', caption: 'Covered outdoor kitchen' },
    { src: `${DIR}projects/fire-and-water-bowls.webp`, alt: 'Fire and water bowls on a pool edge by Pool Masters LA', caption: 'Fire and water bowls' },
  ],
};
