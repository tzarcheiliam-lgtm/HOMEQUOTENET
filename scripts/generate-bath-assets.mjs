#!/usr/bin/env node
/**
 * Generates every image and the hero clip behind the bathroom builder
 * (/estimator/bathroom-remodel). Reproducible record of how each file in
 * public/estimator/scene/bath/, public/estimator/bathroom/ and
 * public/estimator/hero/bath-* was made: prompts, models, crops and
 * post-processing all live in the job lists below. Nothing comes from the
 * web: every picture is generated with kie.ai or drawn procedurally.
 *
 * Usage
 *   KIE_API_KEY=... node scripts/generate-bath-assets.mjs credits
 *   KIE_API_KEY=... node scripts/generate-bath-assets.mjs generate [id ...] [--force]
 *   KIE_API_KEY=... node scripts/generate-bath-assets.mjs video [--force]
 *   node scripts/generate-bath-assets.mjs post [id ...]
 *   node scripts/generate-bath-assets.mjs preview
 *
 *   generate  asks kie.ai for each job's raw image (skips ids that already
 *             have one unless --force) into BATH_RAW_DIR/raw.
 *   video     image-to-video from the hero still (run generate hero first).
 *   post      turns raw files into the served ones: textures and sprites go
 *             through scripts/scene-assets.py (flatten light, colour-balance,
 *             seamless offset + seam cut / chroma key, despill, trim);
 *             gallery photos, option crops and the hero poster through sharp;
 *             the clip through ffmpeg (H.264 + VP9, no audio). shower_glass is
 *             procedural (an SVG, no API call). Every export drops metadata.
 *   preview   3x3 tile previews and sprites-on-grey sheets in BATH_RAW_DIR/previews.
 *
 * Env
 *   KIE_API_KEY   kie.ai key (generate / video / credits). Never commit it.
 *   BATH_RAW_DIR  raw downloads and previews (default <os tmpdir>/bath-assets). Not served.
 *   PYTHON        python3 binary (default python3).
 *
 * After `post`, copy each printed mean colour (textures) and trimmed aspect
 * (sprites) into lib/estimator/scene/bath/textures.ts.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const RAW_DIR = process.env.BATH_RAW_DIR || path.join(tmpdir(), 'bath-assets');
const SCENE = path.join(ROOT, 'public', 'estimator', 'scene', 'bath');
const PHOTOS = path.join(ROOT, 'public', 'estimator', 'bathroom');
const HERO = path.join(ROOT, 'public', 'estimator', 'hero');
const HELPER = path.join(ROOT, 'scripts', 'scene-assets.py');
const PYTHON = process.env.PYTHON || 'python3';
const API = 'https://api.kie.ai';
// kie.ai serves file uploads (kept 3 days) from a separate host.
const UPLOAD_API = 'https://kieai.redpandaai.co';
/** Swatches and cut-outs: the cheaper model is plenty. Room photos: the photoreal one. */
const ASSET_MODEL = 'nano-banana-2';
const PHOTO_MODEL = 'nano-banana-pro';
const VIDEO_MODEL = 'kling/v2-1-standard';

// ------------------------------------------------------------------ prompts

const WALL_RULES =
  'Seamless tileable material texture photographed perfectly straight-on (orthographic, camera parallel to the wall), ' +
  'the material fills the entire square frame edge to edge. Soft, even, warm-neutral daylight: no cast shadows, ' +
  'no vignetting, no glare hot spots, no perspective, no objects, no fixtures, no text, no border. Photorealistic, crisp, true-to-life scale.';

const FLOOR_RULES =
  'Seamless tileable flooring texture photographed perfectly straight down (orthographic, camera parallel to the floor), ' +
  'the material fills the entire square frame edge to edge. Soft, even, warm-neutral daylight: no cast shadows, ' +
  'no vignetting, no glare, no perspective, no objects, no text, no border. Photorealistic, crisp, true-to-life scale.';

const SPRITE_RULES =
  'Product photo seen FRONT-ON at eye level, straight-on elevation view (orthographic feel, camera centred and level, ' +
  'no perspective distortion, no visible top or sides beyond a sliver), one single object, centred and entirely ' +
  'inside the frame with a generous empty margin on every side (the object fills about 80% of the frame), isolated ' +
  'on a perfectly flat, uniform, pure magenta (#FF00FF) background. No floor, no wall, no cast shadow, no reflection ' +
  'of the backdrop, no other objects, no text. Soft even warm-neutral studio daylight, photorealistic product detail.';

const PHOTO_RULES =
  'Photorealistic interior design photograph of a remodeled residential bathroom in Southern California, shot at eye ' +
  'level with a full-frame camera and a 24 mm lens, verticals perfectly straight, bright soft natural daylight from a ' +
  'window plus warm accent lighting, clean and tidy, styled minimally. Realistic proportions and plumbing, believable ' +
  'materials, no people, no text, no logos, no watermark.';

