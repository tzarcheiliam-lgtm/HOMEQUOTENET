/**
 * Produces web-ready copies of the HomeQuote Network logo.
 *
 * The source file is read-only. The only change made to the copies is removing
 * the opaque black square the badge sits on, by clipping to the badge's own
 * circle and exporting with an alpha channel. Nothing is recoloured, redrawn,
 * upscaled or distorted — the aspect ratio stays 1:1 and the artwork is
 * untouched inside the circle.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = String.raw`C:\Users\tzarc\Desktop\HQN\LOGOFORHOMEQUOTE.png`;
const BRAND_DIR = path.join(process.cwd(), 'public', 'images', 'brand');
const APP_DIR = path.join(process.cwd(), 'app');

mkdirSync(BRAND_DIR, { recursive: true });

const srcKB = Math.round(statSync(SRC).size / 1024);
const dataUrl = 'data:image/png;base64,' + readFileSync(SRC).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

/** Draws the logo clipped to its inscribed circle at `size`, returns a data URL. */
async function render(size, type, quality) {
  return page.evaluate(
    async ({ src, size, type, quality }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = src;
      });
      const c = document.getElementById('c');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      // Clip to the badge's own circle, inset by a hair so the black square's
      // anti-aliased edge cannot survive as a dark fringe.
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();
      return c.toDataURL(type, quality);
    },
    { src: dataUrl, size, type, quality }
  );
}

const outputs = [
  // Used in the header, footer and anywhere on the site.
  { file: path.join(BRAND_DIR, 'homequote-network-logo.webp'), size: 512, type: 'image/webp', q: 0.92 },
  // PNG for the OG image route (Satori has no WebP decoder) and general use.
  { file: path.join(BRAND_DIR, 'homequote-network-logo.png'), size: 512, type: 'image/png' },
  // Browser tab icon — Next.js app/icon.png convention.
  { file: path.join(APP_DIR, 'icon.png'), size: 256, type: 'image/png' },
];

console.log(`source: LOGOFORHOMEQUOTE.png  1254x1254  ${srcKB}KB  (unmodified)\n`);
for (const o of outputs) {
  const url = await render(o.size, o.type, o.q);
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(o.file, buf);
  console.log(
    path.relative(process.cwd(), o.file).padEnd(46) +
      `${o.size}x${o.size}`.padEnd(10) +
      `${Math.round(buf.length / 1024)}KB`
  );
}

await browser.close();
