import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ConfiguratorSpec } from '@/lib/estimator/configurator/types';
import { smallSrc, type PhotoManifest } from './photos';

/**
 * Server only (the estimator pages): which configurator photos are in public/.
 * The pages are built ahead of time (generateStaticParams), where public/
 * exists. Where it does not (a serverless re-render), this returns null and
 * the browser falls back per image instead (photo-stage.tsx onError).
 */
export function configuratorPhotoManifest(spec: ConfiguratorSpec, publicDir = join(process.cwd(), 'public')): PhotoManifest | null {
  try {
    if (!existsSync(publicDir)) return null;
    const out: PhotoManifest = {};
    for (const [key, photo] of Object.entries(spec.photos)) {
      const file = (src: string) => existsSync(join(publicDir, src.replace(/^\//, '')));
      out[key] = { full: file(photo.src), sm: file(smallSrc(photo.src)) };
    }
    return out;
  } catch {
    return null;
  }
}
