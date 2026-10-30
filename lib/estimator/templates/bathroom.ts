import { DEFAULT_LIMITS, type EstimatorQuestion, type EstimatorTemplate } from '../types.ts';

/**
 * The default bathroom remodel estimator template.
 *
 * EVERY PRICE IN THIS FILE IS AN EXAMPLE (pricesConfirmed: false). They are
 * plausible installed prices for Southern California bathroom remodels,
 * picked so a medium bathroom (10 x 8 ft, 80 sq ft of floor) lands in
 * realistic ranges: about $6k-$15k for a refresh, $25k-$50k for a full
 * remodel and $50k-$95k for a large spa-style primary bath. They are not any
 * contractor's real pricing; each one is confirmed or replaced before the page
 * drops the "Example prices" label and becomes indexable.
 *
 * Pricing model: the project pick carries the base (demo, prep, rough-in,
 * waterproofing, labor), per sq ft of floor for a refresh or full remodel and
 * flat for a tub-to-shower conversion. Each scope item then adds its own line:
 * the shower or tub, its wall tile, the vanity and counter, the floor (per sq
 * ft), paint, fixture finish and upgrades.
 *
 * Geometry reuses the pool path: the size presets are the room's floor
 * (length x width in feet), every shape factor is 1 (there is no shape
 * question) and depth is ignored. Typed dimensions between 4 and 30 ft win
 * over the preset.
 *
 * Ids here are a fixed contract with the scene (lib/estimator/scene/bath), the
 * screens, the lead route and the tests; rename labels freely but do not
 * rename ids. Extra options a contractor can swap in live in
 * ../catalog/bathroom.ts.
 */

/**
 * Help line for the questions whose option tiles show pictures. The only
 * bathroom pictures today are AI-generated style ideas (HomeQuote Network has
 * no jobs of its own), so the tiles say so; a contractor using photos of real
 * jobs would drop this line.
 */
const AI_PICTURES = 'Pictures are AI-generated style ideas.';

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

