#!/usr/bin/env node
/**
 * Generates the photos of HomeQuote Network's ADU funnel (/estimator/adu,
 * experience 'funnel'). Reproducible record of how every file in
 * public/estimator/adu/funnel/ was made (same method as
 * scripts/generate-kitchen-funnel-photos.mjs).
 *
 * Art direction: ONE property the homeowner builds on, like the pool funnel.
 * One Southern-California single-story house with an attached one-car garage
 * and a big empty lawn, seen by the same drone (about 40 ft up, from the back
 * corner of the lot) in the same late-afternoon light. Every photo is an image
 * EDIT of another photo of the same chain, so the house, lot, camera and light
 * never change; only what the homeowner picked does:
 *   master (the backyard today)
 *     -> size-{detached|attached}-studio   (built on the master on a painted magenta footprint, which pins its position)
 *     -> type-{detached|attached}          (= the 1 bed: that studio made wider / longer)
 *     -> size-{detached|attached}-2bed     (the 1 bed made bigger again)
 *     -> type-garage                       (the master's garage converted)
 *     -> finish-<path>-luxe                (an edit of the exact photo the size step showed: only the ADU's materials change)
 * The type step shows the 1 bed; the size step's 1 bed and the finish step's Standard reuse the file the
 * previous step showed, so a tap that changes nothing shows the same photo.
 * Prompts alone do not hold position or size for this model: the footprint marker sets where the studio
 * stands, and each bigger size grows the previous one. These are AI-generated example designs: the page
 * labels them as such.
 *
 * Usage
 *   KIE_KEY_FILE=<path> node scripts/generate-adu-funnel-photos.mjs credits
 *   KIE_KEY_FILE=<path> node scripts/generate-adu-funnel-photos.mjs generate [key ...] [--force]
 *   node scripts/generate-adu-funnel-photos.mjs export [key ...]
 *   node scripts/generate-adu-funnel-photos.mjs sheet
 *   (KIE_API_KEY=... works instead of KIE_KEY_FILE; the key is read at run time, never printed.)
 *
 * Env
 *   ADU_FUNNEL_RAW_DIR    raw downloads (default <os tmpdir>/adu-funnel/raw).
 *   ADU_FUNNEL_SHEET_DIR  contact sheet (default RAW_DIR/..).
 *   KIE_MODEL             default nano-banana-pro.   KIE_RESOLUTION  default 2K.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = process.env.ADU_FUNNEL_RAW_DIR || path.join(tmpdir(), 'adu-funnel', 'raw');
const SHEET_DIR = process.env.ADU_FUNNEL_SHEET_DIR || path.join(RAW_DIR, '..');
const OUT = path.join(ROOT, 'public', 'estimator', 'adu', 'funnel');
const API = 'https://api.kie.ai';
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = process.env.KIE_MODEL || 'nano-banana-pro';
const RESOLUTION = process.env.KIE_RESOLUTION || '2K';

// ------------------------------------------------------------------ prompts

const SCENE =
  'Photorealistic drone photograph of a single-story Southern California ranch house and its large backyard in a quiet suburban neighborhood. ' +
  'Camera: a drone about 40 feet up above the back corner of the lot, looking down at about 40 degrees across the whole backyard toward the back of the house, ' +
  'wide lens, the lot square to the frame. Warm late-afternoon sun from the right, soft shadows, clear sky at the very top edge. ' +
  'The back of the house runs across the top third of the frame: light grey stucco, white trim, a low-pitched dark grey shingle hip roof, a sliding glass door onto a small concrete patio with a table and chairs at the left. ' +
  'At the right side of the lot stands a detached single-car garage with the same stucco and roof and a white roll-up garage door, a concrete driveway running past it along the right edge. ' +
  'The rest of the backyard is a large, flat, EMPTY green lawn filling the middle and bottom of the frame (room for a small house), framed by a light-wood horizontal-slat fence, ' +
  'a few mature trees and the neighbors\' roofs beyond. The whole house back, the garage, the lawn and the fence fit in the frame. No people, no text, no watermark.';

const KEEP =
  ' Keep EVERYTHING else exactly the same as the input photo: the same camera position, angle and lens, the same main house, garage, fence, trees, ' +
  'driveway, sky and late-afternoon light, the same framing. Photorealistic, no people, no text, no watermark.';

const STANDARD_ADU =
  'clean standard finishes: smooth light grey stucco matching the house, white vinyl windows, a simple dark grey shingle gable roof, a white fiberglass entry door, ' +
  'a small concrete landing and a simple concrete path from the patio.';

/** Footprints (1200 x 800 frame of the master): detached on the open lawn, attached off the back wall between the patio and the garage. */
const FOOTPRINT = {
  detached: {
    studio: [[380, 600], [640, 600], [655, 720], [365, 720]],
    '1bed': [[320, 590], [720, 590], [740, 740], [300, 740]],
    '2bed': [[260, 575], [790, 575], [815, 775], [235, 775]],
  },
  attached: {
    studio: [[500, 408], [710, 408], [714, 520], [496, 520]],
    '1bed': [[470, 408], [740, 408], [748, 580], [462, 580]],
    '2bed': [[440, 408], [760, 408], [772, 640], [428, 640]],
  },
};

