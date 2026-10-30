import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOMEQUOTE_BATHROOM_FUNNEL as BATH } from '@/content/estimators/homequote-bathroom-funnel';
import { HOMEQUOTE_KITCHEN_FUNNEL as KITCHEN } from '@/content/estimators/homequote-kitchen-funnel';
import { POOL_MASTERS_FUNNEL as POOL } from '@/content/estimators/pool-masters-funnel';
import { activeSteps, allFunnelSelections, designRecap, funnelPhoto, photoKey, stepOptionPhotos } from '@/lib/estimator/funnel/engine';
import type { FunnelPhoto, FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';

/*
 * The bathroom and kitchen funnels show the room the homeowner picked on step 1
 * (size), with their earlier picks still in it, on every later step: the
 * variants photo rule (lib/estimator/funnel/engine.ts), nearest-size fallback.
 */

const PUBLIC = join(process.cwd(), 'public');
const onDisk = (src: string) => existsSync(join(PUBLIC, src.replace(/^\//, '')));
const file = (p: FunnelPhoto) => p.src.split('/').pop()!.replace(/\.webp$/, '');

function photo(src: string): FunnelPhoto {
  return { src, alt: src };
}

describe('variants photo rule (engine)', () => {
  // A tiny spec: size (ordered) x finish; the "look" step's photos exist for some combinations only.
  const spec: FunnelSpec = {
    landing: { announcement: '', headline: '', subline: '', cta: '', heroPhoto: { src: '/h.webp' }, heroAlt: '' },
    steps: [
      { id: 'size', label: 'Size', options: [{ id: 's', title: 'S', subtitle: '' }, { id: 'm', title: 'M', subtitle: '' }, { id: 'l', title: 'L', subtitle: '' }], photo: { kind: 'option', photos: { s: photo('/s.webp'), m: photo('/m.webp'), l: photo('/l.webp') } } },
      { id: 'finish', label: 'Finish', options: [{ id: 'std', title: 'Std', subtitle: '' }, { id: 'lux', title: 'Lux', subtitle: '' }], photo: { kind: 'option', photos: { std: photo('/std.webp'), lux: photo('/lux.webp') } } },
      {
        id: 'look',
        label: 'Look',
        options: [{ id: 'a', title: 'A', subtitle: '' }, { id: 'b', title: 'B', subtitle: '' }],
        photo: {
          kind: 'variants',
          by: [{ stepId: 'size', ordered: true }, { stepId: 'finish' }],
          photos: [
            { when: { look: 'a', size: 'l', finish: 'std' }, photo: photo('/x/a-std.webp') },
            { when: { look: 'a', size: 'l', finish: 'lux' }, photo: photo('/x/a-lux.webp') },
            { when: { look: 'a', size: 'm', finish: 'lux' }, photo: photo('/x/a-lux-m.webp') },
            { when: { look: 'a', size: 's' }, photo: photo('/x/a-s.webp') },
            { when: { look: 'b' }, photo: photo('/x/b.webp') },
          ],
        },
      },
    ],
    contactStep: { eyebrow: '', headline: '', subline: '', cta: '', homeowner: { label: '', yes: '', no: '' }, trustLine: '' },
    bookingStep: { headline: '', priceEyebrow: '', priceNote: '', bookingTitle: '' },
  };
  const at = (sel: FunnelSelection) => funnelPhoto(spec, 'look', sel).src;

  it('an exact match wins; the size comes first, then the other picks', () => {
    expect(at({ size: 'l', finish: 'std', look: 'a' })).toBe('/x/a-std.webp');
    expect(at({ size: 'm', finish: 'lux', look: 'a' })).toBe('/x/a-lux-m.webp');
    // Medium standard: no medium standard photo -> the medium one (same size) beats the large standard one.
    expect(at({ size: 'm', finish: 'std', look: 'a' })).toBe('/x/a-lux-m.webp');
  });

  it('a photo that does not name a step matches any pick of it; a missing size falls back to the nearest', () => {
    expect(at({ size: 's', finish: 'lux', look: 'a' })).toBe('/x/a-s.webp');
    expect(at({ size: 'm', finish: 'std', look: 'b' })).toBe('/x/b.webp');
    // Unknown or missing picks resolve to the step defaults (size s, finish std).
    expect(at({ look: 'a' })).toBe('/x/a-s.webp');
    expect(at({ size: 'nope', look: 'a' } as FunnelSelection)).toBe('/x/a-s.webp');
  });

  it('the key is the file name; options swap with the rest of the picks kept (preloads)', () => {
    expect(photoKey(spec, 'look', { size: 'm', finish: 'lux', look: 'a' })).toBe('a-lux-m');
    expect(Object.fromEntries(Object.entries(stepOptionPhotos(spec, 'look', { size: 'l', finish: 'lux' })).map(([k, p]) => [k, p.src]))).toEqual({ a: '/x/a-lux.webp', b: '/x/b.webp' });
  });
});

const TRADES: { name: string; spec: FunnelSpec; dir: string; sizes: string[]; largest: string }[] = [
  { name: 'bathroom', spec: BATH, dir: '/estimator/bathroom/funnel/', sizes: ['guest', 'full', 'primary'], largest: 'primary' },
  { name: 'kitchen', spec: KITCHEN, dir: '/estimator/kitchen/funnel/', sizes: ['compact', 'medium', 'large'], largest: 'large' },
];

describe.each(TRADES)('$name funnel: the chosen size on every later step', ({ spec, dir, sizes, largest }) => {
  const all = allFunnelSelections(spec);

  it('every size x path x step resolves to a photo file (and its phone copy) that is in public/', () => {
    let checked = 0;
    for (const sel of all) {
      for (const s of activeSteps(spec, sel)) {
        const p = funnelPhoto(spec, s.id, sel);
        expect(p.src.startsWith(dir), p.src).toBe(true);
        expect(onDisk(p.src), `${s.id} ${JSON.stringify(sel)} -> ${p.src}`).toBe(true);
        expect(p.srcSm && onDisk(p.srcSm), p.srcSm).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('the finish and layout photos change with the size (each size shows its own room)', () => {
    for (const sel of all) {
      for (const stepId of ['finish', 'layout']) {
        const srcs = sizes.map((size) => funnelPhoto(spec, stepId, { ...sel, size }).src);
        const own = (size: string, src: string) => (size === largest ? !/-(guest|full|compact|medium)\.webp$/.test(src) : src.endsWith(`-${size}.webp`));
        // The smallest room has no spa bath / island (a site-visit item there): it shows the next size up.
        const noFit = (sel.layout === 'spa' || sel.layout === 'island') && sizes[0];
        sizes.forEach((size, i) => {
          if (size === noFit) expect(srcs[i], `${stepId} ${JSON.stringify(sel)}`).toBe(srcs[1]);
          else expect(own(size, srcs[i]), `${stepId} ${size} ${JSON.stringify(sel)} -> ${srcs[i]}`).toBe(true);
        });
        if (!noFit) expect(new Set(srcs).size).toBe(3);
      }
    }
  });

  it('the largest size keeps the original photo keys', () => {
    const sel = Object.fromEntries(spec.steps.map((s) => [s.id, s.options[0].id]));
    expect(photoKey(spec, 'layout', { ...sel, size: largest })).toMatch(/^layout-[a-z]+-(standard|luxe)$/);
  });

  it('follow-up steps show the chosen size whenever that size has the photo, else the nearest size', () => {
    for (const sel of all) {
      for (const s of activeSteps(spec, sel).slice(3)) {
        const src = funnelPhoto(spec, s.id, sel).src;
        const m = src.match(/-(guest|full|compact|medium)\.webp$/);
        const shown = m ? m[1] : largest;
        const d = Math.abs(sizes.indexOf(shown) - sizes.indexOf(sel.size));
        expect(d, `${s.id} ${JSON.stringify(sel)} -> ${src}`).toBeLessThanOrEqual(sel.size === sizes[0] ? 2 : 1);
      }
    }
  });

  it('the "Your design" recap grows with the picks from step 2 on', () => {
    const sel = Object.fromEntries(spec.steps.map((s) => [s.id, s.options[1].id]));
    const path = activeSteps(spec, sel);
    expect(designRecap(spec, sel, 0)).toEqual([]);
    expect(designRecap(spec, sel, 1)).toHaveLength(2);
    expect(designRecap(spec, sel, 2)).toHaveLength(3);
    expect(designRecap(spec, sel, path.length - 1).length).toBeGreaterThanOrEqual(3);
    expect(spec.designRecap).toEqual({ label: 'Your design' });
  });
});

describe('continuity: a follow-up photo is the room built so far', () => {
  it('bathroom: the frameless shower and the soaking tub are the layout photo itself', () => {
    for (const sel of allFunnelSelections(BATH)) {
      if (sel.shower === 'frameless') expect(funnelPhoto(BATH, 'shower', sel).src).toBe(funnelPhoto(BATH, 'layout', sel).src);
      if (sel.tub === 'soaking') expect(funnelPhoto(BATH, 'tub', sel).src).toBe(funnelPhoto(BATH, 'layout', sel).src);
    }
    expect(file(funnelPhoto(BATH, 'shower', { size: 'full', finish: 'standard', layout: 'walkin', shower: 'curbless' }))).toBe('shower-curbless-walkin-standard-full');
    expect(file(funnelPhoto(BATH, 'shower', { size: 'guest', finish: 'luxe', layout: 'walkin', shower: 'bench' }))).toBe('shower-bench-walkin-luxe-guest');
    expect(file(funnelPhoto(BATH, 'tub', { size: 'full', finish: 'luxe', layout: 'spa', tub: 'stone' }))).toBe('tub-stone-spa-luxe-full');
    // The primary suite keeps its original follow-up photos.
    expect(file(funnelPhoto(BATH, 'shower', { size: 'primary', finish: 'luxe', layout: 'walkin', shower: 'curbless' }))).toBe('shower-curbless');
  });

  it('kitchen: white cabinets on a standard path, and the seating island, are the layout photo itself', () => {
    for (const sel of allFunnelSelections(KITCHEN)) {
      if (sel.cabinets === 'white' && sel.finish === 'standard') expect(funnelPhoto(KITCHEN, 'cabinets', sel).src).toBe(funnelPhoto(KITCHEN, 'layout', sel).src);
      if (sel.island === 'seating') expect(funnelPhoto(KITCHEN, 'island', sel).src).toBe(funnelPhoto(KITCHEN, 'layout', sel).src);
    }
    expect(file(funnelPhoto(KITCHEN, 'cabinets', { size: 'compact', finish: 'standard', layout: 'l', cabinets: 'wood' }))).toBe('cabinets-wood-l-standard-compact');
    expect(file(funnelPhoto(KITCHEN, 'cabinets', { size: 'medium', finish: 'luxe', layout: 'island', cabinets: 'twotone' }))).toBe('cabinets-twotone-island-luxe-medium');
    expect(file(funnelPhoto(KITCHEN, 'island', { size: 'medium', finish: 'luxe', layout: 'island', island: 'sink' }))).toBe('island-sink-luxe-medium');
    // On an L path the cabinet photo shows an L kitchen (no island).
    expect(file(funnelPhoto(KITCHEN, 'cabinets', { size: 'medium', finish: 'standard', layout: 'l', cabinets: 'twotone' }))).toBe('cabinets-twotone-l-standard-medium');
    expect(file(funnelPhoto(KITCHEN, 'appliances', { size: 'compact', finish: 'luxe', layout: 'l', appliances: 'pro' }))).toBe('layout-l-luxe-compact');
  });
});

describe('pool funnel: unchanged', () => {
  it('no variants rule, no recap, the same photo keys', () => {
    expect(POOL.designRecap).toBeUndefined();
    expect(POOL.steps.every((s) => s.photo.kind === 'option' || s.photo.kind === 'view')).toBe(true);
    expect(designRecap(POOL, { size: 'classic', finish: 'luxe' }, 1)).toEqual([]);
    expect(photoKey(POOL, 'size', { size: 'classic' })).toBe('size-classic');
  });
});