/**
 * kind texture: `wall` or `floor` rules, post options map to scene-assets.py `texture` flags.
 * kind sprite:  post options map to `sprite` flags; `split` cuts a sheet into equal columns first.
 * kind photo:   gallery / hero stills (PHOTO_MODEL), published by sharp.
 * kind recolor: procedural, a served texture recoloured (post the source first).
 */
const JOBS = [
  // ---- Shower wall tile (front-on).
  {
    id: 'tile_subway', kind: 'texture', rules: 'wall',
    prompt: 'Glossy white ceramic subway tile wall: 3 x 6 inch tiles laid horizontally in a classic running bond (each row offset by half a tile), slightly beveled glossy edges, thin light-gray grout lines, perfectly straight rows. The frame covers exactly 2 x 2 ft, so exactly 4 tiles across and 8 rows.',
    // Crops below run grout centre to grout centre (measured on the raw image), a whole
    // number of tiles, so the grid already repeats (no seam pass): here 3 tiles x 6 rows = 1.5 ft.
    post: { target: '#eeede8', flatten: 0.8, crop: '125,125,768,768', noSeamless: true },
  },
  {
    id: 'tile_large_porcelain', kind: 'texture', rules: 'wall',
    prompt: 'Large-format matte porcelain wall tile, 24 x 48 inch slabs, warm light-greige limestone look with very subtle soft veining and fine speckle, very thin tight grout joints. The frame covers exactly 4 x 4 ft, so exactly 2 slabs side by side, each running the full height.',
    post: { target: '#dcd6cc', flatten: 0.9 },
  },
  {
    id: 'tile_zellige', kind: 'texture', rules: 'wall',
    prompt: 'Handmade Moroccan zellige wall tile: 4 x 4 inch glossy glazed squares in soft sage and eucalyptus green with strong natural tone variation tile to tile, slightly irregular edges and wavy glossy surfaces, thin off-white grout, straight square grid. The frame covers exactly 2 x 2 ft, so exactly 6 x 6 tiles.',
    post: { target: '#a9c2b4', flatten: 0.7 },
  },
  {
    id: 'tile_marble', kind: 'texture', rules: 'wall',
    prompt: 'Polished white Carrara marble wall slab: soft white-gray background with delicate flowing gray veining running diagonally, a few thicker veins, no joints, no tiles. The frame covers 4 x 4 ft.',
    post: { target: '#e8e6e2', flatten: 0.9 },
  },
  {
    id: 'tile_plain', kind: 'texture', rules: 'wall',
    prompt: 'Plain builder-grade matte off-white ceramic wall tile, 12 x 12 inch squares, very subtle surface texture, thin light-gray grout, straight square grid. The frame covers exactly 2 x 2 ft, so exactly 2 x 2 tiles.',
    // One tile (12 in) with the joint through the middle.
    post: { target: '#e6e2da', flatten: 0.9, crop: '255,255,509,509', noSeamless: true },
  },
  // ---- Floor (top-down).
  {
    id: 'floor_porcelain_wood', kind: 'texture', rules: 'floor',
    prompt: 'Wood-look porcelain plank floor tile: 8 x 48 inch planks running horizontally, warm natural light oak look with realistic grain and gentle tone variation plank to plank, very thin tight grout joints, planks staggered randomly. The frame covers exactly 6 x 6 ft, so exactly 9 rows of planks.',
    post: { target: '#b39270' },
  },
  {
    id: 'floor_large_stone', kind: 'texture', rules: 'floor',
    prompt: 'Large-format stone-look porcelain floor tile, 24 x 24 inch squares, honed warm gray limestone look with subtle fossil speckle and soft tone variation, thin grout joints, straight stacked grid. The frame covers exactly 4 x 4 ft, so exactly 2 x 2 tiles.',
    // One 24 in tile with the joints through the middle.
    post: { target: '#c9c3b8', flatten: 0.9, crop: '255,256,510,510', noSeamless: true },
  },
  {
    // nano-banana-2 false-flagged this prompt twice; the photo model takes it.
    id: 'floor_hex_mosaic', kind: 'texture', rules: 'floor', model: PHOTO_MODEL,
    prompt: 'Classic small hexagon mosaic floor tile in matte white porcelain, each hexagon 2 inches across, regular repeating pattern, thin light-gray grout, perfectly regular. The frame covers 1.5 x 1.5 ft, about 9 hexagons across.',
    post: { target: '#ecebe7', flatten: 0.8 },
  },
  {
    id: 'floor_lvp', kind: 'texture', rules: 'floor',
    prompt: 'Luxury vinyl plank floor: 7 x 48 inch planks running horizontally, mid-tone warm brown oak look with subtle embossed grain, slight micro-bevel joints, planks staggered randomly. The frame covers exactly 6 x 6 ft, so about 10 rows of planks.',
    post: { target: '#a28a70' },
  },
  // Neutral default floor: the plain wall tile recoloured beige (procedural).
  { id: 'floor_plain', kind: 'recolor', from: 'tile_plain', target: '#d6cfc2' },
  // ---- Painted walls (subtle roller texture). One AI swatch; the other colours
  // are procedural recolours of it, so all four share one believable surface.
  {
    id: 'paint_soft_white', kind: 'texture', rules: 'wall',
    prompt: 'Interior drywall painted in soft warm white (like a creamy alabaster) matte eggshell paint, a very subtle fine roller stipple texture, perfectly uniform colour, no marks, no joints. The frame covers 4 x 4 ft.',
    // Tight lighting blur: the raw image has faint warm blotches that would repeat.
    post: { target: '#f1eee6', flatten: 1, flattenSigma: 0.03, balance: 0.9 },
  },
  { id: 'paint_greige', kind: 'recolor', from: 'paint_soft_white', target: '#d3c9ba' },
  { id: 'paint_sage', kind: 'recolor', from: 'paint_soft_white', target: '#b3bea4' },
  { id: 'paint_navy', kind: 'recolor', from: 'paint_soft_white', target: '#2e3b53' },
  // ---- Countertops (top-down).
  {
    id: 'counter_quartz_white', kind: 'texture', rules: 'floor',
    prompt: 'Polished white quartz countertop surface seen from straight above: bright clean white with a very fine subtle gray speckle, no veins, no seams.  The frame covers 3 x 3 ft.',
    // Crop leaves out a glare streak on the right of the raw image.
    post: { target: '#f1f0ec', flatten: 1, flattenSigma: 0.1, crop: '0,0,840,840' },
  },
  {
    id: 'counter_marble_look', kind: 'texture', rules: 'floor',
    prompt: 'Marble-look white quartz countertop surface seen from straight above: soft white with elegant thin flowing gray veins (Calacatta look), polished, no seams. The frame covers 3 x 3 ft.',
    // Crop leaves out a window reflection on the left of the raw image.
    post: { target: '#e9e7e2', flatten: 0.9, crop: '200,0,824,824' },
  },
  {
    id: 'counter_concrete', kind: 'texture', rules: 'floor',
    prompt: 'Sealed medium-gray concrete countertop surface seen from straight above: smooth trowelled finish with soft cloudy mottling and a few tiny pinholes, no seams. The frame covers 3 x 3 ft.',
    post: { target: '#a5a29c', flatten: 1, flattenSigma: 0.1 },
  },
  // ---- Vanity cabinet fronts (front-on; the renderer tiles them over the cabinet body).
  {
    id: 'vanity_white', kind: 'texture', rules: 'wall',
    prompt: 'Smooth painted cabinet surface in satin bright white lacquer, a very faint brushed paint grain running vertically, perfectly uniform, no panels, no handles, no joints. The frame covers 3 x 3 ft.',
    post: { target: '#efeeea', flatten: 1, flattenSigma: 0.1 },
  },
  {
    // Same false flag on nano-banana-2.
    id: 'vanity_wood', kind: 'texture', rules: 'wall', model: PHOTO_MODEL,
    prompt: 'Cabinet door surface in natural white oak wood with a warm matte clear finish, straight vertical grain lines, gentle tone variation, no panels, no handles, no joints. The frame covers 3 x 3 ft.',
    post: { target: '#a97e57' },
  },
  // The AI swatch banded when made seamless: a recolour of the white satin finish instead.
  { id: 'vanity_navy_green', kind: 'recolor', from: 'vanity_white', target: '#2f4a4c' },
  {
    id: 'vanity_black', kind: 'texture', rules: 'wall',
    prompt: 'Smooth painted cabinet surface in soft matte charcoal black paint, a very faint brushed paint grain running vertically, perfectly uniform, no panels, no handles, no joints. The frame covers 3 x 3 ft.',
    post: { target: '#28282b', flatten: 1, flattenSigma: 0.1, balance: 0.9 },
  },

  // ---- Sprites (front-on cut-outs on magenta).
  {
    id: 'tub_alcove', kind: 'sprite', aspect: '21:9',
    prompt: 'A white enamel 60 inch alcove bathtub with a plain flat white apron front, seen exactly from the front: a long low white rectangle 5 ft wide and 20 inches tall with a slight rounded top rim. No faucet, no wall, no tile.',
    post: { maxPx: 768 },
  },
  {
    id: 'tub_freestanding', kind: 'sprite', aspect: '21:9',
    prompt: 'A modern oval freestanding soaking bathtub in glossy white acrylic, seen exactly from the side (long side facing the camera): smooth gently curved silhouette, 5.5 ft long and 2 ft tall, slim rim, both ends slightly raised. No faucet.',
    // The glossy acrylic mirrors the magenta backdrop: drop the colour (it is white anyway).
    post: { maxPx: 768, desaturate: true },
  },
  {
    id: 'shower_head', kind: 'sprite', aspect: '1:1',
    prompt: 'A wall-mounted shower arm with a round 5 inch shower head, in polished chrome, seen exactly from the front with the arm coming down from the top of the frame at a slight angle.',
    post: { maxPx: 256 },
  },
  {
    id: 'rain_head', kind: 'sprite', aspect: '1:1',
    prompt: 'A ceiling-mount 12 inch round rain shower head in polished chrome on a short vertical drop arm from the top of the frame, seen exactly from the front at eye level, so the head reads as a thin flat disc under the arm.',
    post: { maxPx: 320 },
  },
  {
    id: 'toilet', kind: 'sprite', aspect: '3:4',
    prompt: 'A modern white one-piece skirted toilet with a closed lid, seen exactly from the front: smooth concealed trapway, tank behind the bowl, chrome flush button on top. Symmetrical.',
    post: { maxPx: 384 },
  },
  {
    id: 'vanity_single', kind: 'sprite', aspect: '1:1',
    prompt: 'A 36 inch freestanding bathroom vanity seen exactly from the front: shaker cabinet painted plain satin white with two doors and a slim drawer, slim brushed-steel bar pulls, white quartz countertop with a rectangular white undermount sink (just its top edge visible), no faucet, short legs or toe kick.',
    post: { maxPx: 512 },
  },
  {
    id: 'vanity_double', kind: 'sprite', aspect: '21:9',
    prompt: 'A 72 inch double bathroom vanity seen exactly from the front: flat slab-door cabinet painted plain satin white with two doors under each sink and a bank of drawers in the middle, slim brushed-steel bar pulls, white quartz countertop with two rectangular undermount sinks, no faucets, toe kick at the bottom.',
    post: { maxPx: 900 },
  },
  {
    id: 'vanity_floating', kind: 'sprite', aspect: '21:9',
    prompt: 'A 48 inch wall-hung floating bathroom vanity seen exactly from the front: two wide flat slab drawers painted plain satin white with a slim recessed finger-pull channel, white quartz countertop with an integrated sink, no faucet, nothing below the cabinet (it floats).',
    post: { maxPx: 768 },
  },
  {
    id: 'mirror', kind: 'sprite', aspect: '3:4',
    prompt: 'A frameless rectangular bathroom vanity mirror with softly rounded corners and a thin polished beveled edge, seen exactly from the front, the glass reflecting only a soft plain pale warm-gray wall with a gentle light gradient.',
    post: { maxPx: 384 },
  },
  {
    id: 'mirror_led', kind: 'sprite', aspect: '3:4',
    prompt: 'A frameless rectangular LED backlit bathroom mirror with softly rounded corners, seen exactly from the front, switched on: a soft warm-white glow strip around the inner edge of the glass, the glass reflecting only a soft plain pale warm-gray wall.',
    post: { maxPx: 384 },
  },
  {
    id: 'sconce', kind: 'sprite', aspect: '9:16',
    prompt: 'A modern bathroom wall sconce seen exactly from the front: a small round wall plate and a short arm holding a vertical frosted white glass cylinder shade, switched on with a soft warm glow, metal parts in brushed nickel.',
    post: { maxPx: 256 },
  },
  {
    id: 'faucets', kind: 'sprite', aspect: '4:1', split: ['faucet_chrome', 'faucet_matte_black', 'faucet_brushed_gold', 'faucet_brushed_nickel'],
    prompt: 'Four identical modern single-handle bathroom vanity faucets with a tall gently curved spout, seen exactly from the side elevation with the spout pointing right, standing in a row and evenly spaced in four equal columns with wide gaps between them, each one a different finish from left to right: polished chrome, matte black, brushed champagne gold, brushed nickel. Every faucet the same size and shape.',
    post: { maxPx: 256 },
  },
  {
    id: 'towel', kind: 'sprite', aspect: '3:4',
    prompt: 'A plush white cotton bath towel folded in thirds and hanging neatly over a slim polished chrome wall towel bar, seen exactly from the front, soft natural folds.',
    post: { maxPx: 320 },
  },
  {
    id: 'plant', kind: 'sprite', aspect: '3:4',
    prompt: 'A small potted snake plant (sansevieria) with upright green and yellow-edged leaves in a simple matte white ceramic cylinder pot, seen exactly from the front.',
    post: { maxPx: 320 },
  },
  // Procedural (no API call): a frameless glass panel with a thin metal clamp edge.
  { id: 'shower_glass', kind: 'glass' },

  // ---- Gallery "Which look do you like?" (AI style ideas, never presented as real jobs).
  {
    id: 'style-modern-spa', kind: 'photo', aspect: '3:2',
    prompt: 'Modern spa primary bathroom: a large curbless walk-in shower behind a frameless glass panel, walls in large-format warm greige porcelain slabs, a long recessed shower niche, a built-in floating shower bench, a ceiling rain shower head, a warm oak floating double vanity with white quartz top, a backlit LED mirror, matte black fixtures, large stone-look floor tile, a small potted plant.',
    alt: 'AI-generated modern spa bathroom with a curbless walk-in shower, built-in bench and niche, a floating oak vanity and a backlit mirror',
    caption: 'Modern spa',
  },
  {
    id: 'style-warm-wood', kind: 'photo', aspect: '3:2',
    prompt: 'Warm wood and white bathroom: glossy white subway tile walls, a natural rift oak double vanity with white quartz top and two undermount sinks, two arched mirrors, brushed brass faucets and sconces, white hexagon mosaic floor, a tub-and-shower combo with a glass door on one side, white towels.',
    alt: 'AI-generated bathroom with white subway tile, an oak double vanity, brass fixtures and a white hexagon floor',
    caption: 'Warm wood and white',
  },
  {
    id: 'style-classic-marble', kind: 'photo', aspect: '3:2',
    prompt: 'Classic marble primary bathroom: polished white Carrara marble walls, a glossy white freestanding soaking tub under a window, and beside it a separate glass-enclosed shower, a white shaker vanity with marble top, polished nickel fixtures, a marble herringbone floor, soft luxurious daylight.',
    alt: 'AI-generated marble bathroom with a freestanding soaking tub and a separate glass shower',
    caption: 'Classic marble',
  },
  {
    id: 'style-green-zellige', kind: 'photo', aspect: '3:2',
    prompt: 'Bold green zellige bathroom: a walk-in shower clad floor to ceiling in glossy handmade sage-green zellige tile with a glass panel, brushed gold shower trim, a white floating vanity with a quartz top, a round mirror, warm white walls, terracotta-tone hexagon floor, a trailing plant.',
    alt: 'AI-generated bathroom with a green zellige tiled walk-in shower and brushed gold fixtures',
    caption: 'Bold green zellige',
  },
  {
    id: 'style-black-white', kind: 'photo', aspect: '3:2',
    prompt: 'Graphic black-and-white bathroom: white subway tile walls, a black and white hexagon mosaic floor, a matte black single vanity with white quartz top, matte black faucet, mirror frame and shower trim, a tub-and-shower combo with a black-framed glass panel, crisp and modern.',
    alt: 'AI-generated black-and-white bathroom with a hexagon floor, a black vanity and matte black fixtures',
    caption: 'Black and white',
  },
  {
    id: 'style-coastal', kind: 'photo', aspect: '3:2',
    prompt: 'Light coastal bathroom: soft white walls, a walk-in shower with pale blue-gray handmade tile and a glass door, a whitewashed light wood vanity with white quartz top, brushed nickel fixtures, a woven basket, light wood-look porcelain plank floor, airy relaxed mood.',
    alt: 'AI-generated coastal bathroom with pale blue tile, a light wood vanity and wood-look floor',
    caption: 'Light coastal',
  },
  {
    id: 'style-navy-hall', kind: 'photo', aspect: '3:2',
    prompt: 'Compact hall bathroom remodel (about 5 x 8 ft): a navy blue single shaker vanity with white quartz top and brushed gold faucet, a tub-and-shower combo with white large-format porcelain walls and a recessed niche, a sliding glass door, stone-look floor tile, a framed mirror and one sconce. Small but bright and polished.',
    alt: 'AI-generated compact hall bathroom with a navy vanity and a tub-and-shower combo with a recessed niche',
    caption: 'Navy hall bath',
  },
  {
    id: 'style-heated-floor', kind: 'photo', aspect: '3:2',
    prompt: 'Calm greige primary bathroom close-up: a floating oak vanity with a white quartz counter and a backlit LED mirror glowing softly above it, warm greige painted walls, large stone-look porcelain floor tile, a pair of slippers on the floor, soft evening light.',
    alt: 'AI-generated greige bathroom with a floating oak vanity and a glowing LED backlit mirror',
    caption: 'Soft greige retreat',
  },
  // ---- Hero (first screen): the still the clip animates, also its poster.
  {
    id: 'hero', kind: 'photo', aspect: '16:9',
    prompt: 'Wide view of a bright newly remodeled primary bathroom: a frameless glass walk-in shower with large-format warm white porcelain walls and a recessed niche, a white oak floating double vanity with white quartz top, a backlit LED mirror, brushed nickel fixtures, a freestanding white soaking tub under a window with sheer curtains, large stone-look floor tile, soft golden late-morning sunlight streaming in.',
  },
];

