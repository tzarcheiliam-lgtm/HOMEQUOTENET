import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { copingTexture, deckTexture, materialKeys, tileTexture, waterLook } from '@/components/estimator/scene/materials';
import { PoolScene } from '@/components/estimator/scene/pool-scene';
import { SPRITES, TEXTURES } from '@/lib/estimator/scene/textures';
import type { SceneSpec } from '@/lib/estimator/scene/types';

const base: SceneSpec = {
  project: 'remodel',
  shape: 'rectangle',
  lengthFt: 30,
  widthFt: 15,
  surface: null,
  tile: null,
  coping: null,
  deck: null,
  deckSize: 'none',
  features: { baja: false, spa: false, waterBowls: false, fireBowls: false, lights: false },
  extras: { kitchen: false, patioCover: false, turfPlanting: false, firePit: false },
};
const all = { baja: true, spa: true, waterBowls: true, fireBowls: true, lights: true };
const extras = { kitchen: true, patioCover: true, turfPlanting: true, firePit: true };

const SPECS: SceneSpec[] = [
  base,
  { ...base, surface: 'pebble', tile: 'glass', coping: 'travertine', deck: 'pavers', deckSize: 'medium', features: { ...all, spa: false } },
  { ...base, project: 'backyard', lengthFt: 36, widthFt: 18, surface: 'plaster', deck: 'porcelain', deckSize: 'large', features: all, extras },
  { ...base, shape: 'l_shape', lengthFt: 24, widthFt: 12, surface: 'quartz', deck: 'concrete', deckSize: 'small', features: all },
  { ...base, project: 'backyard', shape: 'freeform', deck: 'wood_composite', deckSize: 'large', features: all, extras },
  { ...base, shape: 'freeform', lengthFt: 80, widthFt: 50, deck: 'resurface', deckSize: 'large', features: all },
];

const render = (scene: SceneSpec, night = false) => renderToStaticMarkup(<PoolScene scene={scene} night={night} label="A test pool" className="w-full" />);

/** The manifests are module state: snapshot them so a test can blank the sources. */
const saved = {
  textures: Object.fromEntries(Object.entries(TEXTURES).map(([k, v]) => [k, v.src])),
  sprites: Object.fromEntries(Object.entries(SPRITES).map(([k, v]) => [k, v.src])),
};
afterEach(() => {
  for (const [k, src] of Object.entries(saved.textures)) TEXTURES[k as keyof typeof TEXTURES].src = src;
  for (const [k, src] of Object.entries(saved.sprites)) SPRITES[k as keyof typeof SPRITES].src = src;
});

describe('PoolScene', () => {
  it('renders day and night for every spec as one accessible svg with no bad numbers', () => {
    for (const scene of SPECS) {
      for (const night of [false, true]) {
        const html = render(scene, night);
        expect(html).toMatch(/^<svg /);
        expect(html).toContain('role="img"');
        expect(html).toContain('aria-label="A test pool"');
        expect(html).toContain('class="ps-root w-full"');
        expect(html).toContain('<g aria-hidden="true">');
        expect(html).not.toMatch(/NaN|Infinity|undefined/);
        // Every url(#id) points at an id defined in the same svg.
        const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
        for (const [, ref] of html.matchAll(/url\(#([^)]+)\)/g)) expect(ids.has(ref), ref).toBe(true);
      }
    }
  });

  it('draws the night layer only at night', () => {
    const scene = SPECS[2];
    expect(render(scene, false)).not.toContain('-n-water');
    expect(render(scene, true)).toContain('-n-water');
  });

  it('gives each instance its own ids', () => {
    const html = renderToStaticMarkup(
      <>
        <PoolScene scene={SPECS[1]} label="a" />
        <PoolScene scene={SPECS[1]} label="b" />
      </>,
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks finished before any texture or sprite image exists', () => {
    for (const t of Object.values(TEXTURES)) t.src = null;
    for (const s of Object.values(SPRITES)) s.src = null;
    const html = render(SPECS[2]);
    expect(html).not.toContain('<image');
    expect(html).toContain('<pattern');
    expect(html).not.toMatch(/NaN/);
  });

  it('uses the image files when they exist', () => {
    TEXTURES.deck_porcelain.src = '/estimator/scene/textures/deck_porcelain.webp';
    SPRITES.umbrella.src = '/estimator/scene/sprites/umbrella.webp';
    const html = render(SPECS[2]);
    expect(html).toContain('href="/estimator/scene/textures/deck_porcelain.webp"');
    expect(html).toContain('href="/estimator/scene/sprites/umbrella.webp"');
  });

  it('stops all motion under prefers-reduced-motion', () => {
    expect(render(base)).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.ps-root \*\{animation:none!important;transition:none!important\}\}/);
  });
});

describe('scene materials', () => {
  it('maps template and catalog option ids to a look, with neutral defaults', () => {
    expect(waterLook('plaster').floor).toBe('floor_plaster');
    expect(waterLook('mini_pebble').floor).toBe('floor_pebble');
    expect(waterLook('quartz').tint).not.toBe(waterLook('pebble').tint);
    expect(waterLook(null)).toEqual(waterLook('something_new'));
    expect(tileTexture('glass_mosaic')).toBe('tile_glass');
    expect(tileTexture(null)).toBe('tile_porcelain');
    expect(copingTexture('travertine')).toBe('coping_travertine');
    expect(copingTexture(null)).toBe('coping_concrete');
    expect(deckTexture('wood_composite')).toBe('wood_slats');
    expect(deckTexture('flagstone')).toBe('deck_pavers');
    expect(deckTexture(null)).toBe('deck_concrete');
  });

  it('keys each crossfading layer on its material', () => {
    expect(materialKeys(base)).toEqual({ water: 'default', tile: 'tile_porcelain', coping: 'coping_concrete', deck: 'existing', ground: 'grass' });
    expect(materialKeys(SPECS[2])).toMatchObject({ water: 'plaster', deck: 'deck_porcelain', ground: 'turf' });
  });
});
