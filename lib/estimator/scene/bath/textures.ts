import type { BathSpriteEntry, BathSpriteId, BathTextureEntry, BathTextureId } from './types.ts';

/**
 * Texture and sprite manifest for the live bathroom scene. src null = not
 * generated yet: the renderer uses `fallback` (textures) or its vector
 * drawing (sprites). Generated files go in public/estimator/scene/bath/
 * (textures/ and sprites/), made with kie.ai or procedurally, never taken
 * from the web. When a file lands, set its src and make `fallback` the
 * file's mean colour so the loading state matches the finished picture.
 */
export const BATH_TEXTURE_DIR = '/estimator/scene/bath/textures/';
export const BATH_SPRITE_DIR = '/estimator/scene/bath/sprites/';

export const BATH_TEXTURES: Record<BathTextureId, BathTextureEntry> = {
  // 3 x 6" subway, 8 courses per image.
  tile_subway: { src: null, realFt: 2, fallback: '#f1f0ec' },
  // 24 x 48" slabs, 2 across.
  tile_large_porcelain: { src: null, realFt: 4, fallback: '#e4e1db' },
  // 4 x 4" handmade squares.
  tile_zellige: { src: null, realFt: 2, fallback: '#cfe0d8' },
  tile_marble: { src: null, realFt: 4, fallback: '#ecebe8' },
  tile_plain: { src: null, realFt: 2, fallback: '#e9e6df' },
  floor_porcelain_wood: { src: null, realFt: 6, fallback: '#b08a64' },
  floor_large_stone: { src: null, realFt: 4, fallback: '#cfcac1' },
  // 2" hex.
  floor_hex_mosaic: { src: null, realFt: 1.5, fallback: '#efefec' },
  floor_lvp: { src: null, realFt: 6, fallback: '#a9927a' },
  floor_plain: { src: null, realFt: 2, fallback: '#d8d2c6' },
  paint_soft_white: { src: null, realFt: 4, fallback: '#f3f0e8' },
  paint_greige: { src: null, realFt: 4, fallback: '#d6cdbf' },
  paint_sage: { src: null, realFt: 4, fallback: '#b5c0a6' },
  paint_navy: { src: null, realFt: 4, fallback: '#2d3a52' },
  counter_quartz_white: { src: null, realFt: 3, fallback: '#f4f3f0' },
  counter_marble_look: { src: null, realFt: 3, fallback: '#ebe9e4' },
  counter_concrete: { src: null, realFt: 3, fallback: '#a8a6a1' },
  vanity_white: { src: null, realFt: 3, fallback: '#f2f1ee' },
  vanity_wood: { src: null, realFt: 3, fallback: '#a87b52' },
  vanity_navy_green: { src: null, realFt: 3, fallback: '#2f4a4a' },
  vanity_black: { src: null, realFt: 3, fallback: '#26262a' },
};

/** Front-on footprints in feet (width x height of the image). */
export const BATH_SPRITES: Record<BathSpriteId, BathSpriteEntry> = {
  tub_alcove: { src: null, widthFt: 5, heightFt: 1.8 },
  tub_freestanding: { src: null, widthFt: 5.5, heightFt: 2 },
  shower_glass: { src: null, widthFt: 3, heightFt: 6.5 },
  shower_head: { src: null, widthFt: 0.6, heightFt: 0.8 },
  rain_head: { src: null, widthFt: 1, heightFt: 1.2 },
  toilet: { src: null, widthFt: 1.6, heightFt: 2.6 },
  vanity_single: { src: null, widthFt: 3, heightFt: 2.9 },
  vanity_double: { src: null, widthFt: 6, heightFt: 2.9 },
  vanity_floating: { src: null, widthFt: 4, heightFt: 1.8 },
  mirror: { src: null, widthFt: 2.2, heightFt: 3 },
  mirror_led: { src: null, widthFt: 2.4, heightFt: 3.2 },
  sconce: { src: null, widthFt: 0.5, heightFt: 1.2 },
  faucet_chrome: { src: null, widthFt: 0.6, heightFt: 0.7 },
  faucet_matte_black: { src: null, widthFt: 0.6, heightFt: 0.7 },
  faucet_brushed_gold: { src: null, widthFt: 0.6, heightFt: 0.7 },
  faucet_brushed_nickel: { src: null, widthFt: 0.6, heightFt: 0.7 },
  towel: { src: null, widthFt: 1.6, heightFt: 2.2 },
  plant: { src: null, widthFt: 1.2, heightFt: 2 },
};

/** Fixture finish colours for small vector metal (trim, bars, sconce arms). */
export const BATH_METAL_COLORS: Record<string, string> = {
  chrome: '#c9ced3',
  matte_black: '#2a2a2c',
  brushed_gold: '#c2a26a',
  brushed_nickel: '#a9a8a2',
};
/** Metal used while no finish is chosen. */
export const BATH_DEFAULT_METAL = 'chrome';

/** Template option -> its texture, for the picture and for material samples on option cards. */
const OPTION_TEXTURES: Record<string, Record<string, BathTextureId>> = {
  showerTile: { subway: 'tile_subway', large_porcelain: 'tile_large_porcelain', zellige: 'tile_zellige', marble: 'tile_marble' },
  floor: { porcelain_wood: 'floor_porcelain_wood', large_stone: 'floor_large_stone', hex_mosaic: 'floor_hex_mosaic', lvp: 'floor_lvp' },
  paint: { soft_white: 'paint_soft_white', greige: 'paint_greige', sage: 'paint_sage', navy: 'paint_navy' },
  counter: { quartz_white: 'counter_quartz_white', marble_look: 'counter_marble_look', concrete: 'counter_concrete' },
  vanityFinish: { white: 'vanity_white', wood: 'vanity_wood', navy_green: 'vanity_navy_green', black: 'vanity_black' },
};

/** Texture used while a material is not chosen. */
export const BATH_DEFAULT_TEXTURES: Record<keyof typeof OPTION_TEXTURES, BathTextureId> = {
  showerTile: 'tile_plain',
  floor: 'floor_plain',
  paint: 'paint_soft_white',
  counter: 'counter_quartz_white',
  vanityFinish: 'vanity_white',
};

/** The texture for a template option, or null (unknown option, or a question with no material). */
export function bathOptionTexture(questionId: string, optionId: string): BathTextureId | null {
  return OPTION_TEXTURES[questionId]?.[optionId] ?? null;
}
