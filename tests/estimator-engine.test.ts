import { describe, expect, it } from 'vitest';
import {
  applyPackage,
  computeEstimate,
  formatRange,
  formatUsd,
  picksFor,
  validateTemplate,
  visibleQuestions,
} from '@/lib/estimator/engine';
import { CUSTOM_PACKAGE_ID, type Answers, type EstimatorTemplate } from '@/lib/estimator/types';
import { FIXTURE_TEMPLATE } from './fixtures/estimator-template';

// Fixture geometry (rectangle, medium 30 x 15, depth 5): surface 450, perimeter 90, interior 900.
// Small: perimeter 72, interior 648. Large: perimeter 108, interior 1188.
// Deck presets: small 300, medium 600, large 1000. minimumJob 5000, roundTo 500.

const clone = () => structuredClone(FIXTURE_TEMPLATE);
const base: Answers = { project: ['remodel'], shape: ['rectangle'], size: ['medium'], package: [CUSTOM_PACKAGE_ID], cracks: ['no'] };
const answers = (extra: Answers = {}): Answers => ({ ...base, ...extra });
const est = (a: Answers, t: EstimatorTemplate = FIXTURE_TEMPLATE, dimensions?: { lengthFt: number; widthFt: number; avgDepthFt?: number }) =>
  computeEstimate(t, { answers: a, dimensions });
const q = (t: EstimatorTemplate, id: string) => t.questions.find((x) => x.id === id)!;

describe('picksFor', () => {
  const single = q(FIXTURE_TEMPLATE, 'surface');
  const multi = q(FIXTURE_TEMPLATE, 'equipment');

  it('drops unknown ids', () => {
    expect(picksFor(single, { surface: ['nope'] })).toEqual([]);
    expect(picksFor(multi, { equipment: ['pump', 'nope'] })).toEqual(['pump']);
  });

  it('a single question keeps only its first valid pick', () => {
    expect(picksFor(single, { surface: ['nope', 'pebble', 'plaster'] })).toEqual(['pebble']);
  });

  it('a multi question keeps all valid picks once', () => {
    expect(picksFor(multi, { equipment: ['lights', 'pump', 'lights'] })).toEqual(['lights', 'pump']);
  });

  it('handles a missing or malformed answer', () => {
    expect(picksFor(single, {})).toEqual([]);
    expect(picksFor(single, { surface: 'plaster' as unknown as string[] })).toEqual([]);
  });
});

describe('visibleQuestions', () => {
  const ids = (a: Answers, t = FIXTURE_TEMPLATE) => visibleQuestions(t, a).map((x) => x.id);

  it('shows only unconditional questions with no answers', () => {
    expect(ids({})).toEqual(['project', 'shape', 'size', 'package', 'scope', 'cracks']);
  });

  it('adds children for picked scope options, in template order', () => {
    expect(ids({ scope: ['equipment', 'surface'] })).toEqual(['project', 'shape', 'size', 'package', 'scope', 'surface', 'equipment', 'cracks']);
    expect(ids({ scope: ['deck'] })).toEqual(['project', 'shape', 'size', 'package', 'scope', 'deck', 'deckSize', 'cracks']);
  });

  it('a hidden parent hides its children even when their own trigger answer exists', () => {
    const t = clone();
    t.questions.splice(t.questions.findIndex((x) => x.id === 'deckSize') + 1, 0, {
      id: 'deckColor',
      label: 'Color',
      kind: 'single',
      showWhen: { questionId: 'deck', anyOf: ['pavers'] },
      options: [{ id: 'tan', label: 'Tan' }],
    });
    expect(ids({ scope: ['surface'], deck: ['pavers'] }, t)).not.toContain('deckColor');
    expect(ids({ scope: ['deck'], deck: ['pavers'] }, t)).toContain('deckColor');
    expect(ids({ scope: ['deck'], deck: ['resurface'] }, t)).not.toContain('deckColor');
  });

  it('an invalid trigger answer does not show the child', () => {
    expect(ids({ scope: ['bogus'] })).not.toContain('surface');
  });

  it('a showWhen pointing at an unknown question is hidden', () => {
    const t = clone();
    q(t, 'surface').showWhen = { questionId: 'ghost', anyOf: ['x'] };
    expect(ids({ scope: ['surface'] }, t)).not.toContain('surface');
  });
});

