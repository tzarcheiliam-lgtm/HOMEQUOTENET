/**
 * Pool project photography used across the marketing site.
 *
 * IMPORTANT — positioning. HomeQuote Network is a lead-generation company. It
 * did not design, build or remodel any pool shown here. Copy near these images
 * must never imply otherwise: no project claims, no locations, no client
 * attribution, no performance figures. `imageryDisclosure` below is the line to
 * use wherever the imagery needs context.
 *
 * Alt text describes only what is visibly in frame.
 *
 * Sources live outside the repo and are treated as read-only. These files are
 * optimised copies; see the selection table in MARKETING_SITE.md.
 */

export type Photo = {
  /** Path under /public. */
  src: string;
  /** Intrinsic dimensions of the optimised file — required to avoid layout shift. */
  width: number;
  height: number;
  /** Factual description of what is visible. */
  alt: string;
};

const base = '/images/pools';

export const photos = {
  /** Homepage hero. Wide, bright, with sky on the left for the headline. */
  heroPool: {
    src: `${base}/pool-remodel-baja-shelf-spa-umbrella.webp`,
    width: 1920,
    height: 1280,
    alt: 'Rectangular swimming pool with a raised spa, a tanning shelf, a large patio umbrella and lounge chairs on a paved deck.',
  },

  /** /pool-contractors hero. Warmer, hillside, loungers. */
  heroHillside: {
    src: `${base}/pool-spa-hillside-desert-view.webp`,
    width: 1920,
    height: 1280,
    alt: 'Swimming pool and spa on a hillside property, with lounge chairs, patio umbrellas and open desert hills behind.',
  },

  /** Closing CTA band. Night, low key, holds an overlay well. */
  nightPool: {
    src: `${base}/pool-night-lighting-symmetric-deck.webp`,
    width: 1600,
    height: 900,
    alt: 'Swimming pool lit at night, with illuminated planters and lighting along a symmetrical deck.',
  },

  /** Mosaic — portrait, tile and waterline detail. */
  tileDetail: {
    src: `${base}/pool-tile-coping-black-waterline-detail.webp`,
    width: 900,
    height: 1600,
    alt: 'Close view of a spa corner showing dark waterline tile and the coping edge above the water.',
  },

  /** Mosaic — evening, lighting and equipment. */
  lapPoolEvening: {
    src: `${base}/lap-pool-evening-lighting-spa.webp`,
    width: 1100,
    height: 825,
    alt: 'Long lap pool and adjoining spa at dusk, with underwater lighting and lit deck edges.',
  },

  /** Mosaic — decking. */
  woodDeck: {
    src: `${base}/pool-deck-wood-backyard-spa.webp`,
    width: 1100,
    height: 733,
    alt: 'Backyard pool and spa bordered by a wood deck, stone paving and desert planting.',
  },

  /** Section break — full renovation. */
  mountainView: {
    src: `${base}/pool-renovation-mountain-view-deck.webp`,
    width: 1300,
    height: 866,
    alt: 'Pool and spa with a wide paved deck and turf, overlooking distant mountains.',
  },

  /** Section break — water and fire features. */
  fireWaterBowl: {
    src: `${base}/pool-fire-water-bowl-feature.webp`,
    width: 1600,
    height: 1066,
    alt: 'Two dark bowls set on a pool wall, each spilling a sheet of water into the pool below.',
  },

  /** Section break — aerial, reads as a system/plan view. */
  aerial: {
    src: `${base}/backyard-pool-aerial-overhead.webp`,
    width: 1600,
    height: 1066,
    alt: 'Overhead view of a rectangular backyard pool with a wood deck, paving and a lawn.',
  },

  /** Project row. */
  longPool: {
    src: `${base}/long-pool-angled-spa-tile.webp`,
    width: 1100,
    height: 733,
    alt: 'Long swimming pool with an angled spa, tiled edges, turf joints between paving and a patio umbrella.',
  },

  /** Project row — outdoor living. */
  firepit: {
    src: `${base}/outdoor-living-firepit-stone-wall.webp`,
    width: 1100,
    height: 800,
    alt: 'Round gas fire pit with cushioned bench seating against a stone wall on a wood deck.',
  },
} as const satisfies Record<string, Photo>;

/**
 * The single line used wherever the photography needs context. Keep it visible
 * anywhere a reader might otherwise assume these are HomeQuote Network's own
 * construction projects.
 */
export const imageryDisclosure =
  'Pool industry project imagery. HomeQuote Network provides customer acquisition and appointment setting, not construction services.';
