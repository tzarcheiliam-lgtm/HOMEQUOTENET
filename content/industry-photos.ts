import type { Photo } from './photos';

/**
 * Stock photography for the non-pool industry pages.
 *
 * Every image here is from Unsplash under the Unsplash License (free for
 * commercial use, attribution not required). Credits are kept anyway and shown
 * in small type on each page. The source page for each photo is in `credit.url`.
 *
 * Positioning is the same as the pool imagery: HomeQuote Network did not build,
 * roof, fence or install anything shown. `stockImageryDisclosure` goes under
 * each hero. Alt text describes only what is in frame.
 *
 * Files are WebP re-encodes sized to their widest render: 1920px for heroes,
 * 1100px (landscape) or 800px (portrait) for gallery frames.
 */

const unsplash = (name: string, id: string) => ({
  name,
  url: `https://unsplash.com/photos/${id}`,
});

export const stockImageryDisclosure =
  'Illustrative stock photography. HomeQuote Network provides customer acquisition and appointment setting, not construction or installation services.';

export const generalContractorPhotos = {
  hero: {
    src: '/images/general-contractors/modern-home-exterior-dusk.webp',
    width: 1920,
    height: 1083,
    alt: 'Modern two-storey home at dusk with tall lit windows, stone and timber cladding, and ornamental grasses in front.',
    credit: unsplash('Michael Brown', 'G48h926L2qo'),
  },
  kitchen: {
    src: '/images/general-contractors/kitchen-remodel-wood-cabinets-island.webp',
    width: 1100,
    height: 733,
    alt: 'Bright kitchen with white counters, a black faucet, tall walnut cabinetry and pendant lights over an island.',
    credit: unsplash('Clay Banks', 'XU_ODlSO9ac'),
  },
  bathroom: {
    src: '/images/general-contractors/bathroom-remodel-freestanding-tub.webp',
    width: 1100,
    height: 733,
    alt: 'White bathroom with a freestanding tub, a long vanity with two basins, a glass shower and a heated towel rail.',
    credit: unsplash('Lisa Anna', '7PmGkGBedTw'),
  },
  openKitchen: {
    src: '/images/general-contractors/open-kitchen-marble-island.webp',
    width: 1100,
    height: 733,
    alt: 'Open-plan kitchen with a large marble-topped island, white cabinets, pendant lights and a living area beyond.',
    credit: unsplash('Zac Gudakov', '9j9b2L0qAYU'),
  },
  framing: {
    src: '/images/general-contractors/interior-wood-framing.webp',
    width: 800,
    height: 1200,
    alt: 'Interior of a building under construction, with exposed timber wall framing and plywood sheathing.',
    credit: unsplash('Taylor Heery', 'eZtWDby4HJ0'),
  },
  livingKitchen: {
    src: '/images/general-contractors/living-room-kitchen-wood-accents.webp',
    width: 1600,
    height: 1067,
    alt: 'Open living room and kitchen with wood-panelled walls, a white sofa, a low wooden coffee table and tall glass doors.',
    credit: unsplash('Clay Banks', 'Hnec2oEbbxk'),
  },
  darkLiving: {
    src: '/images/general-contractors/dark-modern-living-room.webp',
    width: 1920,
    height: 1080,
    alt: 'Modern living room with dark walls, a pale sectional sofa, built-in shelving and daylight through tall blinds.',
    credit: unsplash('Lumbardh Plluzhina', 'sLTpOqT4BeE'),
  },
} as const satisfies Record<string, Photo>;

export const roofingPhotos = {
  hero: {
    src: '/images/roofing/spanish-tile-roof-stucco-home.webp',
    width: 1920,
    height: 1280,
    alt: 'Single-storey white stucco house with a red clay tile roof, an arched entry and a front lawn.',
    credit: unsplash('ubeyonroad', 'lx-FLZx3iQk'),
  },
  tileDetail: {
    src: '/images/roofing/concrete-roof-tile-detail.webp',
    width: 1100,
    height: 825,
    alt: 'Close view of rows of dark roof tiles in raking light.',
    credit: unsplash('Maros Misove', 'N8hz4rxwphI'),
  },
  install: {
    src: '/images/roofing/roofers-installing-roof.webp',
    width: 1100,
    height: 733,
    alt: 'Two workers in gloves and work boots fastening material on a roof with a power drill.',
    credit: unsplash('LXS Photography', 'P6fOUTBCV6k'),
  },
  shingleHome: {
    src: '/images/roofing/new-home-dark-shingle-roof.webp',
    width: 1100,
    height: 568,
    alt: 'Newly built house with a dark shingle roof, pale siding and a two-car garage.',
    credit: unsplash('Roger Starnes Sr', 'lT2Hpiqgn3c'),
  },
} as const satisfies Record<string, Photo>;

export const fencingPhotos = {
  hero: {
    src: '/images/fencing/wood-slat-fence-detail.webp',
    width: 1920,
    height: 1280,
    alt: 'Close view of vertical wooden slats with narrow dark gaps between them.',
    credit: unsplash('Maksim Shutov', 'YpK65tUQipg'),
  },
  metal: {
    src: '/images/fencing/black-metal-fence.webp',
    width: 1100,
    height: 733,
    alt: 'Black metal fence with a round post cap, against soft evening light through trees.',
    credit: unsplash('Hidde van Esch', '4kemn116m7Y'),
  },
  gate: {
    src: '/images/fencing/iron-gate-stone-wall.webp',
    width: 800,
    height: 1200,
    alt: 'Black iron gate set into a stone wall, with greenery overhead.',
    credit: unsplash('Eric Prouzet', 'E0klqOYjqg4'),
  },
  picket: {
    src: '/images/fencing/white-picket-fence-home.webp',
    width: 1100,
    height: 733,
    alt: 'White picket fence along a brick path in front of a large house and garden.',
    credit: unsplash('Benjamin Rascoe', 'v9jEOnzAkK0'),
  },
} as const satisfies Record<string, Photo>;

export const hvacPhotos = {
  hero: {
    src: '/images/hvac/heat-pump-beside-brick-house.webp',
    width: 1920,
    height: 1280,
    alt: 'Modern outdoor heat pump unit on a gravel bed beside a brick house, framed by shrubs.',
    credit: unsplash('alpha innotec', '4VCm8l6wLQY'),
  },
  technicians: {
    src: '/images/hvac/hvac-technicians-condenser-units.webp',
    width: 1100,
    height: 733,
    alt: 'Two workers beside a bank of outdoor air-conditioning condenser units and ducting.',
    credit: unsplash('Singapore Stock Photos', 'iS5GDeLDk0E'),
  },
  wallUnits: {
    src: '/images/hvac/wall-mounted-ac-units.webp',
    width: 800,
    height: 1200,
    alt: 'Two outdoor air-conditioning units mounted low on a plain white wall.',
    credit: unsplash('Kevin Woblick', 'JkHSdaYRiUI'),
  },
  rooftop: {
    src: '/images/hvac/rooftop-hvac-units.webp',
    width: 800,
    height: 1081,
    alt: 'Rooftop mechanical area with HVAC units and a ladder, seen from above.',
    credit: unsplash('Linus Belanger', 'vvDUCfhiDpE'),
  },
} as const satisfies Record<string, Photo>;
