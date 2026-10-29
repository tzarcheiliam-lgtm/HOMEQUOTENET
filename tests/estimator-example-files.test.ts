import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_FILES, exampleFileExists } from '@/components/estimator/builders/example-files';
import { resolveExampleMedia, TRADE_META } from '@/components/estimator/builders/meta';

/**
 * The estimator pages pick their example media from a fixed list (no file
 * system access at render time). These tests keep the list honest: every
 * listed path ships in public/, and every trade's example pair resolves.
 */
describe('example media list', () => {
  it('lists only files that exist in public/', () => {
    for (const path of EXAMPLE_FILES) {
      const file = join(process.cwd(), 'public', path);
      expect(existsSync(file), path).toBe(true);
      expect(statSync(file).size, path).toBeGreaterThan(1000);
    }
  });

  it('resolves the pool and bathroom example pairs (they never silently disappear)', () => {
    const pool = resolveExampleMedia(TRADE_META.pool, exampleFileExists);
    expect(pool).toMatchObject({ kind: 'compare', illustration: '/estimator/hero/pool-design-illustration.webp' });
    const bath = resolveExampleMedia(TRADE_META.bathroom, exampleFileExists);
    expect(bath).toMatchObject({ kind: 'compare', photo: '/estimator/hero/bath-example-photo.webp' });
    for (const meta of Object.values(TRADE_META)) {
      if (meta.shareImage) expect(exampleFileExists(meta.shareImage.url), meta.shareImage.url).toBe(true);
    }
  });

  it('rejects anything not on the list', () => {
    expect(exampleFileExists('/estimator/hero/missing.webp')).toBe(false);
    expect(exampleFileExists('/../package.json')).toBe(false);
  });
});
