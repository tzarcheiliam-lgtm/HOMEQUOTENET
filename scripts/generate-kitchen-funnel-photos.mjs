#!/usr/bin/env node
/**
 * Generates the photos of HomeQuote Network's kitchen funnel
 * (/estimator/kitchen-remodel, experience 'funnel'): the size plans, the
 * layout x finish room photos and the follow-up option photos (cabinets,
 * island, appliances). Reproducible record of how every file in
 * public/estimator/kitchen/funnel/ was made. Same method as
 * scripts/generate-bath-funnel-photos.mjs.
 *
 * Art direction: ONE consistent Southern-California kitchen, same eye-level
 * wide camera from the dining side, same back-wall windows and daylight, same
 * walls and ceiling, so a photo swap reads as the same room with a different
 * choice. The whole room sits inside the 3:2 frame with margin (the funnel
 * shows the full photo, object-fit contain).
 * - layout-island-luxe is the one text-to-image master (kie.ai nano-banana-pro):
 *   two-tone custom cabinets (soft-white perimeter, white-oak island), quartzite,
 *   pro range + plaster hood, brass hardware, seating island with waterfall edge.
 * - Every other room photo is an image EDIT of the closest photo (FROM below),
 *   so the geometry stays identical: L / U luxe layouts from the master,
 *   standard finishes from the matching luxe layout, cabinet / island /
 *   appliance options from the master.
 * - Size photos are clean top-down plan renders on white in the same style as
 *   the bathroom size plans (plan-medium is drawn with the bathroom plan as a
 *   style reference; compact / large are edits of it), composited TO SCALE on
 *   one canvas (10 x 10, 12 x 14, 16 x 18 ft share one ft-per-pixel scale).
 * - ALIASES are options the master already shows (exported under their own key
 *   from the same raw image, no extra generation).
 * These are AI-generated example designs: the page labels them as such
 * (the label is never burned into the image).
 *
 * Usage
 *   KIE_KEY_FILE=<path> node scripts/generate-kitchen-funnel-photos.mjs credits
 *   KIE_KEY_FILE=<path> node scripts/generate-kitchen-funnel-photos.mjs generate [key ...] [--force]
 *   node scripts/generate-kitchen-funnel-photos.mjs export
 *   node scripts/generate-kitchen-funnel-photos.mjs sheet
 *   (KIE_API_KEY=... works instead of KIE_KEY_FILE; the key is read at run time, never printed.)
 *
 *   generate  runs each job in order (skips keys that already have a raw image unless
 *             --force or named) and saves RAW_DIR/<key>.png. An edit's source must exist.
 *   export    writes <key>.webp (1800 px, 3:2, < 300 KB) and <key>-sm.webp (1200 px,
 *             < 140 KB), metadata stripped, into public/estimator/kitchen/funnel/.
 *   sheet     writes SHEET_DIR/kitchen-sheet.jpg (every exported key).
 *
 * Env
 *   KITCHEN_FUNNEL_RAW_DIR    raw downloads (default <os tmpdir>/kitchen-funnel/raw).
 *   KITCHEN_FUNNEL_SHEET_DIR  contact sheet (default RAW_DIR/..).
 *   KIE_MODEL                 default nano-banana-pro.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = process.env.KITCHEN_FUNNEL_RAW_DIR || path.join(tmpdir(), 'kitchen-funnel', 'raw');
const SHEET_DIR = process.env.KITCHEN_FUNNEL_SHEET_DIR || path.join(RAW_DIR, '..');
const OUT = path.join(ROOT, 'public', 'estimator', 'kitchen', 'funnel');
const API = 'https://api.kie.ai';
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = process.env.KIE_MODEL || 'nano-banana-pro';

// ------------------------------------------------------------------ prompts

const ROOM =
  'Photorealistic, magazine-quality interior photograph (architectural-digest style) of a newly remodeled kitchen in a bright Southern California home. ' +
  'Camera: eye level (about 5 feet high), standing in the dining area looking straight at the kitchen back wall, one-point perspective, ' +
  'wide-angle lens, perfectly vertical lines. The WHOLE kitchen fits in the frame with comfortable margin: the ceiling with a little of its edge at the top, ' +
  'a strip of light wide-plank white-oak floor in the foreground at the bottom, a little of the side walls at the left and right edges; nothing important cut by the frame. ' +
  'The back wall has two tall windows, one on each side of the range hood, with soft white daylight and a glimpse of green foliage outside. ' +
  'Smooth warm-white painted walls and ceiling, recessed lights off, soft natural daylight, bright and airy, gentle shadows. ' +
  'Clean, styled, uncluttered: a wooden cutting board, a bowl of lemons, one small plant. ';
const NO = ' No people, no reflections of people or a camera, no text, no logos, no brand names, no watermark.';

const KEEP =
  ' Keep the exact same camera position, framing, perspective, lens, windows, daylight, wall paint, ceiling, floor and room size.' +
  ' Change only what is described. Photorealistic magazine-quality interior photograph, crisp natural detail, straight vertical lines.' +
  NO;

const LUXE_DESC =
  'Luxe finishes: custom inset cabinetry, the perimeter cabinets painted soft warm white, the island in rift-cut natural white oak (two-tone), ' +
  'unlacquered brushed-brass knobs and pulls, thick honed white quartzite countertops with soft grey veining and a matching full-height quartzite backsplash, ' +
  'a 48-inch stainless PRO-STYLE range with six burners and red knobs under a smooth white plaster range hood, a brushed-brass bridge faucet over an undermount sink. ';

const STANDARD =
  'Downgrade the finishes to a STANDARD, well-done builder-grade remodel while keeping the same layout, room and every cabinet run, window and appliance location: ' +
  'all cabinets become stock white SHAKER-style cabinets (including the island if there is one) with simple matte-black bar pulls, ' +
  'plain white quartz countertops with an eased edge, a white 3 x 6 inch ceramic subway-tile backsplash with light grey grout, ' +
  'a standard 30-inch freestanding stainless-steel range with a stainless over-the-range microwave above it in place of the plaster hood (plain cabinets above the microwave), ' +
  'a stainless French-door refrigerator, a simple stainless sink with a chrome pull-down faucet, no brass anywhere. Clean and new, but simple and affordable-looking.';

const PLAN =
  'Clean top-down architectural floor-plan render seen straight from above (orthographic, no perspective), in exactly the same style as this reference image: ' +
  'the walls cut at waist height as crisp thick off-white walls with a soft drop shadow, a light floor, white and soft-grey fixtures modelled in soft 3D from above, ' +
  'the whole room centered on a pure white background with generous empty margin all around, soft even studio lighting. ' +
  'No text, no dimension labels, no numbers, no arrows, no furniture outside the room, no logos, no watermark.';

/**
 * Jobs in order (an edit runs after its source). from: null = text-to-image,
 * else the key whose raw image is edited. ref: extra repo image (style reference).
 */
