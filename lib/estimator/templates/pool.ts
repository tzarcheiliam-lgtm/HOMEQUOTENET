import { DEFAULT_LIMITS, type EstimatorTemplate } from '../types.ts';

/** STAND-IN: the default pool remodel template (replaced by the real template). */
export const POOL_TEMPLATE: EstimatorTemplate = {
  trade: 'pool',
  title: 'Pool remodel',
  projectNoun: 'pool project',
  pricesConfirmed: false,
  minimumJob: 5000,
  roundTo: 500,
  limits: DEFAULT_LIMITS,
  geometry: {
    sizes: { small: { lengthFt: 24, widthFt: 12 }, medium: { lengthFt: 30, widthFt: 15 }, large: { lengthFt: 36, widthFt: 18 } },
    avgDepthFt: 5,
    shapes: {
      rectangle: { areaFactor: 1, perimeterFactor: 1 },
      l_shape: { areaFactor: 0.9, perimeterFactor: 1.15 },
      freeform: { areaFactor: 0.85, perimeterFactor: 1.1 },
      unsure: { areaFactor: 1, perimeterFactor: 1 },
    },
    deckSizes: { small: 300, medium: 600, large: 1000 },
    limits: { minFt: 6, maxLengthFt: 80, maxWidthFt: 50, minDepthFt: 3, maxDepthFt: 12 },
  },
  questions: [],
  packages: [],
  notIncluded: [],
  disclaimer: 'This is a ballpark range, not a quote.',
};
