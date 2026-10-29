#!/usr/bin/env node
/**
 * Generates the photos of HomeQuote Network's bathroom funnel
 * (/estimator/bathroom-remodel, experience 'funnel'): the size plans, the
 * layout x finish room photos and the follow-up option photos (shower, tub,
 * vanity). Reproducible record of how every file in
 * public/estimator/bathroom/funnel/ was made.
 *
 * Art direction: ONE consistent Southern-California primary bathroom, same
 * straight-on eye-level wide-angle camera, same window and daylight, same
 * walls, so a photo swap reads as the same room with a different choice.
 * - layout-spa-luxe is the one text-to-image master (kie.ai nano-banana-pro).
 * - Every other room photo is an image EDIT of the closest photo (FROM below),
 *   so the geometry stays identical: luxe layouts from the master, standard
 *   finishes from the matching luxe layout, shower options from
 *   layout-walkin-luxe, tub and vanity options from layout-spa-luxe.
 * - Size photos are clean top-down plan renders on white (size-full is
 *   text-to-image, guest/primary are edits of it), composited TO SCALE on one
 *   canvas (5 x 8, 8 x 10, 12 x 14 ft share one ft-per-pixel scale).
 * - ALIASES are options the master already shows (exported under their own key
 *   from the same raw image, no extra generation).
 * These are AI-generated example designs: the page labels them as such
 * (the label is never burned into the image).
 *
 * Usage
 *   KIE_KEY_FILE=<path> node scripts/generate-bath-funnel-photos.mjs credits
 *   KIE_KEY_FILE=<path> node scripts/generate-bath-funnel-photos.mjs generate [key ...] [--force]
 *   node scripts/generate-bath-funnel-photos.mjs export
 *   node scripts/generate-bath-funnel-photos.mjs sheet
 *   (KIE_API_KEY=... works instead of KIE_KEY_FILE; the key is read at run time, never printed.)
 *
 *   generate  runs each job in order (skips keys that already have a raw image unless
 *             --force or named) and saves RAW_DIR/<key>.png. An edit's source must exist.
 *   export    writes <key>.webp (1800 px, 3:2, < 300 KB) and <key>-sm.webp (1200 px,
 *             < 140 KB), metadata stripped, into public/estimator/bathroom/funnel/.
 *   sheet     writes SHEET_DIR/bath-funnel-sheet.jpg (every exported key).
 *
 * Env
 *   BATH_FUNNEL_RAW_DIR    raw downloads (default <os tmpdir>/bath-funnel/raw).
 *   BATH_FUNNEL_SHEET_DIR  contact sheet (default RAW_DIR/..).
 *   KIE_MODEL              default nano-banana-pro.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = process.env.BATH_FUNNEL_RAW_DIR || path.join(tmpdir(), 'bath-funnel', 'raw');
const SHEET_DIR = process.env.BATH_FUNNEL_SHEET_DIR || path.join(RAW_DIR, '..');
const OUT = path.join(ROOT, 'public', 'estimator', 'bathroom', 'funnel');
const API = 'https://api.kie.ai';
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = process.env.KIE_MODEL || 'nano-banana-pro';

// ------------------------------------------------------------------ prompts

const ROOM =
  'Photorealistic, magazine-quality interior photograph (architectural-digest style) of a newly remodeled bathroom in a bright Southern California home. ' +
  'Camera: straight-on, eye level (about 5 feet high) from the doorway, one-point perspective, wide-angle lens, perfectly vertical lines, looking at the back wall. ' +
  'The back wall has one large window centered high on the wall with soft white daylight coming through sheer linen, a glimpse of green foliage outside. ' +
  'Smooth warm-white painted walls above the tile, a light ceiling with recessed lights off, soft natural daylight, bright and airy, gentle shadows. ' +
  'The LEFT wall holds the vanity and mirrors, seen in perspective. Clean, styled, uncluttered: a folded white towel, one small plant. ';
const NO = ' No people, no reflections of people or a camera, no text, no logos, no brand names, no watermark.';

const KEEP =
  ' Keep the exact same camera position, framing, perspective, lens, window, daylight, wall paint, ceiling and room size.' +
  ' Change only what is described. Photorealistic magazine-quality interior photograph, crisp natural detail, straight vertical lines.' +
  NO;

const LUXE_FINISH =
  'Luxe finishes: large-format 24 x 48 inch warm light-grey porcelain tile on the floor and on the wet walls, ' +
  'brushed brass faucets, shower fixtures and hardware, quartz countertops in soft white. ';

const STANDARD =
  'Downgrade the finishes to a STANDARD builder-grade remodel while keeping the same layout and every fixture in the same place: ' +
  'glossy white 3 x 6 inch ceramic subway tile on the wet walls, small 12 x 12 inch light-grey ceramic floor tile with visible grout lines, ' +
  'all faucets, shower fixtures, handles and hardware in polished CHROME (no brass anywhere), ' +
  'the vanity becomes a stock white shaker-style cabinet standing on the floor (two sinks) with a white cultured-marble top, ' +
  'simple rectangular frameless mirrors and plain chrome wall lights. Clean and new, but simple and affordable-looking.';

const PLAN =
  'Clean top-down architectural floor-plan render of a bathroom seen straight from above (orthographic, no perspective), ' +
  'Buildoly-style 3D plan: the walls cut at waist height as crisp thick off-white walls with a soft drop shadow, ' +
  'light warm-grey large-format tile floor, white fixtures modelled in soft 3D from above, a door opening with a thin door swing, ' +
  'the whole room centered on a pure white background with generous empty margin all around, soft even studio lighting. ' +
  'No text, no dimension labels, no numbers, no arrows, no furniture outside the room, no logos, no watermark.';

/**
 * Jobs in order (an edit runs after its source). from: null = text-to-image,
 * else the key whose raw image is edited.
 */
