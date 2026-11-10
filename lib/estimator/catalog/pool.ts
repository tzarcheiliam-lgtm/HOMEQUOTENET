import type { EstimatorCatalog, EstimatorOption } from '../types.ts';
import { POOL_TEMPLATE } from '../templates/pool.ts';

/**
 * The fuller pool option catalog, behind the scenes. For each priced question
 * it holds the default template's options (so the two cannot drift apart) plus
 * extra options that are OFF by default: a contractor can swap them in through
 * contractor settings (customOptions / option overrides) instead of writing
 * them from scratch.
 *
 * Names are generic on purpose (no brands). Like the template, every price is
 * an EXAMPLE per unit, in whole dollars, until a contractor confirms it.
 */

/** The template's options for one question, so the catalog always includes them. */
const fromTemplate = (questionId: string): EstimatorOption[] => POOL_TEMPLATE.questions.find((q) => q.id === questionId)?.options ?? [];

export const POOL_CATALOG: EstimatorCatalog = {
  surface: [
    ...fromTemplate('surface'),
    { id: 'colored_plaster', label: 'Colored plaster', note: 'Plaster tinted gray, blue or charcoal', price: { unit: 'interior_sqft', low: 9, high: 13 } },
    { id: 'mini_pebble', label: 'Mini pebble', note: 'Fine pebble, smoother underfoot', price: { unit: 'interior_sqft', low: 13, high: 17 } },
    { id: 'polished_pebble', label: 'Polished pebble', note: 'Pebble with a smooth, ground finish', price: { unit: 'interior_sqft', low: 18, high: 25 } },
    { id: 'glass_bead', label: 'Glass bead', note: 'Glass beads for a glittering, bright finish', price: { unit: 'interior_sqft', low: 18, high: 26 } },
    { id: 'full_tile', label: 'Full tile', note: 'Tile across the whole interior', price: { unit: 'interior_sqft', low: 45, high: 80 } },
  ],
  tile: [
    ...fromTemplate('tile'),
    { id: 'ceramic', label: 'Ceramic', note: 'Budget-friendly classic', price: { unit: 'perimeter_lf', low: 25, high: 40 } },
    { id: 'italian_porcelain', label: 'Italian porcelain', note: 'Imported, designer patterns', price: { unit: 'perimeter_lf', low: 55, high: 85 } },
    { id: 'glass_mosaic', label: 'Glass mosaic', note: 'Small glass pieces, rich color', price: { unit: 'perimeter_lf', low: 70, high: 110 } },
    { id: 'natural_stone', label: 'Natural stone mosaic', note: 'Hand-cut stone pieces', price: { unit: 'perimeter_lf', low: 60, high: 95 } },
  ],
  coping: [
    ...fromTemplate('coping'),
    { id: 'poured_in_place', label: 'Poured-in-place concrete', note: 'Cast on site, seamless look', price: { unit: 'perimeter_lf', low: 40, high: 65 } },
    // The Pool Masters funnel's Luxe coping (swapped in for "Help me choose" in content/estimators/pool-masters.ts).
    { id: 'porcelain', label: 'Porcelain', note: 'Thick porcelain pavers', swatch: 'porcelain_deck', price: { unit: 'perimeter_lf', low: 60, high: 90 } },
    { id: 'brick', label: 'Brick', note: 'Traditional brick edge', price: { unit: 'perimeter_lf', low: 45, high: 70 } },
    { id: 'bluestone_limestone', label: 'Bluestone or limestone', note: 'Cut natural stone', price: { unit: 'perimeter_lf', low: 70, high: 110 } },
  ],
  deck: [
    ...fromTemplate('deck'),
    { id: 'stamped_concrete', label: 'Stamped concrete', note: 'Concrete pressed to look like stone or tile', price: { unit: 'deck_sqft', low: 15, high: 25 } },
    { id: 'exposed_aggregate', label: 'Exposed aggregate', note: 'Concrete with a pebbled surface', price: { unit: 'deck_sqft', low: 14, high: 22 } },
    { id: 'salt_finish', label: 'Salt finish concrete', note: 'Soft, pitted, cool-to-touch finish', price: { unit: 'deck_sqft', low: 13, high: 21 } },
    { id: 'flagstone', label: 'Flagstone', note: 'Irregular natural stone', price: { unit: 'deck_sqft', low: 30, high: 50 } },
    { id: 'stepping_stones_turf', label: 'Stepping stones with turf', note: 'Stone pads set in artificial grass', price: { unit: 'deck_sqft', low: 18, high: 32 } },
    { id: 'decomposed_granite', label: 'Decomposed granite', note: 'Compacted crushed stone, casual look', price: { unit: 'deck_sqft', low: 6, high: 12 } },
    { id: 'wood_composite', label: 'Wood or composite', note: 'Raised boards, warm underfoot', price: { unit: 'deck_sqft', low: 30, high: 55 } },
  ],
  features: [
    ...fromTemplate('features'),
    { id: 'bench_steps', label: 'Bench or in-water steps', note: 'Built-in seating or entry steps', price: { unit: 'flat', low: 3500, high: 7500 } },
    { id: 'umbrella_sleeve', label: 'Umbrella sleeve', note: 'Built into the deck for a patio umbrella', price: { unit: 'flat', low: 400, high: 900 } },
    { id: 'bubblers', label: 'Bubblers', note: 'Small fountains on a shelf, priced each', price: { unit: 'each', low: 600, high: 1200, quantity: 2 } },
    { id: 'sheer_descent', label: 'Sheer descent', note: 'A smooth sheet of falling water', price: { unit: 'flat', low: 3000, high: 7000 } },
    { id: 'deck_jets', label: 'Deck jets', note: 'Arcs of water from the deck, priced each', price: { unit: 'each', low: 700, high: 1400, quantity: 3 } },
    {
      id: 'zero_edge',
      label: 'Zero edge',
      note: 'Water spills over one side of the pool',
      siteVisit: 'Zero-edge pool (structure and plumbing)',
      price: { unit: 'flat', low: 20000, high: 60000 },
    },
    { id: 'raised_spa_wall', label: 'Raised spa wall', note: 'A taller wall around the spa', price: { unit: 'flat', low: 6000, high: 15000 } },
  ],
  equipment: [
    ...fromTemplate('equipment'),
    { id: 'cartridge_filter', label: 'Cartridge filter', note: 'Easy to maintain filter', price: { unit: 'flat', low: 1200, high: 2400 } },
    { id: 'de_filter', label: 'DE filter', note: 'Finest filtering', price: { unit: 'flat', low: 1800, high: 3200 } },
    { id: 'heat_pump', label: 'Heat pump', note: 'Efficient electric heating', price: { unit: 'flat', low: 4500, high: 8000 } },
    { id: 'uv_ozone', label: 'UV or ozone sanitizer', note: 'Extra water cleaning', price: { unit: 'flat', low: 1500, high: 3500 } },
  ],
  extras: [
    ...fromTemplate('extras'),
    { id: 'louvered_pergola', label: 'Louvered pergola', note: 'Adjustable slats for sun or shade', price: { unit: 'flat', low: 12000, high: 30000 } },
    { id: 'seating_wall', label: 'Seating wall', note: 'Low wall for extra seating, priced per foot', price: { unit: 'linear_ft', low: 150, high: 300, quantity: 20 } },
    { id: 'pool_safety_fence', label: 'Pool safety fence', note: 'Code-compliant fence, priced per foot', price: { unit: 'linear_ft', low: 40, high: 90, quantity: 100 } },
    { id: 'landscape_lighting', label: 'Landscape lighting', note: 'Low-voltage path and accent lights', price: { unit: 'flat', low: 2500, high: 7000 } },
  ],
};
