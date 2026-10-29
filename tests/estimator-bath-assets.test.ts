import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BATH_GALLERY, BATH_HERO_VIDEO, BATH_OPTION_IMAGES, BATH_STYLE_IDEA_LABEL } from '@/content/estimators/homequote-bathroom-photos';
import { BATH_SPRITES, BATH_TEXTURES } from '@/lib/estimator/scene/bath/textures';
import { BATH_SPRITE_IDS, BATH_TEXTURE_IDS } from '@/lib/estimator/scene/bath/types';
import { BATHROOM_TEMPLATE } from '@/lib/estimator/templates/bathroom';

const publicPath = (src: string) => path.join(process.cwd(), 'public', src);

type ImageInfo = { width: number; height: number; alpha: boolean; exif: boolean };

/** Width, height, alpha and EXIF/XMP presence from a WebP or PNG header (no image library needed). */
function imageInfo(buf: Buffer): ImageInfo {
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    const colorType = buf[25];
    const exif = buf.includes('eXIf') || buf.includes('iTXt');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), alpha: colorType === 4 || colorType === 6, exif };
  }
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a WebP or PNG file');
  }
  const exif = buf.includes('EXIF') || buf.includes('XMP ');
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return { alpha: (buf[20] & 0x10) !== 0, width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), exif };
  }
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), alpha: ((bits >> 28) & 1) === 1, exif };
  }
  if (chunk === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, alpha: false, exif };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

function served(src: string, maxKb: number): ImageInfo {
  const file = publicPath(src);
  expect(existsSync(file), src).toBe(true);
  expect(statSync(file).size, src).toBeLessThan(maxKb * 1024);
  const info = imageInfo(readFileSync(file));
  expect(info.exif, `${src} carries metadata`).toBe(false);
  return info;
}

describe('bathroom scene assets', () => {
  it('serves every texture: square, 768-1024 px, small, believable scale and colour', () => {
    for (const id of BATH_TEXTURE_IDS) {
      const t = BATH_TEXTURES[id];
      expect(t.src, id).toBe(`/estimator/scene/bath/textures/${id}.webp`);
      expect(t.realFt, id).toBeGreaterThan(0);
      expect(t.realFt, id).toBeLessThanOrEqual(8);
      expect(t.fallback, id).toMatch(/^#[0-9a-f]{6}$/);
      const info = served(t.src!, 220);
      expect(info.width, id).toBe(info.height);
      expect([768, 1024], id).toContain(info.width);
    }
  });

  it('serves every sprite with transparency, small files and footprints that match the image shape', () => {
    for (const id of BATH_SPRITE_IDS) {
      const s = BATH_SPRITES[id];
      expect(s.src, id).toBe(`/estimator/scene/bath/sprites/${id}.webp`);
      const info = served(s.src!, 200);
      expect(info.alpha, id).toBe(true);
      const drawn = s.widthFt / s.heightFt;
      const image = info.width / info.height;
      // The drawn footprint keeps the cut-out's proportions (within 6%).
      expect(Math.abs(drawn / image - 1), id).toBeLessThan(0.06);
    }
  });
});

describe('bathroom style ideas and option images', () => {
  it('has 6-8 AI style ideas, each labelled as AI-generated, with small files', () => {
    expect(BATH_GALLERY.length).toBeGreaterThanOrEqual(6);
    expect(BATH_GALLERY.length).toBeLessThanOrEqual(8);
    for (const g of BATH_GALLERY) {
      expect(g.caption, g.src).toContain(BATH_STYLE_IDEA_LABEL);
      expect(g.alt, g.src).toMatch(/^AI-generated /);
      expect(`${g.caption} ${g.alt}`, g.src).not.toMatch(/\b(our|we|completed|project by)\b/i);
      const big = served(g.src, 260);
      expect(Math.max(big.width, big.height), g.src).toBeLessThanOrEqual(1600);
      const thumb = served(g.thumb!, 100);
      expect(Math.max(thumb.width, thumb.height), g.thumb).toBeLessThanOrEqual(720);
    }
  });

  it('keys option images by real template options and serves them', () => {
    for (const [key, src] of Object.entries(BATH_OPTION_IMAGES)) {
      const [qid, oid] = key.split('.');
      const q = BATHROOM_TEMPLATE.questions.find((x) => x.id === qid);
      expect(q?.options.some((o) => o.id === oid), key).toBe(true);
      const info = served(src, 100);
      expect(Math.max(info.width, info.height), src).toBeLessThanOrEqual(720);
    }
  });
});

describe('bathroom hero clip', () => {
  it('serves a small silent MP4, a WebM and a poster', () => {
    const mp4 = readFileSync(publicPath(BATH_HERO_VIDEO.mp4));
    expect(mp4.length).toBeLessThan(2.5 * 1024 * 1024);
    expect(mp4.toString('ascii', 4, 8)).toBe('ftyp');
    // No audio track: an MP4 audio track carries an 'soun' handler.
    expect(mp4.includes('soun')).toBe(false);
    const webm = readFileSync(publicPath(BATH_HERO_VIDEO.webm));
    expect(webm.length).toBeLessThan(2.5 * 1024 * 1024);
    expect(webm.readUInt32BE(0)).toBe(0x1a45dfa3);
    const poster = served(BATH_HERO_VIDEO.poster, 200);
    expect(poster.width).toBeLessThanOrEqual(1280);
  });
});
