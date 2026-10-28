import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPRITES, TEXTURES } from '@/lib/estimator/scene/textures';
import { SPRITE_IDS, TEXTURE_IDS } from '@/lib/estimator/scene/types';

const publicPath = (src: string) => path.join(process.cwd(), 'public', src);

type ImageInfo = { width: number; height: number; alpha: boolean };

/** Width, height and alpha from a WebP or PNG header (no image library needed). */
function imageInfo(buf: Buffer): ImageInfo {
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    const colorType = buf[25];
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), alpha: colorType === 4 || colorType === 6 };
  }
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a WebP or PNG file');
  }
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      alpha: (buf[20] & 0x10) !== 0,
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), alpha: ((bits >> 28) & 1) === 1 };
  }
  if (chunk === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

describe('live pool scene assets', () => {
  it('has a manifest entry for every texture and sprite id', () => {
    expect(Object.keys(TEXTURES).sort()).toEqual([...TEXTURE_IDS].sort());
    expect(Object.keys(SPRITES).sort()).toEqual([...SPRITE_IDS].sort());
  });

  it('gives every texture a believable scale and a fallback colour', () => {
    for (const id of TEXTURE_IDS) {
      const t = TEXTURES[id];
      expect(t.realFt, id).toBeGreaterThan(0);
      expect(t.realFt, id).toBeLessThanOrEqual(12);
      expect(t.fallback, id).toMatch(/^(#[0-9a-f]{6}|transparent)$/);
    }
  });

  it('serves square, seamless-sized textures that exist and stay small', () => {
    for (const id of TEXTURE_IDS) {
      const { src } = TEXTURES[id];
      if (src === null) continue;
      expect(src, id).toBe(`/estimator/scene/textures/${id}.webp`);
      const file = publicPath(src);
      expect(existsSync(file), src).toBe(true);
      expect(statSync(file).size, src).toBeLessThan(220 * 1024);
      const info = imageInfo(readFileSync(file));
      expect(info.width, src).toBe(info.height);
      expect([768, 1024], src).toContain(info.width);
    }
  });

  it('serves sprites with transparency, footprints that match the image shape, and small files', () => {
    for (const id of SPRITE_IDS) {
      const { src, widthFt, heightFt } = SPRITES[id];
      expect(widthFt, id).toBeGreaterThan(0);
      expect(heightFt, id).toBeGreaterThan(0);
      if (src === null) continue;
      expect(src, id).toMatch(new RegExp(`^/estimator/scene/sprites/${id}\\.(webp|png)$`));
      const file = publicPath(src);
      expect(existsSync(file), src).toBe(true);
      expect(statSync(file).size, src).toBeLessThan(150 * 1024);
      const info = imageInfo(readFileSync(file));
      expect(info.alpha, src).toBe(true);
      // The drawn footprint keeps the cut-out's proportions (within 6%).
      const ratio = info.width / info.height / (widthFt / heightFt);
      expect(ratio, src).toBeGreaterThan(0.94);
      expect(ratio, src).toBeLessThan(1.06);
    }
  });

  it('ships the core materials as real textures, not just flat colours', () => {
    for (const id of ['floor_plaster', 'water_caustics', 'coping_travertine', 'deck_pavers', 'lawn_turf'] as const) {
      expect(TEXTURES[id].src, id).not.toBeNull();
    }
  });
});
