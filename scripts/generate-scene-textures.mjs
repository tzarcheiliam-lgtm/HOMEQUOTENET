#!/usr/bin/env node
/**
 * Generates the textures, sprites and photo exports behind the live pool
 * scene (lib/estimator/scene/textures.ts). Reproducible record of how every
 * file in public/estimator/scene/ was made: prompts, model, reference
 * patches and post-processing options all live in JOBS below.
 *
 * Usage
 *   KIE_API_KEY=... node scripts/generate-scene-textures.mjs credits
 *   KIE_API_KEY=... node scripts/generate-scene-textures.mjs generate [id ...] [--force]
 *   node scripts/generate-scene-textures.mjs post [id ...]
 *   node scripts/generate-scene-textures.mjs photos <owner-photos-dir>
 *   node scripts/generate-scene-textures.mjs preview
 *
 *   generate  asks kie.ai for each job's raw image (skips ids that already
 *             have one unless --force) and downloads it to SCENE_RAW_DIR.
 *   post      turns raw images into the served files with
 *             scripts/scene-assets.py (numpy + Pillow): flatten lighting,
 *             colour-balance, make seamless (offset + minimal-seam cut) and
 *             export WebP for textures; chroma-key, despill and trim for
 *             sprites. water_caustics is procedural and needs no API call.
 *   photos    re-exports the owner's Pool Masters job photos (used with
 *             permission) into public/estimator/pool-masters/ with all
 *             metadata stripped.
 *   preview   writes 3x3 tile previews and sprites-on-grey sheets to
 *             SCENE_RAW_DIR/previews for a visual check.
 *
 * Env
 *   KIE_API_KEY    kie.ai key (generate / credits only). Never commit it.
 *   SCENE_RAW_DIR  where raw downloads, reference crops and previews go
 *                  (default: <os tmpdir>/pool-scene-assets). Not served.
 *   PYTHON         python3 binary (default python3).
 *
 * After `post`, copy any changed footprint (sprites print their trimmed
 * aspect) and the printed mean colour into lib/estimator/scene/textures.ts.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const RAW_DIR = process.env.SCENE_RAW_DIR || path.join(tmpdir(), 'pool-scene-assets');
const PUBLIC = path.join(ROOT, 'public', 'estimator', 'scene');
const PHOTOS = path.join(ROOT, 'public', 'estimator', 'pool-masters');
const HELPER = path.join(ROOT, 'scripts', 'scene-assets.py');
const PYTHON = process.env.PYTHON || 'python3';
const API = 'https://api.kie.ai';
// kie.ai serves file uploads (reference patches, kept 3 days) from a separate host.
const UPLOAD_API = 'https://kieai.redpandaai.co';
const MODEL = 'nano-banana-2';

// ------------------------------------------------------------------ prompts

const TEXTURE_RULES =
  'Seamless tileable material texture for a top-down site plan. Photographed perfectly straight down ' +
  '(orthographic, camera parallel to the ground); the material fills the entire square frame edge to edge. ' +
  'Bright, even Southern California daylight: no cast shadows, no vignetting, no glare, no perspective, ' +
  'no horizon, no objects, no people, no text, no border. Photorealistic, crisp detail, true-to-life scale.';

const REF_NOTE =
  ' Match the material, colour and finish of the reference photo (a Pool Masters job), ' +
  'but show it flat from directly above as a clean texture swatch.';

const SPRITE_RULES =
  'Seen from directly above (top-down orthographic drone view, camera pointing straight down), ' +
  'one single object, centered and entirely inside the frame with a generous empty margin on every side ' +
  '(the object fills about 75% of the frame), isolated on a perfectly flat, uniform, ' +
  'pure magenta (#FF00FF) background. No shadow, no ground, no other objects, no text. ' +
  'Bright even Southern California daylight, photorealistic product-photo detail.';

/** Reference patches, cropped from the exported job photos: [photo, "x,y,w,h"]. */
const REFS = {
  pavers: ['overhead-pool-turf-bands-pavers.webp', '1090,800,230,230'],
  turf: ['overhead-pool-turf-bands-pavers.webp', '1380,640,210,210'],
  wood: ['overhead-pool-turf-bands-pavers.webp', '130,560,260,200'],
  lounger: ['overhead-pool-turf-bands-pavers.webp', '640,400,240,200'],
  umbrella: ['overhead-pool-turf-bands-pavers.webp', '1230,400,320,230'],
};

/**
 * kind texture: post options map to scene-assets.py `texture` flags.
 * kind sprite:  post options map to `sprite` flags.
 */
