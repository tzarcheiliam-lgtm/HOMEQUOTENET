import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { LIMITS } from '@/lib/contracts/types';

export class LogoRejected extends Error {}

export type LogoKind = 'png' | 'jpeg' | 'webp';
/** Sniffs the real format from the bytes (the file name / MIME type sent by the browser is never trusted). */
export function sniffImage(b: Uint8Array): LogoKind | null {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length > 16 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP') return 'webp';
  return null;
}

const MAX_SOURCE_PX = 6000;
const MAX_OUT_W = 900, MAX_OUT_H = 450;

export interface NormalizedLogo { png: Uint8Array; width: number; height: number }

/**
 * Validates an uploaded logo and re-encodes it as a clean PNG: metadata stripped, transparency kept, transparent
 * padding trimmed, longest side capped. The original bytes are never stored, so nothing but a decodable raster image
 * can ever reach storage (no SVG / script / polyglot files).
 */
export async function normalizeLogo(input: Uint8Array): Promise<NormalizedLogo> {
  if (!input.length) throw new LogoRejected('That file is empty.');
  if (input.length > LIMITS.maxLogoBytes) throw new LogoRejected('Logos can be up to 2 MB.');
  if (!sniffImage(input)) throw new LogoRejected('Use a PNG, JPG or WebP image.');
  let img;
  try { img = await loadImage(Buffer.from(input)); } catch { throw new LogoRejected('That image could not be read.'); }
  if (!img.width || !img.height) throw new LogoRejected('That image could not be read.');
  if (img.width > MAX_SOURCE_PX || img.height > MAX_SOURCE_PX) throw new LogoRejected('That image is too large (6000 px maximum).');
  if (img.width < 24 || img.height < 24) throw new LogoRejected('That image is too small to use as a logo (24 px minimum).');

  // Trim fully transparent margins so every logo fills its box the same way.
  const probe = createCanvas(img.width, img.height);
  const pctx = probe.getContext('2d');
  pctx.drawImage(img, 0, 0);
  const data = pctx.getImageData(0, 0, img.width, img.height).data;
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (data[(y * img.width + x) * 4 + 3] > 10) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  if (maxX < 0) throw new LogoRejected('That image is completely transparent.');
  const sw = maxX - minX + 1, sh = maxY - minY + 1;
  const scale = Math.min(1, MAX_OUT_W / sw, MAX_OUT_H / sh);
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
  const out = createCanvas(w, h);
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(img, minX, minY, sw, sh, 0, 0, w, h);
  const png = new Uint8Array(await out.encode('png'));
  return { png, width: w, height: h };
}

let hqLogo: Uint8Array | null | undefined;
/** HomeQuote's own logo (the same artwork the app header uses). Null if the file is not deployed with the function. */
export function loadHomeQuoteLogo(): Uint8Array | null {
  if (hqLogo !== undefined) return hqLogo;
  try { hqLogo = new Uint8Array(fs.readFileSync(path.join(process.cwd(), 'public', 'assets', 'brand', 'hq-logo-horizontal.png'))); } catch { hqLogo = null; }
  return hqLogo;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}
