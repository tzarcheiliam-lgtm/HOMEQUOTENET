#!/usr/bin/env node
/**
 * Generates the photos of HomeQuote Network's roofing funnel
 * (/estimator/roofing, experience 'funnel'): ONE Southern California house,
 * the same camera and light in every photo, with each roof material and
 * colour the homeowner can pick. Reproducible record of how every file in
 * public/estimator/roofing/funnel/ was made. Same method as
 * scripts/generate-kitchen-funnel-photos.mjs.
 *
 * Art direction: a single-story stucco ranch home with a hip-and-gable roof,
 * seen from the street at a slightly raised three-quarter angle so the roof
 * fills the top half of the 3:2 frame, soft late-morning light, the whole
 * house inside the frame with margin (the funnel shows the full photo).
 * - roof-asphalt-charcoal is the one text-to-image master (kie.ai nano-banana-pro).
 * - Every other photo is an image EDIT of the master that changes ONLY the roof
 *   covering, so it is the same home with a different roof:
 *   asphalt x 3 colours, tile x 3, standing-seam metal x 3 (9 roof photos),
 *   plus house-before (the same home with an old, worn roof) for the address screen.
 * These are AI-generated example designs: the page labels them as such (the
 * label is never burned into the image). Google imagery is never edited here.
 *
 * Usage
 *   KIE_KEY_FILE=<path> node scripts/generate-roofing-funnel-photos.mjs credits
 *   KIE_KEY_FILE=<path> node scripts/generate-roofing-funnel-photos.mjs generate [key ...] [--force]
 *   node scripts/generate-roofing-funnel-photos.mjs export [key ...]
 *   node scripts/generate-roofing-funnel-photos.mjs sheet
 *   (KIE_API_KEY=... works instead of KIE_KEY_FILE; the key is read at run time, never printed.)
 *
 *   generate  10 images (1 master + 9 edits; 18 credits each, ~180 credits). The shipped set
 *             (2026-10-30): the master and roof-tile-terracotta at 2K, the rest with
 *             KIE_RESOLUTION=1K (1264 x 848, plenty for the 1200 px phone copy).
 *   export    <key>.webp (1800 px, 3:2, < 300 KB) and <key>-sm.webp (1200 px, < 140 KB),
 *             metadata stripped, into public/estimator/roofing/funnel/.
 *   sheet     SHEET_DIR/roofing-sheet.jpg (every exported key) to check the house never drifts.
 *
 * Env
 *   ROOFING_FUNNEL_RAW_DIR    raw downloads (default <os tmpdir>/roofing-funnel/raw).
 *   ROOFING_FUNNEL_SHEET_DIR  contact sheet (default RAW_DIR/..).
 *   KIE_MODEL                 default nano-banana-pro.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = process.env.ROOFING_FUNNEL_RAW_DIR || path.join(tmpdir(), 'roofing-funnel', 'raw');
const SHEET_DIR = process.env.ROOFING_FUNNEL_SHEET_DIR || path.join(RAW_DIR, '..');
const OUT = path.join(ROOT, 'public', 'estimator', 'roofing', 'funnel');
const API = 'https://api.kie.ai';
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = process.env.KIE_MODEL || 'nano-banana-pro';
/** 2K by default; 1K costs fewer credits and is plenty for the phone copy. */
const RESOLUTION = process.env.KIE_RESOLUTION || '2K';

// ------------------------------------------------------------------ prompts

const MASTER =
  'Photorealistic, magazine-quality real-estate exterior photograph of a single-story Southern California ranch home, ' +
  'smooth warm-white stucco walls, dark bronze window frames, a natural wood front door, a low front-yard garden with ' +
  'drought-tolerant plants, a light concrete driveway and a two-car garage on the right. ' +
  'The house has a simple hip-and-gable roof with a medium pitch, freshly installed new charcoal-grey architectural asphalt ' +
  'shingles with crisp straight courses, clean ridge caps and neat white gutters. ' +
  'Camera: a low drone shot about 25 feet up from the front-left corner of the lot, looking down at the house at a ' +
  'three-quarter angle, so the ROOF IS THE HERO: the roof planes, hips and ridges fill about half of the frame and read ' +
  'clearly, the whole house in frame with a little margin, only a thin band of sky at the top. ' +
  'Soft late-morning sun, clear blue sky, true-to-life colours, sharp detail. ' +
  'No people, no cars on the street, no text, no watermark, no logos.';

const KEEP =
  ' Keep EVERYTHING else exactly the same: the same house, walls, windows, door, garage, gutters, chimney and vents, ' +
  'the same garden, driveway, sky, light and shadows, and exactly the same camera position, framing and crop. ' +
  'The new roof follows exactly the same roof shape, ridges, hips, eaves and edges. Photorealistic, no text.';

const roof = (look) => `Change ONLY the roof covering of this house to ${look}.${KEEP}`;

const SHINGLE = (colour) => roof(`new architectural asphalt shingles in ${colour}, crisp dimensional shingle courses and matching ridge caps`);
const TILE = (colour) => roof(`new concrete roof tile in ${colour}, rounded S-profile tiles in neat courses with matching ridge and hip caps`);
const FLAT_TILE = (colour) => roof(`new flat slate-look concrete roof tile in ${colour}, neat straight courses with matching ridge and hip caps`);
const METAL = (colour) => roof(`a new standing-seam metal roof in ${colour}, smooth flat panels with evenly spaced raised vertical seams running from ridge to eave, crisp metal ridge and hip trim`);

const BEFORE = roof(
  'an OLD, worn, faded asphalt shingle roof that needs replacing: patchy grey-brown shingles with uneven colour, some curled edges, ' +
    'a few dark streaks and moss spots near the eaves (still a lived-in, tidy home, nothing broken or dramatic)',
);

