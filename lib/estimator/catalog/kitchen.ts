import type { EstimatorCatalog, EstimatorOption } from '../types.ts';
import { KITCHEN_TEMPLATE } from '../templates/kitchen.ts';

/**
 * The fuller kitchen option catalog, behind the scenes. For each priced
 * question it holds the default template's options (so the two cannot drift
 * apart) plus a few extra options that are OFF by default: a contractor can
 * swap them in through contractor settings instead of writing them from
 * scratch.
 *
 * Names are generic on purpose (no brands). Every price is an EXAMPLE, in
 * whole dollars, until a contractor confirms it.
 */

const fromTemplate = (questionId: string): EstimatorOption[] => KITCHEN_TEMPLATE.questions.find((q) => q.id === questionId)?.options ?? [];

export const KITCHEN_CATALOG: EstimatorCatalog = {
  layout: [
    ...fromTemplate('layout'),
    { id: 'galley', label: 'Galley', note: 'Two parallel runs', price: { unit: 'flat', low: 0, high: 2000 } },
  ],
  cabinets: [
    ...fromTemplate('cabinets'),
    { id: 'refaced', label: 'Refaced cabinets', note: 'New doors and fronts on the old boxes', price: { unit: 'floor_sqft', low: 35, high: 60 } },
  ],
  counter: [
    ...fromTemplate('counter'),
    { id: 'marble', label: 'Marble', note: 'Polished natural stone', price: { unit: 'floor_sqft', low: 50, high: 95 } },
  ],
  backsplash: [
    ...fromTemplate('backsplash'),
    { id: 'ceramic', label: 'Ceramic tile', note: 'Budget-friendly classic', price: { unit: 'flat', low: 1000, high: 2500 } },
  ],
  appliances: [
    ...fromTemplate('appliances'),
    {
      id: 'induction',
      label: 'Induction package',
      note: 'Induction range, fridge, dishwasher',
      siteVisit: 'Induction range (electrical check)',
      price: { unit: 'flat', low: 9000, high: 18000 },
    },
  ],
  floor: [
    ...fromTemplate('floor'),
    { id: 'keep', label: 'Keep my floor', note: 'Work around the floor that is there' },
  ],
};
