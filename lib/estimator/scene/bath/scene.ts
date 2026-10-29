import type { Answers, EstimateInput, EstimatorQuestion, EstimatorTemplate } from '../../types.ts';
import { picksFor, visibleQuestions } from '../../engine.ts';
import { poolGeometry } from '../../geometry.ts';
import type { BathBathing, BathRoom, BathSceneSpec, BathVanity } from './types.ts';

const BATHING: readonly BathBathing[] = ['walk_in', 'tub_shower', 'tub_and_shower'];
const VANITIES: readonly BathVanity[] = ['single', 'double', 'floating'];
const PROJECTS: readonly BathSceneSpec['project'][] = ['refresh', 'full', 'tub_to_shower'];

/** Typed floors up to these areas (sq ft) read as a small / medium room; anything larger is large. */
const SMALL_MAX_SQFT = 50;
const MEDIUM_MAX_SQFT = 110;

/**
 * Answers (+ typed dimensions) -> BathSceneSpec. Pure.
 *
 * - Only visible questions count (the same rule as the estimate), so stale
 *   answers to questions the current scope hides never show in the picture.
 *   Package answers are already merged into `answers` by the flow.
 * - lengthFt / widthFt come from poolGeometry (valid typed dimensions win over
 *   the size preset; "not sure" is the medium preset). `room` is the size pick,
 *   or, with typed dimensions or "not sure", the class of the floor area.
 * - bathing is the picked layout; "keep" or nothing picked is 'existing',
 *   except a tub-to-shower project, which shows its walk-in shower.
 * - glass: walk-in or a separate shower.
 * - Materials are the picked option ids, or null when not picked.
 */
export function buildBathScene(template: EstimatorTemplate, input: EstimateInput): BathSceneSpec {
  const answers: Answers = input.answers ?? {};
  const visible = visibleQuestions(template, answers);
  const byId = new Map<string, EstimatorQuestion>(visible.map((q) => [q.id, q]));
  const byRole = (role: EstimatorQuestion['role']) => visible.find((q) => q.role === role);
  const picks = (q: EstimatorQuestion | undefined): string[] => (q ? picksFor(q, answers) : []);
  const material = (id: string): string | null => picks(byId.get(id))[0] ?? null;

  const geometry = poolGeometry(template, { answers, dimensions: input.dimensions });
  const presetMedium = template.geometry.sizes.medium;
  const lengthFt = geometry.lengthFt > 0 ? geometry.lengthFt : (presetMedium?.lengthFt ?? 10);
  const widthFt = geometry.widthFt > 0 ? geometry.widthFt : (presetMedium?.widthFt ?? 8);
  const area = lengthFt * widthFt;
  const room: BathRoom =
    geometry.source === 'preset' && geometry.size !== 'unsure'
      ? geometry.size
      : area <= SMALL_MAX_SQFT
        ? 'small'
        : area <= MEDIUM_MAX_SQFT
          ? 'medium'
          : 'large';

  const projectPick = picks(byRole('project'))[0];
  const project = PROJECTS.includes(projectPick as BathSceneSpec['project']) ? (projectPick as BathSceneSpec['project']) : 'full';

  const bathingPick = material('bathing');
  const bathing: BathBathing = BATHING.includes(bathingPick as BathBathing)
    ? (bathingPick as BathBathing)
    : !bathingPick && project === 'tub_to_shower'
      ? 'walk_in'
      : 'existing';

  const vanityPick = material('vanity');
  const extras = new Set(picks(byId.get('extras')));

  return {
    project,
    room,
    lengthFt,
    widthFt,
    bathing,
    showerTile: material('showerTile'),
    glass: bathing === 'walk_in' || bathing === 'tub_and_shower',
    floor: material('floor'),
    paint: material('paint'),
    vanity: VANITIES.includes(vanityPick as BathVanity) ? (vanityPick as BathVanity) : null,
    vanityFinish: material('vanityFinish'),
    counter: material('counter'),
    metal: material('metal'),
    extras: {
      niche: extras.has('niche'),
      bench: extras.has('bench'),
      ledMirror: extras.has('led_mirror'),
      heatedFloor: extras.has('heated_floor'),
      rainHead: extras.has('rain_head'),
    },
  };
}

/** The picture before any answer: a finished example bathroom, always captioned as an example. */
export const EXAMPLE_BATH_SCENE: BathSceneSpec = {
  project: 'full',
  room: 'medium',
  lengthFt: 10,
  widthFt: 8,
  bathing: 'walk_in',
  showerTile: 'zellige',
  glass: true,
  floor: 'hex_mosaic',
  paint: 'sage',
  vanity: 'floating',
  vanityFinish: 'wood',
  counter: 'quartz_white',
  metal: 'brushed_gold',
  extras: { niche: true, bench: false, ledMirror: true, heatedFloor: false, rainHead: true },
};