/**
 * Gallery files: [job id, published name]. Option tiles are crops of gallery
 * stills that genuinely show the option: [option key, job id, crop l,t,r,b as
 * fractions of the still].
 */
const OPTION_CROPS = [
  ['bathing.walk_in', 'style-modern-spa', [0.1, 0.08, 0.6, 0.85]],
  ['bathing.tub_shower', 'style-navy-hall', [0, 0.12, 0.55, 1]],
  ['bathing.tub_and_shower', 'style-classic-marble', [0, 0.08, 0.72, 1]],
  ['extras.niche', 'style-modern-spa', [0.18, 0.3, 0.48, 0.58]],
  ['extras.bench', 'style-modern-spa', [0.1, 0.56, 0.36, 0.84]],
  ['extras.led_mirror', 'style-heated-floor', [0.26, 0.02, 0.74, 0.55]],
  ['vanity.single', 'style-navy-hall', [0.48, 0.45, 0.96, 1]],
  ['vanity.double', 'style-warm-wood', [0.26, 0.22, 0.94, 0.96]],
  ['vanity.floating', 'style-heated-floor', [0.16, 0.3, 0.84, 0.86]],
  ['showerTile.subway', 'style-warm-wood', [0, 0.05, 0.42, 0.7]],
  ['showerTile.zellige', 'style-green-zellige', [0.55, 0.08, 1, 0.9]],
  ['showerTile.marble', 'style-classic-marble', [0.42, 0, 1, 0.62]],
];

