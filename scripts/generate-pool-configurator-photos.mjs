#!/usr/bin/env node
/**
 * Generates the pre-rendered photo matrix behind the Pool Masters pool
 * configurator (content/estimators/pool-masters-configurator.ts, `photos`).
 * Reproducible record of how every file in
 * public/estimator/pool-masters/configurator/ was made: base photos, chain,
 * prompts, model, composites and export settings all live below.
 *
 * Method (art direction): every variant of a view is an image EDIT of one real
 * Pool Masters job photo (used with permission), chained one change at a time,
 * so the camera, house, fence, hillside and furniture stay identical and only
 * the chosen materials / features change. Regions that do not depend on the
 * other choices (the top-left outdoor-kitchen corner of the aerial view) are
 * composited from one edit with a feathered mask instead of re-generated, so
 * they are pixel-identical across variants and cost no credits.
 *
 * Usage
 *   KIE_API_KEY=... node scripts/generate-pool-configurator-photos.mjs credits
 *   node scripts/generate-pool-configurator-photos.mjs bases <drive-photos-dir>
 *   KIE_API_KEY=... node scripts/generate-pool-configurator-photos.mjs generate [key ...] [--force]
 *   node scripts/generate-pool-configurator-photos.mjs composite
 *   node scripts/generate-pool-configurator-photos.mjs export
 *   node scripts/generate-pool-configurator-photos.mjs sheets
 *   node scripts/generate-pool-configurator-photos.mjs projects <drive-photos-dir>
 *
 *   bases     crops the base photos to 3:2, strips metadata, writes RAW_DIR/base-*.jpg.
 *   generate  runs the edit STEPS in order (skips keys that already have a raw
 *             image unless --force or named explicitly) and saves RAW_DIR/<key>.jpg.
 *   composite builds the COMPOSITES keys from already generated raws.
 *   export    writes <key>.webp (1800 px, < 300 KB) and <key>-sm.webp (900 px,
 *             < 110 KB) into public/estimator/pool-masters/configurator/.
 *   sheets    writes one contact sheet per view to RAW_DIR/../ for a visual check.
 *   projects  exports the "Recent Pool Masters projects" strip (real photos,
 *             untouched apart from resize + metadata strip) into .../configurator/projects/.
 *
 * Env
 *   KIE_API_KEY          kie.ai key (generate / credits only). Never commit it.
 *   POOL_CONFIG_RAW_DIR  raw downloads + bases (default <os tmpdir>/pool-configurator-photos/raw).
 *   KIE_MODEL            default nano-banana-pro.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = process.env.POOL_CONFIG_RAW_DIR || path.join(tmpdir(), 'pool-configurator-photos', 'raw');
const OUT = path.join(ROOT, 'public', 'estimator', 'pool-masters', 'configurator');
const PROJECTS_OUT = path.join(OUT, 'projects');
const API = 'https://api.kie.ai';
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = process.env.KIE_MODEL || 'nano-banana-pro';

/** Real Pool Masters job photos the views are edited from (same job, same house). */
const BASES = {
  'base-aerial': '034_aerial_pool_by_house_with_pergola.jpg',
  'base-poolside': '039_desert_hillside_pool_and_spa_view.jpg',
};

/** Real photos for the "Recent Pool Masters projects" strip: [source, published name]. */
const PROJECTS = [
  ['015_hero_pool_with_umbrella_spa_and_baja_shelf.jpg', 'hilltop-pool-spa-baja-shelf'],
  ['043_long_pool_with_angled_spa_and_umbrella.jpg', 'long-pool-raised-spa'],
  ['014_purple_lit_pool_and_spa_night.jpg', 'led-pool-spa-night'],
  ['031_overhead_pool_with_blue_umbrellas.jpg', 'overhead-pool-blue-umbrellas'],
  ['037_covered_outdoor_kitchen_front_view.jpg', 'covered-outdoor-kitchen'],
  ['042_fire_and_water_bowls_closeup.jpg', 'fire-and-water-bowls'],
];

// ------------------------------------------------------------------ prompts