describe('applyPackage', () => {
  it('sets the package answer and fills the package answers', () => {
    const out = applyPackage(FIXTURE_TEMPLATE, { size: ['large'] }, 'refresh');
    expect(out).toEqual({
      size: ['large'],
      package: ['refresh'],
      scope: ['surface', 'coping'],
      surface: ['plaster'],
      coping: ['precast'],
    });
  });

  it('the package answers overwrite existing answers to the same questions', () => {
    const out = applyPackage(FIXTURE_TEMPLATE, { scope: ['deck'], surface: ['pebble'], deck: ['pavers'] }, 'refresh');
    expect(out.scope).toEqual(['surface', 'coping']);
    expect(out.surface).toEqual(['plaster']);
    // Not named by the package: kept, but hidden because scope no longer includes deck.
    expect(out.deck).toEqual(['pavers']);
    expect(visibleQuestions(FIXTURE_TEMPLATE, out).some((x) => x.id === 'deck')).toBe(false);
  });

  it('custom keeps every existing answer and only sets package=[custom]', () => {
    const before = answers({ package: ['refresh'], scope: ['surface'], surface: ['pebble'] });
    const out = applyPackage(FIXTURE_TEMPLATE, before, CUSTOM_PACKAGE_ID);
    expect(out).toEqual({ ...before, package: [CUSTOM_PACKAGE_ID] });
  });

  it('an unknown package id returns a plain copy', () => {
    const before = answers({ scope: ['surface'] });
    const out = applyPackage(FIXTURE_TEMPLATE, before, 'ghost');
    expect(out).toEqual(before);
    expect(out).not.toBe(before);
  });

  it('does not mutate its input or share arrays with the package', () => {
    const before: Answers = { size: ['large'] };
    const copy = structuredClone(before);
    const out = applyPackage(FIXTURE_TEMPLATE, before, 'refresh');
    expect(before).toEqual(copy);
    out.scope.push('deck');
    expect(FIXTURE_TEMPLATE.packages[0].answers.scope).toEqual(['surface', 'coping']);
  });

  it('works for a template without a package question', () => {
    const t = clone();
    t.questions = t.questions.filter((x) => x.role !== 'package');
    expect(applyPackage(t, {}, 'refresh')).toEqual({ scope: ['surface', 'coping'], surface: ['plaster'], coping: ['precast'] });
  });

  it('a package estimate matches picking the same options by hand', () => {
    const viaPackage = est(applyPackage(FIXTURE_TEMPLATE, answers(), 'refresh'));
    const byHand = est(answers({ package: ['refresh'], scope: ['surface', 'coping'], surface: ['plaster'], coping: ['precast'] }));
    expect(viaPackage).toEqual(byHand);
    // plaster 900 x 10..14 = 9000..12600; precast 90 x 40..60 = 3600..5400.
    // Total 12600..18000 -> low 12500, high 18000.
    expect([viaPackage.low, viaPackage.high, viaPackage.status]).toEqual([12500, 18000, 'ready']);
  });
});

