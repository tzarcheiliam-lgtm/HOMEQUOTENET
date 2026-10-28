import type { Answers, EstimateInput, EstimatorTemplate } from '../types.ts';
import type { SceneSpec } from './types.ts';

/**
 * STAND-IN: answers (+ typed dimensions) -> SceneSpec. Signature is the
 * contract; the body is replaced by the real scene builder.
 */
export function buildScene(template: EstimatorTemplate, input: EstimateInput): SceneSpec {
  const pick = (id: string) => (input.answers[id] ?? [])[0] ?? null;
  const has = (id: string, opt: string) => (input.answers[id] ?? []).includes(opt);
  void template;
  return {
    project: pick('project') === 'backyard' ? 'backyard' : 'remodel',
    shape: pick('shape') === 'l_shape' ? 'l_shape' : pick('shape') === 'freeform' ? 'freeform' : 'rectangle',
    lengthFt: input.dimensions?.lengthFt ?? 30,
    widthFt: input.dimensions?.widthFt ?? 15,
    surface: pick('surface'),
    tile: pick('tile'),
    coping: pick('coping'),
    deck: pick('deck'),
    deckSize: (pick('deckSize') as SceneSpec['deckSize']) ?? 'none',
    features: { baja: has('features', 'baja'), spa: has('features', 'spa'), waterBowls: has('features', 'water'), fireBowls: has('features', 'fire'), lights: has('features', 'lighting') },
    extras: { kitchen: has('extras', 'kitchen'), patioCover: has('extras', 'patio_cover'), turfPlanting: has('extras', 'turf_planting'), firePit: has('extras', 'fire_pit') },
  };
}

export type { Answers };