const KEEP =
  ' Keep the exact same camera position, framing, perspective, lens, sun direction, shadows and colour grading.' +
  ' Keep the house, roof, windows, fence, hillside, sky, trees, plants, pots, furniture and umbrella exactly as they are.' +
  ' Change nothing else. Photorealistic real-estate photograph of a real high-end Los Angeles backyard,' +
  ' crisp natural detail. No people, no text, no logos, no watermark.';

const AERIAL_DECK = {
  pavers:
    'Replace the concrete surface of the whole pool deck with large square pale cream natural limestone pavers ' +
    '(24 x 24 inch) laid in a straight grid aligned with the pool, with thin tight joints. Same deck footprint and edges; ' +
    'the paver grid must be clearly visible across the entire deck.',
  porcelain:
    'Replace the concrete surface of the whole pool deck with large-format pale warm-grey porcelain slabs ' +
    '(24 x 48 inch) laid in a straight running pattern aligned with the pool, with very thin near-seamless joints, ' +
    'a smooth refined matte surface slightly brighter and cooler than stone. Same deck footprint and edges.',
};

const AERIAL_SPA =
  'Add a raised square spa built into the lower-left corner of the pool, inside the pool rectangle where the two pool walls meet: ' +
  'about 7 by 7 feet, its walls rise about 18 inches above the pool water and are faced in dark charcoal stone tile with a thin dark coping, ' +
  'it holds clear light-blue water, and a thin even sheet of water spills from its pool-facing edge into the pool. ' +
  'The rest of the pool stays one clean rectangle.';

const POOL_FINISH = {
  quartz:
    'Change only the pool interior finish to a pale grey quartz finish with a subtle fine sparkle: the water becomes a soft aqua / turquoise, ' +
    'a touch deeper and greener than before. Keep the waterline tile, coping and deck as they are.',
  pebble:
    'Change only the pool interior finish to a dark blue-charcoal pebble finish with visible fine pebble texture on the steps and floor: ' +
    'the water becomes a deep, rich lagoon blue. Keep the waterline tile, coping and deck as they are.',
};

const POOL_PREMIUM_EDGE =
  'Change only the pool edge: replace the waterline tile with a 6 inch band of iridescent blue glass mosaic tile running all around the pool, ' +
  'and replace the coping with honed ivory travertine coping stones with a soft rounded bullnose edge, about 12 inches wide, all around the pool. ' +
  'Keep the pool interior finish, water colour and the deck exactly as they are.';

const DUSK =
  'Relight this exact photo to blue-hour dusk, as if taken from the same tripod 40 minutes after sunset: deep blue sky with a last warm glow ' +
  'over the hills, warm interior lights glowing in the house windows, the wall lantern lit, soft warm uplights on the olive trees and planters. ' +
  'Elegant and calm, not a disco.';

const FIRE =
  'Add a matching pair of round black concrete fire bowls on low square dark charcoal pedestals, placed on the deck at the two FAR corners of the pool, ' +
  'one each side of the entry steps at the back of the pool, modest in size, both with live warm orange flames. ' +
  'Their warm light falls on the nearby deck and on the far end of the water only. ' +
  'Do not add any flames, glows or reflections in the foreground water.';

/**
 * Edit chain, run in order. `from` is a base or an earlier key; every step is a
 * nano-banana-pro image edit of that one image (plus `refs`, extra reference images
 * the prompt points at, used to copy one feature identically across variants). Keys with a `.raw` suffix are
 * intermediates (not published).
 */
