import { BATH_SPRITES, BATH_TEXTURES, BATH_SPRITE_DIR, BATH_TEXTURE_DIR } from '@/lib/estimator/scene/bath/textures';
import type { BathSpriteId, BathTextureId } from '@/lib/estimator/scene/bath/types';
import { proceduralTexture } from './procedural';

/**
 * Image cache for the bathroom picture's texture and sprite files. Files load
 * once per page and are shared by every <BathScene>; until one is decoded the
 * painter uses the procedural texture (or its vector drawing), so a pick never
 * waits on the network. Each paint records the files it asked for
 * (recordBathAssets), so a scene repaints only when one of ITS files arrives.
 */

type Entry = { img: HTMLImageElement; ready: boolean; failed: boolean; done: Promise<void> };

const images = new Map<string, Entry>();
const listeners = new Set<(url: string) => void>();
/** The files the current paint asks for (null outside recordBathAssets). */
let recording: Set<string> | null = null;

/** Run a paint and return every file URL it used or waited for. */
export function recordBathAssets(paint: () => void): Set<string> {
  const used = new Set<string>();
  const outer = recording;
  recording = used;
  try {
    paint();
  } finally {
    recording = outer;
  }
  return used;
}

/** A manifest src as a URL: bare file names live in the bath texture/sprite dirs. */
export function assetUrl(src: string, dir: string): string {
  return /^(\/|https?:|data:|blob:)/.test(src) ? src : `${dir}${src}`;
}

function load(url: string): Entry {
  recording?.add(url);
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
    listeners.forEach((fn) => fn(url));
  };
  img.onerror = () => {
    entry.failed = true;
    resolve();
  };
  img.src = url;
  images.set(url, entry);
  return entry;
}

/** Called with each file's URL as it finishes loading. */
export function onBathAssetLoad(fn: (url: string) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** True while some file the page asked for is still loading. */
export function bathAssetsLoading(): boolean {
  for (const e of images.values()) if (!e.ready && !e.failed) return true;
  return false;
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

/** Start every file loading (so later picks are instant); resolves when all have settled. Not recorded. */
export function preloadBathAssets(): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();
  const outer = recording;
  recording = null;
  const pending: Promise<void>[] = [];
  for (const t of Object.values(BATH_TEXTURES)) if (t.src) pending.push(load(assetUrl(t.src, BATH_TEXTURE_DIR)).done);
  for (const s of Object.values(BATH_SPRITES)) if (s.src) pending.push(load(assetUrl(s.src, BATH_SPRITE_DIR)).done);
  recording = outer;
  return Promise.all(pending).then(() => undefined);
}

let idleQueued = false;
/**
 * preloadBathAssets once the page is idle (after the first paint and the
 * page's own images), so the rest of the files never compete with them.
 */
export function preloadBathAssetsWhenIdle(): void {
  if (idleQueued || typeof window === 'undefined') return;
  idleQueued = true;
  const run = () => void preloadBathAssets();
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}