const VIDEO_PROMPT =
  'Slow, smooth cinematic dolly push-in through a bright remodeled bathroom, gentle sunlight shifting across the tile, ' +
  'sheer curtain moving very slightly. Camera only; nothing else moves, no people, no water, no text. Calm, premium, steady.';

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

async function upload(file, type) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(file)], { type }), path.basename(file));
  form.append('uploadPath', 'bath-assets');
  form.append('fileName', path.basename(file));
  const data = await api('/api/file-stream-upload', { method: 'POST', body: form }, UPLOAD_API);
  const url = data?.downloadUrl || data?.fileUrl || data?.url;
  if (!url) throw new Error('upload returned no url');
  return url;
}

async function runTask(model, input, pollMs = 4000, tries = 225) {
  const data = await api('/api/v1/jobs/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input }),
  });
  const taskId = data?.taskId;
  if (!taskId) throw new Error('createTask returned no taskId');
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, pollMs));
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

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// ------------------------------------------------------------------- steps

function py(args) {
  const r = spawnSync(PYTHON, ['-I', HELPER, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`scene-assets.py ${args[0]} failed:\n${r.stderr}`);
  return r.stdout.trim();
}

const rawFile = (id) => path.join(RAW_DIR, 'raw', `${id}.png`);

function promptFor(job) {
  if (job.kind === 'photo') return `${job.prompt} ${PHOTO_RULES}`;
  if (job.kind === 'sprite') return `${job.prompt} ${SPRITE_RULES}`;
  return `${job.prompt} ${job.rules === 'floor' ? FLOOR_RULES : WALL_RULES}`;
}

async function generate(job, force) {
  const file = rawFile(job.id);
  if (existsSync(file) && !force) return `${job.id}: raw exists (use --force to regenerate)`;
  const photo = job.kind === 'photo';
  const model = job.model || (photo ? PHOTO_MODEL : ASSET_MODEL);
  const input = {
    prompt: promptFor(job),
    aspect_ratio: job.aspect || '1:1',
    resolution: photo ? '2K' : '1K',
    output_format: 'png',
  };
  const { taskId, url } = await runTask(model, input);
  await download(url, file);
  writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify({ id: job.id, model, taskId, input }, null, 2));
  return `${job.id}: ${taskId}`;
}

