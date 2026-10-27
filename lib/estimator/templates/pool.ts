import type { EstimatorConfig } from '../engine.ts';

/**
 * Pool remodel template.
 *
 * EVERY PRICE HERE IS AN EXAMPLE. They are rough Southern California ranges
 * written to make the tool usable, not prices a contractor has confirmed.
 * `pricesConfirmed: false` makes the page say so and keeps it out of search.
 * Replace them with a real pool contractor's numbers, flip `pricesConfirmed`,
 * and update the expected values in tests/pool-estimator.test.ts in the same commit.
 *
 * "Scales with size" costs are written for a Medium pool and multiplied by the
 * size factor (Small 0.8, Medium 1, Large 1.3).
 */
export const POOL_TEMPLATE: EstimatorConfig = {
  trade: 'pool',
  title: 'Pool remodel',
  projectNoun: 'pool project',
  pricesConfirmed: false,
  minimumJob: 5000,
  roundTo: 500,
  questions: [
    {
      id: 'size',
      label: 'How big is your pool?',
      help: 'A rough guess is fine.',
      kind: 'single',
      role: 'size',
      options: [
        { id: 'small', label: 'Small', note: 'Under about 12,000 gallons, around 12 × 24 ft', sizeFactor: 0.8 },
        { id: 'medium', label: 'Medium', note: 'About 12,000–20,000 gallons, around 15 × 30 ft', sizeFactor: 1 },
        { id: 'large', label: 'Large', note: 'Over 20,000 gallons, around 18 × 36 ft or bigger', sizeFactor: 1.3 },
        { id: 'unsure', label: 'Not sure', sizeFactor: 1, siteVisit: 'Pool size to be measured' },
      ],
    },
    {
      id: 'scope',
      label: 'What do you want done?',
      help: 'Pick everything that applies.',
      kind: 'multi',
      options: [
        { id: 'resurfacing', label: 'Resurface the pool' },
        { id: 'tile', label: 'New waterline tile' },
        { id: 'coping', label: 'New coping', note: 'The edge around the pool' },
        { id: 'equipment', label: 'Equipment upgrade' },
        { id: 'decking', label: 'Pool deck' },
        { id: 'features', label: 'Add a feature', note: 'Baja shelf, spa, water feature, fire' },
      ],
    },
    {
      id: 'surface',
      label: 'Which surface finish?',
      kind: 'single',
      summaryLabel: 'Surface',
      showWhen: { questionId: 'scope', anyOf: ['resurfacing'] },
      options: [
        { id: 'plaster', label: 'White plaster', note: 'Lowest cost, shortest life', cost: { low: 6000, high: 8500 }, scalesWithSize: true },
        { id: 'quartz', label: 'Quartz', note: 'Colour options, lasts longer', cost: { low: 8000, high: 11500 }, scalesWithSize: true },
        { id: 'pebble', label: 'Pebble', note: 'Most durable, textured', cost: { low: 10500, high: 15500 }, scalesWithSize: true },
        { id: 'unsure', label: 'Help me choose', cost: { low: 6000, high: 15500 }, scalesWithSize: true },
      ],
    },
    {
      id: 'spa',
      label: 'Is there an attached spa to resurface too?',
      kind: 'single',
      summaryLabel: 'Spa',
      showWhen: { questionId: 'scope', anyOf: ['resurfacing'] },
      options: [
        { id: 'no', label: 'No spa, or leave it as is' },
        { id: 'yes', label: 'Yes, resurface the spa', cost: { low: 2500, high: 4500 } },
      ],
    },
    {
      id: 'tile',
      label: 'Which waterline tile?',
      kind: 'single',
      summaryLabel: 'Waterline tile',
      showWhen: { questionId: 'scope', anyOf: ['tile'] },
      options: [
        { id: 'standard', label: 'Porcelain or ceramic', cost: { low: 3000, high: 5000 }, scalesWithSize: true },
        { id: 'glass', label: 'Glass or premium', cost: { low: 5500, high: 9500 }, scalesWithSize: true },
        { id: 'unsure', label: 'Help me choose', cost: { low: 3000, high: 9500 }, scalesWithSize: true },
      ],
    },
    {
      id: 'coping',
      label: 'Which coping?',
      kind: 'single',
      summaryLabel: 'Coping',
      showWhen: { questionId: 'scope', anyOf: ['coping'] },
      options: [
        { id: 'precast', label: 'Precast concrete', cost: { low: 3500, high: 6000 }, scalesWithSize: true },
        { id: 'poured', label: 'Poured concrete', cost: { low: 4500, high: 8000 }, scalesWithSize: true },
        { id: 'stone', label: 'Travertine or natural stone', cost: { low: 5500, high: 9500 }, scalesWithSize: true },
        { id: 'unsure', label: 'Help me choose', cost: { low: 3500, high: 9500 }, scalesWithSize: true },
      ],
    },
    {
      id: 'equipment',
      label: 'Which equipment?',
      help: 'Pick everything you want replaced or added.',
      kind: 'multi',
      summaryLabel: 'Equipment',
      showWhen: { questionId: 'scope', anyOf: ['equipment'] },
      options: [
        { id: 'pump', label: 'Variable-speed pump', cost: { low: 1800, high: 2800 } },
        { id: 'filter', label: 'New filter', cost: { low: 1200, high: 2200 } },
        { id: 'heater', label: 'Heater or heat pump', cost: { low: 4500, high: 7500 } },
        { id: 'automation', label: 'Automation', note: 'Control the pool from your phone', cost: { low: 2000, high: 4000 } },
        { id: 'lights', label: 'LED pool lights', cost: { low: 1000, high: 2500 } },
      ],
    },
    {
      id: 'deck',
      label: 'What do you want for the deck?',
      kind: 'single',
      summaryLabel: 'Deck',
      showWhen: { questionId: 'scope', anyOf: ['decking'] },
      options: [
        { id: 'resurface', label: 'Resurface the existing deck', cost: { low: 3500, high: 7500 }, scalesWithSize: true },
        { id: 'concrete', label: 'New concrete deck', cost: { low: 9000, high: 18000 }, scalesWithSize: true },
        { id: 'pavers', label: 'New pavers or travertine', cost: { low: 12000, high: 25000 }, scalesWithSize: true },
        { id: 'unsure', label: 'Not sure yet', cost: { low: 3500, high: 25000 }, scalesWithSize: true },
      ],
    },
    {
      id: 'features',
      label: 'Which features?',
      help: 'Pick everything you are interested in.',
      kind: 'multi',
      summaryLabel: 'Feature',
      showWhen: { questionId: 'scope', anyOf: ['features'] },
      options: [
        { id: 'baja', label: 'Baja shelf (tanning ledge)', cost: { low: 6000, high: 12000 } },
        {
          id: 'newSpa',
          label: 'New attached spa',
          cost: { low: 25000, high: 45000 },
          siteVisit: 'New spa (plumbing, electrical and structure)',
        },
        { id: 'water', label: 'Water feature', note: 'Sheer descent, bubblers or deck jets', cost: { low: 2500, high: 7500 } },
        { id: 'fire', label: 'Fire bowls', cost: { low: 3000, high: 8000 } },
      ],
    },
    {
      id: 'cracks',
      label: 'Any cracks, leaks or water loss you know of?',
      kind: 'single',
      options: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes', siteVisit: 'Cracks, leaks or water loss' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Cracks, leaks or water loss' },
      ],
    },
    {
      id: 'access',
      label: 'Is the way into your backyard narrower than about 4 feet?',
      kind: 'single',
      options: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes', siteVisit: 'Narrow backyard access' },
        { id: 'unsure', label: 'Not sure', siteVisit: 'Narrow backyard access' },
      ],
    },
  ],
  notIncluded: [
    'Structural repairs and leak detection',
    'Permits',
    'Changes to gas or electrical service',
  ],
  disclaimer: 'This is a ballpark range, not a quote. Your final price is set after an on-site visit.',
};