export const BATHROOM_TEMPLATE: EstimatorTemplate = {
  trade: 'bathroom',
  title: 'Bathroom remodel',
  projectNoun: 'bathroom remodel',
  pricesConfirmed: false,
  minimumJob: 6000,
  roundTo: 500,
  limits: DEFAULT_LIMITS,
  geometry: {
    // Room floor footprints.
    sizes: { small: { lengthFt: 8, widthFt: 5 }, medium: { lengthFt: 10, widthFt: 8 }, large: { lengthFt: 14, widthFt: 12 } },
    // No depth for a room; kept at 0 so nothing can price by it.
    avgDepthFt: 0,
    shapes: {
      rectangle: { areaFactor: 1, perimeterFactor: 1 },
      l_shape: { areaFactor: 1, perimeterFactor: 1 },
      freeform: { areaFactor: 1, perimeterFactor: 1 },
      unsure: { areaFactor: 1, perimeterFactor: 1 },
    },
    deckSizes: {},
    limits: { minFt: 4, maxLengthFt: 30, maxWidthFt: 30, minDepthFt: 0, maxDepthFt: 0 },
  },
  questions: [
    {
      id: 'project',
      label: 'What are you planning?',
      kind: 'single',
      role: 'project',
      options: [
        { id: 'refresh', label: 'Update the look', note: 'New finishes, same layout', price: { unit: 'floor_sqft', low: 30, high: 60 } },
        { id: 'full', label: 'Full remodel', note: 'Down to the studs, all new', price: { unit: 'floor_sqft', low: 90, high: 160 } },
        { id: 'tub_to_shower', label: 'Tub-to-shower conversion', note: 'Swap the tub for a walk-in shower', price: { unit: 'flat', low: 3000, high: 6000 } },
      ],
    },
    {
      id: 'size',
      label: 'About how big is the bathroom?',
      help: 'Choose the closest. You can type exact measurements on the next step if you know them.',
      kind: 'single',
      role: 'size',
      options: [
        // Length x width, the order the lead, the result and the typed fields use.
        { id: 'small', label: 'Small', note: 'Hall or guest bath, about 8 x 5 ft' },
        { id: 'medium', label: 'Medium', note: 'About 10 x 8 ft' },
        { id: 'large', label: 'Large', note: 'Primary bath, about 14 x 12 ft' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Bathroom size to be measured' },
      ],
    },
    {
      id: 'package',
      label: 'Pick a starting point',
      help: 'Each package fills in the choices for you. You can change anything after.',
      kind: 'single',
      role: 'package',
      options: [
        { id: 'refresh', label: 'Refresh', note: 'New vanity, floor and paint' },
        { id: 'signature', label: 'Signature', note: 'The most popular full remodel' },
        { id: 'spa', label: 'Spa retreat', note: 'Freestanding tub, stone and upgrades' },
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
        { id: 'bathing', label: 'Shower or tub', note: 'New shower, tub and wall tile' },
        { id: 'vanity', label: 'Vanity and counter', note: 'Cabinet, sink and countertop' },
        { id: 'floor', label: 'Floor', note: 'New floor tile or plank' },
        { id: 'walls', label: 'Walls and paint', note: 'Patch, prime and paint' },
        { id: 'extras', label: 'Upgrades', note: 'Niche, bench, LED mirror and more' },
      ],
    },
    {
      id: 'bathing',
      label: 'Shower or tub?',
      help: AI_PICTURES,
      kind: 'single',
      summaryLabel: 'Shower/tub',
      showWhen: { questionId: 'scope', anyOf: ['bathing'] },
      options: [
        { id: 'walk_in', label: 'Walk-in shower with glass', note: 'Curbless or low curb, frameless glass', price: { unit: 'flat', low: 7000, high: 13000 } },
        {
          id: 'tub_shower',
          label: 'Tub and shower combo',
          note: 'A new tub with a shower over it',
          // A tub on a tub-to-shower conversion contradicts the project: confirmed in person.
          siteVisit: 'A tub on a tub-to-shower conversion (plan confirmed in person)',
          siteVisitWhen: { questionId: 'project', anyOf: ['tub_to_shower'] },
          price: { unit: 'flat', low: 5000, high: 9000 },
        },
        {
          id: 'tub_and_shower',
          label: 'Freestanding tub + separate shower',
          note: 'Best in a medium or large bathroom',
          // A layout and plumbing check in a small room, on a same-layout refresh, or on a tub-to-shower conversion.
          siteVisit: 'Freestanding tub and separate shower (layout and plumbing check)',
          siteVisitWhen: [
            { questionId: 'size', anyOf: ['small'] },
            { questionId: 'project', anyOf: ['refresh', 'tub_to_shower'] },
          ],
          price: { unit: 'flat', low: 14000, high: 26000 },
        },
        {
          id: 'keep',
          label: 'Keep my current tub/shower',
          note: 'Work around what is there',
          siteVisit: 'Keeping the tub on a tub-to-shower conversion (plan confirmed in person)',
          siteVisitWhen: { questionId: 'project', anyOf: ['tub_to_shower'] },
        },
      ],
    },
    {
      id: 'showerTile',
      label: 'Which shower wall tile?',
      kind: 'single',
      summaryLabel: 'Shower tile',
      showWhen: { questionId: 'bathing', anyOf: ['walk_in', 'tub_shower', 'tub_and_shower'] },
      options: [
        { id: 'subway', label: 'Classic subway', note: 'Glossy 3 x 6 in, timeless', price: { unit: 'flat', low: 2500, high: 4500 } },
        { id: 'large_porcelain', label: 'Large porcelain', note: 'Big slabs, fewer grout lines', price: { unit: 'flat', low: 3500, high: 6000 } },
        { id: 'zellige', label: 'Zellige', note: 'Handmade look with soft shine', price: { unit: 'flat', low: 5000, high: 9000 } },
        { id: 'marble', label: 'Marble', note: 'Natural stone with soft veining', price: { unit: 'flat', low: 6000, high: 11000 } },
      ],
    },
    {
      // Optional refinements of the shower and the tub (HomeQuote's bathroom funnel always answers
      // them; the builder shows them on the shower/tub screen). Prices are what each adds to the
      // shower or tub above.
      id: 'showerStyle',
      label: 'Which kind of shower?',
      kind: 'single',
      summaryLabel: 'Shower',
      screen: 'bathing',
      showWhen: { questionId: 'bathing', anyOf: ['walk_in', 'tub_and_shower'] },
      optional: true,
      options: [
        { id: 'frameless', label: 'Frameless glass', note: 'Clear glass panel, low curb' },
        {
          id: 'curbless',
          label: 'Curbless walk-in',
          note: 'Level floor, no step in',
          // The floor is recessed for a level entry: confirmed in person.
          siteVisit: 'Curbless shower (floor recess and drain check)',
          price: { unit: 'flat', low: 2500, high: 5500 },
        },
      ],
    },
    {
      id: 'tubStyle',
      label: 'Which kind of tub?',
      kind: 'single',
      summaryLabel: 'Tub',
      screen: 'bathing',
      showWhen: { questionId: 'bathing', anyOf: ['tub_and_shower'] },
      optional: true,
      options: [
        { id: 'soaking', label: 'Soaking tub', note: 'Deep, modern freestanding tub' },
        { id: 'clawfoot', label: 'Clawfoot tub', note: 'Classic tub on feet', price: { unit: 'flat', low: 1500, high: 4000 } },
        {
          id: 'stone',
          label: 'Sculpted stone tub',
          note: 'Solid stone-resin, carved look',
          // Heavy when full: the floor is checked in person.
          siteVisit: 'Stone tub (floor support check)',
          price: { unit: 'flat', low: 5000, high: 10000 },
        },
      ],
    },
    {
      id: 'vanity',
      label: 'Which vanity?',
      help: AI_PICTURES,
      kind: 'single',
      summaryLabel: 'Vanity',
      screen: 'vanity',
      screenTitle: 'Your vanity',
      showWhen: { questionId: 'scope', anyOf: ['vanity'] },
      options: [
        { id: 'single', label: 'Single vanity', note: 'One sink, about 30-48 in', price: { unit: 'flat', low: 1500, high: 3500 } },
        { id: 'double', label: 'Double vanity', note: 'Two sinks, about 60-72 in', price: { unit: 'flat', low: 3500, high: 7000 } },
        { id: 'floating', label: 'Floating vanity', note: 'Wall-mounted, open below', price: { unit: 'flat', low: 2500, high: 5500 } },
      ],
    },
    {
      id: 'vanityFinish',
      label: 'Which cabinet finish?',
      kind: 'single',
      summaryLabel: 'Cabinet',
      screen: 'vanity',
      showWhen: { questionId: 'scope', anyOf: ['vanity'] },
      options: [
        { id: 'white', label: 'White' },
        { id: 'wood', label: 'Natural wood' },
        { id: 'navy_green', label: 'Navy or green' },
        { id: 'black', label: 'Black' },
      ],
    },
    {
      id: 'counter',
      label: 'Which countertop?',
      kind: 'single',
      summaryLabel: 'Counter',
      screen: 'vanity',
      showWhen: { questionId: 'scope', anyOf: ['vanity'] },
      options: [
        { id: 'quartz_white', label: 'White quartz', note: 'Clean and low-maintenance', price: { unit: 'flat', low: 1200, high: 2800 } },
        { id: 'marble_look', label: 'Marble look', note: 'Veined porcelain or quartz', price: { unit: 'flat', low: 1500, high: 3500 } },
        { id: 'concrete', label: 'Concrete', note: 'Soft gray, modern', price: { unit: 'flat', low: 1800, high: 4000 } },
      ],
    },
    {
      id: 'floor',
      label: 'Which floor?',
      kind: 'single',
      summaryLabel: 'Floor',
      showWhen: { questionId: 'scope', anyOf: ['floor'] },
      options: [
        { id: 'porcelain_wood', label: 'Wood-look porcelain', note: 'Warm look, fully waterproof', price: { unit: 'floor_sqft', low: 18, high: 30 } },
        { id: 'large_stone', label: 'Large stone-look tile', note: 'Big tiles, few grout lines', price: { unit: 'floor_sqft', low: 20, high: 35 } },
        { id: 'hex_mosaic', label: 'Hex mosaic', note: 'Small tiles, classic and grippy', price: { unit: 'floor_sqft', low: 25, high: 40 } },
        { id: 'lvp', label: 'Luxury vinyl plank', note: 'Budget-friendly and soft underfoot', price: { unit: 'floor_sqft', low: 9, high: 15 } },
      ],
    },
    {
      id: 'paint',
      label: 'Which wall color?',
      kind: 'single',
      summaryLabel: 'Walls',
      showWhen: { questionId: 'scope', anyOf: ['walls'] },
      options: [
        { id: 'soft_white', label: 'Soft white', price: { unit: 'flat', low: 800, high: 1600 } },
        { id: 'greige', label: 'Warm greige', price: { unit: 'flat', low: 800, high: 1600 } },
        { id: 'sage', label: 'Sage green', price: { unit: 'flat', low: 800, high: 1600 } },
        { id: 'navy', label: 'Deep navy', price: { unit: 'flat', low: 800, high: 1600 } },
      ],
    },
    {
      id: 'metal',
      label: 'Which fixture finish?',
      help: 'Faucets, shower trim and hardware.',
      kind: 'single',
      summaryLabel: 'Fixtures',
      showWhen: { questionId: 'scope', anyOf: ['bathing', 'vanity'] },
      options: [
        { id: 'chrome', label: 'Polished chrome', price: { unit: 'flat', low: 600, high: 1200 } },
        { id: 'matte_black', label: 'Matte black', price: { unit: 'flat', low: 800, high: 1600 } },
        { id: 'brushed_gold', label: 'Brushed gold', price: { unit: 'flat', low: 1000, high: 2000 } },
        { id: 'brushed_nickel', label: 'Brushed nickel', price: { unit: 'flat', low: 800, high: 1500 } },
      ],
    },
    {
      id: 'extras',
      label: 'Any upgrades?',
      help: `Optional. Pick any you would like. ${AI_PICTURES}`,
      kind: 'multi',
      summaryLabel: 'Upgrade',
      showWhen: { questionId: 'scope', anyOf: ['extras'] },
      optional: true,
      options: [
        { id: 'niche', label: 'Shower niche', note: 'Built-in shelf for bottles', price: { unit: 'flat', low: 400, high: 900 } },
        { id: 'bench', label: 'Shower bench', note: 'Tiled seat in the shower', price: { unit: 'flat', low: 800, high: 1800 } },
        { id: 'led_mirror', label: 'LED mirror', note: 'Lit mirror with anti-fog', price: { unit: 'flat', low: 500, high: 1200 } },
        { id: 'heated_floor', label: 'Heated floor', note: 'Warm tile underfoot', price: { unit: 'flat', low: 1800, high: 3500 } },
        { id: 'rain_head', label: 'Rain shower head', note: 'Ceiling or wall-arm rain head', price: { unit: 'flat', low: 600, high: 1500 } },
      ],
    },
    siteQuestion('plumbing', 'Moving the toilet, shower or any walls?', 'Moving plumbing or walls', {
      help: 'Keeping things where they are costs less. It is fine to say you are not sure.',
      screenTitle: 'About your bathroom',
    }),
    siteQuestion('damage', 'Any water damage, leaks or mold?', 'Water damage or mold'),
    siteQuestion('location', 'Is it upstairs, or in a condo or HOA building?', 'Upstairs or condo bathroom (access and building rules)'),
  ],
  packages: [
    {
      id: 'refresh',
      label: 'Refresh',
      description: 'A fresh look without moving anything: new vanity, counter, floor and paint.',
      includes: ['Single vanity in white', 'White quartz counter', 'Luxury vinyl plank floor', 'Fresh paint', 'Brushed nickel fixtures'],
      answers: {
        scope: ['vanity', 'floor', 'walls'],
        vanity: ['single'],
        vanityFinish: ['white'],
        counter: ['quartz_white'],
        floor: ['lvp'],
        paint: ['soft_white'],
        metal: ['brushed_nickel'],
      },
    },
    {
      id: 'signature',
      label: 'Signature',
      description: 'The full remodel most homeowners pick: a glass walk-in shower and all-new finishes.',
      includes: [
        'Walk-in shower with frameless glass',
        'Large porcelain shower tile',
        'Double vanity in natural wood',
        'Wood-look porcelain floor',
        'Brushed gold fixtures and a shower niche',
      ],
      answers: {
        scope: ['bathing', 'vanity', 'floor', 'walls', 'extras'],
        bathing: ['walk_in'],
        showerTile: ['large_porcelain'],
        vanity: ['double'],
        vanityFinish: ['wood'],
        counter: ['quartz_white'],
        floor: ['porcelain_wood'],
        paint: ['greige'],
        metal: ['brushed_gold'],
        extras: ['niche'],
      },
      popular: true,
    },
    {
      id: 'spa',
      label: 'Spa retreat',
      description: 'The showpiece: freestanding tub, separate shower, marble and every comfort.',
      includes: [
        'Freestanding tub and separate glass shower',
        'Marble shower walls and large stone floor',
        'Floating vanity in navy or green, marble-look top',
        'Heated floor, rain head and LED mirror',
        'Shower bench and niche',
      ],
      answers: {
        scope: ['bathing', 'vanity', 'floor', 'walls', 'extras'],
        bathing: ['tub_and_shower'],
        showerTile: ['marble'],
        vanity: ['floating'],
        vanityFinish: ['navy_green'],
        counter: ['marble_look'],
        floor: ['large_stone'],
        paint: ['soft_white'],
        metal: ['brushed_gold'],
        extras: ['niche', 'bench', 'led_mirror', 'heated_floor', 'rain_head'],
      },
    },
  ],
  notIncluded: [
    'Moving plumbing, walls or windows',
    'Repairs for water damage, mold or subfloor',
    'Permits and plan fees',
    'Electrical panel or service upgrades',
    'Unforeseen conditions found once walls are opened',
  ],
  disclaimer:
    'This is a ballpark range, not a quote. Your final price is set by a licensed local contractor after a free in-home consultation.',
};
