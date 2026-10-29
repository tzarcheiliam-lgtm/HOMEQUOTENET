import type { EstimatorCatalog, EstimatorOption } from '../types.ts';
import { BATHROOM_TEMPLATE } from '../templates/bathroom.ts';

/**
 * The fuller bathroom option catalog, behind the scenes. For each priced
 * question it holds the default template's options (so the two cannot drift
 * apart) plus a few extra options that are OFF by default: a contractor can
 * swap them in through contractor settings instead of writing them from
 * scratch. The live picture draws a swapped-in option with the closest look.
 *
 * Names are generic on purpose (no brands). Every price is an EXAMPLE, in
 * whole dollars, until a contractor confirms it.
 */

const fromTemplate = (questionId: string): EstimatorOption[] => BATHROOM_TEMPLATE.questions.find((q) => q.id === questionId)?.options ?? [];

export const BATHROOM_CATALOG: EstimatorCatalog = {
  bathing: [
    ...fromTemplate('bathing'),
    { id: 'tub_only', label: 'Soaking tub only', note: 'A deep alcove tub, no shower', price: { unit: 'flat', low: 4000, high: 8000 } },
    { id: 'steam_shower', label: 'Steam shower', note: 'Sealed glass, steam generator', siteVisit: 'Steam shower (electrical and venting)', price: { unit: 'flat', low: 14000, high: 25000 } },
  ],
  showerTile: [
    ...fromTemplate('showerTile'),
    { id: 'ceramic', label: 'Ceramic', note: 'Budget-friendly classic', price: { unit: 'flat', low: 1800, high: 3500 } },
    { id: 'terrazzo', label: 'Terrazzo look', note: 'Speckled porcelain', price: { unit: 'flat', low: 4000, high: 7000 } },
  ],
  vanity: [
    ...fromTemplate('vanity'),
    { id: 'custom_built', label: 'Custom-built vanity', note: 'Made to fit your room', price: { unit: 'flat', low: 5000, high: 11000 } },
  ],
  counter: [
    ...fromTemplate('counter'),
    { id: 'granite', label: 'Granite', note: 'Natural stone, many colors', price: { unit: 'flat', low: 1400, high: 3200 } },
    { id: 'quartzite', label: 'Quartzite', note: 'Premium natural stone', price: { unit: 'flat', low: 2500, high: 5500 } },
  ],
  floor: [
    ...fromTemplate('floor'),
    { id: 'ceramic', label: 'Ceramic tile', note: 'Budget-friendly tile', price: { unit: 'floor_sqft', low: 12, high: 20 } },
    { id: 'marble', label: 'Marble tile', note: 'Polished natural stone', price: { unit: 'floor_sqft', low: 35, high: 60 } },
  ],
  extras: [
    ...fromTemplate('extras'),
    { id: 'grab_bars', label: 'Grab bars', note: 'Two safety bars, priced each', price: { unit: 'each', low: 250, high: 500, quantity: 2 } },
    { id: 'exhaust_fan', label: 'Quiet exhaust fan', note: 'Vented to the outside', price: { unit: 'flat', low: 500, high: 1200 } },
    { id: 'smart_toilet', label: 'Smart toilet', note: 'Heated seat and bidet', siteVisit: 'Smart toilet (outlet near the toilet)', price: { unit: 'flat', low: 1500, high: 4000 } },
  ],
};
