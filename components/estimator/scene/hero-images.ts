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