const JOBS = [
  // Pool interior (the water layer tints these).
  {
    id: 'floor_plaster', kind: 'texture', aspect: '1:1',
    prompt: 'Drained swimming-pool floor finished in bright white marcite plaster: smooth troweled surface with very subtle soft gray-white mottling and faint trowel marks. The frame covers 6 x 6 ft.',
    post: { target: '#eef1f0', flatten: 0.9 },
  },
  {
    id: 'floor_quartz', kind: 'texture', aspect: '1:1',
    prompt: 'Swimming-pool floor in a light blue quartz aggregate plaster finish: smooth surface with fine speckles of white, pale blue and soft gray quartz crystals, very uniform. The frame covers 6 x 6 ft.',
    post: { target: '#d6e4ea' },
  },
  {
    id: 'floor_pebble', kind: 'texture', aspect: '1:1',
    prompt: 'Swimming-pool floor in an exposed pebble finish: densely packed small smooth rounded pebbles about a quarter inch each, a blend of slate blue, gray, white and a little tan, set flush in cement and polished, very uniform. The frame covers 4 x 4 ft.',
    post: { target: '#8c9aa3' },
  },
  // Waterline tile.
  {
    id: 'tile_porcelain', kind: 'texture', aspect: '1:1',
    prompt: 'Swimming-pool waterline tile: 6 x 6 inch glazed porcelain tiles in a deep blue-teal with subtle tonal variation, thin light gray grout lines, perfectly straight square grid. The frame covers exactly 3 x 3 ft, so exactly 6 x 6 tiles.',
    // Crops below are whole numbers of tiles between grout-line centres (measured on the
    // raw image), so the grid repeats without a doubled joint at the tile edge.
    post: { target: '#2f6478', flatten: 0.6, crop: '167,169,686,686' },
  },
  {
    id: 'tile_glass', kind: 'texture', aspect: '1:1',
    prompt: '1 x 1 inch glass mosaic pool tile: iridescent blend of aqua, turquoise, cobalt blue and a few silver-white pieces, glossy, thin white grout, perfectly straight square grid. The frame covers exactly 2 x 2 ft, so exactly 24 x 24 tiles.',
    post: { target: '#3f8fae', flatten: 0.6, crop: '66,64,891,891' },
  },
  {
    id: 'tile_stone', kind: 'texture', aspect: '1:1',
    prompt: 'Natural stone waterline tile: honed charcoal and gray slate tiles, 6 x 6 inch, natural cleft texture and gentle colour variation, thin grout, perfectly straight square grid. The frame covers exactly 3 x 3 ft, so exactly 6 x 6 tiles.',
    post: { target: '#5d605f', flatten: 0.6, crop: '205,202,818,818' },
  },
  // Coping (square pieces so the pattern reads the same along every side of the pool).
  {
    id: 'coping_concrete', kind: 'texture', aspect: '1:1',
    prompt: 'Pool coping made of smooth bright white precast concrete pieces, 16 x 16 inch squares, very fine sandblasted texture, thin tight joints, perfectly straight square grid. The frame covers exactly 4 x 4 ft, so exactly 3 x 3 pieces.',
    post: { target: '#e6e4de', flatten: 0.9, crop: '338,337,686,686' },
  },
  {
    id: 'coping_travertine', kind: 'texture', aspect: '1:1',
    prompt: 'Pool coping in bright ivory and cream honed travertine, 16 x 16 inch square pieces with natural travertine pits, soft veining and gentle tone variation, thin tight joints, perfectly straight square grid. The frame covers exactly 4 x 4 ft, so exactly 3 x 3 pieces.',
    post: { target: '#e6dac4', flatten: 0.9, crop: '340,338,686,686' },
  },
  {
    id: 'coping_stone', kind: 'texture', aspect: '1:1',
    prompt: 'Pool coping in natural gray-buff limestone, 16 x 16 inch square pieces, lightly cleft natural surface, subtle colour variation, thin joints, perfectly straight square grid. The frame covers exactly 4 x 4 ft, so exactly 3 x 3 pieces.',
    post: { target: '#c2bbad', flatten: 0.9, crop: '340,339,686,686' },
  },
  // Deck.
  {
    id: 'deck_pavers', kind: 'texture', aspect: '1:1', ref: 'pavers',
    prompt: 'Concrete patio pavers in a light warm sand blend (cream, tan and light gray tones), 12 x 24 inch rectangular pavers laid in a straight running bond, thin sand joints, perfectly straight lines. The frame covers exactly 6 x 6 ft, so exactly 3 pavers across and 6 rows.',
    post: { target: '#d3c4ab' },
  },
  {
    id: 'deck_concrete', kind: 'texture', aspect: '1:1',
    prompt: 'Light gray broom-finished concrete patio slab with fine exposed sand, subtle natural mottling, no joints, no cracks, no stains. The frame covers 8 x 8 ft.',
    post: { target: '#cfccc5', flatten: 1, flattenSigma: 0.08 },
  },
  {
    id: 'deck_porcelain', kind: 'texture', aspect: '1:1',
    prompt: 'Large-format outdoor porcelain pavers, 24 x 48 inch, light warm-gray limestone look with very subtle veining, thin tight joints, stacked straight grid. The frame covers exactly 8 x 8 ft, so exactly 4 pavers across and 2 down.',
    post: { target: '#e0dcd3', flatten: 0.9 },
  },
  {
    id: 'deck_resurface', kind: 'texture', aspect: '1:1',
    prompt: 'Pool deck resurfaced with a light sandstone-colour acrylic knockdown spray texture (Kool Deck style): flattened splatter pattern in cream and light tan, very uniform, no joints. The frame covers 8 x 8 ft.',
    post: { target: '#ddd3c1', flatten: 0.95 },
  },
  // Yard and extras.
  {
    id: 'lawn_grass', kind: 'texture', aspect: '1:1',
    prompt: 'Healthy natural lawn seen from straight above: short, freshly mowed fescue grass with the blade tips pointing up at the camera, lush medium green with gentle natural variation, perfectly even with no mowing stripes, no light or dark bands and no bare patches. The frame covers 10 x 10 ft.',
    // Small lighting blur: the raw image has mowing stripes that would repeat as bands.
    post: { target: '#6e9a48', flatten: 1, flattenSigma: 0.06 },
  },
  {
    id: 'lawn_turf', kind: 'texture', aspect: '1:1', ref: 'turf',
    prompt: 'Premium artificial turf seen from straight above: dense uniform bright green blades with a little olive and tan thatch, very even. The frame covers 8 x 8 ft.',
    post: { target: '#62a03f', flatten: 1, flattenSigma: 0.035 },
  },
  {
    id: 'planting_bed', kind: 'texture', aspect: '1:1',
    prompt: 'Garden planting bed seen from straight above: dark brown natural shredded bark mulch, evenly spread, with a few tiny scattered pieces of lighter bark. No plants. The frame covers 6 x 6 ft.',
    post: { target: '#5c4a38' },
  },
  {
    id: 'gravel_dg', kind: 'texture', aspect: '1:1',
    prompt: 'Compacted decomposed granite path surface seen from straight above: warm golden-tan fine crushed granite with scattered small pebbles, very uniform. The frame covers 6 x 6 ft.',
    post: { target: '#c9b48c' },
  },
  {
    id: 'roof_shingle', kind: 'texture', aspect: '1:1',
    prompt: 'Charcoal gray architectural asphalt shingle roof seen from straight above: straight horizontal courses, fine granule texture, gentle tone variation between tabs. The frame covers 10 x 10 ft, about 24 courses.',
    post: { target: '#5a5d63', flatten: 0.9 },
  },
  {
    id: 'wood_slats', kind: 'texture', aspect: '1:1', ref: 'wood',
    prompt: 'Ipe hardwood deck boards seen from straight above: warm reddish-brown oiled ipe, 6 inch wide boards running horizontally, thin straight gaps, natural grain and tone variation board to board, a few staggered butt joints. The frame covers exactly 6 x 6 ft, so exactly 12 boards.',
    post: { target: '#8f5f3d' },
  },
  {
    id: 'counter_stone', kind: 'texture', aspect: '1:1',
    prompt: 'Honed light warm-gray concrete countertop surface seen from straight above: smooth, very subtle mottling and a few tiny pinholes, no joints. The frame covers 4 x 4 ft.',
    post: { target: '#d6d2c9', flatten: 1, flattenSigma: 0.08 },
  },
  {
    id: 'firepit_stone', kind: 'texture', aspect: '1:1',
    prompt: 'Natural stacked flagstone cap seen from straight above: irregular gray and buff stones fitted tightly with thin mortar joints. The frame covers 4 x 4 ft.',
    post: { target: '#918b82' },
  },
  // Procedural: no API call.
  { id: 'water_caustics', kind: 'caustics' },

  // Sprites (magenta key, so plants and water stay clean).
  {
    id: 'lounger', kind: 'sprite', aspect: '9:16', ref: 'lounger',
    prompt: 'A sculpted one-piece glossy white in-pool chaise lounger (the kind set on a Baja shelf), shown full length and oriented vertically with the raised back at the top.',
    post: { maxPx: 420 },
  },
  {
    id: 'umbrella', kind: 'sprite', aspect: '1:1', ref: 'umbrella',
    prompt: 'An open round navy-blue market patio umbrella, about 9 ft across, eight fabric panels with visible ribs and a small finial at the center, seen from straight above so it is a perfect octagon.',
  },
  {
    id: 'olive_tree', kind: 'sprite', aspect: '1:1',
    prompt: 'The canopy of a mature olive tree seen from straight above: silvery gray-green small leaves, an irregular rounded canopy with soft depth and a few visible branches.',
  },
  {
    id: 'shrub', kind: 'sprite', aspect: '1:1',
    prompt: 'A round drought-tolerant shrub (like a coast rosemary or dwarf olive) seen from straight above: a soft gray-green mound of small leaves.',
    post: { maxPx: 320 },
  },
  {
    id: 'fire_bowl', kind: 'sprite', aspect: '1:1',
    prompt: 'A round black powder-coated steel fire bowl seen from straight above: wide rim, filled with dark lava rock, a warm orange gas flame burning in the middle.',
    post: { maxPx: 320 },
  },
  {
    id: 'water_bowl', kind: 'sprite', aspect: '1:1',
    prompt: 'A round black powder-coated steel water bowl seen from straight above: wide rim, filled to the brim with clear turquoise water, a small notch scupper on one side.',
    post: { maxPx: 320 },
  },
  {
    id: 'outdoor_kitchen', kind: 'sprite', aspect: '21:9',
    prompt: 'A straight built-in outdoor kitchen island seen from straight above, long side horizontal, 12 ft long and 4 ft deep: light honed stone countertop with a built-in stainless steel gas grill and a small stainless sink.',
    post: { maxPx: 768 },
  },
  {
    id: 'fire_pit', kind: 'sprite', aspect: '1:1',
    prompt: 'A round gas fire pit about 5 ft across seen from straight above: light gray smooth concrete rim, dark lava rock in the center with a low warm orange flame.',
    post: { maxPx: 400 },
  },
  {
    id: 'patio_set', kind: 'sprite', aspect: '4:3',
    prompt: 'An outdoor dining set seen from straight above: a rectangular teak table with six dark woven outdoor chairs tucked around it.',
  },
];