const JOBS = [
  {
    key: 'master-draft',
    from: null,
    draft: true,
    prompt:
      ROOM +
      'Layout: ONE long straight run of cabinets along the back wall (base cabinets and a few upper cabinets between the windows and the side walls), ' +
      'with the range centered on the back wall under its hood and the sink under the right-hand window; at the far left end of the back wall a tall built-in refrigerator column. ' +
      'In front of it, parallel to the back wall in the middle of the room, a large rectangular KITCHEN ISLAND with seating: a thick quartzite top with WATERFALL edges ' +
      'dropping to the floor at both ends, a slight overhang on the side facing the camera with three simple light-wood counter stools tucked under it. ' +
      'Two large woven pendant lights hang above the island. The island stands in the middle ground with plenty of floor around it. ' +
      LUXE_DESC +
      NO,
  },
  // The draft cut the refrigerator column at the left edge and had a dining table in the
  // foreground; the master pulls back so the whole kitchen sits inside the frame.
  {
    key: 'layout-island-luxe',
    from: 'master-draft',
    prompt:
      'Pull the camera back a few steps and widen the view slightly so the WHOLE kitchen fits inside the frame with margin: the full refrigerator column ' +
      'and a strip of the left wall visible at the left, a strip of the right wall at the right, more ceiling at the top and more of the light wood floor at the bottom. ' +
      'Remove the dining table and chairs from the foreground completely: only open wood floor in front of the island. ' +
      'Everything in the kitchen (cabinets, island, stools, pendants, hood, range, windows, materials, light) stays exactly the same.' +
      ' Same eye-level one-point perspective, straight vertical lines. Photorealistic magazine-quality interior photograph.' +
      NO,
  },
  {
    key: 'layout-l-luxe',
    from: 'layout-island-luxe',
    prompt:
      'Remove the kitchen island, its stools and the pendant lights completely so the middle of the room is open floor (same wood floor). ' +
      'Turn the kitchen into an L-SHAPED kitchen: keep the back-wall run exactly as it is, and add a second run of matching soft-white base cabinets with the same quartzite countertop ' +
      'and upper cabinets along the LEFT wall, coming toward the camera and joining the back-wall run in the left corner (the refrigerator column moves to the near end of the left run). ' +
      'The right side of the room stays open with no cabinets in front of the right window. Brushed-brass hardware throughout.' +
      KEEP,
  },
  {
    key: 'layout-u-luxe',
    from: 'layout-island-luxe',
    prompt:
      'Remove the kitchen island, its stools and the pendant lights completely. ' +
      'Turn the kitchen into a U-SHAPED kitchen: keep the back-wall run exactly as it is, and add matching soft-white base cabinets with the same quartzite countertop ' +
      'along BOTH the LEFT wall and the RIGHT wall, each coming toward the camera and joining the back-wall run in its corner, so the cabinets form a U that opens toward the camera; ' +
      'upper cabinets on the side walls; the refrigerator column at the near end of the left run. Open floor in the middle of the U. Brushed-brass hardware throughout.' +
      KEEP,
  },
  { key: 'layout-island-standard', from: 'layout-island-luxe', prompt: STANDARD + ' The island keeps its place and size but becomes a white shaker island with a plain quartz top and NO waterfall edge, with the same three stools.' + KEEP },
  { key: 'layout-l-standard', from: 'layout-l-luxe', prompt: STANDARD + KEEP },
  { key: 'layout-u-standard', from: 'layout-u-luxe', prompt: STANDARD + KEEP },

  // Cabinet options: edits of the master. cabinets-twotone = alias (the master is two-tone).
  {
    key: 'cabinets-white',
    from: 'layout-island-luxe',
    prompt:
      'Make ALL the cabinets one colour: the island cabinetry also becomes the same soft warm-white painted inset cabinetry as the perimeter, ' +
      'so the whole kitchen is all-white cabinetry with brushed-brass hardware. Everything else stays exactly the same.' +
      KEEP,
  },
  {
    key: 'cabinets-wood',
    from: 'layout-island-luxe',
    prompt:
      'Make ALL the cabinets warm natural WOOD: the perimeter base and upper cabinets, the refrigerator column panels and the island all become ' +
      'rift-cut natural white-oak inset cabinetry with a warm honey tone and visible straight grain, with brushed-brass hardware. ' +
      'The quartzite countertops, backsplash, plaster hood, range and walls stay exactly the same.' +
      KEEP,
  },

  // Island options (island layout): edits of the master. island-seating = alias.
  {
    key: 'island-prep',
    from: 'layout-island-luxe',
    prompt:
      'Replace only the island with a smaller PREP ISLAND in the same place: a compact white-oak work island with deep drawers on the camera side, ' +
      'a quartzite top with a simple squared edge and no waterfall, NO overhang and NO stools, a wooden cutting board and a bowl of lemons on top. ' +
      'Keep the two pendant lights above it.' +
      KEEP,
  },
  {
    key: 'island-sink',
    from: 'layout-island-luxe',
    prompt:
      'Move the sink into the island: in the middle of the same island add a large undermount sink with a tall brushed-brass gooseneck faucet, ' +
      'clearly visible on the island top. Keep the waterfall edges and the three stools. On the back wall, under the right window, the old sink and faucet are removed ' +
      'and replaced by plain quartzite countertop.' +
      KEEP,
  },

  // Appliance options: edits of the master. appliances-pro = alias.
  {
    key: 'appliances-stainless',
    from: 'layout-island-luxe',
    prompt:
      'Change only the appliances to a classic STAINLESS-STEEL PACKAGE: replace the pro range with a 36-inch slide-in stainless range with a black glass cooktop, ' +
      'replace the plaster hood with a slim stainless-steel chimney wall hood, and replace the built-in refrigerator column with a freestanding ' +
      'stainless-steel French-door refrigerator in the same place, with a stainless dishwasher next to the sink. Cabinets and countertops stay the same.' +
      KEEP,
  },
  {
    key: 'appliances-panel',
    from: 'layout-island-luxe',
    prompt:
      'Change only the appliances to PANEL-READY BUILT-INS that disappear into the cabinetry: the refrigerator column becomes a fully integrated built-in refrigerator ' +
      'and freezer hidden behind tall soft-white cabinet panels with long brass pulls (no visible stainless), the pro range is replaced by a flush black induction cooktop ' +
      'set into the quartzite countertop with soft-white drawers below it and a built-in wall oven, the dishwasher is hidden behind a matching cabinet panel. ' +
      'Keep the plaster hood. No visible stainless steel anywhere.' +
      KEEP,
  },

  // Size plans (to scale on one canvas at export).
  {
    key: 'plan-medium',
    from: null,
    ref: 'public/estimator/bathroom/funnel/size-full.webp',
    prompt:
      'Use the reference image ONLY for its rendering style (top-down 3D plan render on white). Draw a different room: a KITCHEN. ' +
      PLAN +
      ' The room is a rectangle 12 feet wide by 14 feet long (proportion 6:7). Inside: an L-shaped run of base cabinets with light countertops along the top wall and the left wall, ' +
      'a sink under a window on the top wall, a cooktop range on the left run, a tall refrigerator at the end of the left run, ' +
      'a small rectangular island in the middle, an open doorway on the bottom wall. One simple rectangular room only.',
  },
  {
    key: 'plan-compact-draft',
    from: 'plan-medium',
    draft: true,
    prompt:
      'Redraw this same plan render, same style, materials, lighting, wall thickness and white background, as a small square GALLEY kitchen 10 feet by 10 feet: ' +
      'two parallel straight runs of base cabinets with light countertops, one along the LEFT wall (with the sink) and one along the RIGHT wall (with the range and a refrigerator at its end), ' +
      'a clear walkway between them, NO island, an open doorway in the bottom wall and a window in the top wall. The room is a square. ' +
      'One simple room only: no closets, no extra rooms. No text, no labels, no numbers, no logos.',
  },
  // The compact draft drew its door leaf sticking out of the room; plan-compact cleans it up.
  {
    key: 'plan-compact',
    from: 'plan-compact-draft',
    prompt:
      'Edit this plan render, keeping exactly the same style, materials, lighting, wall thickness, scale and white background: ' +
      'replace the door at the bottom with a plain OPEN DOORWAY (a simple gap in the bottom wall with a thin white threshold, no door leaf), so nothing sticks out ' +
      'of the room outline; remove the white box appliance at the bottom right and continue the right-hand cabinet run with countertop to the bottom wall instead. ' +
      'Keep everything else. No text, no labels, no numbers, no logos.',
  },
  {
    key: 'plan-large',
    from: 'plan-medium',
    prompt:
      'Redraw this same plan render, same style, materials, lighting, wall thickness and white background, as a LARGE OPEN kitchen 16 feet by 18 feet ' +
      '(nearly square, slightly taller than wide, proportion 8:9): a long run of base cabinets along the top wall with a range in the middle and a sink, ' +
      'a run along the left wall with a tall refrigerator and pantry, a LARGE rectangular island with four stools in the middle of the room, ' +
      'a wide open doorway on the bottom wall. One simple rectangular room only: no closets, no extra rooms. No text, no labels, no numbers, no logos.',
  },
];