const STEPS = [
  // ---- aerial: base -> resurface + yard (real pergola kept), spa removed
  {
    key: 'aerial-resurface-yard',
    from: 'base-aerial',
    prompt:
      'Edit this drone photo of a backyard pool. 1) Remove the small square in-pool spa and its dividing wall in the lower-left corner of the pool: ' +
      'the pool becomes one clean rectangle, with the same white plaster floor, light-blue water, dark waterline tile and light concrete coping continuing ' +
      'straight around that corner; keep the wide entry steps along the top edge of the pool. ' +
      '2) Resurface the whole pool deck: smooth, uniform, freshly poured light sand-beige concrete with crisp straight saw-cut control joints in a regular grid, clean and new. ' +
      '3) Keep the dark-roofed pergola and outdoor kitchen bar with stools in the top-left corner, tidy and clean.' + KEEP,
  },
  {
    key: 'aerial-resurface',
    from: 'aerial-resurface-yard',
    prompt:
      'Remove the dark-roofed pergola, the outdoor kitchen bar and its bar stools in the top-left corner of the photo (beyond the glass fence) and replace them ' +
      'with decomposed-granite gravel, young olive trees and drought-tolerant planting that match the rest of that garden. ' +
      'Keep the covered dining patio attached to the house, the glass fence and everything else exactly as it is.' + KEEP,
  },
  { key: 'aerial-pavers', from: 'aerial-resurface', prompt: AERIAL_DECK.pavers + KEEP },
  { key: 'aerial-porcelain', from: 'aerial-resurface', prompt: AERIAL_DECK.porcelain + KEEP },
  { key: 'aerial-resurface-spa', from: 'aerial-resurface', prompt: AERIAL_SPA + KEEP },

  // ---- poolside: base -> plaster / classic edge (spa + worker removed)
  {
    key: 'poolside-plaster-classic',
    from: 'base-poolside',
    prompt:
      'Edit this photo of a backyard pool. 1) Remove the in-pool spa and its raised wall at the far end of the pool: the pool becomes one clean rectangle; ' +
      'keep a simple set of wide entry steps at the far end. 2) Bright white plaster interior, clear light Caribbean-blue water. ' +
      '3) The waterline tile is a plain 6 inch band of white / light-grey porcelain tile all around the pool, and the coping is flat light-grey poured concrete. ' +
      '4) Remove the person and the ladder near the house at the back right. Keep the light concrete deck.' + KEEP,
  },
  { key: 'poolside-quartz-classic', from: 'poolside-plaster-classic', prompt: POOL_FINISH.quartz + KEEP },
  { key: 'poolside-pebble-classic', from: 'poolside-plaster-classic', prompt: POOL_FINISH.pebble + KEEP },
  { key: 'poolside-plaster-premium', from: 'poolside-plaster-classic', prompt: POOL_PREMIUM_EDGE + KEEP },
  { key: 'poolside-quartz-premium', from: 'poolside-quartz-classic', prompt: POOL_PREMIUM_EDGE + KEEP },
  { key: 'poolside-pebble-premium', from: 'poolside-pebble-classic', prompt: POOL_PREMIUM_EDGE + KEEP },

  // ---- evening: same camera as poolside-plaster-classic, relit
  {
    key: 'evening',
    from: 'poolside-plaster-classic',
    prompt: DUSK + ' The pool is lit by one warm white underwater light, so the water glows a soft aqua.' + KEEP,
  },
  {
    key: 'evening-led',
    from: 'evening',
    prompt:
      'Change only the underwater pool lighting: the pool and its steps now glow with colour LED light, a rich deep blue shading to violet, ' +
      'evenly lit and tasteful. Keep the dusk sky, house lights and everything else identical.' + KEEP,
  },
  {
    key: 'evening-fire',
    from: 'evening',
    prompt:
      FIRE + ' Keep everything else identical.' + KEEP,
  },
];

