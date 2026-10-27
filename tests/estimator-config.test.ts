import { describe, expect, it } from 'vitest';
import { applyContractorConfig } from '@/lib/estimator/config';
import { validateTemplate } from '@/lib/estimator/engine';
import {
  CUSTOM_PACKAGE_ID,
  type ContractorEstimatorConfig,
  type EstimatorCatalog,
  type EstimatorPackage,
  type EstimatorTemplate,
} from '@/lib/estimator/types';
import { FIXTURE_CONTRACTOR, FIXTURE_TEMPLATE } from './fixtures/estimator-template';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const CATALOG: EstimatorCatalog = {
  equipment: [
    { id: 'pump', label: 'Variable-speed pump', price: { unit: 'flat', low: 2000, high: 3000 } },
    { id: 'automation', label: 'Automation', price: { unit: 'flat', low: 1500, high: 2500 } },
    { id: 'lights', label: 'LED lights', price: { unit: 'each', low: 800, high: 1200, quantity: 2 } },
    { id: 'salt', label: 'Salt system', price: { unit: 'flat', low: 1800, high: 2600 } },
  ],
};

const cfg = (extra: Partial<ContractorEstimatorConfig> = {}): ContractorEstimatorConfig => ({ ...FIXTURE_CONTRACTOR, ...extra });
const optionIds = (t: EstimatorTemplate, qid: string) => t.questions.find((q) => q.id === qid)!.options.map((o) => o.id);
const option = (t: EstimatorTemplate, qid: string, oid: string) => t.questions.find((q) => q.id === qid)!.options.find((o) => o.id === oid)!;

describe('applyContractorConfig basics', () => {
  it('with an empty config the template is unchanged except pricesConfirmed', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ pricesConfirmed: true }));
    expect(out).toEqual({ ...FIXTURE_TEMPLATE, pricesConfirmed: true });
    expect(validateTemplate(out)).toEqual([]);
  });

  it('takes pricesConfirmed from the config in both directions', () => {
    expect(applyContractorConfig(FIXTURE_TEMPLATE, cfg({ pricesConfirmed: true })).pricesConfirmed).toBe(true);
    const confirmed = { ...FIXTURE_TEMPLATE, pricesConfirmed: true };
    expect(applyContractorConfig(confirmed, cfg({ pricesConfirmed: false })).pricesConfirmed).toBe(false);
  });

  it('takes minimumJob from the config, else keeps the template value', () => {
    expect(applyContractorConfig(FIXTURE_TEMPLATE, cfg({ minimumJob: 12000 })).minimumJob).toBe(12000);
    expect(applyContractorConfig(FIXTURE_TEMPLATE, cfg()).minimumJob).toBe(5000);
    expect(applyContractorConfig(FIXTURE_TEMPLATE, cfg({ minimumJob: 0 })).minimumJob).toBe(0);
  });
});

