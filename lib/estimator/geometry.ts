import type { EstimateInput, EstimatorTemplate, PoolGeometry, PoolShape, PoolSize } from './types.ts';
import { POOL_SHAPES, POOL_SIZES } from './types.ts';

/**
 * STAND-IN: pool geometry from the shape/size answers (or typed dimensions).
 * Signature is the contract; the body is replaced by the real engine.
 */
export function poolGeometry(template: EstimatorTemplate, input: EstimateInput): PoolGeometry {
  const g = template.geometry;
  const pick = (role: string) => {
    const q = template.questions.find((x) => x.role === role);
    return q ? input.answers[q.id]?.[0] : undefined;
  };
  const shapeAnswer = pick('shape');
  const sizeAnswer = pick('size');
  const shape: PoolShape = POOL_SHAPES.includes(shapeAnswer as PoolShape) ? (shapeAnswer as PoolShape) : 'unsure';
  const size: PoolSize = POOL_SIZES.includes(sizeAnswer as PoolSize) ? (sizeAnswer as PoolSize) : 'unsure';
  const preset = g.sizes[size === 'unsure' ? 'medium' : size];
  const { lengthFt, widthFt } = input.dimensions ?? preset;
  const avgDepthFt = input.dimensions?.avgDepthFt ?? g.avgDepthFt;
  const f = g.shapes[shape];
  const surfaceAreaSqft = lengthFt * widthFt * f.areaFactor;
  const perimeterFt = 2 * (lengthFt + widthFt) * f.perimeterFactor;
  const deckAnswer = pick('deckSize');
  return {
    shape,
    size,
    lengthFt,
    widthFt,
    avgDepthFt,
    surfaceAreaSqft,
    perimeterFt,
    interiorSqft: surfaceAreaSqft + perimeterFt * avgDepthFt,
    deckSqft: deckAnswer ? (g.deckSizes[deckAnswer] ?? 0) : 0,
    source: input.dimensions ? 'dimensions' : 'preset',
  };
}
