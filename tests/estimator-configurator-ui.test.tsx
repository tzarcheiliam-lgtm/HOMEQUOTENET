import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { POOL_MASTERS_CONFIGURATOR as SPEC } from '@/content/estimators/pool-masters-configurator';
import { Configurator } from '@/components/estimator/configurator/configurator';
import { configuratorPhotoManifest } from '@/components/estimator/configurator/photo-manifest';
import { stagePhoto } from '@/components/estimator/configurator/photos';
import {
  compactRange,
  deltaLabel,
  fromLabel,
  costBreakdown,
  designUrl,
  hasSavedDesign,
  moneyRange,
  reduceSelection,
  stepFromHash,
  toastFor,
  viewAfter,
} from '@/components/estimator/configurator/state';
import { publicTemplate } from '@/lib/estimator/config';
import { decodeSelection, defaultSelection, estimateSelection, selectedRows } from '@/lib/estimator/configurator/engine';
import { getEstimator } from '@/lib/estimator/registry';

vi.mock('server-only', () => ({}));

// Pool Masters now runs the simple funnel; the configurator stays available, so test it as a configurator contractor.
const registered = getEstimator('pool-masters')!;
const FULL = registered.template;
const contractor = { ...registered.contractor, experience: 'configurator' as const, revealRange: 'immediately' as const };
const T = publicTemplate(FULL, contractor);
const base = defaultSelection(SPEC);
const render = (props: Partial<Parameters<typeof Configurator>[0]> = {}) =>
  renderToStaticMarkup(<Configurator spec={SPEC} template={T} contractor={contractor} {...props} />);

describe('configurator page markup', () => {
  it('renders the photo, sizes, Go Luxe, every group and the total range with no form', () => {
    const html = render();
    expect(html).toContain(SPEC.title);
    expect(html).toContain('Remodel pricing');
    for (const m of SPEC.models) expect(html).toContain(m.name);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    for (const g of SPEC.groups) expect(html).toContain(`>${g.title.replace('&', '&amp;')}<`);
    expect(html).toContain(moneyRange(estimateSelection(SPEC, T, base).total));
    expect(html).toContain('Ballpark, not a quote');
    expect(html).toContain('Example prices');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toMatch(/type="email"|type="tel"/);
    // Radio groups with legends; the pills switch views.
    expect(html.match(/<fieldset/g)!.length).toBe(SPEC.groups.length + 1);
    for (const v of SPEC.views) expect(html).toContain(`>${v.label}</button>`);
  });

  it('shows a design with Go Luxe on: the card is on and its rows say Luxe selected', () => {
    const html = render({ initialSelection: { ...base, luxe: true } });
    expect(html).toContain('aria-checked="true"');
    expect(html.match(/Luxe selected/g)!.length).toBe(SPEC.bundle!.rows.length);
    expect(html).toContain(moneyRange(estimateSelection(SPEC, T, { ...base, luxe: true }).total));
  });

  it('renders the cost summary and the result step', () => {
    expect(render({ initialStep: 'summary' })).toContain('Cost summary');
    const result = render({ initialStep: 'book', initialSelection: { ...base, luxe: true } });
    expect(result).toContain('Here’s your pool.');
    expect(result).toContain('Confirmed at your free on-site visit');
    expect(result).toContain(SPEC.photoNote);
    expect(result).toContain('Financing available through third-party lenders');
    expect(result).not.toMatch(/\/mo\b|per month/);
  });

  it('uses the real photo when a variant file is missing', () => {
    const manifest = Object.fromEntries(Object.keys(SPEC.photos).map((k) => [k, { full: false, sm: false }]));
    const p = stagePhoto(SPEC, 'aerial-resurface', manifest);
    expect(p.isFallback).toBe(true);
    expect(p.src).toBe(SPEC.views[0].fallback.src);
    const ok = stagePhoto(SPEC, 'aerial-resurface', { ...manifest, 'aerial-resurface': { full: true, sm: true } });
    expect(ok.src).toBe(SPEC.photos['aerial-resurface'].src);
    expect(ok.srcSet).toContain('aerial-resurface-sm.webp 1200w');
    expect(render({ manifest })).toContain(SPEC.views[0].fallback.src);
    expect(configuratorPhotoManifest(SPEC, '/no/such/dir')).toBeNull();
  });
});