/** Keys built locally: the yard corner of `patch` feathered into `base`. Coordinates are fractions of width/height. */
const YARD_MASK = [[0, 0], [0.31, 0], [0.31, 0.06], [0.285, 0.14], [0.22, 0.26], [0.17, 0.33], [0, 0.4]];
/** Where the spa can be: [x0, y0, x1, y1] fractions (keeps stray differences elsewhere out of the diff mask). */
const SPA_CLIP = [0.28, 0.38, 0.6, 0.72];
/** Fire bowls + their glow on the deck, above the far waterline (the LED water keeps its own colour). */
const FIRE_CLIP = [0, 0.3, 1, 0.585];
const COMPOSITES = [
  // Same bowls in both evening variants: cut from evening-fire where it differs from evening.
  { key: 'evening-led-fire', base: 'evening-led', patch: 'evening-fire', diffFrom: 'evening', clip: FIRE_CLIP },
  // The spa is cut out of aerial-resurface-spa by where it differs from aerial-resurface
  // (an edit with the spa image as a reference just copied that whole image, deck included).
  { key: 'aerial-pavers-spa', base: 'aerial-pavers', patch: 'aerial-resurface-spa', diffFrom: 'aerial-resurface', clip: SPA_CLIP },
  { key: 'aerial-porcelain-spa', base: 'aerial-porcelain', patch: 'aerial-resurface-spa', diffFrom: 'aerial-resurface', clip: SPA_CLIP },
  { key: 'aerial-pavers-yard', base: 'aerial-pavers', patch: 'aerial-resurface-yard', mask: YARD_MASK },
  { key: 'aerial-porcelain-yard', base: 'aerial-porcelain', patch: 'aerial-resurface-yard', mask: YARD_MASK },
  { key: 'aerial-resurface-spa-yard', base: 'aerial-resurface-spa', patch: 'aerial-resurface-yard', mask: YARD_MASK },
  { key: 'aerial-pavers-spa-yard', base: 'aerial-pavers-spa', patch: 'aerial-resurface-yard', mask: YARD_MASK },
  { key: 'aerial-porcelain-spa-yard', base: 'aerial-porcelain-spa', patch: 'aerial-resurface-yard', mask: YARD_MASK },
];

const VIEWS = {
  aerial: ['resurface', 'pavers', 'porcelain'].flatMap((d) => ['', '-spa', '-yard', '-spa-yard'].map((s) => `aerial-${d}${s}`)),
  poolside: ['plaster', 'quartz', 'pebble'].flatMap((f) => ['classic', 'premium'].map((e) => `poolside-${f}-${e}`)),
  evening: ['evening', 'evening-led', 'evening-fire', 'evening-led-fire'],
};
const ALL_KEYS = Object.values(VIEWS).flat();

// ------------------------------------------------------------------ helpers

const W = 1800;
const W_SM = 900;
const MAX_KB = 300;
const MAX_KB_SM = 110;

const raw = (key) => path.join(RAW_DIR, `${key}.jpg`);

function kieKey() {
  const k = process.env.KIE_API_KEY;
  if (!k) throw new Error('KIE_API_KEY is not set');
  return k;
}

async function kie(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${kieKey()}`, ...(init.headers || {}) } });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || (json.code !== undefined && json.code !== 200)) {
    throw new Error(`kie.ai ${url} failed: ${res.status} ${JSON.stringify(json)?.slice(0, 300)}`);
  }
  return json;
}

async function credits() {
  return (await kie(`${API}/api/v1/chat/credit`)).data;
}

async function upload(file, name) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type: 'image/jpeg' }), `${name}.jpg`);
  form.append('uploadPath', 'pool-configurator');
  form.append('fileName', `${name}-${Date.now()}.jpg`);
  const data = (await kie(`${UPLOAD_API}/api/file-stream-upload`, { method: 'POST', body: form })).data ?? {};
  const url = [data.downloadUrl, data.fileUrl, data.url].find((v) => typeof v === 'string' && v.startsWith('https://'));
  if (!url) throw new Error('upload returned no URL');
  return url;
}

async function edit(imageUrls, prompt) {
  const created = await kie(`${API}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: { prompt, image_input: imageUrls, aspect_ratio: '3:2', resolution: '2K', output_format: 'jpg' },
    }),
  });
  const taskId = created.data?.taskId;
  if (!taskId) throw new Error('no taskId');
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const data = (await kie(`${API}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`)).data ?? {};
    const state = String(data.state ?? '').toLowerCase();
    if (state === 'success') {
      const urls = JSON.parse(data.resultJson || '{}').resultUrls || [];
      if (!urls[0]) throw new Error('task finished without a result');
      return urls[0];
    }
    if (state === 'fail' || state === 'error') throw new Error(`task ${taskId} failed: ${data.failMsg || data.failCode || ''}`);
  }
  throw new Error(`task ${taskId} timed out`);
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  // Re-encode: strips any metadata the model host adds.
  await sharp(Buffer.from(await res.arrayBuffer())).rotate().jpeg({ quality: 95 }).toFile(file);
}