describe('computeEstimate units', () => {
  it('interior_sqft: interior area x unit price', () => {
    // 900 x 10..14 = 9000..12600 -> 9000..13000
    const e = est(answers({ scope: ['surface'], surface: ['plaster'] }));
    expect(e.lines).toEqual([
      { questionId: 'surface', optionId: 'plaster', label: 'Surface: Plaster', unit: 'interior_sqft', quantity: 900, low: 9000, high: 12600 },
    ]);
    expect([e.low, e.high]).toEqual([9000, 13000]);
  });

  it('interior_sqft follows the pool size', () => {
    // small 648 x 18..24 = 11664..15552 -> 11500..16000 ; large 1188 x 18..24 = 21384..28512 -> 21000..29000
    const small = est(answers({ size: ['small'], scope: ['surface'], surface: ['pebble'] }));
    expect([small.lines[0].quantity, small.low, small.high]).toEqual([648, 11500, 16000]);
    const large = est(answers({ size: ['large'], scope: ['surface'], surface: ['pebble'] }));
    expect([large.lines[0].quantity, large.low, large.high]).toEqual([1188, 21000, 29000]);
  });

  it('perimeter_lf: perimeter x unit price', () => {
    // 90 x 60..90 = 5400..8100 -> 5000..8500
    const e = est(answers({ scope: ['coping'], coping: ['travertine'] }));
    expect(e.lines[0]).toMatchObject({ label: 'Coping: Travertine', unit: 'perimeter_lf', quantity: 90, low: 5400, high: 8100 });
    expect([e.low, e.high]).toEqual([5000, 8500]);
  });

  it('deck_sqft: deck area from the deck-size answer', () => {
    // medium 600 x 20..30 = 12000..18000
    const e = est(answers({ scope: ['deck'], deck: ['pavers'], deckSize: ['medium'] }));
    expect(e.lines[0]).toMatchObject({ label: 'Deck: Pavers', unit: 'deck_sqft', quantity: 600, low: 12000, high: 18000 });
    expect([e.low, e.high]).toEqual([12000, 18000]);
    // small 300 x 6..10 = 1800..3000 -> minimum job, still shown as a range (one roundTo step)
    const r = est(answers({ scope: ['deck'], deck: ['resurface'], deckSize: ['small'] }));
    expect([r.low, r.high]).toEqual([5000, 5500]);
  });

  it('flat: quantity 1; each: default quantity', () => {
    const pump = est(answers({ scope: ['equipment'], equipment: ['pump'] }));
    expect(pump.lines[0]).toMatchObject({ unit: 'flat', quantity: 1, low: 2000, high: 3000 });
    const lights = est(answers({ scope: ['equipment'], equipment: ['lights'] }));
    expect(lights.lines[0]).toMatchObject({ unit: 'each', quantity: 2, low: 1600, high: 2400 });
  });

  it('linear_ft uses price.quantity, rounded, default 1', () => {
    const t = clone();
    q(t, 'equipment').options[0].price = { unit: 'linear_ft', low: 100, high: 150, quantity: 20.4 };
    q(t, 'equipment').options[1].price = { unit: 'linear_ft', low: 100, high: 150 };
    const e = est(answers({ scope: ['equipment'], equipment: ['pump', 'lights'] }), t);
    expect(e.lines.map((l) => [l.quantity, l.low, l.high])).toEqual([
      [20, 2000, 3000],
      [1, 100, 150],
    ]);
  });

  it('rounds geometry quantities to whole units before pricing', () => {
    // freeform small: perimeter 2 x 36 x 1.1 = 79.2 -> 79; interior 244.8 + 79.2 x 5 = 640.8 -> 641
    const e = est(answers({ shape: ['freeform'], size: ['small'], scope: ['surface', 'coping'], surface: ['plaster'], coping: ['precast'] }));
    expect(e.geometry.interiorSqft).toBeCloseTo(640.8, 6);
    const [surface, coping] = e.lines;
    expect([surface.quantity, surface.low, surface.high]).toEqual([641, 6410, 8974]);
    expect([coping.quantity, coping.low, coping.high]).toEqual([79, 3160, 4740]);
    // 9570..13714 -> 9500..14000
    expect([e.low, e.high]).toEqual([9500, 14000]);
  });

  it('typed dimensions replace the preset footprint', () => {
    // 40 x 20: interior 800 + 120 x 5 = 1400; x 10..14 = 14000..19600 -> 14000..20000
    const e = est(answers({ size: ['small'], scope: ['surface'], surface: ['plaster'] }), FIXTURE_TEMPLATE, { lengthFt: 40, widthFt: 20 });
    expect(e.geometry.source).toBe('dimensions');
    expect([e.lines[0].quantity, e.low, e.high]).toEqual([1400, 14000, 20000]);
  });

  it('out-of-limit typed dimensions fall back to the preset', () => {
    const e = est(answers({ scope: ['surface'], surface: ['plaster'] }), FIXTURE_TEMPLATE, { lengthFt: 500, widthFt: 20 });
    expect(e.geometry.source).toBe('preset');
    expect(e.lines[0].quantity).toBe(900);
  });

  it('adds several lines in template order', () => {
    // plaster 9000..12600 + precast 3600..5400 + pump 2000..3000 + lights 1600..2400 = 16200..23400
    const e = est(
      answers({ scope: ['equipment', 'coping', 'surface'], surface: ['plaster'], coping: ['precast'], equipment: ['pump', 'lights'] }),
    );
    expect(e.lines.map((l) => l.questionId)).toEqual(['surface', 'coping', 'equipment', 'equipment']);
    expect([e.low, e.high]).toEqual([16000, 23500]);
  });

  it('a decimal unit price does not leak float error into the rounding', () => {
    const t = clone();
    q(t, 'surface').options[0].price = { unit: 'interior_sqft', low: 9.99, high: 14.01 };
    // 900 x 9.99 = 8991 ; 900 x 14.01 = 12609 -> 8500..13000
    const e = est(answers({ scope: ['surface'], surface: ['plaster'] }), t);
    expect([e.lines[0].low, e.lines[0].high, e.low, e.high]).toEqual([8991, 12609, 8500, 13000]);
  });
});

