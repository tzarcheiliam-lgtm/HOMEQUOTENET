import type { GalleryImage } from '@/lib/estimator/types';

/*
 * Bathroom builder images (/estimator/bathroom-remodel). HomeQuote Network is
 * a matching network with no jobs of its own, so these are AI-generated style
 * ideas (kie.ai nano-banana-pro), never real completed projects: captions and
 * alt text say so, and nothing here may be presented as "our work". Nothing is
 * taken from the web. Files live in public/estimator/bathroom/ (thumbs/ holds
 * 720 px copies and the option crops); re-make them with
 * `node scripts/generate-bath-assets.mjs generate|post` (metadata stripped).
 */
const DIR = '/estimator/bathroom/';
const THUMBS = `${DIR}thumbs/`;

/** Labels every gallery caption, so a style idea is never read as a finished job. */
export const BATH_STYLE_IDEA_LABEL = 'Style idea (AI-generated)';

const look = (name: string, alt: string, caption: string): GalleryImage => ({
  src: `${DIR}${name}.webp`,
  thumb: `${THUMBS}${name}.webp`,
  alt,
  caption: `${BATH_STYLE_IDEA_LABEL}: ${caption}`,
});

/** "Which look do you like?" style ideas (full size kept with the lead; tiles show `thumb`). Not priced. */
export const BATH_GALLERY: GalleryImage[] = [
  look('style-modern-spa', 'AI-generated modern spa bathroom with a curbless walk-in shower, built-in bench and niche, a floating oak vanity and a backlit mirror', 'Modern spa'),
  look('style-warm-wood', 'AI-generated bathroom with white subway tile, an oak double vanity, brass fixtures and a white hexagon floor', 'Warm wood and white'),
  look('style-classic-marble', 'AI-generated marble bathroom with a freestanding soaking tub and a separate glass shower', 'Classic marble'),
  look('style-green-zellige', 'AI-generated bathroom with a green zellige tiled walk-in shower and brushed gold fixtures', 'Bold green zellige'),
  look('style-black-white', 'AI-generated black-and-white bathroom with a hexagon floor, a black vanity and matte black fixtures', 'Black and white'),
  look('style-coastal', 'AI-generated coastal bathroom with pale blue tile, a light wood vanity and a wood-look floor', 'Light coastal'),
  look('style-navy-hall', 'AI-generated compact hall bathroom with a navy vanity and a tub-and-shower combo with a recessed niche', 'Navy hall bath'),
  look('style-heated-floor', 'AI-generated greige bathroom with a floating oak vanity and a glowing LED backlit mirror', 'Soft greige retreat'),
];

/**
 * Picture for an option tile, keyed by "questionId.optionId": a crop of one of
 * the style ideas above, only where it genuinely shows that option. Materials
 * (tile, floor, counter, finish) use the texture samples the live picture
 * paints instead, so the tile matches the picture exactly (the showerTile.*
 * crops stay in public/ unused). The questions that show these say the
 * pictures are AI-generated style ideas (templates/bathroom.ts).
 */
export const BATH_OPTION_IMAGES: Record<string, string> = {
  'bathing.walk_in': `${THUMBS}option-bathing-walk_in.webp`,
  'bathing.tub_shower': `${THUMBS}option-bathing-tub_shower.webp`,
  'bathing.tub_and_shower': `${THUMBS}option-bathing-tub_and_shower.webp`,
  'vanity.single': `${THUMBS}option-vanity-single.webp`,
  'vanity.double': `${THUMBS}option-vanity-double.webp`,
  'vanity.floating': `${THUMBS}option-vanity-floating.webp`,
  'extras.niche': `${THUMBS}option-extras-niche.webp`,
  'extras.bench': `${THUMBS}option-extras-bench.webp`,
  'extras.led_mirror': `${THUMBS}option-extras-led_mirror.webp`,
};

/** First-screen clip: a slow push-in on an AI-rendered remodeled bathroom (silent, loops). */
export const BATH_HERO_VIDEO = {
  mp4: '/estimator/hero/bath-hero.mp4',
  webm: '/estimator/hero/bath-hero.webm',
  poster: '/estimator/hero/bath-hero.webp',
  alt: 'AI-rendered remodeled bathroom with a glass walk-in shower, a floating oak vanity and a freestanding tub',
} as const;