const JOBS = [
  {
    key: 'layout-spa-luxe',
    from: null,
    prompt:
      ROOM +
      'This is a spacious primary-suite SPA BATH: on the back wall a sculptural white freestanding oval soaking tub stands centered under the window ' +
      'with a brushed-brass floor-mounted tub filler beside it, and to the RIGHT of the tub a walk-in shower behind a single clear frameless glass panel ' +
      'with a brushed-brass rain shower head and a recessed niche. On the left wall a floating walnut double vanity with two undermount sinks, ' +
      'a white quartz top, two round brass-framed mirrors and brass sconces. ' +
      LUXE_FINISH +
      NO,
  },
  {
    key: 'layout-walkin-luxe',
    from: 'layout-spa-luxe',
    prompt:
      'Remove the freestanding bathtub, its tub filler AND the existing single glass panel completely (no old glass may remain anywhere). ' +
      'The whole back of the room becomes ONE large walk-in shower: tiled floor and walls in the same large warm light-grey porcelain tile, ' +
      'enclosed by ONE straight wall of clear frameless glass running parallel to the back wall about four feet in front of it, from just past the end of the vanity ' +
      'to the right wall, with a frameless glass door with a slim brushed-brass handle near the right end, on a low 2-inch curb in the same tile. ' +
      'Inside: the brushed-brass rain shower head and hand shower and the recessed niche on the right wall. No glass inside the shower, no second panel. ' +
      'Keep the floating walnut double vanity, the mirrors and the sconces on the left wall exactly as they are.' +
      KEEP,
  },
  {
    key: 'layout-combo-luxe',
    from: 'layout-spa-luxe',
    prompt:
      'Replace the freestanding bathtub AND the walk-in shower with one built-in alcove TUB AND SHOWER COMBO spanning the whole back wall under the window: ' +
      'a white rectangular built-in bathtub with a tiled apron front, tiled walls around it in the same large warm light-grey porcelain tile, ' +
      'a brushed-brass shower head and valve on the wall above the tub, and one fixed clear frameless glass panel on the tub edge. ' +
      'Keep the floating walnut double vanity, the mirrors and the sconces on the left wall exactly as they are.' +
      KEEP,
  },
  { key: 'layout-spa-standard', from: 'layout-spa-luxe', prompt: STANDARD + ' The freestanding tub becomes a plain white acrylic freestanding tub with a chrome filler; the shower glass gets a thin chrome frame.' + KEEP },
  { key: 'layout-walkin-standard', from: 'layout-walkin-luxe', prompt: STANDARD + ' The shower enclosure gets a thin chrome-framed glass door.' + KEEP },
  { key: 'layout-combo-standard', from: 'layout-combo-luxe', prompt: STANDARD + ' The tub becomes a standard white enamel alcove tub; the frameless glass panel becomes ONE fixed clear glass panel with a thin polished-chrome frame in exactly the same place; no sliding door, no rail.' + KEEP },

  // Shower options (walk-in and spa bath): edits of the luxe walk-in. shower-frameless = alias.
  {
    key: 'shower-curbless',
    from: 'layout-walkin-luxe',
    prompt:
      'Make the walk-in shower CURBLESS: remove the curb and the glass door so the same porcelain floor tile runs flat and continuous from the bathroom ' +
      'straight into the shower with a slim linear brass drain along the back wall; keep only one fixed clear frameless glass panel and leave a wide open entry, no door.' +
      KEEP,
  },
  {
    key: 'shower-bench',
    from: 'layout-walkin-luxe',
    prompt:
      'Inside the same walk-in shower add a built-in floating BENCH along the right wall, topped with a thick white quartz slab, ' +
      'and a long wide recessed niche lit with a warm LED strip on the back wall at shoulder height holding two neat bottles without labels; ' +
      'keep the frameless glass enclosure and door.' +
      KEEP,
  },

  // Tub options (spa bath): edits of the luxe spa bath. tub-soaking = alias.
  {
    key: 'tub-clawfoot',
    from: 'layout-spa-luxe',
    prompt:
      'Replace only the freestanding oval tub with a classic white cast-iron CLAWFOOT tub with a rolled rim standing on four brushed-brass claw feet, ' +
      'in exactly the same place under the window, with the same brushed-brass floor-mounted tub filler.' +
      KEEP,
  },
  {
    key: 'tub-stone',
    from: 'layout-spa-luxe',
    prompt:
      'Replace only the freestanding oval tub with a SCULPTED STONE tub: a solid freestanding tub carved from one block of honed pale travertine stone, ' +
      'soft organic rounded shape with a visible natural stone texture, in exactly the same place under the window, with the same brushed-brass floor-mounted tub filler.' +
      KEEP,
  },

  // Vanity options (full bath and primary suite): edits of the luxe spa bath. vanity-floating = alias.
  {
    key: 'vanity-single',
    from: 'layout-spa-luxe',
    prompt:
      'Make the vanity on the left wall a SINGLE vanity: shorten the floating walnut vanity to about half its length, keeping only the part nearest the back wall, ' +
      'with exactly ONE undermount sink and ONE brass faucet centered under the round brass mirror nearest the window, with its two sconces. ' +
      'Remove the near sink, the near faucet and the near mirror at the left edge of the frame; the freed part of the left wall is plain warm-white painted wall above the bare tile floor. ' +
      'Exactly one sink, one faucet and one mirror in the whole room.' +
      KEEP,
  },
  {
    key: 'vanity-double',
    from: 'layout-spa-luxe',
    prompt:
      'On the left wall replace the floating vanity with a furniture-style DOUBLE vanity that stands on the floor: a long white oak cabinet on slim legs ' +
      'with drawers, two undermount sinks in a white quartz top, keeping the two round brass-framed mirrors and the sconces.' +
      KEEP,
  },

  // Size plans (to scale on one canvas at export).
  // The draft (text-to-image) had a stray empty closet and an odd door; plan-full cleans it up as an edit.
  {
    key: 'plan-draft',
    from: null,
    prompt:
      PLAN +
      ' The room is a rectangle 8 feet wide by 10 feet long (proportion 4:5). Inside: a 5-foot built-in bathtub with shower across the short top wall, ' +
      'a single vanity with a sink on the left wall, a toilet on the right wall, the door on the bottom wall.',
  },
  {
    key: 'plan-full',
    from: 'plan-draft',
    prompt:
      'Edit this plan render, keeping exactly the same style, materials, lighting, wall thickness, scale and white background: ' +
      'remove the small empty compartment at the top right and the short wall that separates it, so the room is ONE simple rectangle; ' +
      'the built-in bathtub with shower spans the full width of the top wall. Redraw the door on the bottom wall as a plain hinged door: ' +
      'a thin door leaf opened 90 degrees into the room with a thin quarter-circle swing arc. Keep the vanity and the toilet. ' +
      'No closets, no empty compartments, no text, no labels, no numbers, no logos.',
  },
  {
    key: 'plan-guest',
    from: 'plan-full',
    prompt:
      'Redraw this same plan render, same style, materials, lighting, wall thickness, scale and white background, as a SMALLER and much NARROWER hall bathroom 5 feet wide by 8 feet long: ' +
      'the room is a tall narrow rectangle whose width is only five eighths of its height (clearly narrower than now). ' +
      'A 5-foot tub with shower spans the short top wall from wall to wall; a small single vanity and then a toilet stand one after the other along the LEFT long wall; ' +
      'the door on the bottom wall drawn as a thin door leaf with a quarter-circle swing. Exactly one toilet, one sink, one tub. ' +
      'One simple rectangular room only: no closets, no empty compartments, no extra rooms. No text, no labels, no numbers, no logos.',
  },
  {
    key: 'plan-primary',
    from: 'plan-full',
    prompt:
      'Redraw this same plan render, same style, materials, lighting, wall thickness, scale and white background, as a LARGE primary-suite bathroom 12 feet by 14 feet ' +
      '(nearly square, proportion 6:7): a freestanding oval soaking tub against the top wall, a glass walk-in shower in the top-right corner, ' +
      'a long double vanity with two sinks along the left wall, EXACTLY ONE toilet against the right wall, the door on the bottom wall drawn as a thin door leaf with a quarter-circle swing. ' +
      'Exactly one toilet, one tub, one shower. One simple rectangular room only: no closets, no water-closet nook, no empty compartments, no extra rooms. ' +
      'No text, no labels, no numbers, no logos.',
  },
];