/** Options the master already shows: exported under their own key, same raw. */
const ALIASES = [
  { key: 'cabinets-twotone', raw: 'layout-island-luxe' },
  { key: 'island-seating', raw: 'layout-island-luxe' },
  { key: 'appliances-pro', raw: 'layout-island-luxe' },
];

/** Size photos: raw plan + real size, all drawn at one scale (the 18 ft side fills ~92% of the height). */
const SIZES = [
  { key: 'size-compact', raw: 'plan-compact', ft: [10, 10] },
  { key: 'size-medium', raw: 'plan-medium', ft: [12, 14] },
  { key: 'size-large', raw: 'plan-large', ft: [16, 18] },
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
    throw new Error(`kie.ai ${url} failed: ${res.status} ${JSON.stringify(json)?.slice(0, 300)}`);
  }
  return json;
}

const credits = async () => (await kie(`${API}/api/v1/chat/credit`)).data;

async function upload(file, name) {
  const buf = await sharp(file).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer();
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), `${name}.jpg`);
  form.append('uploadPath', 'kitchen-funnel');
  form.append('fileName', `${name}-${Date.now()}.jpg`);
  const data = (await kie(`${UPLOAD_API}/api/file-stream-upload`, { method: 'POST', body: form })).data ?? {};
  const url = [data.downloadUrl, data.fileUrl, data.url].find((v) => typeof v === 'string' && v.startsWith('https://'));
  if (!url) throw new Error('upload returned no URL');
  return url;
}

