import type { GalleryImage } from '@/lib/estimator/types';

/*
 * Pool Masters LA project photos for the estimator (from the owner's brochure,
 * used with permission). Files live in public/estimator/pool-masters/.
 */
const DIR = '/estimator/pool-masters/';

/** "Which look do you like?" photos. Not priced. */
export const POOL_MASTERS_GALLERY: GalleryImage[] = [
  {
    src: `${DIR}hero-night-pool-lit-pavers.webp`,
    alt: 'Backyard pool glowing at night, with lit stepping pavers set in dark lawn and potted plants',
    caption: 'Lit pavers and pool at night',
  },
  {
    src: `${DIR}raised-spa-dark-tile-turf-bands.webp`,
    alt: 'Raised, angular spa with a dark tile face beside pale pavers separated by turf bands',
    caption: 'Raised spa with a dark tile face',
  },
  {
    src: `${DIR}family-pool-baja-shelf-loungers.webp`,
    alt: 'Long family pool with a full-width shallow shelf holding two in-water loungers',
    caption: 'Family pool with a full-width baja shelf',
  },
  {
    src: `${DIR}zero-edge-pool-porcelain-pavers.webp`,
    alt: 'Curved, irregular-shaped pool with a zero edge, surrounded by pale porcelain pavers',
    caption: 'Zero-edge pool with porcelain pavers',
  },
  {
    src: `${DIR}pool-spa-hardwood-deck-pavers.webp`,
    alt: 'Pool and spa beside a hardwood deck and a paver terrace, with drought-tolerant planting',
    caption: 'Pool and spa with hardwood deck and pavers',
  },
  {
    src: `${DIR}raised-spa-glass-tile-spillway.webp`,
    alt: 'Raised spa with glass mosaic tile spilling into a light blue pool',
    caption: 'Raised spa with glass tile and spillway',
  },
  {
    src: `${DIR}color-led-pool-spa-lighting.webp`,
    alt: 'Pool and spa lit in purple and blue at dusk, with uplit planting behind',
    caption: 'Colour LED pool and spa lighting',
  },
  {
    src: `${DIR}herringbone-pavers-turf-bands.webp`,
    alt: 'Herringbone pavers with turf bands and a black sphere water feature in the lawn',
    caption: 'Herringbone pavers with turf bands',
  },
];

/** Photo for an option, keyed by "questionId.optionId". Only where the photo shows that option. */
export const POOL_MASTERS_OPTION_IMAGES: Record<string, string> = {
  'features.baja': `${DIR}family-pool-baja-shelf-loungers.webp`,
  'features.spa': `${DIR}raised-spa-dark-tile-turf-bands.webp`,
  'features.water': `${DIR}fire-water-bowls-spilling-into-pool.webp`,
  'features.fire': `${DIR}fire-water-bowls-spilling-into-pool.webp`,
  'features.lighting': `${DIR}color-led-pool-spa-lighting.webp`,
  'extras.kitchen': `${DIR}outdoor-kitchen-slab-counter.webp`,
  'extras.fire_pit': `${DIR}fire-pit-seating-wall.webp`,
};