// -------------------------------------------------------------- kie.ai API

function apiKey() {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error('Set KIE_API_KEY (never commit it).');
  return key;
}

async function api(pathname, init = {}, base = API) {
  const res = await fetch(`${base}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.code && json.code !== 200)) {
    throw new Error(`${pathname}: ${res.status} ${json.msg || ''}`.trim());
  }
  return json.data;
}

const credits = () => api('/api/v1/chat/credit');

async function upload(file) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type: 'image/jpeg' }), path.basename(file));
  form.append('uploadPath', 'pool-scene-refs');
  form.append('fileName', path.basename(file));
  const data = await api('/api/file-stream-upload', { method: 'POST', body: form }, UPLOAD_API);
  const url = data?.downloadUrl || data?.fileUrl || data?.url;
  if (!url) throw new Error('upload returned no url');
  return url;
}

async function runTask(input) {
  const data = await api('/api/v1/jobs/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input }),
  });
  const taskId = data?.taskId;
  if (!taskId) throw new Error('createTask returned no taskId');
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let info;
    try {
      info = await api(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
    } catch {
      continue; // transient; keep polling
    }
    const state = String(info?.state || '').toLowerCase();
    if (state === 'success') {
      const urls = JSON.parse(info.resultJson || '{}').resultUrls || [];
      if (!urls.length) throw new Error(`${taskId}: no result url`);
      return { taskId, url: urls[0] };
    }
    if (state === 'fail' || state === 'error') throw new Error(`${taskId}: ${info.failMsg || 'failed'}`);
  }
  throw new Error(`${taskId}: timed out`);
}

// ------------------------------------------------------------------- steps

function py(args) {
  const r = spawnSync(PYTHON, ['-I', HELPER, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`scene-assets.py ${args[0]} failed:\n${r.stderr}`);
  return r.stdout.trim();
}

const rawFile = (id) => path.join(RAW_DIR, 'raw', `${id}.png`);
const refUrls = new Map();

async function refUrl(name) {
  if (refUrls.has(name)) return refUrls.get(name);
  const [photo, box] = REFS[name];
  const out = path.join(RAW_DIR, 'refs', `${name}.jpg`);
  py(['refcrop', path.join(PHOTOS, photo), out, box]);
  const url = await upload(out);
  refUrls.set(name, url);
  return url;
}

function promptFor(job) {
  const rules = job.kind === 'sprite' ? SPRITE_RULES : TEXTURE_RULES;
  return `${job.prompt} ${rules}${job.ref ? REF_NOTE.replace('texture swatch', job.kind === 'sprite' ? 'cut-out object' : 'texture swatch') : ''}`;
}

async function generate(job, force) {
  const file = rawFile(job.id);
  if (existsSync(file) && !force) return `${job.id}: raw exists (use --force to regenerate)`;
  const input = { prompt: promptFor(job), aspect_ratio: job.aspect, resolution: '1K', output_format: 'png' };
  if (job.ref) input.image_input = [await refUrl(job.ref)];
  const { taskId, url } = await runTask(input);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${job.id}: download ${res.status}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ id: job.id, model: MODEL, taskId, input }, null, 2));
  return `${job.id}: ${taskId}`;
}

/**
 * Published size per texture: about twice its largest on-screen size, so phones decode little
 * (small tiles 256 px, mid 384 px, decks/lawns/roof 512 px; tests/estimator-scene-assets.test.ts
 * enforces it). The 2026-10-28 re-export also graded both lawns toward olive (saturation ~0.65,
 * brightness ~0.82) and turned water_caustics into white light in the alpha channel; redo those
 * by hand (sharp) if a texture is regenerated.
 */
const EXPORT_SIZE = {
  tile_porcelain: 256, tile_glass: 256, tile_stone: 256, coping_concrete: 256, coping_travertine: 256, coping_stone: 256,
  floor_pebble: 256, floor_quartz: 256, counter_stone: 256, firepit_stone: 256,
  floor_plaster: 384, wood_slats: 384, planting_bed: 384, gravel_dg: 384,
};

function post(job) {
  if (job.kind === 'caustics') {
    return py(['caustics', path.join(PUBLIC, 'textures', `${job.id}.webp`), '--size', '512']);
  }
  if (!existsSync(rawFile(job.id))) return `${job.id}: no raw image, run generate first`;
  const o = job.post || {};
  if (job.kind === 'texture') {
    const args = ['texture', rawFile(job.id), path.join(PUBLIC, 'textures', `${job.id}.webp`), '--size', String(o.size || EXPORT_SIZE[job.id] || 512)];
    if (o.target) args.push('--target', o.target);
    for (const [k, flag] of [['flatten', '--flatten'], ['flattenSigma', '--flatten-sigma'], ['balance', '--balance'], ['saturation', '--saturation'], ['contrast', '--contrast'], ['feather', '--feather'], ['crop', '--crop']]) {
      if (o[k] !== undefined) args.push(flag, String(o[k]));
    }
    return py(args);
  }
  const args = ['sprite', rawFile(job.id), path.join(PUBLIC, 'sprites', `${job.id}.webp`), '--max-px', String(o.maxPx || 512)];
  for (const [k, flag] of [['lo', '--lo'], ['hi', '--hi'], ['soften', '--soften']]) {
    if (o[k] !== undefined) args.push(flag, String(o[k]));
  }
  return py(args);
}

function preview() {
  const dir = path.join(RAW_DIR, 'previews');
  mkdirSync(dir, { recursive: true });
  const list = (sub) => readdirSync(path.join(PUBLIC, sub)).filter((f) => f.endsWith('.webp')).map((f) => path.join(PUBLIC, sub, f));
  console.log(py(['preview', path.join(dir, 'textures.jpg'), ...list('textures')]));
  console.log(py(['preview', path.join(dir, 'sprites.jpg'), ...list('sprites')]));
}

async function pool(items, limit, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: limit }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        console.log(await fn(item));
      } catch (e) {
        console.error(`${item.id}: ${e.message}`);
      }
    }
  }));
}

// -------------------------------------------------------------------- main

const [cmd, ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const ids = rest.filter((a) => !a.startsWith('--'));
const selected = ids.length ? JOBS.filter((j) => ids.includes(j.id)) : JOBS;

if (cmd === 'credits') {
  console.log(`credits: ${await credits()}`);
} else if (cmd === 'generate') {
  const before = await credits();
  await pool(selected.filter((j) => j.kind !== 'caustics'), 4, (j) => generate(j, force));
  const after = await credits();
  console.log(`credits: ${before} -> ${after} (used ${(before - after).toFixed(1)})`);
} else if (cmd === 'post') {
  for (const job of selected) console.log(post(job));
} else if (cmd === 'photos') {
  if (!ids[0]) throw new Error('usage: photos <owner-photos-dir>');
  console.log(py(['photos', ids[0], PHOTOS]));
} else if (cmd === 'preview') {
  preview();
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exitCode = cmd ? 1 : 0;
}