const MASTER_KEY = 'roof-asphalt-charcoal';

const JOBS = [
  { key: MASTER_KEY, prompt: MASTER },
  { key: 'roof-asphalt-weathered_wood', from: MASTER_KEY, prompt: SHINGLE('a warm "weathered wood" brown-grey blend') },
  { key: 'roof-asphalt-pewter', from: MASTER_KEY, prompt: SHINGLE('a soft light "pewter" grey') },
  { key: 'roof-tile-terracotta', from: MASTER_KEY, prompt: TILE('a classic terracotta red-orange clay colour blend') },
  { key: 'roof-tile-sandstone', from: MASTER_KEY, prompt: TILE('a warm sandstone tan blend') },
  { key: 'roof-tile-slate_grey', from: MASTER_KEY, prompt: FLAT_TILE('a dark slate grey') },
  { key: 'roof-metal-matte_black', from: MASTER_KEY, prompt: METAL('matte black') },
  { key: 'roof-metal-dark_bronze', from: MASTER_KEY, prompt: METAL('a warm dark bronze brown') },
  { key: 'roof-metal-galvalume', from: MASTER_KEY, prompt: METAL('bare galvalume silver (soft satin metallic, not mirror-like)') },
  { key: 'house-before', from: MASTER_KEY, prompt: BEFORE },
];

// ------------------------------------------------------------------ helpers

const W = 1800;
const W_SM = 1200;
const MAX_KB = 300;
const MAX_KB_SM = 140;
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
    throw new Error(`kie.ai ${new URL(url).pathname} failed: ${res.status} ${json?.code ?? ''} ${String(json?.msg ?? '').slice(0, 200)}`);
  }
  return json;
}

const credits = async () => (await kie(`${API}/api/v1/chat/credit`)).data;

async function upload(file, name) {
  const buf = await sharp(file).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), `${name}.jpg`);
  form.append('uploadPath', 'roofing-funnel');
  form.append('fileName', `${name}-${Date.now()}.jpg`);
  const data = (await kie(`${UPLOAD_API}/api/file-stream-upload`, { method: 'POST', body: form })).data ?? {};
  const url = [data.downloadUrl, data.fileUrl, data.url].find((v) => typeof v === 'string' && v.startsWith('https://'));
  if (!url) throw new Error('upload returned no URL');
  return url;
}

async function run(prompt, imageUrls) {
  const input = { prompt, aspect_ratio: '3:2', resolution: RESOLUTION, output_format: 'png' };
  if (imageUrls?.length) input.image_input = imageUrls;
  const created = await kie(`${API}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input }),
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
  await sharp(Buffer.from(await res.arrayBuffer())).png().toFile(file);
}

async function webpUnder(input, width, maxKb, file) {
  for (let q = 90; q >= 42; q -= 4) {
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
  let masterUrl = null;
  for (const job of JOBS) {
    const named = only.includes(job.key);
    if (only.length && !named) continue;
    if (existsSync(raw(job.key)) && !force && !named) { console.log('skip', job.key); continue; }
    const t = Date.now();
    const inputs = [];
    if (job.from) {
      if (!existsSync(raw(job.from))) throw new Error(`${job.key}: source ${job.from} has no raw image yet`);
      // The master is uploaded once per run (every edit starts from the same file).
      masterUrl ??= await upload(raw(job.from), job.from);
      inputs.push(masterUrl);
    }
    const out = await run(job.prompt, inputs);
    await download(out, raw(job.key));
    console.log('done', job.key, `${Math.round((Date.now() - t) / 1000)}s`);
  }
  console.log('credits after', await credits());
}

async function cmdExport(only = []) {
  mkdirSync(OUT, { recursive: true });
  for (const { key } of JOBS) {
    if (only.length && !only.includes(key)) continue;
    if (!existsSync(raw(key))) { console.log('MISSING', key); continue; }
    const a = await webpUnder(raw(key), W, MAX_KB, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(raw(key), W_SM, MAX_KB_SM, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(30), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`);
  }
}

async function cmdSheet() {
  const keys = JOBS.map((j) => j.key);
  const tw = 600;
  const th = 400;
  const label = 28;
  const cols = 3;
  const tiles = [];
  for (const [i, key] of keys.entries()) {
    const exported = path.join(OUT, `${key}-sm.webp`);
    const file = existsSync(exported) ? exported : raw(key);
    const x = (i % cols) * tw;
    const y = Math.floor(i / cols) * (th + label);
    if (existsSync(file)) tiles.push({ input: await sharp(file).resize(tw, th, { fit: 'cover' }).toBuffer(), left: x, top: y + label });
    tiles.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${label}"><rect width="100%" height="100%" fill="#eee"/><text x="8" y="20" font-family="sans-serif" font-size="18">${key}${existsSync(file) ? '' : ' (missing)'}</text></svg>`),
      left: x,
      top: y,
    });
  }
  mkdirSync(SHEET_DIR, { recursive: true });
  const out = path.join(SHEET_DIR, 'roofing-sheet.jpg');
  await sharp({ create: { width: cols * tw, height: Math.ceil(keys.length / cols) * (th + label), channels: 3, background: '#ffffff' } })
    .composite(tiles).jpeg({ quality: 85 }).toFile(out);
  console.log('sheet', out);
}

const [cmd, ...args] = process.argv.slice(2);
const cmds = {
  credits: async () => console.log('credits', await credits()),
  generate: () => cmdGenerate(args),
  export: () => cmdExport(args),
  sheet: cmdSheet,
}[cmd];
if (!cmds) {
  console.log('usage: credits | generate [key ...] [--force] | export | sheet');
  process.exit(1);
}
cmds().catch((e) => { console.error(e.message || e); process.exit(1); });