/** Crop to exactly 3:2 (centre) and re-encode without metadata. */
async function to32(input, file) {
  const img = sharp(input).rotate();
  const { width, height } = await img.metadata();
  let w = width;
  let h = Math.round(width / 1.5);
  if (h > height) { h = height; w = Math.round(height * 1.5); }
  await img
    .extract({ left: Math.floor((width - w) / 2), top: Math.floor((height - h) / 2), width: w, height: h })
    .jpeg({ quality: 95 })
    .toFile(file);
}

async function webpUnder(input, width, maxKb, file) {
  for (let q = 82; q >= 40; q -= 4) {
    const buf = await sharp(input).resize({ width, height: Math.round(width / 1.5), fit: 'cover' }).webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length <= maxKb * 1024 || q <= 42) {
      writeFileSync(file, buf);
      return { q, kb: Math.round(buf.length / 1024) };
    }
  }
  throw new Error('unreachable');
}

// ------------------------------------------------------------------ commands

async function cmdBases(dir) {
  if (!dir) throw new Error('usage: bases <drive-photos-dir>');
  mkdirSync(RAW_DIR, { recursive: true });
  for (const [key, file] of Object.entries(BASES)) {
    await to32(path.join(dir, file), raw(key));
    console.log('base', key, '<-', file);
  }
}

async function cmdGenerate(args) {
  const force = args.includes('--force');
  const only = args.filter((a) => !a.startsWith('--'));
  mkdirSync(RAW_DIR, { recursive: true });
  console.log('credits before', await credits());
  for (const step of STEPS) {
    const named = only.includes(step.key);
    if (only.length && !named) continue;
    if (existsSync(raw(step.key)) && !force && !named) { console.log('skip', step.key); continue; }
    if (!existsSync(raw(step.from))) throw new Error(`${step.key} needs ${step.from} first`);
    const t = Date.now();
    const src = await upload(raw(step.from), step.from);
    const refs = [];
    for (const r of step.refs || []) refs.push(await upload(raw(r), r));
    const out = await edit([src, ...refs], step.prompt);
    await download(out, raw(step.key));
    console.log('done', step.key, `${Math.round((Date.now() - t) / 1000)}s`);
  }
  console.log('credits after', await credits());
}

/** Mask of where `a` differs from `b` (spa + its shadow), cleaned of noise, slightly grown and feathered. */
async function diffMask(a, b, width, height, clip = [0, 0, 1, 1]) {
  const small = Math.round(width / 4);
  const sh = Math.round(height / 4);
  const read = (f) => sharp(f).resize(small, sh, { fit: 'fill' }).greyscale().blur(1.5).extractChannel(0).raw().toBuffer();
  const [pa, pb] = await Promise.all([read(a), read(b)]);
  const bin = Buffer.alloc(small * sh);
  for (let i = 0; i < bin.length; i++) {
    const x = (i % small) / small;
    const y = Math.floor(i / small) / sh;
    const inside = x >= clip[0] && x <= clip[2] && y >= clip[1] && y <= clip[3];
    bin[i] = inside && Math.abs(pa[i] - pb[i]) > 28 ? 255 : 0;
  }
  // open (drop specks), then close + grow (fill the spa body): box-filter thresholds.
  const box = async (buf, r, t) => {
    const out = await sharp(buf, { raw: { width: small, height: sh, channels: 1 } }).blur(r).extractChannel(0).raw().toBuffer();
    for (let i = 0; i < out.length; i++) out[i] = out[i] > t ? 255 : 0;
    return out;
  };
  let m = await box(bin, 2, 170); // erode
  m = await box(m, 6, 20); // dilate (and fill)
  m = await box(m, 4, 200); // erode back a little
  return sharp(m, { raw: { width: small, height: sh, channels: 1 } })
    .resize(width, height, { fit: 'fill' }).blur(Math.max(1, width * 0.002)).extractChannel(0).raw().toBuffer();
}

