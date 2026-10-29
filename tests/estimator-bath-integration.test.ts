import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { resolveExampleMedia, TRADE_META } from '@/components/estimator/builders/meta';
import { BATH_GALLERY, BATH_OPTION_IMAGES } from '@/content/estimators/homequote-bathroom-photos';
import { getEstimator } from '@/lib/estimator/registry';

/*
 * The bathroom builder as published (/estimator/bathroom-remodel): config
 * wired to its AI-generated pictures, labelled as such, truthful network
 * facts, and the example design/photo pair on the first screen.
 */

const publicPath = (src: string) => path.join(process.cwd(), 'public', src);
const exists = (src: string) => {
  try {
    return statSync(publicPath(src)).isFile();
  } catch {
    return false;
  }
};

describe('bathroom-remodel config', () => {
  const found = getEstimator('bathroom-remodel')!;

  it('shows the AI style ideas as the looks gallery and on option tiles', () => {
    expect(found.contractor.gallery).toEqual(BATH_GALLERY);
    for (const [key, image] of Object.entries(BATH_OPTION_IMAGES)) {
      const [qid, oid] = key.split('.');
      const option = found.template.questions.find((q) => q.id === qid)?.options.find((o) => o.id === oid);
      expect(option?.image, key).toBe(image);
      expect(exists(image), image).toBe(true);
    }
  });

  it('says the pictures are AI-generated on every question whose tiles show one', () => {
    const withImages = found.template.questions.filter((q) => q.options.some((o) => o.image));
    expect(withImages.map((q) => q.id).sort()).toEqual(['bathing', 'extras', 'vanity']);
    for (const q of withImages) expect(q.help, q.id).toMatch(/AI-generated/);
  });

  it('material questions use the texture samples, not photo crops', () => {
    for (const id of ['showerTile', 'vanityFinish', 'counter', 'floor', 'paint', 'metal']) {
      const q = found.template.questions.find((x) => x.id === id)!;
      expect(q.options.some((o) => o.image), id).toBe(false);
    }
  });

  it('carries only truthful network facts (no license, years or reviews of its own)', () => {
    expect(found.contractor.facts).toEqual(['Free in-home consultation', 'Licensed local contractors', 'No obligation']);
    expect(getEstimator('pool-masters')!.contractor.facts).toEqual(['Licensed & insured', 'Serving SoCal since 2010', 'Free on-site estimate']);
  });
});

describe('bathroom example pair', () => {
  const pair = TRADE_META.bathroom.exampleImages!;

  it('is on disk, so the first screen opens on the design/photo slider', () => {
    expect(resolveExampleMedia(TRADE_META.bathroom, exists)?.kind).toBe('compare');
    expect(TRADE_META.bathroom.shareImage && exists(TRADE_META.bathroom.shareImage.url)).toBe(true);
  });

  it('labels the photo half as AI-rendered and never as a real job', () => {
    expect(pair.photoLabel).toMatch(/AI-rendered/);
    expect(pair.caption).toMatch(/AI-rendered/);
    expect(pair.caption).toMatch(/Not a real job/);
    expect(pair.photoAlt).toMatch(/AI-rendered/);
  });

  it.each([pair.illustration, pair.photo])('%s is a 1200 x 800 WebP under 260 KB without metadata', async (src) => {
    const buf = readFileSync(publicPath(src));
    const meta = await sharp(buf).metadata();
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([1200, 800]);
    expect(buf.length).toBeLessThan(260 * 1024);
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
  });
});