const SIZE_WORDS = {
  studio: 'a compact studio of about 400 square feet with the entry door and one window facing the camera',
  '1bed': 'a one-bedroom of about 600 square feet with the entry door and two windows facing the camera',
  '2bed': 'a two-bedroom of about 800 square feet with the entry door and three windows facing the camera',
};

const BUILD_DETACHED = (size) =>
  'The first image is a backyard with a solid magenta area painted on the lawn. Build a new single-story detached backyard ADU, ' + SIZE_WORDS[size] +
  ', whose footprint covers EXACTLY the magenta area: its walls rise straight up from the edges of the magenta shape (about 10 feet tall to the eaves, seen from above with its roof clearly visible), ' +
  'it stands free on the lawn with grass around it, separate from the house and the garage. Remove all magenta. ';
const BUILD_ATTACHED = (size) =>
  'The first image is a backyard with a solid magenta area painted against the back of the house. Build a new single-story addition to the house, ' + SIZE_WORDS[size] +
  ', whose footprint covers EXACTLY the magenta area: it is joined to the back wall of the house, its walls rise from the edges of the magenta shape, ' +
  'its roof ties into the house roof. Remove all magenta. ';

const TYPE = {
  detached: BUILD_DETACHED('1bed') + STANDARD_ADU,
  garage:
    'Edit the photo: convert the garage at the right into a studio ADU (about 400 square feet) without changing its size, footprint or roof: ' +
    'the roll-up garage door is replaced by a stucco wall with a white entry door and a wide white vinyl window, matching stucco, a small concrete landing, ' +
    'a narrow planter strip in front, the driveway end becomes a small paved patio. ' + STANDARD_ADU,
  attached: BUILD_ATTACHED('1bed') + STANDARD_ADU,
};

const LUXE =
  'Change ONLY the materials of the new ADU. Its footprint, size, position on the lawn, outline, roof shape and height, and its size in the frame stay EXACTLY the same ' +
  '(do not move it, enlarge it or bring it closer). New luxe materials: vertical warm cedar wood siding with smooth white stucco accents, ' +
  'large black-framed windows, a black-framed glass entry door, a black standing-seam metal roof, a small composite wood deck at the entry with modern black wall sconces lit warmly, ' +
  'and low drought-tolerant planting with a pale stone path. The main house keeps its light grey stucco and grey shingle roof, and the garage keeps its stucco, roof and ' +
  'roll-up door: neither is re-sided or re-roofed. The fence and lawn stay as they are.';
const LUXE_GARAGE =
  'Change ONLY the materials of the converted garage ADU. Its footprint, size, position, outline, roof shape and height stay EXACTLY the same. New luxe materials: vertical warm cedar wood siding with smooth white stucco accents, ' +
  'large black-framed windows, a black-framed glass entry door, a black standing-seam metal roof, a small composite wood deck at the entry with modern black wall sconces lit warmly, ' +
  'and low drought-tolerant planting. The main house keeps its light grey stucco and grey shingle roof. The camera, framing, fence, lawn and driveway stay exactly as they are.';

