/**
 * Live bathroom scene: the shared contract.
 *
 * The estimator turns the homeowner's answers into a BathSceneSpec (pure, see
 * scene.ts) and <BathScene> draws it as one layered picture of THEIR bathroom
 * that updates instantly on every pick. Textures and sprites are pre-generated
 * image files (kie.ai or procedural, see textures.ts); nothing is generated
 * while a visitor clicks. No photo from the web is ever used.
 *
 * Change these types deliberately: scene.ts, textures.ts, the BathScene
 * renderer, the bath builder adapter and the photoreal render build on them.
 */

/** Scene canvas, in SVG/canvas units: 3:2, the same frame, PNG export and render aspect as the pool. */
export const BATH_SCENE = { width: 1200, height: 800 } as const;

/** Room size class: drives how much room the picture shows (a hall bath vs a primary suite). */
export type BathRoom = 'small' | 'medium' | 'large';

/** The bathing layout drawn. 'existing' = keep / not chosen: a plain, tasteful tub-and-shower stands in. */
export type BathBathing = 'walk_in' | 'tub_shower' | 'tub_and_shower' | 'existing';

export type BathVanity = 'single' | 'double' | 'floating';

/** Lighting mood of the picture (the builder's Daylight / Evening switch). */
export type BathMood = 'day' | 'evening';

/**
 * Everything the picture shows. A material that is null was not chosen yet
 * (or its question is hidden): the renderer draws a tasteful neutral default.
 * Material values are the picked option ids; a contractor's catalog swap
 * passes through and the renderer maps it to the closest look.
 */
export type BathSceneSpec = {
  project: 'refresh' | 'full' | 'tub_to_shower';
  room: BathRoom;
  /** Room floor in feet (size preset or typed dimensions). */
  lengthFt: number;
  widthFt: number;
  bathing: BathBathing;
  /** Shower wall tile: subway | large_porcelain | zellige | marble, or null. */
  showerTile: string | null;
  /** A glass shower enclosure is drawn (walk-in or separate shower). */
  glass: boolean;
  /** porcelain_wood | large_stone | hex_mosaic | lvp, or null. */
  floor: string | null;
  /** soft_white | greige | sage | navy, or null. */
  paint: string | null;
  /** Vanity type; null = not chosen (a single vanity stands in). */
  vanity: BathVanity | null;
  /** white | wood | navy_green | black, or null. */
  vanityFinish: string | null;
  /** quartz_white | marble_look | concrete, or null. */
  counter: string | null;
  /** chrome | matte_black | brushed_gold | brushed_nickel, or null. */
  metal: string | null;
  extras: {
    niche: boolean;
    bench: boolean;
    ledMirror: boolean;
    heatedFloor: boolean;
    rainHead: boolean;
  };
  /**
   * Scope items ticked (what will be new). Before a material is picked a
   * renewed area is drawn as a clean, neutral new finish instead of the
   * existing beige one, so ticking it already changes the picture. Absent =
   * nothing ticked (or a spec made before this field existed).
   */
  renew?: { bathing: boolean; vanity: boolean; floor: boolean; walls: boolean };
};

/**
 * Seamless, front-on (wall) or top-down (floor) tileable material textures,
 * square WebP. `realFt` in the manifest says how many feet one tile covers, so
 * subway tile and planks keep a believable scale in every room size.
 */
export const BATH_TEXTURE_IDS = [
  // Shower walls.
  'tile_subway',
  'tile_large_porcelain',
  'tile_zellige',
  'tile_marble',
  // Neutral default wall tile (nothing chosen / keep current).
  'tile_plain',
  // Floor.
  'floor_porcelain_wood',
  'floor_large_stone',
  'floor_hex_mosaic',
  'floor_lvp',
  // Neutral default floor.
  'floor_plain',
  // Painted wall, with a faint roller texture (one per colour).
  'paint_soft_white',
  'paint_greige',
  'paint_sage',
  'paint_navy',
  // Countertop.
  'counter_quartz_white',
  'counter_marble_look',
  'counter_concrete',
  // Vanity cabinet fronts.
  'vanity_white',
  'vanity_wood',
  'vanity_navy_green',
  'vanity_black',
] as const;
export type BathTextureId = (typeof BATH_TEXTURE_IDS)[number];

/**
 * Objects with transparent backgrounds (PNG/WebP), front-on to match the room
 * view. Optional: the renderer draws a vector version when src is null.
 * Vanity sprites carry the shape, shading, doors and basin; the cabinet body
 * is tinted with the chosen vanity_* texture. Faucets come per metal finish;
 * smaller metal (shower trim, towel bar, sconce arms) is drawn in the metal's
 * fallback colour (BATH_METAL_COLORS).
 */
export const BATH_SPRITE_IDS = [
  'tub_alcove',
  'tub_freestanding',
  'shower_glass',
  'shower_head',
  'rain_head',
  'toilet',
  'vanity_single',
  'vanity_double',
  'vanity_floating',
  'mirror',
  'mirror_led',
  'sconce',
  'faucet_chrome',
  'faucet_matte_black',
  'faucet_brushed_gold',
  'faucet_brushed_nickel',
  'towel',
  'plant',
] as const;
export type BathSpriteId = (typeof BATH_SPRITE_IDS)[number];

export type { SpriteEntry as BathSpriteEntry, TextureEntry as BathTextureEntry } from '../types.ts';