describe('computeEstimate hidden questions', () => {
  it('ignores answers to hidden questions', () => {
    const e = est(answers({ scope: ['surface'], surface: ['plaster'], coping: ['travertine'], deck: ['pavers'], deckSize: ['large'], equipment: ['pump'] }));
    expect(e.lines.map((l) => l.questionId)).toEqual(['surface']);
    expect(e.geometry.deckSqft).toBe(0);
    expect(e.unanswered).toEqual([]);
  });

  it('stale site-visit answers to hidden questions do not flag a visit', () => {
    const t = clone();
    q(t, 'surface').options[0].siteVisit = 'Check surface';
    const e = est(answers({ scope: ['coping'], coping: ['precast'], surface: ['plaster'] }), t);
    expect(e.siteVisitItems).toEqual([]);
    expect(e.status).toBe('ready');
  });

  it('changing scope drops the lines but keeps the stored answers usable later', () => {
    const a = answers({ scope: ['surface', 'coping'], surface: ['plaster'], coping: ['precast'] });
    expect(est(a).lines).toHaveLength(2);
    expect(est({ ...a, scope: ['surface'] }).lines).toHaveLength(1);
  });

  it('package and scope picks never produce lines, even if they carry a price', () => {
    const t = clone();
    q(t, 'package').options[0].price = { unit: 'flat', low: 1, high: 2 };
    q(t, 'scope').options[0].price = { unit: 'flat', low: 1, high: 2 };
    const e = est(answers({ package: ['refresh'], scope: ['surface'], surface: ['plaster'] }), t);
    expect(e.lines.map((l) => l.questionId)).toEqual(['surface']);
  });

  it('an invalid pick on a visible question counts as unanswered', () => {
    const e = est(answers({ scope: ['surface'], surface: ['terrazzo'] }));
    expect(e.unanswered).toEqual(['surface']);
    expect(e.lines).toEqual([]);
  });
});