async function video(force) {
  const out = path.join(RAW_DIR, 'raw', 'hero.mp4');
  if (existsSync(out) && !force) return 'hero video: raw exists (use --force to regenerate)';
  const still = path.join(RAW_DIR, 'hero-upload.jpg');
  await sharp(rawFile('hero')).resize({ width: 1600 }).jpeg({ quality: 90 }).toFile(still);
  const imageUrl = await upload(still, 'image/jpeg');
  const input = { prompt: VIDEO_PROMPT, image_url: imageUrl, duration: '5', negative_prompt: 'people, water splashing, text, warping, morphing, flicker' };
  const { taskId, url } = await runTask(VIDEO_MODEL, input, 8000, 150);
  await download(url, out);
  writeFileSync(out.replace(/\.mp4$/, '.json'), JSON.stringify({ model: VIDEO_MODEL, taskId, input: { ...input, image_url: '(hero still)' } }, null, 2));
  return `hero video: ${taskId}`;
}

/** Published texture size: 768 px for the small repeats, 1024 px for planks, slabs and stone. */
const TEXTURE_SIZE = {
  tile_large_porcelain: 1024, tile_marble: 1024, floor_porcelain_wood: 1024, floor_large_stone: 1024, floor_lvp: 1024,
};

function textureArgs(job) {
  const o = job.post || {};
  const args = ['texture', rawFile(job.id), path.join(SCENE, 'textures', `${job.id}.webp`), '--size', String(o.size || TEXTURE_SIZE[job.id] || 768), '--max-kb', '215'];
  if (o.target) args.push('--target', o.target);
  for (const [k, flag] of [['flatten', '--flatten'], ['flattenSigma', '--flatten-sigma'], ['balance', '--balance'], ['saturation', '--saturation'], ['contrast', '--contrast'], ['feather', '--feather'], ['crop', '--crop']]) {
    if (o[k] !== undefined) args.push(flag, String(o[k]));
  }
  if (o.noSeamless) args.push('--no-seamless');
  return args;
}

