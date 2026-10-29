import type { EstimateInput, EstimatorTemplate, PoolGeometry, PoolShape, PoolSize } from './types.ts';
import { POOL_SHAPES, POOL_SIZES } from './types.ts';
import { picksFor, visibleQuestions } from './engine.ts';

/** A finite number of at least 0, else 0. Keeps NaN/Infinity/negatives out of every product below. */
function nonNegative(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
}

function within(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}

/**
 * Pool geometry from the shape/size answers, or from typed dimensions.
 *
 * - Shape and size are read through their question roles. A missing or invalid
 *   answer counts as "unsure"; "unsure" size uses the medium preset.
 * - Typed length and width are used only when both sit inside geometry.limits
 *   (inclusive). Otherwise the preset footprint is used and `source` is 'preset'.
 *   A typed depth outside its limits falls back to the template's default depth.
 * - surfaceArea = L x W x areaFactor, perimeter = 2(L + W) x perimeterFactor,
 *   interior = surfaceArea + perimeter x avgDepth.
 * - deckSqft comes from the deckSize answer, only while that question is
 *   visible; 0 otherwise.
 *
 * Every figure is clamped to a finite number >= 0.
 */
export function poolGeometry(template: EstimatorTemplate, input: EstimateInput): PoolGeometry {
  const g = template.geometry;
  const answerFor = (role: string) => {
    const q = template.questions.find((x) => x.role === role);
    return q ? picksFor(q, input.answers)[0] : undefined;
  };
  const shapeAnswer = answerFor('shape');
  const sizeAnswer = answerFor('size');
  const shape: PoolShape = POOL_SHAPES.includes(shapeAnswer as PoolShape) ? (shapeAnswer as PoolShape) : 'unsure';
  const size: PoolSize = POOL_SIZES.includes(sizeAnswer as PoolSize) ? (sizeAnswer as PoolSize) : 'unsure';

  const preset = g.sizes[size === 'unsure' ? 'medium' : size];
  const typed = input.dimensions;
  const useTyped =
    !!typed &&
    within(typed.lengthFt, g.limits.minFt, g.limits.maxLengthFt) &&
    within(typed.widthFt, g.limits.minFt, g.limits.maxWidthFt);

  const lengthFt = nonNegative(useTyped ? typed.lengthFt : preset?.lengthFt);
  const widthFt = nonNegative(useTyped ? typed.widthFt : preset?.widthFt);
  const avgDepthFt = nonNegative(
    useTyped && within(typed.avgDepthFt, g.limits.minDepthFt, g.limits.maxDepthFt) ? typed.avgDepthFt : g.avgDepthFt,
  );

  const factors = g.shapes[shape];
  const areaFactor = nonNegative(factors?.areaFactor);
  const perimeterFactor = nonNegative(factors?.perimeterFactor);
  const surfaceAreaSqft = lengthFt * widthFt * areaFactor;
  const perimeterFt = 2 * (lengthFt + widthFt) * perimeterFactor;

  const deckQ = visibleQuestions(template, input.answers).find((q) => q.role === 'deckSize');
  const deckAnswer = deckQ ? picksFor(deckQ, input.answers)[0] : undefined;
  const deckSqft = deckAnswer && Object.hasOwn(g.deckSizes, deckAnswer) ? nonNegative(g.deckSizes[deckAnswer]) : 0;

  return {
    shape,
    size,
    lengthFt,
    widthFt,
    avgDepthFt,
    surfaceAreaSqft,
    perimeterFt,
    interiorSqft: surfaceAreaSqft + perimeterFt * avgDepthFt,
    deckSqft,
    source: useTyped ? 'dimensions' : 'preset',
  };
}

/**
 * The size preset a footprint reads as: the size answer itself, or, with
 * valid typed dimensions (or "not sure"), the preset whose floor area is
 * nearest on a log scale (the boundary between two presets is the geometric
 * mean of their areas). For the bathroom presets (40, 80 and 168 sq ft) that
 * is small up to about 57 sq ft and medium up to about 116.
 */
export function sizeClassFor(template: EstimatorTemplate, geometry: PoolGeometry): Exclude<PoolSize, 'unsure'> {
  if (geometry.source === 'preset' && geometry.size !== 'unsure') return geometry.size;
  const area = Math.max(1e-6, geometry.lengthFt * geometry.widthFt);
  let best: Exclude<PoolSize, 'unsure'> = 'medium';
  let bestGap = Infinity;
  for (const size of ['small', 'medium', 'large'] as const) {
    const preset = template.geometry.sizes[size];
    if (!preset) continue;
    const gap = Math.abs(Math.log(area / Math.max(1e-6, preset.lengthFt * preset.widthFt)));
    if (gap < bestGap) {
      best = size;
      bestGap = gap;
    }
  }
  return best;
}
