import { CUSTOM_PACKAGE_ID, DEFAULT_LIMITS, type ContractorEstimatorConfig, type EstimatorTemplate } from '@/lib/estimator/types';

/**
 * Small, stable estimator template for tests and for building screens before
 * the real pool template exists. Numbers are arbitrary but round so expected
 * values are easy to compute by hand. Do not import from production code.
 */
export const FIXTURE_TEMPLATE: EstimatorTemplate = {
  trade: 'pool',
  title: 'Pool remodel (fixture)',
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
  questions: [
    {
      id: 'project',
      label: 'What are you planning?',
      kind: 'single',
      role: 'project',
      options: [
        { id: 'remodel', label: 'Remodel my pool' },
        { id: 'backyard', label: 'Pool + backyard' },
      ],
    },
    {
      id: 'shape',
      label: 'What shape is your pool?',
      kind: 'single',
      role: 'shape',
      options: [
        { id: 'rectangle', label: 'Rectangle' },
        { id: 'l_shape', label: 'L-shape' },
        { id: 'freeform', label: 'Freeform' },
        { id: 'unsure', label: 'Not sure' },
      ],
    },
    {
      id: 'size',
      label: 'How big is it?',
      kind: 'single',
      role: 'size',
      options: [
        { id: 'small', label: 'Small' },
        { id: 'medium', label: 'Medium' },
        { id: 'large', label: 'Large' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Pool size to be measured' },
      ],
    },
    {
      id: 'package',
      label: 'Pick a starting point',
      kind: 'single',
      role: 'package',
      options: [
        { id: 'refresh', label: 'Refresh' },
        { id: CUSTOM_PACKAGE_ID, label: 'Build my own' },
      ],
    },
    {
      id: 'scope',
      label: 'What do you want done?',
      kind: 'multi',
      role: 'scope',
      options: [
        { id: 'surface', label: 'Surface' },
        { id: 'coping', label: 'Coping' },
        { id: 'deck', label: 'Deck' },
        { id: 'equipment', label: 'Equipment' },
      ],
    },
    {
      id: 'surface',
      label: 'Which surface?',
      kind: 'single',
      summaryLabel: 'Surface',
      showWhen: { questionId: 'scope', anyOf: ['surface'] },
      options: [
        { id: 'plaster', label: 'Plaster', swatch: 'plaster', price: { unit: 'interior_sqft', low: 10, high: 14 } },
        { id: 'pebble', label: 'Pebble', swatch: 'pebble', price: { unit: 'interior_sqft', low: 18, high: 24 } },
      ],
    },
    {
      id: 'coping',
      label: 'Which coping?',
      kind: 'single',
      summaryLabel: 'Coping',
      screen: 'edge',
      screenTitle: 'Coping',
      showWhen: { questionId: 'scope', anyOf: ['coping'] },
      options: [
        { id: 'precast', label: 'Precast concrete', price: { unit: 'perimeter_lf', low: 40, high: 60 } },
        { id: 'travertine', label: 'Travertine', price: { unit: 'perimeter_lf', low: 60, high: 90 } },
      ],
    },
    {
      id: 'deck',
      label: 'Which deck?',
      kind: 'single',
      summaryLabel: 'Deck',
      showWhen: { questionId: 'scope', anyOf: ['deck'] },
      options: [
        { id: 'pavers', label: 'Pavers', price: { unit: 'deck_sqft', low: 20, high: 30 } },
        { id: 'resurface', label: 'Resurface existing', price: { unit: 'deck_sqft', low: 6, high: 10 } },
      ],
    },
    {
      id: 'deckSize',
      label: 'How big is the deck?',
      kind: 'single',
      role: 'deckSize',
      showWhen: { questionId: 'scope', anyOf: ['deck'] },
      options: [
        { id: 'small', label: 'Small' },
        { id: 'medium', label: 'Medium' },
        { id: 'large', label: 'Large' },
      ],
    },
    {
      id: 'equipment',
      label: 'Which equipment?',
      kind: 'multi',
      summaryLabel: 'Equipment',
      showWhen: { questionId: 'scope', anyOf: ['equipment'] },
      options: [
        { id: 'pump', label: 'Variable-speed pump', price: { unit: 'flat', low: 2000, high: 3000 } },
        { id: 'lights', label: 'LED lights', price: { unit: 'each', low: 800, high: 1200, quantity: 2 } },
      ],
    },
    {
      id: 'cracks',
      label: 'Any cracks or leaks?',
      kind: 'single',
      screen: 'property',
      screenTitle: 'About your property',
      options: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes', siteVisit: 'Cracks or leaks' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Cracks or leaks' },
      ],
    },
  ],
  packages: [
    {
      id: 'refresh',
      label: 'Refresh',
      description: 'New surface and coping.',
      includes: ['Plaster surface', 'Precast coping'],
      answers: { scope: ['surface', 'coping'], surface: ['plaster'], coping: ['precast'] },
      popular: true,
    },
  ],
  notIncluded: ['Permits'],
  disclaimer: 'This is a ballpark range, not a quote.',
};

export const FIXTURE_CONTRACTOR: ContractorEstimatorConfig = {
  slug: 'fixture-pools',
  contractorName: 'Fixture Pools',
  licenseLabel: 'CSLB #0000000',
  phone: '(555) 555-0100',
  funnelSlug: 'pool-masters',
  calendarUrl: 'https://example.com/book',
  revealRange: 'after_contact',
  pricesConfirmed: false,
};
