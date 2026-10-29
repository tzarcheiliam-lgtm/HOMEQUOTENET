import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Server only (node:fs): true when a public path such as
 * "/estimator/hero/bath-hero.webp" is a file in public/. Plain paths only (no
 * "..", no query), so it never looks outside public/. The estimator pages use
 * it to show only example files that exist (resolveExampleMedia).
 */
export function publicFileExists(path: string): boolean {
  if (!/^\/[\w./-]+$/.test(path) || path.includes('..')) return false;
  try {
    return existsSync(join(process.cwd(), 'public', path));
  } catch {
    return false;
  }
}