async function run(prompt, imageUrls) {
  const input = { prompt, aspect_ratio: '3:2', resolution: '2K', output_format: 'png' };
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

/** A plan render trimmed to the room, scaled to its real size, centered on a white 3:2 canvas. */
async function sizeCanvas(rawFile, [wFt, hFt]) {
  const CW = 2400;
  const CH = 1600;
  const pxPerFt = (CH * 0.92) / 18; // the 18 ft side of the largest room (with its shadow) fills 92% of the height
  const trimmed = await sharp(rawFile).flatten({ background: '#ffffff' }).trim({ background: '#ffffff', threshold: 18 }).toBuffer({ resolveWithObject: true });
  // Scale by the room's LONG side (the renders are not always drawn at the exact proportion).
  const tall = trimmed.info.height >= trimmed.info.width;
  const long = Math.round(Math.max(wFt, hFt) * pxPerFt);
  const room = await sharp(trimmed.data).resize(tall ? { height: long } : { width: long }).toBuffer({ resolveWithObject: true });
  return sharp({ create: { width: CW, height: CH, channels: 3, background: '#ffffff' } })
    .composite([{ input: room.data, left: Math.round((CW - room.info.width) / 2), top: Math.round((CH - room.info.height) / 2) }])
    .png()
    .toBuffer();
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
      inputs.push(await upload(raw(job.from), job.from));
    }
    if (job.ref) inputs.push(await upload(path.join(ROOT, job.ref), path.basename(job.ref, path.extname(job.ref))));
    const out = await run(job.prompt, inputs);
    await download(out, raw(job.key));
    console.log('done', job.key, `${Math.round((Date.now() - t) / 1000)}s`);
  }
  console.log('credits after', await credits());
}