/** Options the master (or another raw) already shows: exported under their own key, same raw. */
const ALIASES = [
  { key: 'shower-frameless', raw: 'layout-walkin-luxe' },
  { key: 'tub-soaking', raw: 'layout-spa-luxe' },
  { key: 'vanity-floating', raw: 'layout-spa-luxe' },
];

/** Size photos: raw plan + real size, all drawn at one scale (the 12 x 14 plan fills ~92% of the height). */
const SIZES = [
  { key: 'size-guest', raw: 'plan-guest', ft: [5, 8] },
  { key: 'size-full', raw: 'plan-full', ft: [8, 10] },
  { key: 'size-primary', raw: 'plan-primary', ft: [12, 14] },
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
  const buf = await sharp(file).jpeg({ quality: 95 }).toBuffer();
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), `${name}.jpg`);
  form.append('uploadPath', 'bath-funnel');
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
  const pxPerFt = (CH * 0.92) / 14; // the 14 ft side of the largest room (with its shadow) fills 92% of the height
  const trimmed = await sharp(rawFile).flatten({ background: '#ffffff' }).trim({ background: '#ffffff', threshold: 18 }).toBuffer({ resolveWithObject: true });
  // Scale by the room's LONG side (the plan renders are not all drawn at the exact
  // 5:8 / 6:7 proportion, so matching both sides would shrink the narrow room).
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
    let inputs = [];
    if (job.from) {
      if (!existsSync(raw(job.from))) throw new Error(`${job.key}: source ${job.from} has no raw image yet`);
      inputs = [await upload(raw(job.from), job.from)];
    }
    const out = await run(job.prompt, inputs);
    await download(out, raw(job.key));
    console.log('done', job.key, `${Math.round((Date.now() - t) / 1000)}s`);
  }
  console.log('credits after', await credits());
}

const PHOTO_KEYS = () => [
  ...JOBS.filter((j) => !j.key.startsWith('plan-')).map((j) => ({ key: j.key, raw: j.key })),
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
  const out = path.join(SHEET_DIR, 'bath-funnel-sheet.jpg');
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
