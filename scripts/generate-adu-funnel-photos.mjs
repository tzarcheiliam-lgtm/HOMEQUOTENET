#!/usr/bin/env node
/**
 * Generates the photos of HomeQuote Network's ADU funnel (/estimator/adu,
 * experience 'funnel'). Reproducible record of how every file in
 * public/estimator/adu/funnel/ was made (same method as
 * scripts/generate-kitchen-funnel-photos.mjs).
 *
 * Buildoly-style quote flow (2026-10-31): model -> finish -> kitchen -> bathroom -> storage.
 *
 * Step 1, "Select a model.": a furnished 3D cutaway floor plan of each model on white
 * (plan-<model>), every plan an edit of the one-bedroom plan so they share one camera and style.
 *
 * Step 2, "Choose your finish.": ONE property the homeowner builds on, like the pool funnel.
 * One Southern-California single-story house with a detached one-car garage and a big empty lawn,
 * seen by the same drone (about 40 ft up, from the back corner of the lot) in the same late-afternoon
 * light. Every photo is an image EDIT of another photo of the same chain, so the house, lot, camera
 * and light never change; only what the homeowner picked does:
 *   master (the backyard today)
 *     -> size-detached-studio      (built on the master on a painted magenta footprint, which pins its position)
 *     -> type-detached             (the one bedroom: that studio made wider)
 *     -> size-detached-2bed        (the one bedroom made bigger again)
 *     -> size-detached-3bed        (the two bedroom made bigger again)
 *     -> type-garage               (the master's garage converted)
 *     -> finish-<model>-luxe       (an edit of that model's Standard photo: only the ADU's materials change)
 *
 * Steps 3 to 5, "Design your kitchen." / "Design your bathroom." / "Choose your storage.": the inside of the same ADU. One
 * Standard kitchen (white windows and doors, like the Standard exterior); its Luxe twin is an edit of
 * it (black-framed windows and doors, oak floor, like the Luxe exterior); each kitchen option is an
 * edit of its finish's kitchen. The bedroom and the bathroom are new rooms in the same style (the kitchen photo is
 * the style reference), with the same finish twins and their option edits.
 *
 * Prompts alone do not hold position or size for this model: the footprint marker sets where the studio
 * stands, and each bigger size grows the previous one. These are AI-generated example designs: the page
 * labels them as such. A job's source with no raw image yet is taken from its published webp.
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
 *   KIE_MODEL             default nano-banana-pro.   KIE_RESOLUTION  default 2K (a job may set its own).
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
/** The cheaper edit model (google/nano-banana-edit, flat price per image, no resolution setting): a job may pick it. */
const EDIT_MODEL = 'google/nano-banana-edit';
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