describe('selecting', () => {
  it('switches single rows, toggles multi rows and moves the photo to their view', () => {
    let sel = reduceSelection(SPEC, base, { type: 'row', rowId: 'pebble' });
    expect(sel.picks.finish).toEqual(['pebble']);
    sel = reduceSelection(SPEC, sel, { type: 'row', rowId: 'spa' });
    sel = reduceSelection(SPEC, sel, { type: 'row', rowId: 'heater' });
    expect(sel.picks.features).toEqual(['spa']);
    sel = reduceSelection(SPEC, sel, { type: 'row', rowId: 'spa' });
    expect(sel.picks.features).toEqual([]);
    expect(viewAfter(SPEC, { type: 'row', rowId: 'pebble' })).toBe('poolside');
    expect(viewAfter(SPEC, { type: 'row', rowId: 'fire_bowls' })).toBe('evening');
    expect(viewAfter(SPEC, { type: 'row', rowId: 'heater' })).toBeUndefined();
    // No jump to a view where nothing changes: water bowls are priced, not pictured; the spa shows in every view.
    expect(viewAfter(SPEC, { type: 'row', rowId: 'water_bowls' }, 'evening')).toBeUndefined();
    expect(viewAfter(SPEC, { type: 'row', rowId: 'spa' }, 'evening')).toBeUndefined();
    expect(viewAfter(SPEC, { type: 'row', rowId: 'deck_pavers' }, 'evening')).toBe('aerial');
    expect(viewAfter(SPEC, { type: 'luxe', on: true }, 'poolside')).toBeUndefined();
    expect(toastFor(SPEC, base, reduceSelection(SPEC, base, { type: 'row', rowId: 'spa' }), { type: 'row', rowId: 'spa' })).toBe('Spa added');
    const bowls = reduceSelection(SPEC, base, { type: 'row', rowId: 'water_bowls' });
    expect(toastFor(SPEC, base, bowls, { type: 'row', rowId: 'water_bowls' })).toBe('Water bowls added · priced, not pictured');
    expect(toastFor(SPEC, base, { ...base, model: 'large' }, { type: 'model', model: 'large' })).toBe('Estate · 36 × 18 ft');
  });

  it('updates the total as rows and sizes change', () => {
    const t0 = costBreakdown(SPEC, T, base).total;
    const spa = reduceSelection(SPEC, base, { type: 'row', rowId: 'spa' });
    const t1 = costBreakdown(SPEC, T, spa).total;
    expect(t1.low).toBeGreaterThan(t0.low);
    expect(t1.high).toBeGreaterThan(t0.high);
    const large = reduceSelection(SPEC, spa, { type: 'model', model: 'large' });
    expect(costBreakdown(SPEC, T, large).total.high).toBeGreaterThan(t1.high);
    const b = costBreakdown(SPEC, T, spa);
    expect(b.upgrades.map((u) => u.rowId)).toEqual(['spa']);
    expect(b.total).toEqual(estimateSelection(SPEC, T, spa).total);
  });

  it('Go Luxe forces and locks its rows, then restores the homeowner picks', () => {
    const mine = reduceSelection(SPEC, base, { type: 'row', rowId: 'quartz' });
    const luxe = reduceSelection(SPEC, mine, { type: 'luxe', on: true });
    for (const id of SPEC.bundle!.rows) expect(selectedRows(SPEC, luxe).has(id)).toBe(true);
    // Locked: clicking a covered row does nothing.
    expect(reduceSelection(SPEC, luxe, { type: 'row', rowId: 'plaster' })).toEqual(luxe);
    const b = costBreakdown(SPEC, T, luxe);
    expect(b.luxe).not.toBeNull();
    expect(b.upgrades).toEqual([]);
    expect(b.total.low).toBeLessThan(b.base.low + b.luxe!.full.low);
    const off = reduceSelection(SPEC, luxe, { type: 'luxe', on: false });
    expect(off.picks.finish).toEqual(['quartz']);
  });

  it('formats row figures in full dollars ("from" the low end) and totals as ranges', () => {
    expect(deltaLabel({ low: 11400, high: 17400 })).toBe('+$11,400');
    expect(fromLabel({ low: 14500, high: 24000 })).toBe('from $14,500');
    expect(compactRange({ low: 1800, high: 2700 })).toBe('$1.8k–2.7k');
    expect(moneyRange({ low: 64000, high: 105500 })).toBe('$64,000 – $105,500');
  });
});

describe('URL state', () => {
  it('writes the design into the query string and keeps other parameters and the hash', () => {
    const sel = reduceSelection(SPEC, reduceSelection(SPEC, { ...base, model: 'large' }, { type: 'row', rowId: 'pebble' }), { type: 'luxe', on: true });
    const url = designUrl(SPEC, 'https://x.test/estimator/pool-masters?utm_source=ig&m=small#summary', sel);
    expect(url).toBe('/estimator/pool-masters?utm_source=ig&m=large&o=pebble&lx=1#summary');
    const back = decodeSelection(SPEC, url.split('?')[1].split('#')[0]);
    expect(back).toEqual(sel);
    expect(designUrl(SPEC, 'https://x.test/estimator/pool-masters', base)).toBe('/estimator/pool-masters?m=medium');
  });

  it('knows a saved design and the steps', () => {
    expect(hasSavedDesign('?utm_source=ig')).toBe(false);
    expect(hasSavedDesign('?m=large')).toBe(true);
    expect(stepFromHash('#summary')).toBe('summary');
    expect(stepFromHash('#book')).toBe('book');
    expect(stepFromHash('#nope')).toBe('design');
  });
});