/**
 * Every job edits the photo the previous funnel step showed (`from`).
 * Order matters: a job's source must already exist.
 */
const GROW_1BED =
  'Edit the photo: make the new ADU about TWICE AS WIDE (a one-bedroom of about 600 square feet): extend it to the left and right on the lawn so its long side faces the camera, ' +
  'with the roof ridge now running left to right, the entry door in the middle and one window on each side of it. Same front line, same height, same stucco, windows, door, trim and roof; ' +
  'the house, garage, fence and lawn around it stay the same.';
const GROW_2BED =
  'Edit the photo: make the new ADU about HALF AGAIN AS WIDE (a two-bedroom of about 800 square feet): extend it further to the left and right on the lawn, ' +
  'adding one more window, the entry door still facing the camera. Same front line, same height, same stucco, windows, door, trim and roof; the house, garage, fence and lawn stay the same.';
const KEEP_GARAGE =
  ' The garage at the right with its white roll-up garage door, and the driveway, stay EXACTLY as they are and fully visible: the addition grows out into the lawn, never over the garage.';
const GROW_ATTACHED_1BED =
  'Edit the photo: make the new addition about TWICE AS LONG (a one-bedroom of about 600 square feet): it reaches further out from the back of the house into the lawn toward the camera, ' +
  'adding one more window on its side. Same width, height, stucco, windows, door, trim and roof; the house, fence and lawn stay the same.' + KEEP_GARAGE;
const GROW_ATTACHED_2BED =
  'Edit the photo: make the new addition about HALF AGAIN AS BIG (a two-bedroom of about 800 square feet): it reaches further out into the lawn toward the camera and a little wider, ' +
  'adding one more window. Same height, stucco, windows, door, trim and roof; the house, fence and lawn stay the same.' + KEEP_GARAGE;

/**
 * Every job edits the photo the funnel showed one step earlier, or the next-smaller size of the same building
 * (studio -> 1 bed -> 2 bed), so the building, lot, camera and light never change. Order matters.
 */
const JOBS = [
  // draft: the backyard before; only an edit source, never shown.
  { key: 'master', prompt: SCENE, draft: true },
  // Build type: the studio is built on the master (footprint), the 1 bed (the type photo) is that studio made wider.
  { key: 'size-detached-studio', from: 'master', footprint: FOOTPRINT.detached.studio, prompt: BUILD_DETACHED('studio') + STANDARD_ADU + KEEP },
  { key: 'type-detached', from: 'size-detached-studio', prompt: GROW_1BED + KEEP },
  { key: 'size-detached-2bed', from: 'type-detached', prompt: GROW_2BED + KEEP },
  { key: 'size-attached-studio', from: 'master', footprint: FOOTPRINT.attached.studio, prompt: BUILD_ATTACHED('studio') + STANDARD_ADU + KEEP },
  { key: 'type-attached', from: 'size-attached-studio', prompt: GROW_ATTACHED_1BED + KEEP },
  { key: 'size-attached-2bed', from: 'type-attached', prompt: GROW_ATTACHED_2BED + KEEP },
  { key: 'type-garage', from: 'master', prompt: TYPE.garage + KEEP },
  // Luxe: edits of the exact photo the size step showed (Standard = that photo itself).
  { key: 'finish-detached-1bed-luxe', from: 'type-detached', prompt: LUXE + KEEP },
  { key: 'finish-detached-studio-luxe', from: 'size-detached-studio', prompt: LUXE + KEEP },
  { key: 'finish-detached-2bed-luxe', from: 'size-detached-2bed', prompt: LUXE + KEEP },
  { key: 'finish-attached-1bed-luxe', from: 'type-attached', prompt: LUXE + KEEP },
  { key: 'finish-attached-studio-luxe', from: 'size-attached-studio', prompt: LUXE + KEEP },
  { key: 'finish-attached-2bed-luxe', from: 'size-attached-2bed', prompt: LUXE + KEEP },
  { key: 'finish-garage-luxe', from: 'type-garage', prompt: LUXE_GARAGE + KEEP },
];