/** Footprint (1200 x 800 frame of the master): the detached studio on the open lawn. */
const FOOTPRINT = {
  detached: {
    studio: [[380, 600], [640, 600], [655, 720], [365, 720]],
    '1bed': [[320, 590], [720, 590], [740, 740], [300, 740]],
    '2bed': [[260, 575], [790, 575], [815, 775], [235, 775]],
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

const TYPE = {
  detached: BUILD_DETACHED('1bed') + STANDARD_ADU,
  garage:
    'Edit the photo: convert the garage at the right into a studio ADU (about 400 square feet) without changing its size, footprint or roof: ' +
    'the roll-up garage door is replaced by a stucco wall with a white entry door and a wide white vinyl window, matching stucco, a small concrete landing, ' +
    'a narrow planter strip in front, the driveway end becomes a small paved patio. ' + STANDARD_ADU,
};

// Luxe (owner, 2026-10-31: "the luxe exterior is OD, keep it simple and minimal"): the same building with three
// changes only: smooth white stucco, black windows and door, a slim dark standing-seam roof. No wood, deck or lights.
const LUXE_MATERIALS =
  'New minimal modern luxe materials, and NOTHING else: all its walls become smooth bright white stucco; every window frame and the entry door become matte black ' +
  '(the same window and door sizes and positions); the roof becomes a slim dark charcoal standing-seam metal roof with the same shape, pitch and height; ' +
  'one small plain concrete step at the door. NO wood siding, NO deck, NO wall lights, NO new plants, planters or path. ';
const LUXE =
  'Change ONLY the materials of the new ADU. Its footprint, size, position on the lawn, outline, roof shape and height, and its size in the frame stay EXACTLY the same ' +
  '(do not move it, enlarge it or bring it closer). ' + LUXE_MATERIALS +
  'The main house keeps its light grey stucco and grey shingle roof, and the garage keeps its stucco, roof and roll-up door: neither is re-sided or re-roofed. The fence and lawn stay as they are.';
const LUXE_GARAGE =
  'Change ONLY the materials of the converted garage ADU. Its footprint, size, position, outline, roof shape and height stay EXACTLY the same. ' + LUXE_MATERIALS +
  'The main house keeps its light grey stucco and grey shingle roof. The camera, framing, fence, lawn and driveway stay exactly as they are.';

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

const GROW_3BED =
  'Edit the photo: make the new ADU CLEARLY BIGGER (a three-bedroom of about 1,000 square feet): keep its current front wall, and add a new wing at its RIGHT end that projects ' +
  'about 12 feet further TOWARD THE CAMERA, so the building becomes an L shape, with its own gable roof meeting the main roof and one more window facing the camera. ' +
  'Same height, same stucco, white windows, door, trim and dark grey shingle roof; the house, garage, fence and the lawn around it stay the same.';

/** Step 1: furnished cutaway floor plans on white, like an architect's 3D plan render. */
const PLAN_STYLE =
  'Photorealistic 3D architectural floor plan render seen from straight above with a very slight tilt, the roof removed and the walls cut at waist height: ' +
  'crisp thick off-white walls with soft drop shadows, light oak plank floors, white tile in the bathroom, furnished in a calm modern style ' +
  '(sage and beige fabrics, light wood, a few green plants), black-framed windows and doors shown as openings, ' +
  'the whole plan centered on a pure white background with generous empty white margins all around, soft even daylight. No text, no labels, no dimensions, no people, no watermark.';
const PLAN = {
  '1bed':
    'A one-bedroom ADU of about 500 square feet, a long rectangle about 32 by 15 feet, its long side horizontal across the frame: ' +
    'at the left an open living room with a sofa and a small dining table, a straight kitchen run with white cabinets along the top wall; ' +
    'in the middle a bathroom with a walk-in shower, toilet and vanity; at the right a bedroom with a queen bed and two built-in wardrobe closets; ' +
    'a small wood deck outside the sliding door at the bottom left. The plan fills about the middle 60 percent of the frame width. ' + PLAN_STYLE,
};
const PLAN_KEEP =
  ' Keep EXACTLY the same render style, camera, tilt, wall height and colour, floor, furniture style, lighting and pure white background as the input image, ' +
  'and the same scale (one foot is the same size on screen): a smaller home looks smaller in the frame, a bigger one bigger. No text, no labels, no dimensions.';
const PLAN_EDIT = {
  studio:
    'Edit the plan into a studio ADU of about 350 square feet (about 22 by 16 feet), SMALLER in the frame: one open room with the sofa, ' +
    'a queen bed against the right wall and the kitchen run along the top wall, plus a bathroom with a walk-in shower; no separate bedroom; the small wood deck at the bottom left.',
  '2bed':
    'Edit the plan into a two-bedroom ADU of about 750 square feet (about 36 by 21 feet), BIGGER in the frame: the open living, dining and kitchen in the middle, ' +
    'a bedroom with a queen bed and built-in closets at each end, and a bathroom between the kitchen and one bedroom; the small wood deck at the bottom.',
  '3bed':
    'Edit the plan into a three-bedroom ADU of about 1,000 square feet (about 40 by 25 feet), BIGGER again in the frame: the open living, dining and kitchen in the middle, ' +
    'three bedrooms with beds and built-in closets around it, and two bathrooms; the small wood deck at the bottom.',
  garage:
    'Change the SHAPE of this plan: it becomes a garage converted to a studio, a SQUARE about 20 by 20 feet (as deep as it is wide, clearly squarer than the input). ' +
    'Inside: one open room with the sofa, the queen bed and the kitchen run along the top wall, and a bathroom with a walk-in shower in one corner. ' +
    'The bottom wall, where the garage door was, now has a wide window and a glass entry door. Remove the wood deck.',
};

/** Steps 3 and 4: the inside of the same ADU. */
const INTERIOR_STYLE =
  'Photorealistic interior photograph of a brand-new small backyard ADU in Southern California, eye level, wide lens, bright natural daylight, ' +
  'light walls, a 9-foot flat ceiling with small recessed lights, calm and uncluttered, lightly styled. No people, no text, no watermark.';
const KITCHEN_STANDARD =
  'A compact open kitchen along one wall of the living room: white flat-panel cabinets, white quartz counter with a short 6-inch quartz backsplash, ' +
  'a stainless electric range, dishwasher and fridge (simple GE-style appliance package), an undermount sink under a window. ' +
  'WHITE vinyl windows and a white-framed sliding patio door at the side, light grey vinyl plank floor. ' + INTERIOR_STYLE;
const KEEP_ROOM =
  ' Keep EVERYTHING else exactly the same as the input photo: the same room, camera position, angle, lens, walls, ceiling, light and layout. Photorealistic, no people, no text.';
const TO_LUXE_ROOM =
  'Edit the photo: give this room the LUXE finish of the ADU: every window frame and the patio door frame become matte BLACK, the floor becomes wide warm engineered oak planks, ' +
  'the light fixtures become modern black. Keep the cabinets, counters and appliances as they are.';
const KITCHEN_UPGRADE =
  'Edit the photo: upgrade the kitchen: the cabinets become warm natural OAK slab cabinets, the backsplash becomes full-height (24-inch) quartz, ' +
  'and the appliances become a premium Bosch-style package (panel-look stainless range with a sleek hood, counter-depth fridge). Same layout and positions.';
const BEDROOM_STANDARD =
  'Using the input photo ONLY as the style reference (it is the kitchen): show the BEDROOM of the same ADU, with the same window and door frames, floor, walls, ceiling and light: a queen bed with linen bedding, ' +
  'TWO built-in white wardrobe closets with flat doors side by side along one wall, a window beside the bed. ';
const BEDROOM_MORE =
  'Edit the photo: there are now THREE built-in wardrobe closets side by side along the same wall instead of two (the wall of closets is wider), same doors, finish and handles. ' +
  'The bed, window and the rest of the room stay the same.';

/** A plan whose furniture made no sense (owner: "why are there two couches back to back"): fix only the furniture. */
const PLAN_FIX_GARAGE =
  'Fix ONLY the furniture of this floor plan so it is a believable studio: keep the walls, bathroom, kitchen run, windows, door, floor and render style exactly as they are. ' +
  'There must be exactly ONE sofa: keep the sofa against the left wall and delete the second sofa behind it. Move the queen bed so its headboard is against the right wall, ' +
  'below the bathroom, with one nightstand beside it. Put one TV console against the wall facing the sofa, and a small round dining table with two chairs near the kitchen. ' +
  'Remove any other duplicate or floating furniture. No text, no labels.';

const PLAN_FIX_3BED =
  'Fix this floor plan so it is a believable THREE-bedroom ADU of about 1,000 square feet: it must show exactly THREE separate bedrooms, each with one queen bed ' +
  'with its headboard against a wall, a nightstand, a built-in closet and a door; TWO bathrooms, each with a toilet, a vanity and a shower; one open living room with ONE sofa ' +
  'facing a TV console; a dining table with chairs; and the kitchen run. Keep the existing two bedrooms, bathrooms, kitchen and the wood deck; ' +
  'extend the building to the left by about 11 feet to fit the third bedroom (the plan gets a little wider in the frame). Nothing duplicated or back to back. ';

/** Step "Design your bathroom.": the ADU bathroom in each finish's interior style, then the upgraded one. */
const BATH_STANDARD =
  'Using the input photo ONLY as the style reference (it is the kitchen of the same ADU): show the BATHROOM of the same ADU, with the same window frames, wall colour, ceiling and light: ' +
  'a white alcove bathtub with a shower over it and a clear glass panel, white 3x6 subway tile around the tub, a white single vanity with a quartz top and a rectangular mirror, a white toilet, ' +
  'a small window, light grey vinyl plank floor. ';
const BATH_UPGRADE =
  'Edit the photo: upgrade the bathroom: the tub-shower becomes a curbless walk-in shower behind a frameless clear glass panel, with large light porcelain tiles on the shower walls and floor, ' +
  'a rain shower head and a built-in niche. Same room, same window, vanity, mirror, toilet and positions.';

/**
 * Every job edits the photo the funnel showed one step earlier, or the next-smaller size of the same building
 * (studio -> 1 bed -> 2 bed), so the building, lot, camera and light never change. Order matters.
 */
const JOBS = [
  // draft: the backyard before; only an edit source, never shown.
  { key: 'master', prompt: SCENE, draft: true },
  // Exteriors (step 2). The studio is built on the master (footprint); each bigger size grows the previous one.
  { key: 'size-detached-studio', from: 'master', footprint: FOOTPRINT.detached.studio, prompt: BUILD_DETACHED('studio') + STANDARD_ADU + KEEP },
  { key: 'type-detached', from: 'size-detached-studio', prompt: GROW_1BED + KEEP },
  { key: 'size-detached-2bed', from: 'type-detached', prompt: GROW_2BED + KEEP },
  { key: 'size-detached-3bed', from: 'size-detached-2bed', prompt: GROW_3BED + KEEP },
  { key: 'type-garage', from: 'master', prompt: TYPE.garage + KEEP },
  // Luxe: edits of that model's Standard photo.
  { key: 'finish-detached-1bed-luxe', from: 'type-detached', prompt: LUXE + KEEP },
  { key: 'finish-detached-studio-luxe', from: 'size-detached-studio', prompt: LUXE + KEEP },
  { key: 'finish-detached-2bed-luxe', from: 'size-detached-2bed', prompt: LUXE + KEEP },
  { key: 'finish-detached-3bed-luxe', from: 'size-detached-3bed', prompt: LUXE + KEEP },
  { key: 'finish-garage-luxe', from: 'type-garage', prompt: LUXE_GARAGE + KEEP },
  // Floor plans (step 1): the one bedroom first, the others edits of it.
  { key: 'plan-1bed', prompt: PLAN['1bed'], resolution: '1K' },
  { key: 'plan-studio', from: 'plan-1bed', prompt: PLAN_EDIT.studio + PLAN_KEEP, resolution: '1K' },
  { key: 'plan-2bed', from: 'plan-1bed', prompt: PLAN_EDIT['2bed'] + PLAN_KEEP, resolution: '1K' },
  // Superseded by their -fixed edits below (shipped under these names, see ALIASES): kept as edit sources.
  { key: 'plan-3bed', from: 'plan-1bed', prompt: PLAN_EDIT['3bed'] + PLAN_KEEP, resolution: '1K', draft: true },
  { key: 'plan-garage', from: 'plan-studio', prompt: PLAN_EDIT.garage + PLAN_KEEP, resolution: '1K', draft: true },
  // The garage plan came back with two sofas back to back and the bed mid-room: fixed by an edit of itself.
  { key: 'plan-garage-fixed', from: 'plan-garage', prompt: PLAN_FIX_GARAGE + PLAN_KEEP, resolution: '1K', draft: true },
  // The three-bedroom plan came back with only two bedrooms: fixed by an edit of itself.
  { key: 'plan-3bed-fixed', from: 'plan-3bed', prompt: PLAN_FIX_3BED + PLAN_KEEP, resolution: '1K', draft: true },
  // Kitchen (step 3): Standard master, its Luxe twin, each with the upgraded kitchen.
  { key: 'kitchen-standard', prompt: KITCHEN_STANDARD, resolution: '1K' },
  { key: 'kitchen-luxe', from: 'kitchen-standard', prompt: TO_LUXE_ROOM + KEEP_ROOM, resolution: '1K' },
  { key: 'kitchen-standard-upgraded', from: 'kitchen-standard', prompt: KITCHEN_UPGRADE + KEEP_ROOM, resolution: '1K' },
  { key: 'kitchen-luxe-upgraded', from: 'kitchen-luxe', prompt: KITCHEN_UPGRADE + KEEP_ROOM, resolution: '1K' },
  // Bedroom (step 4): a new room styled from the kitchen of the same finish, then the storage edit.
  { key: 'bedroom-standard', refRaw: 'kitchen-standard', prompt: BEDROOM_STANDARD + INTERIOR_STYLE, resolution: '1K' },
  { key: 'bedroom-luxe', from: 'bedroom-standard', prompt: TO_LUXE_ROOM.replace('Keep the cabinets, counters and appliances as they are.', 'Keep the bed, closets and furniture as they are.') + KEEP_ROOM, resolution: '1K' },
  { key: 'bedroom-standard-more', from: 'bedroom-standard', prompt: BEDROOM_MORE + KEEP_ROOM, resolution: '1K' },
  { key: 'bedroom-luxe-more', from: 'bedroom-luxe', prompt: BEDROOM_MORE + KEEP_ROOM, resolution: '1K' },
  // Bathroom ("Design your bathroom."): a new room styled from the kitchen of the same finish, then the upgrade edit.
  { key: 'bath-standard', refRaw: 'kitchen-standard', prompt: BATH_STANDARD + INTERIOR_STYLE },
  // The window stays the same small window (a first try turned it into a tall glass door).
  { key: 'bath-luxe', from: 'bath-standard', prompt: TO_LUXE_ROOM.replace('every window frame and the patio door frame become', 'the frame of the small window above the toilet becomes').replace('Keep the cabinets, counters and appliances as they are.', 'The window keeps EXACTLY its size, shape and position (a small window, not a door). The faucets and shower trim become matte black. Keep the tub, tile, vanity and toilet as they are.') + KEEP_ROOM },
  { key: 'bath-standard-upgraded', from: 'bath-standard', prompt: BATH_UPGRADE + KEEP_ROOM },
  { key: 'bath-luxe-upgraded', from: 'bath-luxe', prompt: BATH_UPGRADE + KEEP_ROOM },
];

/**
 * A step whose pick changes nothing (the finish step's Standard) points at the file the previous step showed
 * (content/estimators/homequote-adu-funnel.ts), so no duplicate files ship. Aliases: a fixed edit shipped under
 * the original name (the garage and three-bedroom plans, whose first versions are kept only as edit sources).
 */
const ALIASES = [
  { key: 'plan-garage', raw: 'plan-garage-fixed' },
  { key: 'plan-3bed', raw: 'plan-3bed-fixed' },
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

async function run(prompt, imageUrls, resolution = RESOLUTION, model = MODEL) {
  const input =
    model === EDIT_MODEL
      ? { prompt, image_urls: imageUrls, aspect_ratio: '3:2', output_format: 'png' }
      : { prompt, aspect_ratio: '3:2', resolution, output_format: 'png' };
  if (model !== EDIT_MODEL && imageUrls?.length) input.image_input = imageUrls;
  const created = await kie(`${API}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input }),
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
    const w = Math.min(width, (await sharp(input).metadata()).width ?? width);
    const buf = await sharp(input).resize({ width: w, height: Math.round(w / 1.5), fit: 'cover' }).webp({ quality: q, effort: 6 }).toBuffer();
    if (buf.length <= maxKb * 1024 || q <= 42) {
      writeFileSync(file, buf);
      return { q, kb: Math.round(buf.length / 1024) };
    }
  }
  throw new Error('unreachable');
}

/** A source with no raw image yet (a fresh machine): its published webp, if it has one. */
async function seedRaw(key) {
  if (!key || existsSync(raw(key))) return;
  const published = path.join(OUT, `${key}.webp`);
  if (existsSync(published)) await sharp(published).png().toFile(raw(key));
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
    for (const src of [job.from, job.refRaw]) await seedRaw(src);
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
    const out = await run(job.prompt, inputs, job.resolution, job.model);
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
