import type { Answers, EstimateInput, EstimatorQuestion, EstimatorTemplate } from '../types.ts';
import { picksFor, visibleQuestions } from '../engine.ts';
import { poolGeometry } from '../geometry.ts';
import type { SceneDeckSize, SceneShape, SceneSpec } from './types.ts';

/** Choices that mean "not decided yet": the picture shows a tasteful default instead. */
const UNDECIDED = new Set(['unsure']);
const DECK_SIZES: readonly SceneDeckSize[] = ['small', 'medium', 'large'];
const SHAPES: readonly SceneShape[] = ['rectangle', 'l_shape', 'freeform'];

/**
 * Answers (+ typed dimensions) -> SceneSpec. Pure.
 *
 * - Only visible questions count (the same rule as the estimate), so stale
 *   answers to questions the current scope hides never show in the picture.
 *   Package answers are already merged into `answers` by the flow.
 * - Length and width come from poolGeometry, so valid typed dimensions win
 *   over the size preset exactly as they do for pricing; "not sure" size is the
 *   medium preset. "Not sure" shape draws a rectangle.
 * - surface / tile / coping / deck are the picked option ids (a contractor's
 *   catalog swap passes through; the renderer maps it to the closest look), or
 *   null when not picked or "not sure".
 * - deckSize is 'none' unless the deck-size question is visible and answered.
 */
export function buildScene(template: EstimatorTemplate, input: EstimateInput): SceneSpec {
  const answers: Answers = input.answers ?? {};
  const visible = visibleQuestions(template, answers);
  const byId = new Map<string, EstimatorQuestion>(visible.map((q) => [q.id, q]));
  const byRole = (role: EstimatorQuestion['role']) => visible.find((q) => q.role === role);
  const picks = (q: EstimatorQuestion | undefined): string[] => (q ? picksFor(q, answers) : []);
  const material = (id: string): string | null => {
    const pick = picks(byId.get(id))[0];
    return pick && !UNDECIDED.has(pick) ? pick : null;
  };

  const geometry = poolGeometry(template, { answers, dimensions: input.dimensions });
  const shape: SceneShape = SHAPES.includes(geometry.shape as SceneShape) ? (geometry.shape as SceneShape) : 'rectangle';
  const presetMedium = template.geometry.sizes.medium;
  const lengthFt = geometry.lengthFt > 0 ? geometry.lengthFt : (presetMedium?.lengthFt ?? 30);
  const widthFt = geometry.widthFt > 0 ? geometry.widthFt : (presetMedium?.widthFt ?? 15);

  const deckSizePick = picks(byRole('deckSize'))[0];
  const deckSize: SceneDeckSize = DECK_SIZES.includes(deckSizePick as SceneDeckSize) ? (deckSizePick as SceneDeckSize) : 'none';

  const features = new Set(picks(byId.get('features')));
  const extras = new Set(picks(byId.get('extras')));

  return {
    project: picks(byRole('project'))[0] === 'backyard' ? 'backyard' : 'remodel',
    shape,
    lengthFt,
    widthFt,
    surface: material('surface'),
    tile: material('tile'),
    coping: material('coping'),
    deck: material('deck'),
    deckSize,
    features: {
      baja: features.has('baja'),
      spa: features.has('spa'),
      waterBowls: features.has('water'),
      fireBowls: features.has('fire'),
      lights: features.has('lighting'),
    },
    extras: {
      kitchen: extras.has('kitchen'),
      patioCover: extras.has('patio_cover'),
      turfPlanting: extras.has('turf_planting'),
      firePit: extras.has('fire_pit'),
    },
  };
}

export type { Answers };