function spriteArgs(raw, id, o) {
  const args = ['sprite', raw, path.join(SCENE, 'sprites', `${id}.webp`), '--max-px', String(o.maxPx || 512), '--max-kb', '190'];
  for (const [k, flag] of [['lo', '--lo'], ['hi', '--hi'], ['soften', '--soften'], ['keep', '--keep']]) {
    if (o[k] !== undefined) args.push(flag, String(o[k]));
  }
  return args;
}

/**
 * Frameless clear glass panel, 3 x 6.5 ft (300 x 650 px): faint cool tint, a
 * diagonal sheen, a brighter polished edge and two small clamps on the left.
 * Mostly transparent, so the shower tile reads through it.
 */
async function glass() {
  const w = 300, h = 650;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="tint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dff0ee" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#cfe4e2" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0.18" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.27" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="0.33" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.52" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.56" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="3" fill="url(#tint)"/>
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="3" fill="url(#sheen)"/>
  <rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" rx="3" fill="none" stroke="#f4fbfa" stroke-opacity="0.75" stroke-width="3"/>
  <rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="2" fill="none" stroke="#9fbcb8" stroke-opacity="0.35" stroke-width="1.2"/>
  <rect x="0" y="150" width="12" height="30" rx="2" fill="#c9ced3"/>
  <rect x="0" y="470" width="12" height="30" rx="2" fill="#c9ced3"/>
</svg>`;
  const out = path.join(SCENE, 'sprites', 'shower_glass.webp');
  mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 90, alphaQuality: 100 }).toFile(out);
  return `shower_glass: ${out} (${w}x${h}, procedural)`;
}

/**
 * Procedural recolour of a served texture: multiply each channel so the mean
 * lands on `target`, keeping the source's grain, stipple or grout detail.
 */
async function recolor(job) {
  const src = path.join(SCENE, 'textures', `${job.from}.webp`);
  if (!existsSync(src)) return `${job.id}: post ${job.from} first`;
  const { channels } = await sharp(src).stats();
  const t = [1, 3, 5].map((i) => parseInt(job.target.slice(i, i + 2), 16));
  const gain = t.map((v, c) => v / Math.max(channels[c].mean, 1));
  const out = path.join(SCENE, 'textures', `${job.id}.webp`);
  await sharp(src).removeAlpha().linear(gain, [0, 0, 0]).webp({ quality: 84, effort: 6 }).toFile(out);
  return `${job.id}: recoloured ${job.from} -> ${job.target}`;
}

const GALLERY_MAX = 1600;
const THUMB_MAX = 720;

/** sharp drops all metadata unless asked to keep it. */
async function webp(input, out, maxEdge, maxKb, quality = 82) {
  mkdirSync(path.dirname(out), { recursive: true });
  for (let q = quality; q >= 50; q -= 4) {
    const buf = await sharp(input).resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true }).webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length <= maxKb * 1024 || q <= 54) {
      writeFileSync(out, buf);
      return `${path.relative(ROOT, out)} q${q} ${(buf.length / 1024).toFixed(0)} KB`;
    }
  }
  throw new Error('unreachable');
}

async function postPhoto(job) {
  // The hero still only feeds the clip; the poster is the clip's first frame (postPoster).
  if (job.id === 'hero') return 'hero: still kept raw (poster comes from the clip)';
  const big = await webp(rawFile(job.id), path.join(PHOTOS, `${job.id}.webp`), GALLERY_MAX, 255);
  const small = await webp(rawFile(job.id), path.join(PHOTOS, 'thumbs', `${job.id}.webp`), THUMB_MAX, 90);
  return `${big}\n${small}`;
}

async function postOptions() {
  const lines = [];
  for (const [key, id, [l, t, r, b]] of OPTION_CROPS) {
    const meta = await sharp(rawFile(id)).metadata();
    const W = meta.width, H = meta.height;
    const region = { left: Math.round(l * W), top: Math.round(t * H), width: Math.round((r - l) * W), height: Math.round((b - t) * H) };
    const buf = await sharp(rawFile(id)).extract(region).toBuffer();
    lines.push(await webp(buf, path.join(PHOTOS, 'thumbs', `option-${key.replace('.', '-')}.webp`), THUMB_MAX, 90));
  }
  return lines.join('\n');
}

function postVideo() {
  const raw = path.join(RAW_DIR, 'raw', 'hero.mp4');
  if (!existsSync(raw)) return 'hero video: no raw clip, run video first';
  mkdirSync(HERO, { recursive: true });
  // Ping-pong (push in, then ease back out) so the loop has no jump cut: about 10 s.
  const vf = 'scale=1280:-2:flags=lanczos,fps=24,split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1:a=0';
  const common = ['-y', '-i', raw, '-an', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-filter_complex', vf];
  const mp4 = path.join(HERO, 'bath-hero.mp4');
  const webm = path.join(HERO, 'bath-hero.webm');
  for (const args of [
    [...common, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', mp4],
    [...common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', webm],
  ]) {
    const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr.slice(-800)}`);
  }
  return `hero video: ${path.relative(ROOT, mp4)}, ${path.relative(ROOT, webm)}`;
}

