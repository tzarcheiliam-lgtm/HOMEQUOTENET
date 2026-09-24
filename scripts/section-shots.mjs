/**
 * Captures individual page sections so they can be reviewed at a readable
 * scale, rather than as one very tall full-page image.
 *
 *   node scripts/section-shots.mjs mobile
 *   node scripts/section-shots.mjs desktop
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = '.qa-screenshots/sections';

const WIDTHS = { mobile: 375, tablet: 768, desktop: 1440 };
const which = process.argv[2] || 'mobile';
const width = WIDTHS[which] || 375;

const TARGETS = [
  ['/', ['#problem', '#how-it-works', '#projects', '#lead-standards', '#why',
         '#system', '#options', '#fit', '#after-apply', '#faq']],
  ['/pool-contractors', ['#projects', '#standards', '#apply']],
  ['/lead-standards', []],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height: 900 },
  deviceScaleFactor: 1,
  isMobile: which === 'mobile',
});
await mkdir(OUT, { recursive: true });

for (const [route, ids] of TARGETS) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(300);

  const slug = route === '/' ? 'home' : route.replace(/\//g, '');

  // Hero: top of the page at viewport height.
  await page.screenshot({
    path: path.join(OUT, `${slug}__hero__${which}.png`),
    clip: { x: 0, y: 0, width, height: Math.min(900, 1100) },
  });

  for (const id of ids) {
    const el = page.locator(id);
    if (!(await el.count())) {
      console.log(`  missing ${route} ${id}`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await el.screenshot({
      path: path.join(OUT, `${slug}${id.replace('#', '__')}__${which}.png`),
    });
  }
  await page.close();
}

await ctx.close();
await browser.close();
console.log(`section shots -> ${OUT} (${which}, ${width}px)`);
