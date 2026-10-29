import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * The host's photo for the vCard: a logo under public/images turned into a
 * 256 px square JPEG on white (logos are wide and transparent; contact apps
 * crop to a circle and show transparency as black). Read from disk (traced
 * into the function, next.config.ts) or, failing that, from the site itself.
 * Never an outside URL: the path is checked here and by the 0070 column check.
 * Cached per path for the life of the instance. Null when anything fails:
 * the card is still useful without a photo.
 */

const SAFE_PATH = /^\/images\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp)$/;
const SIZE = 256;
const MAX_BYTES = 5_000_000;
const cache = new Map<string, Promise<string | null>>();

export const isSafePhotoPath = (p: string | null | undefined): p is string => !!p && SAFE_PATH.test(p) && !p.includes('..');

async function sourceBytes(photoPath: string, origin: string | null): Promise<Buffer | null> {
  try {
    const file = path.join(process.cwd(), 'public', ...photoPath.split('/').filter(Boolean));
    const buf = await readFile(file);
    if (buf.length <= MAX_BYTES) return buf;
  } catch { /* not on disk in this deployment: try the site */ }
  if (!origin) return null;
  try {
    const res = await fetch(new URL(photoPath, origin), { cache: 'force-cache', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= MAX_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/** Square JPEG, base64 (no data: prefix), or null. */
export async function squareLogoJpeg(input: Buffer): Promise<string | null> {
  try {
    const sharp = (await import('sharp')).default;
    // Logo inside a padded white square, sized so the round crop contact apps use never clips it:
    // a wide wordmark at 84% of the width (its corners stay inside the circle), a square / round mark at 94%.
    const meta = await sharp(input).metadata();
    const wide = (meta.width ?? 1) / (meta.height ?? 1) >= 1.6;
    const inner = Math.round(SIZE * (wide ? 0.84 : 0.94));
    const logo = await sharp(input).resize(inner, inner, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
    const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' } })
      .composite([{ input: logo, gravity: 'center' }])
      .flatten({ background: '#ffffff' })
      // Baseline (not progressive) for older contact importers; 4:4:4 keeps logo lettering crisp.
      .jpeg({ quality: 86, progressive: false, chromaSubsampling: '4:4:4' })
      .toBuffer();
    return out.toString('base64');
  } catch (e) {
    console.warn('[booking-contact] photo conversion failed', e instanceof Error ? e.message : e);
    return null;
  }
}

export function hostPhotoBase64(photoPath: string | null, origin: string | null): Promise<string | null> {
  if (!isSafePhotoPath(photoPath)) return Promise.resolve(null);
  let hit = cache.get(photoPath);
  if (!hit) {
    hit = (async () => {
      const bytes = await sourceBytes(photoPath, origin);
      return bytes ? squareLogoJpeg(bytes) : null;
    })();
    cache.set(photoPath, hit);
    // A miss is not remembered (the next request tries again).
    void hit.then((v) => { if (!v) cache.delete(photoPath); });
  }
  return hit;
}
