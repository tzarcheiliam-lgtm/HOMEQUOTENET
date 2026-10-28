// Contractor price sheet for the pool estimator: a CSV the contractor fills in
// with their real prices, one row per option, then the packages at the bottom.
//
//   node scripts/estimator-price-sheet.mjs                 # CSV to stdout
//   node scripts/estimator-price-sheet.mjs sheet.csv       # CSV to a file
//
// Imports the TypeScript template and catalog directly, like
// seed-funnel-templates.mjs. That needs Node's built-in type stripping, which
// is on by default from Node 22.18 / 23.6; on an older Node run it as
//   node --experimental-strip-types scripts/estimator-price-sheet.mjs
//
// Columns: section, question, option, unit, how quantity is measured, example
// low / high (per unit), contractor low / high (blank, to fill in), offer?
// (Y = in the default estimator, N = optional catalog item), notes. Prices are
// whole US dollars PER UNIT, not per job.
import { writeFileSync } from 'node:fs';
import { POOL_TEMPLATE } from '../lib/estimator/templates/pool.ts';
import { POOL_CATALOG } from '../lib/estimator/catalog/pool.ts';

const template = POOL_TEMPLATE;

// Typical medium pool, only used to show the contractor what a quantity means.
const g = template.geometry;
const med = g.sizes.medium;
const medPerimeter = 2 * (med.lengthFt + med.widthFt);
const medInterior = med.lengthFt * med.widthFt + medPerimeter * g.avgDepthFt;
const num = (n) => Math.round(n).toLocaleString('en-US');

const UNIT_WORDS = {
  interior_sqft: 'per sq ft of pool interior',
  perimeter_lf: 'per linear ft of pool edge',
  deck_sqft: 'per sq ft of deck',
  linear_ft: 'per linear ft',
  each: 'each',
  flat: 'one flat price',
};

function measuredBy(price) {
  switch (price.unit) {
    case 'interior_sqft':
      return `Pool floor plus walls (a ${med.lengthFt} x ${med.widthFt} ft pool, ${g.avgDepthFt} ft deep on average, is about ${num(medInterior)} sq ft)`;
    case 'perimeter_lf':
      return `Length of the pool edge (a ${med.lengthFt} x ${med.widthFt} ft pool is about ${num(medPerimeter)} ft)`;
    case 'deck_sqft':
      return `Deck area (small ${num(g.deckSizes.small ?? 0)}, medium ${num(g.deckSizes.medium ?? 0)}, large ${num(g.deckSizes.large ?? 0)} sq ft)`;
    case 'linear_ft':
      return `Length in feet (the example assumes ${price.quantity ?? 1} ft)`;
    case 'each':
      return `Number of items (the example assumes ${price.quantity ?? 1})`;
    default:
      return 'Whole job, no measuring';
  }
}

const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cells) => cells.map(cell).join(',');

const lines = [
  row([
    'Section',
    'Question',
    'Option',
    'Unit',
    'How quantity is measured',
    'Example low ($)',
    'Example high ($)',
    'Contractor low ($)',
    'Contractor high ($)',
    'Offer? (Y/N)',
    'Notes',
  ]),
];

for (const q of template.questions) {
  const inTemplate = q.options.filter((o) => o.price);
  if (inTemplate.length === 0) continue;
  const ids = new Set(q.options.map((o) => o.id));
  const extras = (POOL_CATALOG[q.id] ?? []).filter((o) => !ids.has(o.id) && o.price);
  const section = q.summaryLabel ?? q.label;
  const add = (o, offer) => {
    const notes = [o.note, o.siteVisit ? `Flags a site visit: ${o.siteVisit}` : ''].filter(Boolean).join('. ');
    lines.push(
      row([section, q.label, o.label, UNIT_WORDS[o.price.unit], measuredBy(o.price), o.price.low, o.price.high, '', '', offer, notes]),
    );
  };
  for (const o of inTemplate) add(o, 'Y');
  for (const o of extras) add(o, 'N');
}

lines.push('', row(['Packages (pre-filled choices, priced from the options above)']));
lines.push(row(['Package', 'Name', 'Most popular?', 'Description', 'Includes']));
for (const p of template.packages) {
  lines.push(row(['Package', p.label, p.popular ? 'Y' : 'N', p.description, p.includes.join('; ')]));
}

lines.push('', row(['Not included in any estimate']));
for (const item of template.notIncluded) lines.push(row(['Not included', item]));
lines.push('', row([`Minimum job: $${num(template.minimumJob)}. Ranges round to the nearest $${num(template.roundTo)}.`]));

const csv = `${lines.join('\n')}\n`;
const out = process.argv[2];
if (out) {
  writeFileSync(out, csv);
  console.error(`Wrote ${out}`);
} else {
  process.stdout.write(csv);
}
