/**
 * The example media files that ship in public/ (the design/photo pairs, the
 * bathroom clip and its poster). A fixed list, resolved when the module is
 * built, so the estimator pages decide what to show without touching the file
 * system: a page rendered in a serverless function (ISR, a preview) has no
 * public/ folder to look in, and would silently drop the examples.
 *
 * tests/estimator-example-files.test.ts checks that every path here is a real
 * file and that each trade's example pair is listed. Add a path when the file
 * is added; remove it when the file is removed.
 */
export const EXAMPLE_FILES: ReadonlySet<string> = new Set([
  '/estimator/hero/pool-design-illustration.webp',
  '/estimator/hero/pool-design-photo.webp',
  '/estimator/hero/bath-example-design.webp',
  '/estimator/hero/bath-example-photo.webp',
  '/estimator/hero/bath-hero.mp4',
  '/estimator/hero/bath-hero.webm',
  '/estimator/hero/bath-hero.webp',
]);

/** True when a public path such as "/estimator/hero/bath-hero.webp" is one of the shipped example files. */
export function exampleFileExists(path: string): boolean {
  return EXAMPLE_FILES.has(path);
}