describe('computeEstimate totals', () => {
  it('has null low/high until a priced option is picked', () => {
    const e = est({});
    expect([e.low, e.high, e.lines]).toEqual([null, null, []]);
    const noPrice = est(answers({ scope: ['surface'] }));
    expect([noPrice.low, noPrice.high]).toEqual([null, null]);
  });

  it('applies the minimum job to both ends, keeping a range (never a single figure)', () => {
    // lights alone: 1600..2400 -> both at 5000, high lifted one roundTo step
    const e = est(answers({ scope: ['equipment'], equipment: ['lights'] }));
    expect([e.low, e.high]).toEqual([5000, 5500]);
    const t = clone();
    t.roundTo = 0;
    const r = est(answers({ scope: ['equipment'], equipment: ['lights'] }), t);
    expect([r.low, r.high]).toEqual([5000, 5500]); // 10% spread without a rounding step
  });

  it('applies the minimum job to the low end only when it is the only end below', () => {
    // pump + lights: 3600..5400 -> low 5000, high 5500
    const e = est(answers({ scope: ['equipment'], equipment: ['pump', 'lights'] }));
    expect([e.low, e.high]).toEqual([5000, 5500]);
  });

  it('rounds the low end down and the high end up', () => {
    // plaster 9000..12600 -> 9000..13000 ; coping precast alone 3600..5400 -> 5000..5500
    expect([est(answers({ scope: ['surface'], surface: ['plaster'] })).high]).toEqual([13000]);
    const e = est(answers({ scope: ['equipment'], equipment: ['pump', 'lights'] }));
    expect(e.high).toBe(5500);
  });

  it('values already on a step stay put', () => {
    const t = clone();
    q(t, 'equipment').options[0].price = { unit: 'flat', low: 7000, high: 8500 };
    const e = est(answers({ scope: ['equipment'], equipment: ['pump'] }), t);
    expect([e.low, e.high]).toEqual([7000, 8500]);
  });

  it('roundTo 0 skips rounding', () => {
    const t = clone();
    t.roundTo = 0;
    const e = est(answers({ scope: ['surface'], surface: ['plaster'] }), t);
    expect([e.low, e.high]).toEqual([9000, 12600]);
  });

  it('never ends below the minimum job even when it is not on a step', () => {
    const t = clone();
    t.minimumJob = 5250;
    const e = est(answers({ scope: ['equipment'], equipment: ['lights'] }), t);
    expect([e.low, e.high]).toEqual([5250, 5500]);
  });

  it('a larger minimum job lifts both ends', () => {
    const t = clone();
    t.minimumJob = 20000;
    const e = est(answers({ scope: ['surface'], surface: ['plaster'] }), t);
    expect([e.low, e.high]).toEqual([20000, 20500]);
  });

  it('skips prices that are not finite', () => {
    const t = clone();
    q(t, 'surface').options[0].price = { unit: 'interior_sqft', low: NaN, high: 14 };
    const e = est(answers({ scope: ['surface'], surface: ['plaster'] }), t);
    expect(e.lines).toEqual([]);
    expect(e.low).toBeNull();
  });
});

describe('computeEstimate deck dependency', () => {
  it('with no deck size, the deck line waits and deckSize stays unanswered', () => {
    const e = est(answers({ scope: ['deck'], deck: ['pavers'] }));
    expect(e.lines).toEqual([]);
    expect([e.low, e.high]).toEqual([null, null]);
    expect(e.unanswered).toEqual(['deckSize']);
    expect(e.status).toBe('incomplete');
  });

  it('other lines still price while the deck waits', () => {
    const e = est(answers({ scope: ['surface', 'deck'], surface: ['plaster'], deck: ['pavers'] }));
    expect(e.lines.map((l) => l.questionId)).toEqual(['surface']);
    expect(e.unanswered).toEqual(['deckSize']);
    expect([e.low, e.high]).toEqual([9000, 13000]);
  });

  it('the deck line appears once the deck size is answered', () => {
    const e = est(answers({ scope: ['deck'], deck: ['pavers'], deckSize: ['large'] }));
    expect(e.lines[0].quantity).toBe(1000);
    expect(e.unanswered).toEqual([]);
    expect(e.status).toBe('ready');
  });

  it('flags the deck question when the deck size can never be asked', () => {
    const t = clone();
    q(t, 'deckSize').showWhen = { questionId: 'project', anyOf: ['backyard'] };
    const e = est(answers({ scope: ['deck'], deck: ['pavers'] }), t);
    expect(e.lines).toEqual([]);
    expect(e.unanswered).toEqual(['deck']);
    expect(e.status).toBe('incomplete');
  });

  it('a deck-size area of 0 behaves like an unanswered size', () => {
    const t = clone();
    t.geometry.deckSizes.small = 0;
    const e = est(answers({ scope: ['deck'], deck: ['pavers'], deckSize: ['small'] }), t);
    expect(e.lines).toEqual([]);
    expect(e.unanswered).toEqual(['deck']);
  });
});

