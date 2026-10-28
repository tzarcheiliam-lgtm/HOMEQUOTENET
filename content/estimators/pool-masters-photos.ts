import type { GalleryImage } from '@/lib/estimator/types';

/*
 * Pool Masters LA job photos for the estimator (the owner's own project and
 * drone photos, used with permission). Files live in
 * public/estimator/pool-masters/; re-export them with
 * `node scripts/generate-scene-textures.mjs photos <dir>` (metadata stripped).
 */
const DIR = '/estimator/pool-masters/';

/** "Which look do you like?" photos. Not priced. */
export const POOL_MASTERS_GALLERY: GalleryImage[] = [
  {
    src: `${DIR}pool-umbrella-spa-baja-shelf.webp`,
    alt: 'Sunny hilltop pool and spa with a white umbrella and in-water loungers on the Baja shelf, and pavers set in turf',
    caption: 'Baja shelf and spa with a view',
  },
  {
    src: `${DIR}overhead-pool-turf-bands-pavers.webp`,
    alt: 'Drone view of a long pool with a spa, a dark wood deck, blue umbrellas and large pavers separated by turf bands',
    caption: 'Pavers with turf bands, from above',
  },
  {
    src: `${DIR}baja-shelf-loungers-blue-umbrellas.webp`,
    alt: 'Wide shallow Baja shelf holding two white loungers in clear turquoise water, with blue umbrellas on the deck',
    caption: 'Baja shelf with in-water loungers',
  },
  {
    src: `${DIR}raised-dark-tile-spa-long-pool.webp`,
    alt: 'Angular raised spa faced in dark tile at the end of a long pool, beside pale pavers and turf bands',
    caption: 'Raised spa in dark tile',
  },
  {
    src: `${DIR}fire-water-bowls-closeup.webp`,
    alt: 'Two black bowls on pedestals with fire burning on top and water spilling into the pool',
    caption: 'Fire and water bowls',
  },
  {
    src: `${DIR}night-led-pool-spa.webp`,
    alt: 'Pool and spa glowing purple and blue with LED lights at dusk, with uplit planting behind',
    caption: 'Colour LED lighting at night',
  },
  {
    src: `${DIR}covered-outdoor-kitchen-bar.webp`,
    alt: 'Outdoor kitchen with a stone bar counter and stools under a slatted shade cover, with desert planting',
    caption: 'Covered outdoor kitchen and bar',
  },
  {
    src: `${DIR}modern-pool-ipe-deck-overhead.webp`,
    alt: 'Straight-down view of a compact modern pool and spa with a warm ipe wood deck, loungers and turf',
    caption: 'Modern pool with an ipe deck',
  },
];

/** Photo for an option, keyed by "questionId.optionId". Only where the photo shows that option. */
export const POOL_MASTERS_OPTION_IMAGES: Record<string, string> = {
  'features.baja': `${DIR}baja-shelf-loungers-blue-umbrellas.webp`,
  'features.spa': `${DIR}raised-dark-tile-spa-long-pool.webp`,
  'features.water': `${DIR}fire-water-bowls-closeup.webp`,
  'features.fire': `${DIR}fire-water-bowls-closeup.webp`,
  'features.lighting': `${DIR}night-led-pool-spa.webp`,
  'extras.kitchen': `${DIR}covered-outdoor-kitchen-bar.webp`,
  'extras.patio_cover': `${DIR}covered-lounge-pool-dusk.webp`,
  'extras.fire_pit': `${DIR}fire-pit-stone-wall-seating.webp`,
  'extras.turf_planting': `${DIR}pool-turf-planting-overhead.webp`,
};
