import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { allFunnelSelections, stepOptionPhotos } from '@/lib/estimator/funnel/engine';
import type { FunnelSpec } from '@/lib/estimator/funnel/types';

/**
 * Server only (the funnel pages): the photo files a funnel can show (the steps'
 * photos, and the landing hero when it has a fallback) that are
 * not in public/, so the screen uses their fallback straight away instead of
 * asking the browser for a missing file. A photo whose folder is not on disk
 * is never reported: on Vercel the photos are served statically and kept out
 * of the functions (next.config.ts), so the <img> swaps on error instead.
 */
export function missingFunnelPhotos(spec: FunnelSpec, publicDir = join(process.cwd(), 'public')): string[] {
  try {
    if (!existsSync(publicDir)) return [];
    const srcs = new Set<string>();
    // The landing's hero, when it has a fallback to show instead.
    if (spec.landing.heroFallback) srcs.add(spec.landing.heroPhoto.src);
    // The roofing address screen's photo.
    if (spec.addressFirst) {
      srcs.add(spec.addressFirst.photo.src);
      if (spec.addressFirst.photo.srcSm) srcs.add(spec.addressFirst.photo.srcSm);
    }
    for (const sel of allFunnelSelections(spec)) {
      for (const step of spec.steps) {
        for (const p of Object.values(stepOptionPhotos(spec, step.id, sel))) {
          srcs.add(p.src);
          if (p.srcSm) srcs.add(p.srcSm);
        }
      }
    }
    return [...srcs].filter((src) => {
      if (!src.startsWith('/')) return false;
      const file = join(publicDir, src.replace(/^\//, ''));
      return existsSync(dirname(file)) && !existsSync(file);
    });
  } catch {
    return [];
  }
}
