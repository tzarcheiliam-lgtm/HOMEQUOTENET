import { DEFAULT_LIMITS, type EstimatorTemplate } from '../types.ts';

/**
 * The default pool remodel estimator template.
 *
 * EVERY PRICE IN THIS FILE IS AN EXAMPLE (pricesConfirmed: false). They are
 * plausible installed prices per unit for Southern California pool remodels,
 * picked so a medium rectangle (30 x 15 ft, 5 ft average depth: about 900 sq ft
 * of interior, 90 ft of edge, 600 sq ft deck) lands in realistic ranges. They
 * are not any contractor's real pricing. A contractor confirms or replaces each
 * one (see scripts/estimator-price-sheet.mjs) before the page drops the
 * "Example prices" label and becomes indexable.
 *
 * Ids here are a fixed contract with the screens, the lead route and the tests;
 * rename labels freely but do not rename ids. Extra options a contractor can
 * swap in live in ../catalog/pool.ts.
 */
export const POOL_TEMPLATE: EstimatorTemplate = {
  trade: 'pool',
  title: 'Pool remodel',
  projectNoun: 'pool project',
  pricesConfirmed: false,
  minimumJob: 5000,
  roundTo: 500,
  limits: DEFAULT_LIMITS,
  geometry: {
    // Rectangle-equivalent footprints; the shape factors scale area and edge.
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
  questions: [
    {
      id: 'project',
      label: 'What are you planning?',
      kind: 'single',
      role: 'project',
      options: [
        { id: 'remodel', label: 'Remodel my pool', note: 'Update what is already there' },
        { id: 'backyard', label: 'Pool and backyard', note: 'Pool plus outdoor living upgrades' },
      ],
    },
    {
      id: 'shape',
      label: 'What shape is your pool?',
      help: 'A rough idea is fine.',
      kind: 'single',
      role: 'shape',
      options: [
        { id: 'rectangle', label: 'Rectangle' },
        { id: 'l_shape', label: 'L-shape' },
        { id: 'freeform', label: 'Freeform', note: 'Curves, kidney or organic shapes' },
        { id: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'size',
      label: 'About how big is it?',
      help: 'Choose the closest. You can type exact measurements on the next step if you know them.',
      kind: 'single',
      role: 'size',
      options: [
        { id: 'small', label: 'Small', note: 'About 24 x 12 ft' },
        { id: 'medium', label: 'Medium', note: 'About 30 x 15 ft' },
        { id: 'large', label: 'Large', note: 'About 36 x 18 ft' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Pool size to be measured' },
      ],
    },
    {
      id: 'package',
      label: 'Pick a starting point',
      help: 'Each package fills in the choices for you. You can change anything after.',
      kind: 'single',
      role: 'package',
      options: [
        { id: 'refresh', label: 'Refresh', note: 'A fresh look for the pool itself' },
        { id: 'signature', label: 'Signature', note: 'Our most popular upgrade' },
        { id: 'transformation', label: 'Transformation', note: 'A full pool and deck makeover' },
        { id: 'custom', label: 'Build my own', note: 'Choose each piece yourself' },
      ],
    },
    {
      id: 'scope',
      label: 'What to include',
      help: 'Pick everything you want done.',
      kind: 'multi',
      role: 'scope',
      options: [
        { id: 'surface', label: 'Pool surface', note: 'Replaster or resurface the inside' },
        { id: 'tile_coping', label: 'Tile and coping', note: 'The band at the water line and the edge' },
        { id: 'deck', label: 'Deck', note: 'The area around the pool' },
        { id: 'features', label: 'Pool features', note: 'Shelf, spa, water and fire, lighting' },
        { id: 'equipment', label: 'Equipment', note: 'Pump, heater, automation' },
      ],
    },
    {
      id: 'surface',
      label: 'Which pool surface?',
      help: 'This is the finish you see and feel inside the pool.',
      kind: 'single',
      summaryLabel: 'Surface',
      showWhen: { questionId: 'scope', anyOf: ['surface'] },
      options: [
        { id: 'plaster', label: 'Plaster', note: 'Classic smooth white finish', swatch: 'plaster', price: { unit: 'interior_sqft', low: 8, high: 11 } },
        { id: 'quartz', label: 'Quartz', note: 'Smooth and more durable, with sparkle', swatch: 'quartz', price: { unit: 'interior_sqft', low: 10, high: 14 } },
        { id: 'pebble', label: 'Pebble', note: 'Textured, long-lasting, natural look', swatch: 'pebble', price: { unit: 'interior_sqft', low: 14, high: 19 } },
        // Spans the cheapest low to the priciest high of the options above.
        { id: 'unsure', label: 'Help me choose', note: 'We will show the full range', price: { unit: 'interior_sqft', low: 8, high: 19 } },
      ],
    },
    {
      id: 'tile',
      label: 'Which waterline tile?',
      help: 'The row of tile at the water line.',
      kind: 'single',
      summaryLabel: 'Waterline tile',
      screen: 'edge',
      screenTitle: 'Tile & coping',
      showWhen: { questionId: 'scope', anyOf: ['tile_coping'] },
      options: [
        { id: 'porcelain', label: 'Porcelain', note: 'Clean, durable, many colors', swatch: 'tile_porcelain', price: { unit: 'perimeter_lf', low: 35, high: 55 } },
        { id: 'glass', label: 'Glass', note: 'Bright and glossy', swatch: 'tile_glass', price: { unit: 'perimeter_lf', low: 60, high: 90 } },
        { id: 'stone', label: 'Natural stone', note: 'Earthy, one-of-a-kind look', swatch: 'stone', price: { unit: 'perimeter_lf', low: 45, high: 75 } },
      ],
    },
    {
      id: 'coping',
      label: 'Which coping?',
      help: 'The cap along the edge of the pool.',
      kind: 'single',
      summaryLabel: 'Coping',
      screen: 'edge',
      showWhen: { questionId: 'scope', anyOf: ['tile_coping'] },
      options: [
        { id: 'concrete', label: 'Concrete', note: 'Budget-friendly and sturdy', swatch: 'concrete', price: { unit: 'perimeter_lf', low: 40, high: 60 } },
        { id: 'travertine', label: 'Travertine', note: 'Soft natural stone that stays cool', swatch: 'travertine', price: { unit: 'perimeter_lf', low: 65, high: 95 } },
        { id: 'stone', label: 'Natural stone', note: 'Premium cut stone', swatch: 'stone', price: { unit: 'perimeter_lf', low: 55, high: 100 } },
        { id: 'unsure', label: 'Help me choose', note: 'We will show the full range', price: { unit: 'perimeter_lf', low: 40, high: 100 } },
      ],
    },
    {
      id: 'deck',
      label: 'Which deck material?',
      kind: 'single',
      summaryLabel: 'Deck',
      screen: 'deck',
      screenTitle: 'Your deck',
      showWhen: { questionId: 'scope', anyOf: ['deck'] },
      options: [
        { id: 'pavers', label: 'Pavers', note: 'Interlocking stone pavers', swatch: 'pavers', price: { unit: 'deck_sqft', low: 25, high: 41 } },
        { id: 'concrete', label: 'Concrete', note: 'Poured, with a broom or stamped finish', swatch: 'concrete', price: { unit: 'deck_sqft', low: 12, high: 20 } },
        { id: 'porcelain', label: 'Porcelain', note: 'Large-format tile, stays cooler underfoot', swatch: 'porcelain_deck', price: { unit: 'deck_sqft', low: 35, high: 55 } },
        { id: 'resurface', label: 'Resurface existing', note: 'Keep your deck, give it a new coating', swatch: 'deck_resurface', price: { unit: 'deck_sqft', low: 6, high: 12 } },
      ],
    },
    {
      id: 'deckSize',
      label: 'About how big is the deck?',
      help: 'The paved area around and beside the pool.',
      kind: 'single',
      role: 'deckSize',
      screen: 'deck',
      showWhen: { questionId: 'scope', anyOf: ['deck'] },
      options: [
        { id: 'small', label: 'Small', note: 'About 300 sq ft' },
        { id: 'medium', label: 'Medium', note: 'About 600 sq ft' },
        { id: 'large', label: 'Large', note: 'About 1,000 sq ft' },
      ],
    },
    {
      id: 'features',
      label: 'Which pool features?',
      help: 'Pick any you would like.',
      kind: 'multi',
      summaryLabel: 'Feature',
      showWhen: { questionId: 'scope', anyOf: ['features'] },
      options: [
        { id: 'baja', label: 'Baja shelf', note: 'A shallow lounging area', price: { unit: 'flat', low: 5000, high: 9000 } },
        {
          id: 'spa',
          label: 'Spa',
          note: 'Attached hot tub',
          siteVisit: 'New or raised spa (plumbing, electrical and structure)',
          price: { unit: 'flat', low: 18000, high: 35000 },
        },
        { id: 'water', label: 'Water bowls', note: 'Two bowls, priced each', price: { unit: 'each', low: 1500, high: 3000, quantity: 2 } },
        { id: 'fire', label: 'Fire bowls', note: 'Two bowls, priced each', price: { unit: 'each', low: 1800, high: 3500, quantity: 2 } },
        { id: 'lighting', label: 'LED pool lights', note: 'Two lights, priced each', price: { unit: 'each', low: 700, high: 1200, quantity: 2 } },
      ],
    },
    {
      id: 'equipment',
      label: 'Which equipment?',
      help: 'New equipment is often worth doing while the pool is open.',
      kind: 'multi',
      summaryLabel: 'Equipment',
      showWhen: { questionId: 'scope', anyOf: ['equipment'] },
      options: [
        { id: 'pump_filter', label: 'Pump and filter', note: 'Energy-saving variable-speed pump', price: { unit: 'flat', low: 2500, high: 4500 } },
        { id: 'heater', label: 'Heater', note: 'Swim more of the year', price: { unit: 'flat', low: 3500, high: 6500 } },
        { id: 'automation', label: 'Automation', note: 'Control it all from your phone', price: { unit: 'flat', low: 2500, high: 5000 } },
        { id: 'salt', label: 'Salt system', note: 'Softer water, less chlorine handling', price: { unit: 'flat', low: 1800, high: 3200 } },
      ],
    },
    {
      id: 'extras',
      label: 'Any backyard extras?',
      help: 'Optional. Pick any you would like.',
      kind: 'multi',
      summaryLabel: 'Backyard',
      showWhen: { questionId: 'project', anyOf: ['backyard'] },
      optional: true,
      options: [
        {
          id: 'kitchen',
          label: 'Outdoor kitchen',
          note: 'Grill, counter and storage',
          siteVisit: 'Outdoor kitchen (gas and electrical)',
          price: { unit: 'flat', low: 8000, high: 25000 },
        },
        { id: 'patio_cover', label: 'Patio cover', note: 'Shade for the seating area', price: { unit: 'flat', low: 9000, high: 22000 } },
        { id: 'turf_planting', label: 'Turf and planting', note: 'Artificial turf and new plants', price: { unit: 'flat', low: 4000, high: 12000 } },
        { id: 'fire_pit', label: 'Fire pit', note: 'A built-in gathering spot', price: { unit: 'flat', low: 2500, high: 7000 } },
      ],
    },
    {
      id: 'cracks',
      label: 'Any cracks, leaks or water loss?',
      help: 'It is fine to say you are not sure.',
      kind: 'single',
      screen: 'property',
      screenTitle: 'About your property',
      options: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes', siteVisit: 'Cracks, leaks or water loss' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Cracks, leaks or water loss' },
      ],
    },
    {
      id: 'access',
      label: 'Is backyard access narrow?',
      help: 'For example a gate under about 3 feet wide.',
      kind: 'single',
      screen: 'property',
      options: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes', siteVisit: 'Narrow backyard access' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Narrow backyard access' },
      ],
    },
    {
      id: 'hillside',
      label: 'Is your home on a hillside?',
      kind: 'single',
      screen: 'property',
      options: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes', siteVisit: 'Hillside lot' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Hillside lot' },
      ],
    },
  ],
  packages: [
    {
      id: 'refresh',
      label: 'Refresh',
      description: 'A fresh look for the pool itself: new surface, tile and edge.',
      includes: ['New quartz pool surface', 'Porcelain waterline tile', 'Concrete coping'],
      answers: {
        scope: ['surface', 'tile_coping'],
        surface: ['quartz'],
        tile: ['porcelain'],
        coping: ['concrete'],
      },
    },
    {
      id: 'signature',
      label: 'Signature',
      description: 'A step up in finish, plus new equipment and lighting.',
      includes: ['Pebble pool surface', 'Glass waterline tile', 'Travertine coping', 'New pump and filter', 'LED pool lights'],
      answers: {
        scope: ['surface', 'tile_coping', 'features', 'equipment'],
        surface: ['pebble'],
        tile: ['glass'],
        coping: ['travertine'],
        features: ['lighting'],
        equipment: ['pump_filter'],
      },
      popular: true,
    },
    {
      id: 'transformation',
      label: 'Transformation',
      description: 'The full makeover: everything in Signature plus a new deck and showpiece features.',
      includes: [
        'Everything in Signature',
        'New paver deck (medium size)',
        'Baja shelf',
        'Fire and water bowls',
        'Pool automation',
      ],
      answers: {
        scope: ['surface', 'tile_coping', 'deck', 'features', 'equipment'],
        surface: ['pebble'],
        tile: ['glass'],
        coping: ['travertine'],
        deck: ['pavers'],
        deckSize: ['medium'],
        features: ['baja', 'water', 'fire', 'lighting'],
        equipment: ['pump_filter', 'automation'],
      },
    },
  ],
  notIncluded: [
    'Structural repairs and leak detection',
    'Permits and plan fees',
    'Gas or electrical service changes',
    'Unforeseen conditions found once work begins',
  ],
  disclaimer: 'This is a ballpark range, not a quote. Your final price is set after a free on-site visit.',
};
