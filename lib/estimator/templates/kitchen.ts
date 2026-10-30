import { DEFAULT_LIMITS, type EstimatorQuestion, type EstimatorTemplate } from '../types.ts';

/**
 * The default kitchen remodel estimator template.
 *
 * EVERY PRICE IN THIS FILE IS AN EXAMPLE (pricesConfirmed: false). They are
 * plausible installed prices for Southern California kitchen remodels, picked
 * so a full remodel lands in realistic ranges: about $35k-$60k for a compact
 * kitchen with stock cabinets, $55k-$95k for a medium one and $130k-$250k for
 * a large open kitchen with custom cabinets, quartzite and built-in
 * appliances. They are not any contractor's real pricing; each one is
 * confirmed or replaced before the page drops the "Example prices" label and
 * becomes indexable.
 *
 * Pricing model: the project pick carries the base (demo, electrical and
 * plumbing rough-in, drywall, labor) per sq ft of kitchen floor. Cabinets,
 * counters and the floor scale with the floor too (a bigger kitchen has longer
 * cabinet runs and more counter), so they are priced per sq ft of floor
 * rather than per linear ft the homeowner would have to measure. The layout,
 * the island, the backsplash, the appliances, lighting, hardware and paint
 * are flat.
 *
 * Geometry reuses the pool path, like the bathroom: the size presets are the
 * room's floor (length x width in feet), every shape factor is 1 (there is no
 * shape question) and depth is ignored. Typed dimensions between 6 and 40 ft
 * win over the preset.
 *
 * Only the simple funnel uses this template today (HomeQuote Network's
 * /estimator/kitchen-remodel, experience 'funnel'): there is no live kitchen
 * builder (components/estimator/builders has no kitchen adapter), so there are
 * no packages and no scope question; every question is answered by the
 * funnel's picks except the three site questions, which are asked in person.
 * Ids are a fixed contract with the funnel spec
 * (content/estimators/homequote-kitchen-funnel.ts), the lead route and the
 * tests; rename labels freely but do not rename ids. Extra options a
 * contractor can swap in live in ../catalog/kitchen.ts.
 */

/** The three "not sure / no / yes" site questions share these options. */
const siteQuestion = (id: string, label: string, flag: string, extra: Partial<EstimatorQuestion> = {}): EstimatorQuestion => ({
  id,
  label,
  kind: 'single',
  screen: 'property',
  options: [
    { id: 'no', label: 'No' },
    { id: 'yes', label: 'Yes', siteVisit: flag },
    { id: 'unsure', label: 'Not sure', siteVisit: flag },
  ],
  ...extra,
});