describe('option overrides', () => {
  it('enabled:false removes the option', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'surface.pebble': { enabled: false } } }));
    expect(optionIds(out, 'surface')).toEqual(['plaster']);
  });

  it('enabled:true adds a catalog option in catalog order', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.automation': { enabled: true } } }), CATALOG);
    expect(optionIds(out, 'equipment')).toEqual(['pump', 'automation', 'lights']);
    expect(option(out, 'equipment', 'automation').price).toEqual({ unit: 'flat', low: 1500, high: 2500 });
  });

  it('a catalog option with no later sibling in the template is appended', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.salt': { enabled: true } } }), CATALOG);
    expect(optionIds(out, 'equipment')).toEqual(['pump', 'lights', 'salt']);
  });

  it('enabled:true on a missing option is ignored without a catalog entry', () => {
    const a = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.automation': { enabled: true } } }));
    expect(optionIds(a, 'equipment')).toEqual(['pump', 'lights']);
    const b = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.nope': { enabled: true } } }), CATALOG);
    expect(optionIds(b, 'equipment')).toEqual(['pump', 'lights']);
  });

  it('enabled:true on an existing option does not duplicate it', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.pump': { enabled: true } } }), CATALOG);
    expect(optionIds(out, 'equipment')).toEqual(['pump', 'lights']);
  });

  it('an override without enabled does not add a missing option', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.automation': { label: 'X' } } }), CATALOG);
    expect(optionIds(out, 'equipment')).toEqual(['pump', 'lights']);
  });

  it('label, note and image replace; untouched fields stay', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ options: { 'surface.pebble': { label: 'Premium pebble', note: 'Lasts longer', image: '/img/pebble.jpg' } } }),
    );
    expect(option(out, 'surface', 'pebble')).toMatchObject({
      label: 'Premium pebble',
      note: 'Lasts longer',
      image: '/img/pebble.jpg',
      swatch: 'pebble',
      price: { unit: 'interior_sqft', low: 18, high: 24 },
    });
  });

  it('price merges over the existing price', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'coping.travertine': { price: { high: 100 } } } }));
    expect(option(out, 'coping', 'travertine').price).toEqual({ unit: 'perimeter_lf', low: 60, high: 100 });
    const q = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'equipment.lights': { price: { quantity: 4, low: 700 } } } }));
    expect(option(q, 'equipment', 'lights').price).toEqual({ unit: 'each', low: 700, high: 1200, quantity: 4 });
  });

  it('undefined fields in a price patch do not wipe the existing value', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'coping.travertine': { price: { low: undefined, high: 95 } } } }));
    expect(option(out, 'coping', 'travertine').price).toEqual({ unit: 'perimeter_lf', low: 60, high: 95 });
  });

  it('a partial price on an unpriced option is ignored; a full one is set', () => {
    const partial = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'package.refresh': { price: { low: 5 } } } }));
    expect(option(partial, 'package', 'refresh').price).toBeUndefined();
    const full = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ options: { 'package.refresh': { price: { unit: 'flat', low: 5, high: 6 } } } }),
    );
    expect(option(full, 'package', 'refresh').price).toEqual({ unit: 'flat', low: 5, high: 6 });
  });

  it('applies overrides to an option just enabled from the catalog', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ options: { 'equipment.salt': { enabled: true, label: 'Saltwater', price: { high: 2700 } } } }),
      CATALOG,
    );
    expect(option(out, 'equipment', 'salt')).toMatchObject({ label: 'Saltwater', price: { unit: 'flat', low: 1800, high: 2700 } });
  });

  it('ignores overrides for unknown questions and malformed keys', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ options: { 'nope.x': { enabled: false }, nodot: { enabled: false }, 'surface.nope': { enabled: false } } }),
    );
    expect(out).toEqual({ ...FIXTURE_TEMPLATE, pricesConfirmed: false });
  });
});

describe('custom options', () => {
  it('are appended to the question', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ customOptions: { surface: [{ id: 'micro', label: 'Micro-aggregate', price: { unit: 'interior_sqft', low: 20, high: 28 } }] } }),
    );
    expect(optionIds(out, 'surface')).toEqual(['plaster', 'pebble', 'micro']);
    expect(validateTemplate(out)).toEqual([]);
  });

  it('ignore unknown questions', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ customOptions: { nope: [{ id: 'x', label: 'X' }] } }));
    expect(out.questions.map((q) => q.id)).toEqual(FIXTURE_TEMPLATE.questions.map((q) => q.id));
  });

  it('are appended after catalog-enabled options', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ options: { 'equipment.salt': { enabled: true } }, customOptions: { equipment: [{ id: 'cover', label: 'Cover' }] } }),
      CATALOG,
    );
    expect(optionIds(out, 'equipment')).toEqual(['pump', 'lights', 'salt', 'cover']);
  });
});

describe('packages', () => {
  const premium: EstimatorPackage = {
    id: 'premium',
    label: 'Premium',
    description: 'Pebble and travertine.',
    includes: ['Pebble', 'Travertine'],
    answers: { scope: ['surface', 'coping'], surface: ['pebble'], coping: ['travertine'] },
  };

  it('config.packages replace the template packages and the package question follows', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ packages: [premium] }));
    expect(out.packages.map((p) => p.id)).toEqual(['premium']);
    expect(optionIds(out, 'package')).toEqual(['premium', CUSTOM_PACKAGE_ID]);
    expect(option(out, 'package', 'premium').label).toBe('Premium');
    expect(validateTemplate(out)).toEqual([]);
  });

  it('keeps the existing custom option and package option fields', () => {
    const t = structuredClone(FIXTURE_TEMPLATE);
    option(t, 'package', 'refresh').image = '/img/refresh.jpg';
    option(t, 'package', CUSTOM_PACKAGE_ID).label = 'Design it myself';
    const out = applyContractorConfig(t, cfg({ packages: [{ ...premium, id: 'refresh' }] }));
    expect(option(out, 'package', 'refresh')).toMatchObject({ image: '/img/refresh.jpg', label: 'Premium' });
    expect(option(out, 'package', CUSTOM_PACKAGE_ID).label).toBe('Design it myself');
  });

  it('config.packages = [] leaves only the custom option', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ packages: [] }));
    expect(out.packages).toEqual([]);
    expect(optionIds(out, 'package')).toEqual([CUSTOM_PACKAGE_ID]);
    expect(validateTemplate(out)).toEqual([]);
  });

  it('drops package picks that point at removed options', () => {
    const out = applyContractorConfig(FIXTURE_TEMPLATE, cfg({ options: { 'surface.plaster': { enabled: false }, 'scope.coping': { enabled: false } } }));
    // refresh: scope [surface, coping] -> [surface]; surface [plaster] -> dropped; coping [precast] stays.
    expect(out.packages[0].answers).toEqual({ scope: ['surface'], coping: ['precast'] });
    expect(validateTemplate(out)).toEqual([]);
  });

  it('prunes contractor-supplied packages too', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({ packages: [premium], options: { 'surface.pebble': { enabled: false } } }),
    );
    expect(out.packages[0].answers).toEqual({ scope: ['surface', 'coping'], coping: ['travertine'] });
    expect(validateTemplate(out)).toEqual([]);
  });

  it('a template without a package question still takes config.packages', () => {
    const t = structuredClone(FIXTURE_TEMPLATE);
    t.questions = t.questions.filter((q) => q.role !== 'package');
    const out = applyContractorConfig(t, cfg({ packages: [premium] }));
    expect(out.packages).toHaveLength(1);
  });
});

