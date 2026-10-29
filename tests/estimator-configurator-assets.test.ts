import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { POOL_MASTERS_CONFIGURATOR as SPEC } from '@/content/estimators/pool-masters-configurator';

/**
 * The configurator's pre-rendered photo matrix (scripts/generate-pool-configurator-photos.mjs):
 * every image key the spec can resolve to must ship as a 1800 px WebP plus a 1200 px
 * "-sm" phone version, 3:2, within the size budget and with no metadata.
 */
const PUBLIC = path.join(process.cwd(), 'public');
const DIR = path.join(PUBLIC, 'estimator', 'pool-masters', 'configurator');
const fileFor = (src: string) => path.join(PUBLIC, ...src.split('/').filter(Boolean));
const smSrc = (src: string) => src.replace(/\.webp$/, '-sm.webp');

async function meta(file: string) {
  return sharp(file).metadata();
}

describe('pool configurator photo assets', () => {
  const photos = Object.entries(SPEC.photos);

  it('covers the whole photo matrix (78 keys: aerial 48, poolside 18, evening 12)', () => {
    expect(photos).toHaveLength(78);
  });

  it.each(photos)('%s ships a full-size and a phone WebP', async (_key, photo) => {
    expect(photo.src.startsWith('/estimator/pool-masters/configurator/')).toBe(true);
    expect(photo.alt.length).toBeGreaterThan(20);
    const full = fileFor(photo.src);
    const sm = fileFor(smSrc(photo.src));
    expect(existsSync(full)).toBe(true);
    expect(existsSync(sm)).toBe(true);
    expect(statSync(full).size).toBeLessThan(250 * 1024);
    expect(statSync(sm).size).toBeLessThan(125 * 1024);
    const [a, b] = await Promise.all([meta(full), meta(sm)]);
    expect([a.format, a.width, a.height]).toEqual(['webp', 1800, 1200]);
    expect([b.format, b.width, b.height]).toEqual(['webp', 1200, 800]);
    for (const m of [a, b]) {
      expect(m.exif).toBeUndefined();
      expect(m.xmp).toBeUndefined();
    }
  });

  it('every view falls back to an existing real photo', () => {
    for (const view of SPEC.views) expect(existsSync(fileFor(view.fallback.src))).toBe(true);
  });

  it('ships no stray files next to the matrix', () => {
    const expected = new Set(photos.flatMap(([, p]) => [path.basename(p.src), path.basename(smSrc(p.src))]));
    const files = readdirSync(DIR).filter((f) => f !== 'projects');
    expect(files.sort()).toEqual([...expected].sort());
  });

  it('has six real project photos for the "Recent projects" strip', async () => {
    const files = readdirSync(path.join(DIR, 'projects')).filter((f) => f.endsWith('.webp'));
    expect(files).toHaveLength(6);
    for (const f of files) {
      const file = path.join(DIR, 'projects', f);
      const m = await meta(file);
      expect(m.width).toBeLessThanOrEqual(1200);
      expect(m.exif).toBeUndefined();
      expect(statSync(file).size).toBeLessThan(300 * 1024);
    }
  });
});