describe('computeEstimate status and site visits', () => {
  const full = answers({ scope: ['surface'], surface: ['plaster'] });

  it('ready when everything is answered and nothing is flagged', () => {
    const e = est(full);
    expect([e.status, e.unanswered, e.siteVisitItems]).toEqual(['ready', [], []]);
  });

  it('incomplete lists every shown, unanswered question', () => {
    const e = est({ shape: ['rectangle'], size: ['medium'], scope: ['surface', 'equipment'] });
    expect(e.unanswered).toEqual(['project', 'package', 'surface', 'equipment', 'cracks']);
    expect(e.status).toBe('incomplete');
  });

  it('a multi question with no picks is unanswered', () => {
    const e = est(answers({ scope: ['equipment'], equipment: [] }));
    expect(e.unanswered).toEqual(['equipment']);
  });

  it('site_visit when answered but something needs a look', () => {
    const e = est({ ...full, cracks: ['yes'] });
    expect(e.siteVisitItems).toEqual([{ questionId: 'cracks', label: 'Cracks or leaks' }]);
    expect(e.status).toBe('site_visit');
    expect([e.low, e.high]).toEqual([9000, 13000]);
  });

  it('an unsure size sets a site visit and uses medium', () => {
    const e = est({ ...full, size: ['unsure'] });
    expect(e.siteVisitItems).toEqual([{ questionId: 'size', label: 'Pool size to be measured' }]);
    expect(e.geometry.interiorSqft).toBe(900);
    expect(e.status).toBe('site_visit');
  });

  it('incomplete outranks site_visit', () => {
    const e = est({ ...full, cracks: ['yes'], package: [] });
    expect(e.unanswered).toEqual(['package']);
    expect(e.siteVisitItems).toHaveLength(1);
    expect(e.status).toBe('incomplete');
  });

  it('dedupes site-visit items by label', () => {
    const t = clone();
    q(t, 'size').options[3].siteVisit = 'Cracks or leaks';
    const e = est({ ...full, size: ['unsure'], cracks: ['unsure'] }, t);
    expect(e.siteVisitItems).toEqual([{ questionId: 'size', label: 'Cracks or leaks' }]);
  });

  it('keeps distinct labels, in question order', () => {
    const e = est({ ...full, size: ['unsure'], cracks: ['unsure'] });
    expect(e.siteVisitItems.map((s) => s.label)).toEqual(['Pool size to be measured', 'Cracks or leaks']);
  });

  it('an option can carry both a price and a site visit', () => {
    const t = clone();
    q(t, 'surface').options[0].siteVisit = 'Check shell';
    const e = est(full, t);
    expect(e.lines).toHaveLength(1);
    expect(e.status).toBe('site_visit');
  });
});

describe('computeEstimate purity', () => {
  it('does not mutate the template or the input', () => {
    const t = clone();
    const a = answers({ scope: ['surface'], surface: ['plaster'] });
    const tCopy = structuredClone(t);
    const aCopy = structuredClone(a);
    est(a, t);
    expect(t).toEqual(tCopy);
    expect(a).toEqual(aCopy);
  });
});

