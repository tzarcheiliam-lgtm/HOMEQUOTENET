import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PoolShapeIcon } from '@/components/estimator/pool-shapes';
import { Swatch, SWATCH_IDS } from '@/components/estimator/swatches';
import { POOL_MASTERS_GALLERY, POOL_MASTERS_OPTION_IMAGES } from '@/content/estimators/pool-masters-photos';
import { POOL_SHAPES } from '@/lib/estimator/types';

const publicPath = (src: string) => path.join(process.cwd(), 'public', src);

describe('estimator visuals', () => {
  it('draws every pool shape as a decorative svg', () => {
    for (const shape of POOL_SHAPES) {
      const html = renderToStaticMarkup(<PoolShapeIcon shape={shape} className="x" />);
      expect(html).toMatch(/^<svg /);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('viewBox=');
    }
  });

  it('renders a swatch svg for every swatch id, with unique pattern ids per instance', () => {
    for (const id of SWATCH_IDS) {
      const html = renderToStaticMarkup(<Swatch id={id} className="x" />);
      expect(html).toMatch(/^<svg /);
      expect(html).toContain('aria-hidden="true"');
    }
    const both = renderToStaticMarkup(
      <>
        <Swatch id="pavers" />
        <Swatch id="pavers" />
      </>,
    );
    const ids = [...both.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders nothing for an unknown swatch id', () => {
    expect(renderToStaticMarkup(<Swatch id="nope" />)).toBe('');
  });

  it('only references photos that exist on disk, with alt text', () => {
    expect(POOL_MASTERS_GALLERY.length).toBeGreaterThanOrEqual(6);
    expect(POOL_MASTERS_GALLERY.length).toBeLessThanOrEqual(8);
    for (const img of POOL_MASTERS_GALLERY) {
      expect(img.src.startsWith('/estimator/pool-masters/')).toBe(true);
      expect(img.alt.length).toBeGreaterThan(10);
      expect(existsSync(publicPath(img.src)), img.src).toBe(true);
      if (img.thumb) expect(existsSync(publicPath(img.thumb)), img.thumb).toBe(true);
    }
    for (const [key, src] of Object.entries(POOL_MASTERS_OPTION_IMAGES)) {
      expect(key).toMatch(/^[a-zA-Z]+\.[a-z_]+$/);
      expect(src.startsWith('/estimator/pool-masters/')).toBe(true);
      expect(existsSync(publicPath(src)), src).toBe(true);
    }
  });

  it('keeps each photo reasonably small', () => {
    const all = new Set([...POOL_MASTERS_GALLERY.map((g) => g.src), ...Object.values(POOL_MASTERS_OPTION_IMAGES)]);
    for (const src of all) expect(statSync(publicPath(src)).size, src).toBeLessThan(300 * 1024);
  });

  it('serves small copies to the tiles (a phone loads ~9 option photos on one screen)', () => {
    for (const img of POOL_MASTERS_GALLERY) expect(img.thumb, img.src).toMatch(/^\/estimator\/pool-masters\/thumbs\//);
    for (const src of Object.values(POOL_MASTERS_OPTION_IMAGES)) {
      expect(src).toMatch(/^\/estimator\/pool-masters\/thumbs\//);
      expect(statSync(publicPath(src)).size, src).toBeLessThan(80 * 1024);
    }
  });
});
