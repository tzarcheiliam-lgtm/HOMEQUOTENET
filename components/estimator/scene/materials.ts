import type { SceneSpec, TextureId } from '@/lib/estimator/scene/types';

/**
 * Option id -> look for the live pool scene. The template's own ids map
 * directly; a contractor's catalog swap (lib/estimator/catalog/pool.ts) maps to
 * the closest look, and anything unknown falls back to a neutral default.
 */

export type WaterLook = {
  floor: TextureId;
  /** Water tint over the floor (day). */
  tint: string;
  /** Deep-end colour. */
  deep: string;
  /** How strongly the tint covers the floor (0-1). */
  tintOpacity: number;
};

const WATER: Record<'plaster' | 'quartz' | 'pebble' | 'colored' | 'default', WaterLook> = {
  // Bright white plaster under clear water: the classic bright turquoise (drive/031).
  plaster: { floor: 'floor_plaster', tint: '#5fd0e0', deep: '#1fa3c4', tintOpacity: 0.68 },
  // Quartz: a clear azure blue.
  quartz: { floor: 'floor_quartz', tint: '#3aa6d0', deep: '#16729f', tintOpacity: 0.72 },
  // Pebble: deep teal-grey, the stones read through (drive/024).
  pebble: { floor: 'floor_pebble', tint: '#2f7f95', deep: '#174f60', tintOpacity: 0.6 },
  colored: { floor: 'floor_quartz', tint: '#2a8fbf', deep: '#155f8f', tintOpacity: 0.76 },
  // Not chosen yet: an existing plaster pool, a little less bright than new plaster.
  default: { floor: 'floor_plaster', tint: '#4cc4d8', deep: '#1a98ba', tintOpacity: 0.7 },
};

export function waterLook(surface: string | null): WaterLook {
  switch (surface) {
    case 'plaster':
      return WATER.plaster;
    case 'colored_plaster':
      return WATER.colored;
    case 'quartz':
    case 'glass_bead':
    case 'full_tile':
      return WATER.quartz;
    case 'pebble':
    case 'mini_pebble':
    case 'polished_pebble':
      return WATER.pebble;
    default:
      return WATER.default;
  }
}

/** Waterline tile; an unpicked tile shows the existing porcelain band. */
export function tileTexture(tile: string | null): TextureId {
  if (tile === 'glass' || tile === 'glass_mosaic') return 'tile_glass';
  if (tile === 'stone' || tile === 'natural_stone') return 'tile_stone';
  return 'tile_porcelain';
}

/** Coping; an unpicked coping shows existing concrete. */
export function copingTexture(coping: string | null): TextureId {
  if (coping === 'travertine' || coping === 'porcelain') return 'coping_travertine';
  if (coping === 'stone' || coping === 'bluestone_limestone' || coping === 'brick') return 'coping_stone';
  return 'coping_concrete';
}

/** Deck; null = the existing deck (old concrete). */
export function deckTexture(deck: string | null): TextureId {
  switch (deck) {
    case 'pavers':
    case 'flagstone':
    case 'stepping_stones_turf':
      return 'deck_pavers';
    case 'porcelain':
      return 'deck_porcelain';
    case 'resurface':
      return 'deck_resurface';
    case 'decomposed_granite':
      return 'gravel_dg';
    case 'wood_composite':
      return 'wood_slats';
    default:
      return 'deck_concrete';
  }
}

/** A short key per material layer: when it changes, that layer crossfades. */
export function materialKeys(scene: SceneSpec) {
  return {
    water: scene.surface ?? 'default',
    tile: tileTexture(scene.tile),
    coping: copingTexture(scene.coping),
    deck: scene.deck ? deckTexture(scene.deck) : 'existing',
    ground: scene.extras.turfPlanting ? 'turf' : 'grass',
  };
}

/* ------------------------------------------------------------------ */
/* Option tiles                                                        */
/* ------------------------------------------------------------------ */

/** The material questions whose options can show a crop of the scene's own texture. */
export type MaterialQuestionId = 'surface' | 'tile' | 'coping' | 'deck';

export type OptionMaterial = {
  texture: TextureId;
  /** Surface finishes are shown under water, the way the scene draws them; null for the rest. */
  water: WaterLook | null;
  /** Real-world feet across the option tile, so pebbles, tiles and pavers keep a believable size. */
  viewFt: number;
};

/** How much of the material one option tile shows (feet across). */
const VIEW_FT: Record<MaterialQuestionId, number> = { surface: 4, tile: 3, coping: 5.5, deck: 11 };

/**
 * Option ids whose look the scene really has a texture for. Deliberately
 * strict: a catalog option only drawn as the "closest look" in the scene (brick
 * coping as stone, stamped concrete as plain concrete) keeps its swatch or no
 * picture, so a tile never shows a material the homeowner did not pick.
 */
const OPTION_TEXTURES: Record<MaterialQuestionId, Record<string, TextureId>> = {
  surface: { plaster: 'floor_plaster', quartz: 'floor_quartz', pebble: 'floor_pebble', mini_pebble: 'floor_pebble', polished_pebble: 'floor_pebble' },
  tile: {
    porcelain: 'tile_porcelain',
    ceramic: 'tile_porcelain',
    italian_porcelain: 'tile_porcelain',
    glass: 'tile_glass',
    glass_mosaic: 'tile_glass',
    stone: 'tile_stone',
    natural_stone: 'tile_stone',
  },
  coping: {
    concrete: 'coping_concrete',
    precast: 'coping_concrete',
    poured_in_place: 'coping_concrete',
    travertine: 'coping_travertine',
    stone: 'coping_stone',
    bluestone_limestone: 'coping_stone',
  },
  deck: {
    pavers: 'deck_pavers',
    concrete: 'deck_concrete',
    salt_finish: 'deck_concrete',
    porcelain: 'deck_porcelain',
    resurface: 'deck_resurface',
    decomposed_granite: 'gravel_dg',
    wood_composite: 'wood_slats',
  },
};

function isMaterialQuestion(id: string): id is MaterialQuestionId {
  return id === 'surface' || id === 'tile' || id === 'coping' || id === 'deck';
}

/**
 * The real texture an option tile shows (the same image the scene paints when
 * it is picked), or null when there is none (unknown or catalog-only ids, "not
 * sure", non-material questions): the tile then falls back to its swatch.
 */
export function optionMaterial(questionId: string, optionId: string): OptionMaterial | null {
  if (!isMaterialQuestion(questionId)) return null;
  const texture = OPTION_TEXTURES[questionId][optionId];
  if (!texture) return null;
  return { texture, water: questionId === 'surface' ? waterLook(optionId) : null, viewFt: VIEW_FT[questionId] };
}
