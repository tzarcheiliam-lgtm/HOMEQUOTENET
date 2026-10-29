/**
 * Hero assets, made once: a <PoolScene> of a Signature-look design rendered to
 * PNG, and the photoreal render of that same picture from the production
 * kie.ai model and prompt (lib/estimator/render.ts). 1200 x 800 WebP (the
 * builder frame's 3:2), no metadata. A plain module (not 'use client') so the
 * server page can use the paths for its share preview.
 */
export const HERO_IMAGES = {
  illustration: '/estimator/hero/pool-design-illustration.webp',
  photo: '/estimator/hero/pool-design-photo.webp',
} as const;

/**
 * Bathroom builder examples. The pair: a <BathScene> of the Spa retreat
 * package in a large room (the builder's own "Save my design" export) and its
 * render from the production kie.ai model and bathroom prompt
 * (renderPromptFor('bathroom')), same 1200 x 800 WebP format. The
 * clip is an AI-rendered remodeled bathroom (scripts/generate-bath-assets.mjs).
 * Either may be missing: the page only shows the files that exist
 * (resolveExampleMedia).
 */
export const BATH_EXAMPLE_IMAGES = {
  illustration: '/estimator/hero/bath-example-design.webp',
  photo: '/estimator/hero/bath-example-photo.webp',
} as const;

export const BATH_HERO_VIDEO = {
  mp4: '/estimator/hero/bath-hero.mp4',
  webm: '/estimator/hero/bath-hero.webm',
  poster: '/estimator/hero/bath-hero.webp',
  alt: 'AI-rendered example of a remodeled bathroom with a glass walk-in shower, a floating oak vanity and a freestanding tub',
} as const;
