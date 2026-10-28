import type { SpriteEntry, SpriteId, TextureEntry, TextureId } from './types.ts';

/**
 * Texture and sprite manifest for the live pool scene. src null = not
 * generated yet: the renderer uses `fallback` (textures) or its vector
 * drawing (sprites). Files live in public/estimator/scene/ and are made by
 * scripts/generate-scene-textures.mjs (kie.ai nano-banana-2 + seamless
 * post-processing; water_caustics is procedural, white light in the alpha
 * channel). Files are exported at about twice their largest on-screen size
 * (256 px for small tiles, 384-512 px for decks and lawns) so phones decode
 * little. Each fallback is the file's own mean colour, so the loading state
 * matches the finished picture.
 */
const T = '/estimator/scene/textures/';
const S = '/estimator/scene/sprites/';

export const TEXTURES: Record<TextureId, TextureEntry> = {
  floor_plaster: { src: `${T}floor_plaster.webp`, realFt: 6, fallback: '#eff0ef' },
  floor_quartz: { src: `${T}floor_quartz.webp`, realFt: 6, fallback: '#cadde7' },
  // Pebbles about half an inch across.
  floor_pebble: { src: `${T}floor_pebble.webp`, realFt: 2.5, fallback: '#8b979d' },
  water_caustics: { src: `${T}water_caustics.webp`, realFt: 8, fallback: 'transparent' },
  // Tiles: 4 x 6" porcelain, 12 x 2" glass mosaic, 4 x 6" slate per image.
  tile_porcelain: { src: `${T}tile_porcelain.webp`, realFt: 2, fallback: '#295d71' },
  tile_glass: { src: `${T}tile_glass.webp`, realFt: 2, fallback: '#4b9bb8' },
  tile_stone: { src: `${T}tile_stone.webp`, realFt: 2, fallback: '#5c5f60' },
  // Coping: 2 x 2 square 16" pieces per image.
  coping_concrete: { src: `${T}coping_concrete.webp`, realFt: 2.67, fallback: '#e7e5e0' },
  coping_travertine: { src: `${T}coping_travertine.webp`, realFt: 2.67, fallback: '#e7dcc8' },
  coping_stone: { src: `${T}coping_stone.webp`, realFt: 2.67, fallback: '#b7b1a4' },
  // Large-format 18 x 36" pavers, 3 across and 6 rows.
  deck_pavers: { src: `${T}deck_pavers.webp`, realFt: 9, fallback: '#d3c4ad' },
  deck_concrete: { src: `${T}deck_concrete.webp`, realFt: 8, fallback: '#cac8c1' },
  // 24 x 48" porcelain slabs, 2 across and 4 down.
  deck_porcelain: { src: `${T}deck_porcelain.webp`, realFt: 8, fallback: '#d9d4ca' },
  deck_resurface: { src: `${T}deck_resurface.webp`, realFt: 8, fallback: '#ded2bd' },
  // Both graded toward the darker olive turf of the drone photos.
  lawn_grass: { src: `${T}lawn_grass.webp`, realFt: 8, fallback: '#62743c' },
  lawn_turf: { src: `${T}lawn_turf.webp`, realFt: 8, fallback: '#5b6936' },
  planting_bed: { src: `${T}planting_bed.webp`, realFt: 6, fallback: '#554334' },
  gravel_dg: { src: `${T}gravel_dg.webp`, realFt: 5, fallback: '#c8ab7b' },
  roof_shingle: { src: `${T}roof_shingle.webp`, realFt: 10, fallback: '#56595e' },
  // Ipe boards 6" wide, running horizontally (12 per image).
  wood_slats: { src: `${T}wood_slats.webp`, realFt: 6, fallback: '#966342' },
  counter_stone: { src: `${T}counter_stone.webp`, realFt: 4, fallback: '#cec8bd' },
  firepit_stone: { src: `${T}firepit_stone.webp`, realFt: 4, fallback: '#958f85' },
};

/** Footprints follow each cut-out's trimmed proportions (long side kept at its real size). */
export const SPRITES: Record<SpriteId, SpriteEntry> = {
  // Head of the lounger at the top of the image.
  lounger: { src: `${S}lounger.webp`, widthFt: 2.2, heightFt: 6.5 },
  umbrella: { src: `${S}umbrella.webp`, widthFt: 9, heightFt: 9 },
  olive_tree: { src: `${S}olive_tree.webp`, widthFt: 8, heightFt: 8 },
  shrub: { src: `${S}shrub.webp`, widthFt: 3, heightFt: 3 },
  fire_bowl: { src: `${S}fire_bowl.webp`, widthFt: 3, heightFt: 3 },
  water_bowl: { src: `${S}water_bowl.webp`, widthFt: 3, heightFt: 3 },
  // Long side horizontal; the front (cabinet) edge is the bottom of the image.
  outdoor_kitchen: { src: `${S}outdoor_kitchen.webp`, widthFt: 12, heightFt: 4.15 },
  fire_pit: { src: `${S}fire_pit.webp`, widthFt: 5, heightFt: 5 },
  patio_set: { src: `${S}patio_set.webp`, widthFt: 9, heightFt: 6.4 },
};