/** Poster = the clip's first frame, so nothing jumps when playback starts. */
async function postPoster() {
  const raw = path.join(RAW_DIR, 'raw', 'hero.mp4');
  if (!existsSync(raw)) return 'hero poster: no raw clip';
  const frame = path.join(RAW_DIR, 'hero-frame0.png');
  const r = spawnSync('ffmpeg', ['-y', '-i', raw, '-frames:v', '1', frame], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr.slice(-800)}`);
  return webp(frame, path.join(HERO, 'bath-hero.webp'), 1280, 160);
}

async function post(job) {
  if (job.kind === 'glass') return glass();
  if (job.kind === 'recolor') return recolor(job);
  if (!existsSync(rawFile(job.id))) return `${job.id}: no raw image, run generate first`;
  if (job.kind === 'texture') return py(textureArgs(job));
  if (job.kind === 'photo') return postPhoto(job);
  const o = job.post || {};
  if (!job.split) {
    const line = py(spriteArgs(rawFile(job.id), job.id, o));
    if (o.desaturate) {
      const file = path.join(SCENE, 'sprites', `${job.id}.webp`);
      const buf = await sharp(file).modulate({ saturation: 0 }).tint('#f7f5f1').webp({ quality: 88, alphaQuality: 100 }).toBuffer();
      writeFileSync(file, buf);
    }
    return line;
  }
  // A sheet of N same-sized objects: cut equal columns, then key each.
  const meta = await sharp(rawFile(job.id)).metadata();
  const colW = Math.floor(meta.width / job.split.length);
  const lines = [];
  for (const [i, id] of job.split.entries()) {
    const part = path.join(RAW_DIR, 'raw', `${id}.png`);
    await sharp(rawFile(job.id)).extract({ left: i * colW, top: 0, width: colW, height: meta.height }).png().toFile(part);
    lines.push(py(spriteArgs(part, id, o)));
  }
  return lines.join('\n');
}

function preview() {
  const dir = path.join(RAW_DIR, 'previews');
  mkdirSync(dir, { recursive: true });
  const list = (sub) => readdirSync(path.join(SCENE, sub)).filter((f) => f.endsWith('.webp')).map((f) => path.join(SCENE, sub, f));
  console.log(py(['preview', path.join(dir, 'textures.jpg'), ...list('textures')]));
  console.log(py(['preview', path.join(dir, 'sprites.jpg'), ...list('sprites')]));
}

async function runPool(items, limit, fn) {
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
  await runPool(selected.filter((j) => j.kind !== 'glass' && j.kind !== 'recolor'), 4, (j) => generate(j, force));
  const after = await credits();
  console.log(`credits: ${before} -> ${after} (used ${(before - after).toFixed(1)})`);
} else if (cmd === 'video') {
  const before = await credits();
  console.log(await video(force));
  console.log(`credits: ${before} -> ${await credits()}`);
} else if (cmd === 'post') {
  for (const job of selected) console.log(await post(job));
  if (!ids.length || ids.includes('options')) console.log(await postOptions());
  if (!ids.length || ids.includes('video')) console.log(postVideo(), '\n' + await postPoster());
} else if (cmd === 'preview') {
  preview();
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
  process.exitCode = cmd ? 1 : 0;
}
