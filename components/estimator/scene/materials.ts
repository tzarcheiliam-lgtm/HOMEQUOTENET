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
