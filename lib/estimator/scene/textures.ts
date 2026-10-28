import type { SpriteEntry, SpriteId, TextureEntry, TextureId } from './types.ts';

/**
 * Texture and sprite manifest for the live pool scene. src null = not
 * generated yet: the renderer uses `fallback` (textures) or its vector
 * drawing (sprites). Files live in public/estimator/scene/.
 */
export const TEXTURES: Record<TextureId, TextureEntry> = {
  floor_plaster: { src: null, realFt: 6, fallback: '#e9f3f4' },
  floor_quartz: { src: null, realFt: 6, fallback: '#cfe6ea' },
  floor_pebble: { src: null, realFt: 4, fallback: '#7f97a0' },
  water_caustics: { src: null, realFt: 8, fallback: 'transparent' },
  tile_porcelain: { src: null, realFt: 3, fallback: '#3f6f86' },
  tile_glass: { src: null, realFt: 2, fallback: '#2f8fb0' },
  tile_stone: { src: null, realFt: 3, fallback: '#8a8478' },
  coping_concrete: { src: null, realFt: 4, fallback: '#d9d6cf' },
  coping_travertine: { src: null, realFt: 4, fallback: '#e3d6bf' },
  coping_stone: { src: null, realFt: 4, fallback: '#bdb6a8' },
  deck_pavers: { src: null, realFt: 6, fallback: '#cdbfa6' },
  deck_concrete: { src: null, realFt: 8, fallback: '#cfccc5' },
  deck_porcelain: { src: null, realFt: 8, fallback: '#e1ddd5' },
  deck_resurface: { src: null, realFt: 8, fallback: '#ddd3c2' },
  lawn_grass: { src: null, realFt: 10, fallback: '#6f9b4c' },
  lawn_turf: { src: null, realFt: 8, fallback: '#5f9a3f' },
  planting_bed: { src: null, realFt: 6, fallback: '#6b5a45' },
  gravel_dg: { src: null, realFt: 6, fallback: '#c8b48e' },
  roof_shingle: { src: null, realFt: 10, fallback: '#5b5f66' },
  wood_slats: { src: null, realFt: 6, fallback: '#9a6b42' },
  counter_stone: { src: null, realFt: 4, fallback: '#d8d4cc' },
  firepit_stone: { src: null, realFt: 4, fallback: '#8f8a82' },
};

export const SPRITES: Record<SpriteId, SpriteEntry> = {
  lounger: { src: null, widthFt: 2.5, heightFt: 6.5 },
  umbrella: { src: null, widthFt: 9, heightFt: 9 },
  olive_tree: { src: null, widthFt: 8, heightFt: 8 },
  shrub: { src: null, widthFt: 3, heightFt: 3 },
  fire_bowl: { src: null, widthFt: 3, heightFt: 3 },
  water_bowl: { src: null, widthFt: 3, heightFt: 3 },
  outdoor_kitchen: { src: null, widthFt: 12, heightFt: 4 },
  fire_pit: { src: null, widthFt: 5, heightFt: 5 },
  patio_set: { src: null, widthFt: 9, heightFt: 7 },
};