async function cmdComposite() {
  for (const c of COMPOSITES) {
    const base = sharp(raw(c.base));
    const { width, height } = await base.metadata();
    if (c.diffFrom) {
      const mask = await diffMask(raw(c.patch), raw(c.diffFrom), width, height, c.clip);
      writeFileSync(path.join(RAW_DIR, `${c.key}.mask.png`), await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer());
      const patch = await sharp(raw(c.patch)).resize(width, height, { fit: 'fill' })
        .joinChannel(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
      await sharp(raw(c.base)).composite([{ input: patch }]).jpeg({ quality: 95 }).toFile(raw(c.key));
      console.log('composite', c.key, '(diff mask)');
      continue;
    }
    const pts = c.mask.map(([x, y]) => `${Math.round(x * width)},${Math.round(y * height)}`).join(' ');
    const blur = Math.round(width * 0.012);
    const mask = await sharp(Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="black"/><polygon points="${pts}" fill="white"/></svg>`,
    )).blur(blur).extractChannel(0).toBuffer();
    const patch = await sharp(raw(c.patch)).resize(width, height, { fit: 'fill' }).joinChannel(mask).png().toBuffer();
    await base.composite([{ input: patch }]).jpeg({ quality: 95 }).toFile(raw(c.key));
    console.log('composite', c.key);
  }
}

async function cmdExport() {
  mkdirSync(OUT, { recursive: true });
  for (const key of ALL_KEYS) {
    if (!existsSync(raw(key))) { console.log('MISSING', key); continue; }
    const a = await webpUnder(raw(key), W, MAX_KB, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(raw(key), W_SM, MAX_KB_SM, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(28), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`);
  }
}

async function cmdSheets() {
  const dest = path.join(RAW_DIR, '..');
  for (const [view, keys] of Object.entries(VIEWS)) {
    const cols = view === 'aerial' ? 4 : 2;
    const tw = 600;
    const th = 400;
    const label = 28;
    const rows = Math.ceil(keys.length / cols);
    const tiles = [];
    for (const [i, key] of keys.entries()) {
      const file = existsSync(raw(key)) ? raw(key) : null;
      const x = (i % cols) * tw;
      const y = Math.floor(i / cols) * (th + label);
      if (file) tiles.push({ input: await sharp(file).resize(tw, th, { fit: 'cover' }).toBuffer(), left: x, top: y + label });
      tiles.push({
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${label}"><rect width="100%" height="100%" fill="white"/><text x="8" y="20" font-family="sans-serif" font-size="18">${key}${file ? '' : ' (missing)'}</text></svg>`),
        left: x,
        top: y,
      });
    }
    const out = path.join(dest, `sheet-${view}.jpg`);
    await sharp({ create: { width: cols * tw, height: rows * (th + label), channels: 3, background: '#ffffff' } })
      .composite(tiles).jpeg({ quality: 85 }).toFile(out);
    console.log('sheet', out);
  }
}

async function cmdProjects(dir) {
  if (!dir) throw new Error('usage: projects <drive-photos-dir>');
  mkdirSync(PROJECTS_OUT, { recursive: true });
  for (const [file, name] of PROJECTS) {
    const out = path.join(PROJECTS_OUT, `${name}.webp`);
    await sharp(path.join(dir, file)).rotate().resize({ width: 1200, height: 800, fit: 'cover' }).webp({ quality: 78, effort: 6 }).toFile(out);
    console.log('project', name, `${Math.round(statSync(out).size / 1024)} KB`);
  }
}

const [cmd, ...args] = process.argv.slice(2);
const run = {
  credits: async () => console.log('credits', await credits()),
  bases: () => cmdBases(args[0]),
  generate: () => cmdGenerate(args),
  composite: cmdComposite,
  export: cmdExport,
  sheets: cmdSheets,
  projects: () => cmdProjects(args[0]),
}[cmd];
if (!run) {
  console.log('usage: credits | bases <dir> | generate [key ...] [--force] | composite | export | sheets | projects <dir>');
  process.exit(1);
}
run().catch((e) => { console.error(e.message || e); process.exit(1); });
