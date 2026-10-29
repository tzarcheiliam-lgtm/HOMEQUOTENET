import type { BathSpriteEntry, BathSpriteId, BathTextureEntry, BathTextureId } from './types.ts';

/**
 * Texture and sprite manifest for the live bathroom scene. Every file in
 * public/estimator/scene/bath/ (textures/ and sprites/) was made with kie.ai
 * or procedurally by scripts/generate-bath-assets.mjs, never taken from the
 * web; that script holds the prompts, crops and post-processing. src null =
 * no file: the renderer uses `fallback` (textures) or its vector drawing
 * (sprites). `fallback` is each file's mean colour, so the loading state
 * matches the finished picture.
 *
 * Textures are square WebP, seamless (tested 3x3). The paint and concrete
 * files are drawn procedurally and tile_large_porcelain has its grout drawn
 * in (the script's `touchup` step). Wall tile, paint and
 * cabinet fronts are shot straight-on; floors and counters straight down.
 * Sprites are front-on (eye-level) cut-outs with soft alpha edges; their
 * footprints keep the trimmed image's proportions. Vanity sprites are plain
 * satin white, so the renderer can multiply the chosen vanity_* finish over
 * the cabinet body. Faucets come per metal finish; the shower head, rain
 * head, towel bar and sconce are chrome / brushed nickel only (tint or draw
 * small metal with BATH_METAL_COLORS). shower_glass is a mostly transparent
 * procedural panel (clear glass cannot be chroma-keyed).
 */
export const BATH_TEXTURE_DIR = '/estimator/scene/bath/textures/';
export const BATH_SPRITE_DIR = '/estimator/scene/bath/sprites/';

const tex = (id: BathTextureId) => `${BATH_TEXTURE_DIR}${id}.webp`;
const sprite = (id: BathSpriteId) => `${BATH_SPRITE_DIR}${id}.webp`;

export const BATH_TEXTURES: Record<BathTextureId, BathTextureEntry> = {
  // 3 x 6" subway in running bond: 3 tiles across, 6 courses.
  tile_subway: { src: tex('tile_subway'), realFt: 1.5, fallback: '#ebebe5' },
  // 24 x 48" slabs, 2 across (joints every 2 ft; the slab ends sit off-frame).
  tile_large_porcelain: { src: tex('tile_large_porcelain'), realFt: 4, fallback: '#d4cec2' },
  // 4 x 4" handmade squares, about 6 x 6.
  tile_zellige: { src: tex('tile_zellige'), realFt: 2, fallback: '#a6baa7' },
  tile_marble: { src: tex('tile_marble'), realFt: 4, fallback: '#e0dedb' },
  // One 12" tile, joints through the middle.
  tile_plain: { src: tex('tile_plain'), realFt: 1, fallback: '#e6e4d9' },
  // 8 x 48" wood-look planks.
  floor_porcelain_wood: { src: tex('floor_porcelain_wood'), realFt: 6, fallback: '#b59571' },
  // One 24" tile, joints through the middle.
  floor_large_stone: { src: tex('floor_large_stone'), realFt: 2, fallback: '#c2bdb1' },
  // 2" hex.
  floor_hex_mosaic: { src: tex('floor_hex_mosaic'), realFt: 1.5, fallback: '#ecebe5' },
  floor_lvp: { src: tex('floor_lvp'), realFt: 6, fallback: '#a48664' },
  // tile_plain recoloured beige: one 12" tile.
  floor_plain: { src: tex('floor_plain'), realFt: 1, fallback: '#d6cfc1' },
  // Procedural paint (fine stipple, no colour drift) in each generated colour: scripts/generate-bath-assets.mjs touchup.
  paint_soft_white: { src: tex('paint_soft_white'), realFt: 4, fallback: '#f0eee6' },
  paint_greige: { src: tex('paint_greige'), realFt: 4, fallback: '#d2c9b9' },
  paint_sage: { src: tex('paint_sage'), realFt: 4, fallback: '#b3bea4' },
  paint_navy: { src: tex('paint_navy'), realFt: 4, fallback: '#2d3a52' },
  counter_quartz_white: { src: tex('counter_quartz_white'), realFt: 2.5, fallback: '#efeeec' },
  counter_marble_look: { src: tex('counter_marble_look'), realFt: 2.4, fallback: '#ebe9e4' },
  // Procedural smooth trowelled concrete (touchup).
  counter_concrete: { src: tex('counter_concrete'), realFt: 3, fallback: '#999793' },
  vanity_white: { src: tex('vanity_white'), realFt: 3, fallback: '#efeee9' },
  vanity_wood: { src: tex('vanity_wood'), realFt: 3, fallback: '#b38b63' },
  // Recolour of the white satin finish.
  vanity_navy_green: { src: tex('vanity_navy_green'), realFt: 3, fallback: '#2e494b' },
  vanity_black: { src: tex('vanity_black'), realFt: 3, fallback: '#29282b' },
};

/** Front-on footprints in feet (width x height of the trimmed image). */
export const BATH_SPRITES: Record<BathSpriteId, BathSpriteEntry> = {
  // Apron-front 60" tub (front face only).
  tub_alcove: { src: sprite('tub_alcove'), widthFt: 5, heightFt: 1.54 },
  tub_freestanding: { src: sprite('tub_freestanding'), widthFt: 5.5, heightFt: 2.13 },
  // Procedural frameless panel, clamps on the left edge.
  shower_glass: { src: sprite('shower_glass'), widthFt: 3, heightFt: 6.5 },
  // Wall arm + head, seen face-on.
  shower_head: { src: sprite('shower_head'), widthFt: 0.6, heightFt: 0.84 },
  // 12" disc on a ceiling drop arm (arm included).
  rain_head: { src: sprite('rain_head'), widthFt: 1, heightFt: 0.81 },
  toilet: { src: sprite('toilet'), widthFt: 1.12, heightFt: 2.6 },
  // 36" shaker with a 4" backsplash on the white quartz top.
  vanity_single: { src: sprite('vanity_single'), widthFt: 3, heightFt: 3.39 },
  // 72"-style double, drawn a little low: kept to the image's proportions.
  vanity_double: { src: sprite('vanity_double'), widthFt: 6.5, heightFt: 2.26 },
  vanity_floating: { src: sprite('vanity_floating'), widthFt: 4, heightFt: 1.43 },
  mirror: { src: sprite('mirror'), widthFt: 2.2, heightFt: 3.19 },
  mirror_led: { src: sprite('mirror_led'), widthFt: 2.4, heightFt: 3.39 },
  sconce: { src: sprite('sconce'), widthFt: 0.69, heightFt: 1.2 },
  // Side elevation, spout pointing right (flip with scaleX(-1) for the other way).
  faucet_chrome: { src: sprite('faucet_chrome'), widthFt: 0.47, heightFt: 0.7 },
  faucet_matte_black: { src: sprite('faucet_matte_black'), widthFt: 0.47, heightFt: 0.7 },
  faucet_brushed_gold: { src: sprite('faucet_brushed_gold'), widthFt: 0.47, heightFt: 0.7 },
  faucet_brushed_nickel: { src: sprite('faucet_brushed_nickel'), widthFt: 0.47, heightFt: 0.7 },
  // White towel on a chrome bar.
  towel: { src: sprite('towel'), widthFt: 1.6, heightFt: 1.93 },
  plant: { src: sprite('plant'), widthFt: 0.93, heightFt: 2 },
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
