#!/usr/bin/env node
/**
 * Generates the option photos of the Pool Masters funnel's follow-up steps
 * (content/estimators/pool-masters-funnel.ts: "Choose your spa.", "Choose your
 * outdoor kitchen.", "Choose your fire feature.", "Choose your cabana.").
 * Reproducible record of how every edited file in
 * public/estimator/pool-masters/funnel/ (spa-*, kitchen-*, fire-*, cabana-*)
 * was made.
 *
 * Method (same art direction as scripts/generate-pool-configurator-photos.mjs):
 * every edited photo is ONE kie.ai nano-banana-pro image edit of a photo of the
 * same real Pool Masters job (used with permission), keeping the camera, house
 * and yard identical and changing only the feature. Options an existing photo
 * already shows genuinely are not regenerated (REUSED below; the funnel spec
 * points at those files directly).
 *
 * Usage
 *   KIE_API_KEY=... node scripts/generate-pool-funnel-options.mjs credits
 *   KIE_API_KEY=... node scripts/generate-pool-funnel-options.mjs generate [key ...] [--force]
 *   node scripts/generate-pool-funnel-options.mjs export
 *   POOL_CONFIG_FINAL_DIR=... node scripts/generate-pool-funnel-options.mjs crops
 *   node scripts/generate-pool-funnel-options.mjs sheet
 *   (KIE_KEY_FILE=<path> works instead of KIE_API_KEY: the key is read at run time, never printed.)
 *
 *   generate  runs each EDIT (skips keys that already have a raw image unless --force
 *             or named) and saves RAW_DIR/<key>.png.
 *   export    writes <key>.webp (1800 px, < 240 KB) and <key>-sm.webp (1200 px, < 120 KB),
 *             metadata stripped, into public/estimator/pool-masters/funnel/.
 *   crops     exports the CROPS (top-left corner of an aerial configurator photo) the same way.
 *   sheet     writes RAW_DIR/../funnel-options-sheet.jpg: all 12 option photos (edited + reused).
 *
 * Env
 *   POOL_FUNNEL_RAW_DIR  raw downloads (default <os tmpdir>/pool-funnel-options/raw).
 *   KIE_MODEL            default nano-banana-pro.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUB = path.join(ROOT, 'public');
const RAW_DIR = process.env.POOL_FUNNEL_RAW_DIR || path.join(tmpdir(), 'pool-funnel-options', 'raw');
const OUT = path.join(PUB, 'estimator', 'pool-masters', 'funnel');
const API = 'https://api.kie.ai';
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = process.env.KIE_MODEL || 'nano-banana-pro';

const CFG = 'estimator/pool-masters/configurator';
const REAL = 'estimator/pool-masters';

const KEEP =
  ' Keep the exact same camera position, framing, perspective, lens, sun direction, shadows and colour grading.' +
  ' Keep the house, windows, fence, hillside, sky, trees, plants, pots, furniture, deck, pool, waterline tile and coping exactly as they are.' +
  ' Change nothing else. Photorealistic real-estate photograph of a real high-end Los Angeles backyard,' +
  ' crisp natural detail. No people, no text, no logos, no watermark.';

/** Edits: key -> the published photo it is edited from (relative to public/) and the prompt. */
const EDITS = [
  {
    key: 'spa-flush',
    from: `${CFG}/poolside-pebble-premium-spa.webp`,
    prompt:
      'Replace the raised dark-tile spa in the near-left part of the pool with a FLUSH spa in exactly the same place and size (about 7 by 7 feet, square): ' +
      'the spa is no longer raised - its top edge sits level with the pool water and the pool coping, with no tall wall and no waterfall. ' +
      'It is separated from the pool only by a slim dam wall just at the waterline, capped in the same blue glass mosaic tile as the pool waterline, ' +
      'and a very gentle thin overflow of water spills over that dam into the pool. The spa holds clear light-blue water with its own seat ledge visible inside.' +
      KEEP,
  },
  {
    key: 'spa-zero-edge',
    from: `${CFG}/poolside-pebble-premium-spa.webp`,
    prompt:
      'Turn the raised spa in the near-left part of the pool into a ZERO-EDGE (vanishing-edge) spa in exactly the same place and size: ' +
      'same square shape and same height, its walls faced in dark charcoal tile, but there is no visible coping on top - the spa water brims right to the top edge ' +
      'like a mirror and overflows evenly on ALL FOUR sides as a thin glossy unbroken sheet of water running down every outside wall into the pool. ' +
      'Replace the single spillway with this all-around overflow.' +
      KEEP,
  },
  {
    key: 'kitchen-grill',
    from: `${REAL}/covered-outdoor-kitchen-bar.webp`,
    prompt:
      'Under the same black pergola with the woven pendant lights, replace the long white kitchen bar and its four bar stools with a compact freestanding ' +
      'GRILL ISLAND: a short white-stone island about 6 feet long with a built-in stainless-steel gas grill and small stainless doors below, ' +
      'no bar seating and no stools. Show the light paved ground where the long bar was.' +
      KEEP,
  },
  {
    key: 'kitchen-chef',
    from: `${REAL}/covered-outdoor-kitchen-bar.webp`,
    prompt:
      "Upgrade the outdoor kitchen under the same black pergola into a chef's kitchen: keep the white bar counter and the four black bar stools, " +
      'and add a domed white-plaster wood-fired pizza oven with a black arched opening, a glowing fire inside and a short black chimney on the right end of the back counter, ' +
      'plus a long built-in stainless-steel grill with a side burner on the back counter.' +
      KEEP,
  },
  {
    key: 'fire-pit',
    from: `${CFG}/evening-pebble-fire-spa.webp`,
    prompt:
      'Remove the two fire bowls at the far end of the pool (and their pedestals), and instead add one round low built-in gas FIRE PIT in light concrete ' +
      'with a live warm flame on the deck to the right of the pool, in front of the outdoor sofa, with two lounge chairs facing it. ' +
      'Its warm light falls on the nearby deck only. Keep the dusk light, the spa and everything else identical.' +
      KEEP,
  },
  {
    key: 'fire-fireplace',
    from: `${CFG}/evening-pebble-fire-spa.webp`,
    prompt:
      'Remove the two fire bowls at the far end of the pool (and their pedestals), and instead build one modern OUTDOOR FIREPLACE at the far end beyond the pool, ' +
      'in front of the planting: a tall smooth light-grey plaster fireplace wall about 8 feet tall with a wide linear firebox and a live warm flame, ' +
      'a slim hearth bench, its glow reflected softly on the far end of the water only. Keep the dusk light, the spa and everything else identical.' +
      KEEP,
  },
  {
    key: 'cabana-curtains',
    from: `${REAL}/covered-outdoor-kitchen-bar.webp`,
    prompt:
      'Replace the kitchen bar and bar stools under the same black pergola with a lounge CABANA: give the pergola a solid flat roof and hang flowing ' +
      'off-white outdoor curtains from it, tied back at every post, framing a deep light-grey outdoor sofa with cushions and a low wood coffee table on the paved floor.' +
      KEEP,
  },
];

