import type { Answers } from '../types.ts';
import type { SceneSpec } from './types.ts';

/**
 * The picture before the homeowner has answered anything: a finished example
 * backyard (not a bare pool on a lawn), so the first thing they see is what
 * the builder can make. It is always captioned as an example, and it is
 * replaced by a picture of their own answers the moment they pick anything.
 * Never priced, never sent anywhere.
 */
export const EXAMPLE_SCENE: SceneSpec = {
  project: 'backyard',
  shape: 'rectangle',
  lengthFt: 34,
  widthFt: 15,
  surface: 'quartz',
  tile: 'glass',
  coping: 'travertine',
  deck: 'porcelain',
  deckSize: 'medium',
  features: { baja: true, spa: true, waterBowls: false, fireBowls: true, lights: true },
  extras: { kitchen: false, patioCover: true, turfPlanting: true, firePit: true },
};

/** True once any question has a pick (or dimensions were typed): from then on the picture shows only their answers. */
export function hasAnyPick(answers: Answers, dimensionsTyped = false): boolean {
  return dimensionsTyped || Object.values(answers).some((picks) => Array.isArray(picks) && picks.length > 0);
}
