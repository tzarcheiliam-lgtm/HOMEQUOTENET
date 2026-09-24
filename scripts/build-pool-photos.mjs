/**
 * Copies the selected pool photos into public/images/pools/ as optimised WebP.
 *
 * The source folder is opened read-only — files are read, never written,
 * renamed, moved or deleted. Conversion happens on a canvas in Chromium, so no
 * image-processing dependency is added to the project.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = String.raw`C:\Users\tzarc\Desktop\Pool Masters\poolmastersos\Pool_Masters_Organized_Photos`;
const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'pools');

/**
 * source file → published name, sized to the role it plays on the page.
 * Chosen from a visual review of every non-duplicate image in the collection.
 */
const SELECTION = [
  // Heroes — the only full-bleed images, so the only ones kept at 1920.
  ['01_Pools_Spas_Baja_Shelves', '015_hero_pool_with_umbrella_spa_and_baja_shelf.jpg', 'pool-remodel-baja-shelf-spa-umbrella', 1920],
  ['01_Pools_Spas_Baja_Shelves', '039_desert_hillside_pool_and_spa_view.jpg',          'pool-spa-hillside-desert-view',        1920],
  // Full-width atmospheric band behind the closing CTA.
  ['08_Night_Ambience',          '001_night_symmetric_pool_with_lit_bowls.jpg',        'pool-night-lighting-symmetric-deck',   1600],
  // Mosaic strip — never rendered wider than ~620px.
  ['01_Pools_Spas_Baja_Shelves', '019_black_tile_spa_closeup.jpg',                     'pool-tile-coping-black-waterline-detail', 900],
  ['08_Night_Ambience',          '020_evening_lap_pool_with_lit_spa.jpg',              'lap-pool-evening-lighting-spa',        1100],
  ['01_Pools_Spas_Baja_Shelves', '007_daytime_backyard_pool_with_wood_deck.jpg',       'pool-deck-wood-backyard-spa',          1100],
  // Section breaks and the project row — half-width at most.
  ['01_Pools_Spas_Baja_Shelves', '028_mountain_view_pool_spa_and_deck.jpg',            'pool-renovation-mountain-view-deck',   1300],
  ['05_Fire_Water_Features',     '042_fire_and_water_bowls_closeup.jpg',               'pool-fire-water-bowl-feature',         1600],
  ['02_Drone_Aerials',           '024_topdown_dark_house_backyard_pool.jpg',           'backyard-pool-aerial-overhead',        1600],
  ['01_Pools_Spas_Baja_Shelves', '043_long_pool_with_angled_spa_and_umbrella.jpg',     'long-pool-angled-spa-tile',            1100],
  ['05_Fire_Water_Features',     '021_stone_wall_firepit_seating.jpg',                 'outdoor-living-firepit-stone-wall',    1100],
];

const QUALITY = 0.78;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const report = [];

for (const [folder, file, outName, maxW] of SELECTION) {
  const src = path.join(ROOT, folder, file);
  const srcBytes = statSync(src).size;
  const dataUrl =
    'data:image/jpeg;base64,' + readFileSync(src).toString('base64');

  const out = await page.evaluate(
    async ({ src, maxW, quality }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = src;
      });
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.getElementById('c');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return {
        w,
        h,
        origW: img.width,
        origH: img.height,
        data: c.toDataURL('image/webp', quality),
      };
    },
    { src: dataUrl, maxW, quality: QUALITY }
  );

  if (!out.data.startsWith('data:image/webp')) {
    throw new Error(`WebP encoding unavailable for ${file}`);
  }

  const buf = Buffer.from(out.data.split(',')[1], 'base64');
  const dest = path.join(OUT_DIR, `${outName}.webp`);
  writeFileSync(dest, buf);

  report.push({
    source: `${folder}/${file}`,
    published: `${outName}.webp`,
    orig: `${out.origW}x${out.origH}`,
    outSize: `${out.w}x${out.h}`,
    origKB: Math.round(srcBytes / 1024),
    webpKB: Math.round(buf.length / 1024),
  });
}

await browser.close();

let total = 0;
console.log(
  'published'.padEnd(46) + 'dims'.padEnd(12) + 'orig'.padEnd(9) + 'webp'
);
console.log('-'.repeat(78));
for (const r of report) {
  total += r.webpKB;
  console.log(
    r.published.padEnd(46) +
      r.outSize.padEnd(12) +
      (r.origKB + 'KB').padEnd(9) +
      r.webpKB + 'KB'
  );
}
console.log('-'.repeat(78));
console.log(`${report.length} images, total ${total} KB (${(total / 1024).toFixed(2)} MB)`);