/**
 * Options shown with an existing photo (not regenerated). The funnel spec points
 * at these files directly. Same yard where one exists; otherwise a real Pool
 * Masters job photo of that feature (unedited).
 *
 * PLACEHOLDERS (no photo of the option exists yet; kie.ai credits ran out on
 * 2026-10-29 after spa-flush, spa-zero-edge and fire-fireplace): kitchen-chef
 * and cabana-curtains show the same yard's real pergola kitchen photo. Run
 * `generate kitchen-chef cabana-curtains`, then `export`, and point the two
 * options in content/estimators/pool-masters-funnel.ts at funnel/<key>.webp.
 * kitchen-grill and fire-pit have same-yard edits ready too (optional: the
 * real photos below are genuine).
 */
const REUSED = [
  { key: 'spa-raised', src: `${CFG}/poolside-pebble-premium-spa.webp`, why: 'configurator photo: raised dark-tile spa with a spillway' },
  { key: 'kitchen-grill', src: `${REAL}/outdoor-kitchen-slab-counter.webp`, why: 'real Pool Masters job: built-in grill station' },
  { key: 'kitchen-full', src: `${REAL}/funnel/kitchen-full.webp`, why: 'crop of the configurator aerial (kitchen bar + island with bar stools)' },
  { key: 'kitchen-chef', src: `${REAL}/covered-outdoor-kitchen-bar.webp`, why: 'PLACEHOLDER: real photo of this yard, no pizza oven' },
  { key: 'fire-pit', src: `${REAL}/fire-pit-stone-wall-seating.webp`, why: 'real Pool Masters job: fire pit with seating' },
  { key: 'fire-bowls', src: `${CFG}/evening-pebble-fire-spa.webp`, why: 'configurator photo: the pair of fire bowls' },
  { key: 'cabana-pergola', src: `${REAL}/covered-lounge-pool-dusk.webp`, why: 'real Pool Masters job: louvered pergola over a lounge' },
  { key: 'cabana-curtains', src: `${REAL}/covered-outdoor-kitchen-bar.webp`, why: 'PLACEHOLDER: real photo of this yard, no curtains' },
  { key: 'cabana-lounge', src: `${REAL}/funnel/cabana-lounge.webp`, why: 'crop of the configurator aerial (patio cover over a lounge)' },
];

/**
 * Crops of configurator photos that show a backyard feature too small at full
 * frame: the top-left corner (56% of the width, 3:2). Source: the configurator's
 * composited JPEGs (POOL_CONFIG_FINAL_DIR, 2528 px wide), else its published 1800 px WebP.
 */
const CROPS = [
  { key: 'kitchen-full', from: 'aerial-porcelain-pebble-spa-yard' },
  { key: 'cabana-lounge', from: 'aerial-porcelain-pebble-spa-cover' },
];

// ------------------------------------------------------------------ helpers

const W = 1800;
const W_SM = 1200;
const MAX_KB = 240;
const MAX_KB_SM = 120;
const raw = (key) => path.join(RAW_DIR, `${key}.png`);