export const KITCHEN_TEMPLATE: EstimatorTemplate = {
  trade: 'kitchen',
  title: 'Kitchen remodel',
  projectNoun: 'kitchen remodel',
  pricesConfirmed: false,
  minimumJob: 15000,
  roundTo: 1000,
  limits: DEFAULT_LIMITS,
  geometry: {
    // Kitchen floor footprints (length x width).
    sizes: { small: { lengthFt: 10, widthFt: 10 }, medium: { lengthFt: 14, widthFt: 12 }, large: { lengthFt: 18, widthFt: 16 } },
    // No depth for a room; kept at 0 so nothing can price by it.
    avgDepthFt: 0,
    shapes: {
      rectangle: { areaFactor: 1, perimeterFactor: 1 },
      l_shape: { areaFactor: 1, perimeterFactor: 1 },
      freeform: { areaFactor: 1, perimeterFactor: 1 },
      unsure: { areaFactor: 1, perimeterFactor: 1 },
    },
    deckSizes: {},
    limits: { minFt: 6, maxLengthFt: 40, maxWidthFt: 40, minDepthFt: 0, maxDepthFt: 0 },
  },
  questions: [
    {
      id: 'project',
      label: 'What are you planning?',
      kind: 'single',
      role: 'project',
      options: [
        { id: 'full', label: 'Full kitchen remodel', note: 'Down to the studs, all new', price: { unit: 'floor_sqft', low: 90, high: 150 } },
        { id: 'refresh', label: 'Cabinets and counters', note: 'Same layout, new cabinets and tops', price: { unit: 'floor_sqft', low: 30, high: 55 } },
      ],
    },
    {
      id: 'size',
      label: 'About how big is the kitchen?',
      kind: 'single',
      role: 'size',
      options: [
        // Length x width, the order the lead, the result and the typed fields use.
        { id: 'small', label: 'Compact / galley', note: 'About 10 x 10 ft' },
        { id: 'medium', label: 'Medium', note: 'About 14 x 12 ft' },
        { id: 'large', label: 'Large open kitchen', note: 'About 18 x 16 ft' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Kitchen size to be measured' },
      ],
    },
    {
      id: 'layout',
      label: 'Which layout?',
      kind: 'single',
      summaryLabel: 'Layout',
      options: [
        { id: 'l_shape', label: 'L-shaped', note: 'Cabinets on two walls' },
        { id: 'u_shape', label: 'U-shaped', note: 'Cabinets on three walls', price: { unit: 'flat', low: 3000, high: 7000 } },
        {
          id: 'island',
          label: 'Kitchen with island',
          note: 'Cabinets on the walls plus an island',
          // Base cabinets and a counter for the island itself (its style is priced by islandStyle).
          price: { unit: 'flat', low: 5000, high: 10000 },
          siteVisit: 'Island in a compact kitchen (clearance check)',
          siteVisitWhen: { questionId: 'size', anyOf: ['small'] },
        },
      ],
    },
    {
      // Optional refinement of the island (the funnel always answers it). Prices are what each adds to the island above.
      id: 'islandStyle',
      label: 'Which kind of island?',
      kind: 'single',
      summaryLabel: 'Island',
      showWhen: { questionId: 'layout', anyOf: ['island'] },
      optional: true,
      options: [
        { id: 'prep', label: 'Prep island', note: 'Extra counter and storage' },
        { id: 'seating', label: 'Seating island with waterfall edge', note: 'Bar stools, the counter runs to the floor', price: { unit: 'flat', low: 4000, high: 9000 } },
        {
          id: 'sink',
          label: 'Island with sink',
          note: 'A prep or main sink in the island',
          // Water, drain and venting run to the island: confirmed in person.
          siteVisit: 'Island sink (plumbing and venting check)',
          price: { unit: 'flat', low: 3500, high: 7500 },
        },
      ],
    },
    {
      id: 'cabinets',
      label: 'Which cabinets?',
      kind: 'single',
      summaryLabel: 'Cabinets',
      options: [
        { id: 'stock', label: 'Shaker cabinets', note: 'Ready-made, soft-close', price: { unit: 'floor_sqft', low: 70, high: 120 } },
        { id: 'semi_custom', label: 'Semi-custom cabinets', note: 'More sizes and finishes', price: { unit: 'floor_sqft', low: 100, high: 170 } },
        { id: 'custom', label: 'Custom cabinets', note: 'Built to fit, to the ceiling', price: { unit: 'floor_sqft', low: 160, high: 260 } },
      ],
    },
    {
      id: 'cabinetFinish',
      label: 'Which cabinet finish?',
      kind: 'single',
      summaryLabel: 'Cabinet finish',
      options: [
        { id: 'white', label: 'White', note: 'Painted white' },
        { id: 'wood', label: 'Warm wood', note: 'Stained oak or walnut', price: { unit: 'flat', low: 1500, high: 4000 } },
        { id: 'two_tone', label: 'Two-tone', note: 'Wood or color below, white above', price: { unit: 'flat', low: 1000, high: 2500 } },
      ],
    },
    {
      id: 'counter',
      label: 'Which countertop?',
      kind: 'single',
      summaryLabel: 'Counter',
      options: [
        { id: 'quartz', label: 'Quartz', note: 'Clean and low-maintenance', price: { unit: 'floor_sqft', low: 25, high: 45 } },
        { id: 'granite', label: 'Granite', note: 'Natural stone, many colors', price: { unit: 'floor_sqft', low: 25, high: 50 } },
        { id: 'quartzite', label: 'Quartzite', note: 'Premium natural stone', price: { unit: 'floor_sqft', low: 45, high: 80 } },
      ],
    },
    {
      id: 'backsplash',
      label: 'Which backsplash?',
      kind: 'single',
      summaryLabel: 'Backsplash',
      options: [
        { id: 'subway', label: 'Subway tile', note: 'Glossy 3 x 6 in, timeless', price: { unit: 'flat', low: 1500, high: 3500 } },
        { id: 'zellige', label: 'Zellige tile', note: 'Handmade look with soft shine', price: { unit: 'flat', low: 3000, high: 6500 } },
        { id: 'slab', label: 'Full-height stone slab', note: 'The counter stone up the wall', price: { unit: 'flat', low: 4000, high: 9000 } },
      ],
    },
    {
      id: 'appliances',
      label: 'Which appliances?',
      kind: 'single',
      summaryLabel: 'Appliances',
      options: [
        { id: 'stainless', label: 'Stainless package', note: 'Range, fridge, dishwasher, microwave', price: { unit: 'flat', low: 6000, high: 12000 } },
        { id: 'pro', label: 'Pro range & hood', note: 'Pro-style range, vent hood, premium fridge', price: { unit: 'flat', low: 15000, high: 30000 } },
        {
          id: 'panel',
          label: 'Panel-ready built-ins',
          note: 'Fridge and dishwasher behind cabinet panels',
          // Built-ins need their own cut-outs and often a new circuit: confirmed in person.
          siteVisit: 'Built-in appliances (cut-outs and electrical check)',
          price: { unit: 'flat', low: 25000, high: 50000 },
        },
      ],
    },
    {
      id: 'floor',
      label: 'Which floor?',
      kind: 'single',
      summaryLabel: 'Floor',
      options: [
        { id: 'lvp', label: 'Luxury vinyl plank', note: 'Budget-friendly and waterproof', price: { unit: 'floor_sqft', low: 8, high: 14 } },
        { id: 'porcelain', label: 'Porcelain tile', note: 'Wood or stone look, very durable', price: { unit: 'floor_sqft', low: 15, high: 28 } },
        { id: 'hardwood', label: 'Wide-plank hardwood', note: 'Engineered oak, warm underfoot', price: { unit: 'floor_sqft', low: 16, high: 30 } },
      ],
    },
    {
      id: 'lighting',
      label: 'Which lighting?',
      kind: 'single',
      summaryLabel: 'Lighting',
      options: [
        { id: 'recessed', label: 'Recessed and under-cabinet', note: 'Bright, even light', price: { unit: 'flat', low: 2500, high: 5000 } },
        { id: 'designer', label: 'Designer lighting', note: 'Recessed, under-cabinet and pendants', price: { unit: 'flat', low: 5000, high: 10000 } },
      ],
    },
    {
      id: 'hardware',
      label: 'Which hardware and faucet finish?',
      kind: 'single',
      summaryLabel: 'Hardware',
      options: [
        { id: 'nickel', label: 'Brushed nickel', price: { unit: 'flat', low: 800, high: 1800 } },
        { id: 'matte_black', label: 'Matte black', price: { unit: 'flat', low: 900, high: 2000 } },
        { id: 'brass', label: 'Brushed brass', price: { unit: 'flat', low: 1200, high: 3000 } },
      ],
    },
    {
      id: 'paint',
      label: 'Walls and paint',
      kind: 'single',
      summaryLabel: 'Walls',
      options: [{ id: 'paint', label: 'Patch, prime and paint', price: { unit: 'flat', low: 1200, high: 2500 } }],
    },
    siteQuestion('plumbing', 'Moving the sink, range or any walls?', 'Moving plumbing, gas or walls', {
      help: 'Keeping things where they are costs less. It is fine to say you are not sure.',
      screenTitle: 'About your kitchen',
    }),
    siteQuestion('damage', 'Any water damage, leaks or mold?', 'Water damage or mold'),
    siteQuestion('location', 'Is it in a condo or HOA building?', 'Condo or HOA kitchen (building rules)'),
  ],
  packages: [],
  notIncluded: [
    'Moving plumbing, gas lines, walls or windows',
    'Repairs for water damage, mold or subfloor',
    'Permits and plan fees',
    'Electrical panel or service upgrades',
    'Unforeseen conditions found once walls are opened',
  ],
  disclaimer:
    'This is a ballpark range, not a quote. Your final price is set by a licensed local contractor after a free in-home consultation.',
};