describe('validateTemplate', () => {
  const problems = (mutate: (t: EstimatorTemplate) => void) => {
    const t = clone();
    mutate(t);
    return validateTemplate(t);
  };
  const some = (list: string[], re: RegExp) => expect(list.some((p) => re.test(p)), list.join('\n')).toBe(true);

  it('accepts the fixture', () => {
    expect(validateTemplate(FIXTURE_TEMPLATE)).toEqual([]);
  });

  it('does not mutate the template', () => {
    const t = clone();
    t.questions[0].options.push({ id: 'remodel', label: 'dup' });
    const copy = structuredClone(t);
    validateTemplate(t);
    expect(t).toEqual(copy);
  });

  it('duplicate question ids', () => {
    some(problems((t) => void t.questions.push({ ...q(t, 'cracks') })), /Duplicate question id "cracks"/);
  });

  it('duplicate option ids', () => {
    some(problems((t) => void q(t, 'surface').options.push({ id: 'plaster', label: 'again' })), /duplicate option id "plaster"/);
  });

  it('showWhen referencing an unknown question', () => {
    some(problems((t) => void (q(t, 'surface').showWhen = { questionId: 'ghost', anyOf: ['x'] })), /unknown question "ghost"/);
  });

  it('showWhen referencing a later question', () => {
    some(problems((t) => void (q(t, 'scope').showWhen = { questionId: 'surface', anyOf: ['plaster'] })), /"scope" is shown by "surface".*before/);
  });

  it('showWhen referencing itself', () => {
    some(problems((t) => void (q(t, 'surface').showWhen = { questionId: 'surface', anyOf: ['plaster'] })), /"surface" is shown by "surface"/);
  });

  it('showWhen referencing an unknown option', () => {
    some(problems((t) => void (q(t, 'surface').showWhen = { questionId: 'scope', anyOf: ['surface', 'moat'] })), /unknown option "scope.moat"/);
  });

  it('price low below 0', () => {
    some(problems((t) => void (q(t, 'surface').options[0].price = { unit: 'flat', low: -1, high: 5 })), /"surface.plaster".*negative low/);
  });

  it('price high below low', () => {
    some(problems((t) => void (q(t, 'surface').options[0].price = { unit: 'flat', low: 10, high: 5 })), /"surface.plaster".*high price below/);
  });

  it('non-finite prices', () => {
    some(problems((t) => void (q(t, 'surface').options[0].price = { unit: 'flat', low: NaN, high: 5 })), /not a finite number/);
    some(problems((t) => void (q(t, 'surface').options[0].price = { unit: 'flat', low: 1, high: Infinity })), /not a finite number/);
  });

  it('unknown price unit', () => {
    some(problems((t) => void (q(t, 'surface').options[0].price = { unit: 'acre' as never, low: 1, high: 2 })), /unknown price unit "acre"/);
  });

  it('quantity at or below 0', () => {
    some(problems((t) => void (q(t, 'equipment').options[1].price = { unit: 'each', low: 1, high: 2, quantity: 0 })), /quantity/);
    some(problems((t) => void (q(t, 'equipment').options[1].price = { unit: 'each', low: 1, high: 2, quantity: -3 })), /quantity/);
    some(problems((t) => void (q(t, 'equipment').options[1].price = { unit: 'each', low: 1, high: 2, quantity: NaN })), /quantity/);
  });

  it('each role at most once', () => {
    some(problems((t) => void (q(t, 'cracks').role = 'size')), /Role "size" is used by more than one question/);
  });

  it('shape option ids must be pool shapes', () => {
    some(problems((t) => void (q(t, 'shape').options[3].id = 'oval')), /Shape option "oval"/);
  });

  it('size option ids must be pool sizes', () => {
    some(problems((t) => void (q(t, 'size').options[3].id = 'huge')), /Size option "huge"/);
  });

  it('package option ids must match the packages plus custom', () => {
    some(problems((t) => void q(t, 'package').options.push({ id: 'gold', label: 'Gold' })), /Package option "gold"/);
    expect(problems((t) => void (t.packages = []))).toEqual(['Package option "refresh" does not match any package.']);
  });

  it('deckSize option ids must be keys of geometry.deckSizes', () => {
    some(problems((t) => void q(t, 'deckSize').options.push({ id: 'huge', label: 'Huge' })), /Deck size option "huge"/);
  });

  it('a deck_sqft price needs a deckSize question', () => {
    some(
      problems((t) => {
        t.questions = t.questions.filter((x) => x.role !== 'deckSize');
      }),
      /"deck" prices by deck area but the template has no deckSize question/,
    );
  });

  it('too many options on a single question', () => {
    some(
      problems((t) => {
        q(t, 'surface').options.push(
          { id: 'a', label: 'a' },
          { id: 'b', label: 'b' },
          { id: 'c', label: 'c' },
        );
      }),
      /"surface" has 5 options; a single question allows at most 4/,
    );
  });

  it('too many options on a multi question', () => {
    some(
      problems((t) => {
        q(t, 'equipment').options.push(
          { id: 'a', label: 'a' },
          { id: 'b', label: 'b' },
          { id: 'c', label: 'c' },
          { id: 'd', label: 'd' },
        );
      }),
      /"equipment" has 6 options; a multi question allows at most 5/,
    );
  });

  it('exactly at the limits is fine', () => {
    expect(
      problems((t) => {
        q(t, 'surface').options.push({ id: 'a', label: 'a' }, { id: 'b', label: 'b' });
        q(t, 'equipment').options.push({ id: 'a', label: 'a' }, { id: 'b', label: 'b' }, { id: 'c', label: 'c' });
      }),
    ).toEqual([]);
  });

  it('honors custom limits', () => {
    some(problems((t) => void (t.limits = { maxSingleOptions: 1, maxMultiOptions: 1 })), /allows at most 1/);
  });

  it('package answers referencing an unknown question', () => {
    some(problems((t) => void (t.packages[0].answers.ghost = ['x'])), /Package "refresh" answers unknown question "ghost"/);
  });

  it('package answers referencing an unknown option', () => {
    some(problems((t) => void (t.packages[0].answers.surface = ['marble'])), /Package "refresh" picks unknown option "surface.marble"/);
  });

  it('duplicate package ids', () => {
    some(problems((t) => void t.packages.push({ ...t.packages[0] })), /Duplicate package id "refresh"/);
  });

  it('negative or non-finite minimumJob / roundTo', () => {
    some(problems((t) => void (t.minimumJob = -1)), /minimumJob/);
    some(problems((t) => void (t.roundTo = -500)), /roundTo/);
    some(problems((t) => void (t.minimumJob = NaN)), /minimumJob/);
  });

  it('zero minimumJob and roundTo are allowed', () => {
    expect(
      problems((t) => {
        t.minimumJob = 0;
        t.roundTo = 0;
      }),
    ).toEqual([]);
  });

  it('reports several problems at once', () => {
    const list = problems((t) => {
      t.minimumJob = -1;
      q(t, 'size').options[3].id = 'huge';
      q(t, 'surface').options[0].price = { unit: 'flat', low: 10, high: 5 };
    });
    expect(list.length).toBeGreaterThanOrEqual(3);
  });
});