const PHOTO_KEYS = () => [
  ...JOBS.filter((j) => !j.draft && !j.key.startsWith('plan-')).map((j) => ({ key: j.key, raw: j.key })),
  ...ALIASES,
];

async function cmdExport() {
  mkdirSync(OUT, { recursive: true });
  for (const { key, raw: r } of PHOTO_KEYS()) {
    if (!existsSync(raw(r))) { console.log('MISSING', key); continue; }
    const a = await webpUnder(raw(r), W, MAX_KB, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(raw(r), W_SM, MAX_KB_SM, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(24), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`);
  }
  for (const { key, raw: r, ft } of SIZES) {
    if (!existsSync(raw(r))) { console.log('MISSING', key); continue; }
    const canvas = await sizeCanvas(raw(r), ft);
    const a = await webpUnder(canvas, W, MAX_KB, path.join(OUT, `${key}.webp`));
    const b = await webpUnder(canvas, W_SM, MAX_KB_SM, path.join(OUT, `${key}-sm.webp`));
    console.log(key.padEnd(24), `${a.kb} KB q${a.q}`, `| sm ${b.kb} KB q${b.q}`, `(to scale ${ft.join(' x ')} ft)`);
  }
}

async function cmdSheet() {
  const keys = [...SIZES.map((s) => s.key), ...PHOTO_KEYS().map((p) => p.key)];
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
  const out = path.join(SHEET_DIR, 'kitchen-sheet.jpg');
  await sharp({ create: { width: cols * tw, height: Math.ceil(keys.length / cols) * (th + label), channels: 3, background: '#ffffff' } })
    .composite(tiles).jpeg({ quality: 85 }).toFile(out);
  console.log('sheet', out);
}

const [cmd, ...args] = process.argv.slice(2);
const cmds = {
  credits: async () => console.log('credits', await credits()),
  generate: () => cmdGenerate(args),
  export: cmdExport,
  sheet: cmdSheet,
}[cmd];
if (!cmds) {
  console.log('usage: credits | generate [key ...] [--force] | export | sheet');
  process.exit(1);
}
cmds().catch((e) => { console.error(e.message || e); process.exit(1); });
