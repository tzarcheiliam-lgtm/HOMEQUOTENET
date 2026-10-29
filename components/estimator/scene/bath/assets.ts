import { BATH_SPRITES, BATH_TEXTURES, BATH_SPRITE_DIR, BATH_TEXTURE_DIR } from '@/lib/estimator/scene/bath/textures';
import type { BathSpriteId, BathTextureId } from '@/lib/estimator/scene/bath/types';
import { proceduralTexture } from './procedural';

/**
 * Image cache for the bathroom picture's texture and sprite files. Files load
 * once per page and are shared by every <BathScene>; until one is decoded the
 * painter uses the procedural texture (or its vector drawing), so a pick never
 * waits on the network. Listeners repaint when a file arrives.
 */

type Entry = { img: HTMLImageElement; ready: boolean; failed: boolean; done: Promise<void> };

const images = new Map<string, Entry>();
const listeners = new Set<() => void>();

/** A manifest src as a URL: bare file names live in the bath texture/sprite dirs. */
export function assetUrl(src: string, dir: string): string {
  return /^(\/|https?:|data:|blob:)/.test(src) ? src : `${dir}${src}`;
}

function load(url: string): Entry {
  const hit = images.get(url);
  if (hit) return hit;
  const img = new Image();
  img.decoding = 'async';
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const entry: Entry = { img, ready: false, failed: false, done };
  img.onload = () => {
    entry.ready = true;
    resolve();
    listeners.forEach((fn) => fn());
  };
  img.onerror = () => {
    entry.failed = true;
    resolve();
  };
  img.src = url;
  images.set(url, entry);
  return entry;
}

export function onBathAssetLoad(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** A texture source and how many feet one copy of it covers. */
export type TextureSource = { image: CanvasImageSource; width: number; height: number; realFt: number; file: boolean };

export function textureSource(id: BathTextureId): TextureSource {
  const entry = BATH_TEXTURES[id];
  if (entry.src && typeof Image !== 'undefined') {
    const e = load(assetUrl(entry.src, BATH_TEXTURE_DIR));
    if (e.ready && e.img.naturalWidth > 0) {
      return { image: e.img, width: e.img.naturalWidth, height: e.img.naturalHeight, realFt: entry.realFt, file: true };
    }
  }
  const c = proceduralTexture(id);
  return { image: c, width: c.width, height: c.height, realFt: entry.realFt, file: false };
}

/** A decoded sprite image, or null (no file, still loading, or failed): draw the vector version. */
export function spriteImage(id: BathSpriteId): HTMLImageElement | null {
  const entry = BATH_SPRITES[id];
  if (!entry.src || typeof Image === 'undefined') return null;
  const e = load(assetUrl(entry.src, BATH_SPRITE_DIR));
  return e.ready && e.img.naturalWidth > 0 ? e.img : null;
}

/** Start every file loading (idle-time preload, so later picks are instant). */
export function preloadBathAssets(): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  const pending: Promise<void>[] = [];
  for (const t of Object.values(BATH_TEXTURES)) if (t.src) pending.push(load(assetUrl(t.src, BATH_TEXTURE_DIR)).done);
  for (const s of Object.values(BATH_SPRITES)) if (s.src) pending.push(load(assetUrl(s.src, BATH_SPRITE_DIR)).done);
  return Promise.all(pending).then(() => undefined);
}