describe('formatUsd / formatRange', () => {
  it('formats whole dollars', () => {
    expect(formatUsd(12000)).toBe('$12,000');
    expect(formatUsd(0)).toBe('$0');
    expect(formatUsd(1234.6)).toBe('$1,235');
  });

  it('renders non-finite as an em dash', () => {
    expect(formatUsd(NaN)).toBe('—');
    expect(formatUsd(Infinity)).toBe('—');
  });

  it('formats ranges and collapses equal ends', () => {
    expect(formatRange(12000, 18500)).toBe('$12,000 – $18,500');
    expect(formatRange(5000, 5000)).toBe('$5,000');
  });
});

describe('optional questions and measured size', () => {
  it('an optional multi with no picks is not unanswered', () => {
    const t = clone();
    const equipment = t.questions.find((q) => q.id === 'equipment')!;
    equipment.optional = true;
    const e = est(answers({ scope: ['equipment', 'surface'], surface: ['plaster'] }), t);
    expect(e.unanswered).not.toContain('equipment');
    expect(est(answers({ scope: ['equipment', 'surface'], surface: ['plaster'] })).unanswered).toContain('equipment');
  });

  it('"Not sure" on size flags a measuring visit only when no dimensions were typed', () => {
    const base = answers({ size: ['unsure'], scope: ['surface'], surface: ['plaster'] });
    expect(computeEstimate(FIXTURE_TEMPLATE, { answers: base }).siteVisitItems.map((i) => i.label)).toContain('Pool size to be measured');
    const typed = computeEstimate(FIXTURE_TEMPLATE, { answers: base, dimensions: { lengthFt: 30, widthFt: 15 } });
    expect(typed.geometry.source).toBe('dimensions');
    expect(typed.siteVisitItems.map((i) => i.label)).not.toContain('Pool size to be measured');
  });
});