/**
 * No aliases: a step whose pick changes nothing (the size step's 1 bed, the finish step's Standard) points at
 * the file the previous step showed (content/estimators/homequote-adu-funnel.ts), so no duplicate files ship.
 */
const ALIASES = [];

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
    throw new Error(`kie.ai ${url} failed: ${res.status} ${JSON.stringify(json)?.slice(0, 300)}`);
  }
  return json;
}

const credits = async () => (await kie(`${API}/api/v1/chat/credit`)).data;

async function upload(file, name) {
  const buf = await sharp(file).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), `${name}.jpg`);
  form.append('uploadPath', 'adu-funnel');
  form.append('fileName', `${name}-${Date.now()}.jpg`);
  const data = (await kie(`${UPLOAD_API}/api/file-stream-upload`, { method: 'POST', body: form })).data ?? {};
  const url = [data.downloadUrl, data.fileUrl, data.url].find((v) => typeof v === 'string' && v.startsWith('https://'));
  if (!url) throw new Error('upload returned no URL');
  return url;
}

/**
 * The source photo with the new building's footprint painted on the lawn in solid magenta
 * (`quad`: four [x, y] corners in a 1200 x 800 frame, scaled to the photo). The model is told to build
 * exactly on it, which pins the building's position and size (prompts alone drift).
 */
async function withFootprint(file, quad) {
  const { width, height } = await sharp(file).metadata();
  const pts = quad.map(([x, y]) => `${Math.round((x * width) / 1200)},${Math.round((y * height) / 800)}`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><polygon points="${pts}" fill="#ff00ff"/></svg>`;
  const out = path.join(RAW_DIR, `_marked-${path.basename(file)}`);
  await sharp(file).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
  return out;
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
  for (const job of JOBS) {
    const named = only.includes(job.key);
    if (only.length && !named) continue;
    if (existsSync(raw(job.key)) && !force && !named) { console.log('skip', job.key); continue; }
    const t = Date.now();
    const inputs = [];
    if (job.from) {
      if (!existsSync(raw(job.from))) throw new Error(`${job.key}: source ${job.from} has no raw image yet`);
      inputs.push(await upload(job.footprint ? await withFootprint(raw(job.from), job.footprint) : raw(job.from), job.from));
    }
    if (job.styleFrom) {
      if (!existsSync(raw(job.styleFrom))) throw new Error(`${job.key}: style source ${job.styleFrom} has no raw image yet`);
      inputs.push(await upload(raw(job.styleFrom), job.styleFrom));
    }
    if (job.ref) inputs.push(await upload(path.join(ROOT, job.ref), path.basename(job.ref, path.extname(job.ref))));
    // refRaw: another raw key used only as a style reference (a new kitchen in the same house).
    if (job.refRaw) {
      if (!existsSync(raw(job.refRaw))) throw new Error(`${job.key}: reference ${job.refRaw} has no raw image yet`);
      inputs.push(await upload(raw(job.refRaw), job.refRaw));
    }
    const out = await run(job.prompt, inputs);
    await download(out, raw(job.key));
    console.log('done', job.key, `${Math.round((Date.now() - t) / 1000)}s`);
  }
  console.log('credits after', await credits());
}

const PHOTO_KEYS = () => [
  ...JOBS.filter((j) => !j.draft).map((j) => ({ key: j.key, raw: j.key })),
  ...ALIASES,
];

async function cmdExport(only = []) {
  mkdirSync(OUT, { recursive: true });
  for (const { key, raw: r } of PHOTO_KEYS()) {
    if (only.length && !only.includes(key)) continue;
    if (!existsSync(raw(r))) { console.log('MISSING', key); continue; }
    const a = await webpUnder(raw(r), W, MAX_KB, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(raw(r), W_SM, MAX_KB_SM, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(24), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`);
  }

}

async function cmdSheet() {
  const keys = PHOTO_KEYS().map((p) => p.key);
  const tw = 600;
  const th = 400;
  const label = 28;
  const cols = 3;
  const tiles = [];
  for (const [i, key] of keys.entries()) {
    const file = path.join(OUT, `${key}-sm.webp`);
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
  const out = path.join(SHEET_DIR, 'adu-sheet.jpg');
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