function kieKey() {
  const k = process.env.KIE_API_KEY || (process.env.KIE_KEY_FILE ? readFileSync(process.env.KIE_KEY_FILE, 'utf8').trim() : '');
  if (!k) throw new Error('KIE_API_KEY (or KIE_KEY_FILE) is not set');
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

const credits = async () => (await kie(`${API}/api/v1/chat/credit`)).data;

async function upload(file, name) {
  // Upload a clean JPEG (no metadata) of the published photo.
  const buf = await sharp(file).rotate().jpeg({ quality: 95 }).toBuffer();
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), `${name}.jpg`);
  form.append('uploadPath', 'pool-funnel-options');
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
    body: JSON.stringify({ model: MODEL, input: { prompt, image_input: imageUrls, aspect_ratio: '3:2', resolution: '2K', output_format: 'png' } }),
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
  await sharp(Buffer.from(await res.arrayBuffer())).rotate().png().toFile(file);
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

async function cmdGenerate(args) {
  const force = args.includes('--force');
  const only = args.filter((a) => !a.startsWith('--'));
  mkdirSync(RAW_DIR, { recursive: true });
  console.log('credits before', await credits());
  for (const step of EDITS) {
    const named = only.includes(step.key);
    if (only.length && !named) continue;
    if (existsSync(raw(step.key)) && !force && !named) { console.log('skip', step.key); continue; }
    const t = Date.now();
    const src = await upload(path.join(PUB, step.from), step.key);
    const out = await edit([src], step.prompt);
    await download(out, raw(step.key));
    console.log('done', step.key, `${Math.round((Date.now() - t) / 1000)}s`);
  }
  console.log('credits after', await credits());
}

async function cmdExport() {
  mkdirSync(OUT, { recursive: true });
  for (const { key } of EDITS) {
    if (!existsSync(raw(key))) { console.log('MISSING', key); continue; }
    const a = await webpUnder(raw(key), W, MAX_KB, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(raw(key), W_SM, MAX_KB_SM, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(18), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`);
  }
}

async function cmdCrops() {
  mkdirSync(OUT, { recursive: true });
  const finalDir = process.env.POOL_CONFIG_FINAL_DIR;
  for (const { key, from } of CROPS) {
    const src = finalDir && existsSync(path.join(finalDir, `${from}.jpg`)) ? path.join(finalDir, `${from}.jpg`) : path.join(PUB, CFG, `${from}.webp`);
    const { width, height } = await sharp(src).metadata();
    const w = Math.round(width * 0.56);
    const h = Math.min(height, Math.round(w / 1.5));
    const buf = await sharp(src).extract({ left: 0, top: 0, width: w, height: h }).png().toBuffer();
    // Dense planting from above: a little more room than the full frames so the quality stays near q60.
    const a = await webpUnder(buf, W, 320, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(buf, W_SM, 170, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(18), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`, `(crop ${w}x${h} of ${path.basename(src)})`);
  }
}

async function cmdSheet() {
  const order = ['spa-flush', 'spa-raised', 'spa-zero-edge', 'kitchen-grill', 'kitchen-full', 'kitchen-chef', 'fire-pit', 'fire-fireplace', 'fire-bowls', 'cabana-pergola', 'cabana-curtains', 'cabana-lounge'];
  const tw = 600;
  const th = 400;
  const label = 28;
  const cols = 3;
  const tiles = [];
  for (const [i, key] of order.entries()) {
    const reused = REUSED.find((r) => r.key === key);
    const file = reused && existsSync(path.join(PUB, reused.src)) ? path.join(PUB, reused.src) : existsSync(path.join(OUT, `${key}.webp`)) ? path.join(OUT, `${key}.webp`) : null;
    const x = (i % cols) * tw;
    const y = Math.floor(i / cols) * (th + label);
    if (file) tiles.push({ input: await sharp(file).resize(tw, th, { fit: 'cover' }).toBuffer(), left: x, top: y + label });
    tiles.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${label}"><rect width="100%" height="100%" fill="white"/><text x="8" y="20" font-family="sans-serif" font-size="18">${key}${reused ? (reused.why.startsWith('PLACEHOLDER') ? ' (placeholder)' : ' (reused)') : file ? ' (new edit)' : ' (missing)'}</text></svg>`),
      left: x,
      top: y,
    });
  }
  mkdirSync(path.join(RAW_DIR, '..'), { recursive: true });
  const out = path.join(RAW_DIR, '..', 'funnel-options-sheet.jpg');
  await sharp({ create: { width: cols * tw, height: Math.ceil(order.length / cols) * (th + label), channels: 3, background: '#ffffff' } })
    .composite(tiles).jpeg({ quality: 85 }).toFile(out);
  console.log('sheet', out);
}

const [cmd, ...args] = process.argv.slice(2);
const run = {
  credits: async () => console.log('credits', await credits()),
  generate: () => cmdGenerate(args),
  export: cmdExport,
  crops: cmdCrops,
  sheet: cmdSheet,
}[cmd];
if (!run) {
  console.log('usage: credits | generate [key ...] [--force] | export | crops | sheet');
  process.exit(1);
}
run().catch((e) => { console.error(e.message || e); process.exit(1); });
