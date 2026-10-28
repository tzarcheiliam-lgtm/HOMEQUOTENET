/**
 * Live top-down pool scene: the shared contract.
 *
 * The estimator turns the homeowner's answers into a SceneSpec (pure, see
 * scene.ts), and <PoolScene> draws it as one layered top-down picture that
 * updates instantly on every pick. Textures and sprites are pre-generated
 * image files (see textures.ts); nothing is generated while a visitor clicks.
 *
 * Change these types deliberately: scene.ts, textures.ts, the PoolScene
 * renderer, the estimator screens and the photoreal render all build on them.
 */

/** Scene canvas, in SVG user units. 1 ft = SCENE.pxPerFt units. */
export const SCENE = { width: 1200, height: 800, pxPerFt: 13 } as const;

export type SceneShape = 'rectangle' | 'l_shape' | 'freeform';
export type SceneDeckSize = 'none' | 'small' | 'medium' | 'large';

/** Everything the picture shows. Null = nothing chosen yet (draw a tasteful default). */
export type SceneSpec = {
  /** remodel = pool in an existing yard; backyard = pool plus outdoor-living extras. */
  project: 'remodel' | 'backyard';
  shape: SceneShape;
  /** Pool water footprint in feet (from the size preset or typed dimensions). */
  lengthFt: number;
  widthFt: number;
  /** Interior finish option id: plaster | quartz | pebble, or null (unsure / not picked). */
  surface: string | null;
  /** Waterline tile option id: porcelain | glass | stone, or null. */
  tile: string | null;
  /** Coping option id: concrete | travertine | stone, or null. */
  coping: string | null;
  /** Deck material option id: pavers | concrete | porcelain | resurface, or null (existing deck). */
  deck: string | null;
  deckSize: SceneDeckSize;
  features: {
    baja: boolean;
    spa: boolean;
    waterBowls: boolean;
    fireBowls: boolean;
    lights: boolean;
  };
  extras: {
    kitchen: boolean;
    patioCover: boolean;
    turfPlanting: boolean;
    firePit: boolean;
  };
};

/**
 * Seamless, top-down, tileable material textures (square WebP, transparent not
 * needed). `realFt` in the manifest says how many feet one tile covers, so
 * pavers and tiles keep a believable scale at every pool size.
 */
export const TEXTURE_IDS = [
  // Pool interior, seen through the water (the water layer tints them).
  'floor_plaster',
  'floor_quartz',
  'floor_pebble',
  // Grayscale caustic light pattern, blended over the water and animated.
  'water_caustics',
  // Waterline tile band.
  'tile_porcelain',
  'tile_glass',
  'tile_stone',
  // Coping ring.
  'coping_concrete',
  'coping_travertine',
  'coping_stone',
  // Deck.
  'deck_pavers',
  'deck_concrete',
  'deck_porcelain',
  'deck_resurface',
  // Yard and extras.
  'lawn_grass',
  'lawn_turf',
  'planting_bed',
  'gravel_dg',
  'roof_shingle',
  'wood_slats',
  'counter_stone',
  'firepit_stone',
] as const;
export type TextureId = (typeof TEXTURE_IDS)[number];

export type TextureEntry = {
  /** Public path (e.g. /estimator/scene/textures/deck_pavers.webp) or null until generated. */
  src: string | null;
  /** Real-world feet covered by one tile of the image. */
  realFt: number;
  /** Flat colour used while the image loads or when src is null. */
  fallback: string;
};

/**
 * Top-down objects with transparent backgrounds (PNG/WebP). Optional: the
 * renderer draws a vector version when src is null.
 */
export const SPRITE_IDS = [
  'lounger',
  'umbrella',
  'olive_tree',
  'shrub',
  'fire_bowl',
  'water_bowl',
  'outdoor_kitchen',
  'fire_pit',
  'patio_set',
] as const;
export type SpriteId = (typeof SPRITE_IDS)[number];

export type SpriteEntry = {
  src: string | null;
  /** Real-world footprint in feet (width x height of the image). */
  widthFt: number;
  heightFt: number;
};
