import { photoFor, photoKeys, photoSrc } from '@/lib/estimator/configurator/engine';
import type { ConfiguratorSelection, ConfiguratorSpec } from '@/lib/estimator/configurator/types';

/*
 * Which file each photo key shows. Variants live at
 * /estimator/pool-masters/configurator/<key>.webp (2048 px) with an optional
 * <key>-sm.webp (1024 px) for phones. The server page checks which files ship
 * (photo-manifest.ts) so the browser never asks for a missing one; without a
 * manifest the <img> falls back to the view's real photo on error.
 */

/** Per key: is the full file there, is the small one. A key absent from a manifest is treated as missing. */
export type PhotoManifest = Record<string, { full: boolean; sm: boolean }>;

/** What one <img> layer shows. */
export type StagePhoto = {
  key: string;
  src: string;
  srcSet?: string;
  alt: string;
  /** The view's real photo, for onError. */
  fallback: string;
  /** True when this is the view's real photo standing in for a missing variant. */
  isFallback: boolean;
};

/** "/x/aerial-pavers.webp" -> "/x/aerial-pavers-sm.webp". */
export const smallSrc = (src: string) => src.replace(/\.webp$/, '-sm.webp');

/** Width hints for srcset (the files are 1024 and 2048 px wide). */
export const SMALL_W = 1024;
export const FULL_W = 2048;

/** The photo for a key, honouring the manifest (missing variant -> the view's real photo). */
export function stagePhoto(spec: ConfiguratorSpec, key: string, manifest?: PhotoManifest | null): StagePhoto {
  const view = spec.views.find((v) => key === v.id || key.startsWith(`${v.id}-`)) ?? spec.views[0];
  const fallback = view.fallback.src;
  const real = { key, src: fallback, alt: view.fallback.alt, fallback, isFallback: true };
  if (!spec.photos[key]) return real;
  const { src, alt } = photoSrc(spec, key);
  if (!manifest) return { key, src, alt, fallback, isFallback: false };
  const files = manifest[key];
  if (!files?.full) return real;
  return { key, src, alt, fallback, isFallback: false, srcSet: files.sm ? `${smallSrc(src)} ${SMALL_W}w, ${src} ${FULL_W}w` : undefined };
}

/** The current photo of every view (result page, "next likely" preloads). */
export function currentPhotos(spec: ConfiguratorSpec, selection: ConfiguratorSelection, manifest?: PhotoManifest | null) {
  return spec.views.map((v) => ({ view: v.id, label: v.label, ...stagePhoto(spec, photoFor(spec, v.id, selection), manifest) }));
}

/** Every distinct file a view can show (to warm the cache while the homeowner looks at it). */
export function viewPhotos(spec: ConfiguratorSpec, viewId: string, manifest?: PhotoManifest | null): StagePhoto[] {
  const seen = new Set<string>();
  return photoKeys(spec, viewId)
    .map((k) => stagePhoto(spec, k, manifest))
    .filter((p) => (seen.has(p.src) ? false : (seen.add(p.src), true)));
}
