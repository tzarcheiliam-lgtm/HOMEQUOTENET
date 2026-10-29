import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { allFunnelSelections, stepOptionPhotos } from '@/lib/estimator/funnel/engine';
import type { FunnelSpec } from '@/lib/estimator/funnel/types';

/**
 * Server only (the funnel pages): the photo files a funnel can show that are
 * not in public/, so the screen uses their fallback straight away instead of
 * asking the browser for a missing file. Where public/ is not on disk (a
 * serverless re-render) this returns [] and the <img> swaps on error instead.
 */
export function missingFunnelPhotos(spec: FunnelSpec, publicDir = join(process.cwd(), 'public')): string[] {
  try {
    if (!existsSync(publicDir)) return [];
    const srcs = new Set<string>();
    for (const sel of allFunnelSelections(spec)) {
      for (const step of spec.steps) {
        for (const p of Object.values(stepOptionPhotos(spec, step.id, sel))) {
          srcs.add(p.src);
          if (p.srcSm) srcs.add(p.srcSm);
        }
      }
    }
    return [...srcs].filter((src) => src.startsWith('/') && !existsSync(join(publicDir, src.replace(/^\//, ''))));
  } catch {
    return [];
  }
}
