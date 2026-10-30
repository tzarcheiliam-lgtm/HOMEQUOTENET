import type { EstimatorCatalog, EstimatorOption } from '../types.ts';
import { ROOFING_TEMPLATE } from '../templates/roofing.ts';

/**
 * The roofing option catalog: the default template's options (so the two
 * cannot drift apart) plus a few extra materials that are OFF by default, for
 * a contractor to swap in through contractor settings. Every price is an
 * EXAMPLE per sq ft of priced roof (per roofing square / 100).
 */

const fromTemplate = (questionId: string): EstimatorOption[] => ROOFING_TEMPLATE.questions.find((q) => q.id === questionId)?.options ?? [];

export const ROOFING_CATALOG: EstimatorCatalog = {
  material: [
    ...fromTemplate('material'),
    { id: 'clay', label: 'Clay tile', note: 'Tear-off and new clay tile', price: { unit: 'floor_sqft', low: 14, high: 22 } },
    { id: 'designer_shingle', label: 'Designer asphalt shingle', note: 'Slate or shake look', price: { unit: 'floor_sqft', low: 7.5, high: 10.5 } },
  ],
};