describe('immutability', () => {
  it('does not mutate the template, config or catalog', () => {
    const template = deepFreeze(structuredClone(FIXTURE_TEMPLATE));
    const config = deepFreeze(
      cfg({
        minimumJob: 9000,
        pricesConfirmed: true,
        options: {
          'surface.pebble': { enabled: false },
          'equipment.automation': { enabled: true, price: { high: 2600 } },
          'coping.travertine': { label: 'Travertine!', price: { low: 70 } },
        },
        customOptions: { surface: [{ id: 'micro', label: 'Micro' }] },
        packages: [{ id: 'p', label: 'P', description: 'd', includes: ['x'], answers: { scope: ['surface'], surface: ['plaster'] } }],
      }),
    );
    const catalog = deepFreeze(structuredClone(CATALOG));
    const templateCopy = structuredClone(FIXTURE_TEMPLATE);
    const configCopy = structuredClone(config);
    const catalogCopy = structuredClone(CATALOG);
    expect(() => applyContractorConfig(template, config, catalog)).not.toThrow();
    expect(template).toEqual(templateCopy);
    expect(config).toEqual(configCopy);
    expect(catalog).toEqual(catalogCopy);
  });

  it('shares no nested objects with the inputs', () => {
    const config = cfg({
      customOptions: { surface: [{ id: 'micro', label: 'Micro' }] },
      packages: [{ id: 'p', label: 'P', description: 'd', includes: ['x'], answers: { scope: ['surface'] } }],
      options: { 'equipment.automation': { enabled: true } },
    });
    const out = applyContractorConfig(FIXTURE_TEMPLATE, config, CATALOG);
    expect(out).not.toBe(FIXTURE_TEMPLATE);
    expect(out.questions[0]).not.toBe(FIXTURE_TEMPLATE.questions[0]);
    expect(option(out, 'surface', 'micro')).not.toBe(config.customOptions!.surface[0]);
    expect(option(out, 'equipment', 'automation')).not.toBe(CATALOG.equipment[1]);
    expect(out.packages[0]).not.toBe(config.packages![0]);

    // Writing to the result leaves every input alone.
    const before = structuredClone(FIXTURE_TEMPLATE);
    out.questions[0].options[0].label = 'changed';
    out.geometry.avgDepthFt = 99;
    out.notIncluded.push('x');
    expect(FIXTURE_TEMPLATE).toEqual(before);
  });

  it('is repeatable', () => {
    const config = cfg({ options: { 'equipment.automation': { enabled: true } }, packages: [] });
    expect(applyContractorConfig(FIXTURE_TEMPLATE, config, CATALOG)).toEqual(applyContractorConfig(FIXTURE_TEMPLATE, config, CATALOG));
  });
});

describe('merged template stays valid', () => {
  it('after a realistic mix of changes', () => {
    const out = applyContractorConfig(
      FIXTURE_TEMPLATE,
      cfg({
        pricesConfirmed: true,
        minimumJob: 8000,
        options: {
          'surface.pebble': { price: { low: 20, high: 26 }, label: 'Pebble finish' },
          'equipment.automation': { enabled: true },
          'equipment.lights': { enabled: false },
          'coping.precast': { enabled: false },
        },
        customOptions: { deck: [{ id: 'turf', label: 'Turf', price: { unit: 'deck_sqft', low: 12, high: 18 } }] },
      }),
      CATALOG,
    );
    expect(validateTemplate(out)).toEqual([]);
    expect(out.minimumJob).toBe(8000);
    // refresh's coping pick (precast) was removed, so it is dropped.
    expect(out.packages[0].answers).toEqual({ scope: ['surface', 'coping'], surface: ['plaster'] });
  });
});
