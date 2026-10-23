#!/usr/bin/env node
// Generates Seret's sample images and videos with YOUR kie.ai key, saves them in studio/public/samples/ and
// writes studio/src/lib/samples.js. Run it once by hand (never during a build):
//
//   KIE_API_KEY=xxxx node studio/scripts/generate-samples.mjs              # shows the plan + cost, asks first
//   KIE_API_KEY=xxxx node studio/scripts/generate-samples.mjs --images-only
//   KIE_API_KEY=xxxx node studio/scripts/generate-samples.mjs --yes        # skip the question
//   node studio/scripts/generate-samples.mjs --optimize-existing           # shrink files already downloaded (no key needed)
//
// With ffmpeg installed, downloads are shrunk for the web: videos to at most 1280px wide H.264 with a poster
// frame, images to at most 1600px WebP. Without ffmpeg the originals are kept.
// It is safe to re-run: files that already exist are kept, and only missing samples are generated (and paid for).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'samples');
const MANIFEST = join(ROOT, 'src', 'lib', 'samples.js');
const args = new Set(process.argv.slice(2));

if (args.has('--optimize-existing')) {
    const manifest = loadManifest();
    for (const list of [...Object.values(manifest.byModel), ...Object.values(manifest.byPreset), manifest.feed]) {
        for (const entry of list) {
            const file = entry.url.split('/').pop();
            if (!existsSync(join(OUT_DIR, file))) continue;
            Object.assign(entry, toEntryFiles(optimize(file, entry.type)));
            console.log(`optimized ${file} -> ${entry.url.split('/').pop()}`);
        }
    }
    writeManifest(manifest);
    process.exit(0);
}

const KEY = process.env.KIE_API_KEY;
if (!KEY) {
    console.error('Set KIE_API_KEY to your kie.ai API key (https://kie.ai/api-key).');
    process.exit(1);
}
// kie.js is the studio's browser client; give it what it expects from a browser.
globalThis.__KIE_KEY__ = KEY;
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

const { kie } = await import('../src/lib/kie.js');
const { getCatalog } = await import('../src/lib/catalog.js');
const { PRESETS } = await import('../src/lib/presets.js');
const { specsFor } = await import('../src/lib/specs.js');

// Estimated USD per job at the cheapest settings used below (shortest length, lowest resolution).
// "kie.ai" = shown on kie.ai's own site on 2026-10-23; "est" = no price found there, a cautious guess.
const COST = {
    'Nano Banana': [0.02, 'est'], 'Nano Banana 2': [0.04, 'kie.ai'], 'Nano Banana Pro': [0.09, 'kie.ai'], 'Grok Imagine': [0.02, 'est'],
    'Seedance 2 Fast': [0.30, 'est'], 'Seedance 2': [0.45, 'est'], 'Seedance 1.5 Pro': [0.30, 'est'], 'Kling 2.1 Pro': [0.50, 'est'],
    'Veo 3': [2.00, 'kie.ai'], 'Veo 3 Fast': [0.40, 'kie.ai'], 'Wan 3.0': [0.20, 'kie.ai'], 'Sora 2': [0.50, 'est'], 'Sora 2 Pro': [1.50, 'est'],
};

// Home-service prompts, so samples look like the ads Seret is for.
const IMAGE_PROMPTS = [
    'Bright modern kitchen remodel, white oak cabinets, quartz island, brass fixtures, morning light, real estate photo, ultra realistic',
    'Luxury backyard with a new pool and travertine deck at golden hour, outdoor lounge, professional architectural photo',
];
const VIDEO_PROMPT = 'Slow cinematic drone shot rising over a newly remodeled suburban home with a backyard pool at golden hour, realistic';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const cheapest = (list, prefer) => prefer.find((p) => list.map(String).map((x) => x.toLowerCase()).includes(p)) ?? list[0];

// One representative Seret model id per model kie.ai actually runs.
const models = [...new Map(getCatalog().filter((m) => m.runsAs).map((m) => [m.runsAs, m])).values()];
const jobs = [];
for (const m of models) {
    const spec = specsFor(m);
    const base = {
        model: m.id,
        aspect_ratio: spec.aspect.includes('16:9') ? '16:9' : spec.aspect[0],
        resolution: spec.res.length ? cheapest(spec.res, ['1k', '480p', '720p']) : undefined,
    };
    if (m.kind === 'image') {
        IMAGE_PROMPTS.forEach((prompt, i) => jobs.push({ kind: 'image', group: 'byModel', key: m.runsAs, file: `${slug(m.runsAs)}-${i + 1}`,
            params: { ...base, prompt, aspect_ratio: i === 0 && spec.aspect.includes('4:5') ? '4:5' : base.aspect_ratio }, cost: COST[m.runsAs] }));
    } else if (!args.has('--images-only')) {
        jobs.push({ kind: 'video', group: 'byModel', key: m.runsAs, file: `${slug(m.runsAs)}-1`,
            params: { ...base, prompt: VIDEO_PROMPT, duration: spec.dur.length ? Math.min(...spec.dur.map(Number)) : undefined }, cost: COST[m.runsAs] });
    }
}
// A cover image for every preset, made with Nano Banana 2 (cheap) from the preset's own prompt.
for (const p of PRESETS) {
    jobs.push({ kind: 'image', group: 'byPreset', key: p.id, file: `preset-${p.id}`,
        params: { model: 'nano-banana-2', prompt: p.prompt, aspect_ratio: '4:5', resolution: '1k' }, cost: COST['Nano Banana 2'] });
}

// Keep what earlier runs produced; only missing files are generated.
const manifest = loadManifest();
const exists = (j) => ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'webm'].some((ext) => existsSync(join(OUT_DIR, `${j.file}.${ext}`)));
const todo = jobs.filter((j) => !exists(j));

const total = todo.reduce((sum, j) => sum + (j.cost?.[0] ?? 1), 0);
console.log(`\nSeret samples: ${jobs.length} planned, ${jobs.length - todo.length} already done, ${todo.length} to generate.\n`);
for (const j of todo) console.log(`  ${j.kind.padEnd(5)}  ${j.key.padEnd(22)}  ≈ $${(j.cost?.[0] ?? 1).toFixed(2)}${j.cost?.[1] === 'est' || !j.cost ? ' (estimate)' : ''}`);
console.log(`\n  Estimated total ≈ $${total.toFixed(2)} (≈ ${Math.round(total / 0.005).toLocaleString()} kie.ai credits)\n`);
if (!todo.length) { writeManifest(manifest); process.exit(0); }

if (!args.has('--yes')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Spend these credits and generate? (y/N) ')).trim().toLowerCase();
    rl.close();
    if (answer !== 'y' && answer !== 'yes') { console.log('Nothing generated.'); process.exit(0); }
}

mkdirSync(OUT_DIR, { recursive: true });
let failed = 0;
for (const j of todo) {
    process.stdout.write(`→ ${j.key} (${j.kind})… `);
    try {
        const res = j.kind === 'image' ? await kie.generateImage(j.params) : await kie.generateVideo(j.params);
        if (!res?.url) throw new Error('kie.ai returned no file URL');
        // kie.ai only keeps results for a limited time, so download a copy.
        const file = await download(res.url, j.file, j.kind);
        (manifest[j.group][j.key] ??= []).push({ ...toEntryFiles(optimize(file, j.kind)), type: j.kind, prompt: j.params.prompt, settings: clean(j.params) });
        writeManifest(manifest); // after every success, so a crash never loses paid-for work
        console.log(`saved ${file}`);
    } catch (e) {
        failed++;
        console.log(`FAILED: ${e.message}`);
    }
}
console.log(`\nDone. ${todo.length - failed} generated, ${failed} failed. Re-run to retry the failed ones.`);
console.log('Then: npm run build:studio, check /studio, and commit studio/public/samples + studio/src/lib/samples.js.');

async function download(url, name, kind) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download failed (${r.status})`);
    const type = r.headers.get('content-type') || '';
    const ext = /mp4/.test(type) ? 'mp4' : /webm/.test(type) ? 'webm' : /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /jpe?g/.test(type) ? 'jpg'
        : (url.match(/\.(mp4|webm|png|webp|jpe?g)(\?|$)/i)?.[1] || (kind === 'video' ? 'mp4' : 'png')).toLowerCase();
    const file = `${name}.${ext}`;
    writeFileSync(join(OUT_DIR, file), Buffer.from(await r.arrayBuffer()));
    return file;
}

function hasFfmpeg() {
    try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}
function ff(...a) {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
}

/** Shrink a downloaded file for the web. Returns { file, poster? } (names inside OUT_DIR). */
function optimize(file, kind) {
    if (!hasFfmpeg()) return { file };
    const src = join(OUT_DIR, file);
    const base = file.replace(/\.[^.]+$/, '');
    if (kind === 'video') {
        const tmp = join(OUT_DIR, `${base}.tmp.mp4`);
        ff('-i', src, '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-crf', '27', '-preset', 'slow', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', tmp);
        if (src !== join(OUT_DIR, `${base}.mp4`)) rmSync(src);
        renameSync(tmp, join(OUT_DIR, `${base}.mp4`));
        const poster = `${base}-poster.webp`;
        ff('-ss', '1', '-i', join(OUT_DIR, `${base}.mp4`), '-frames:v', '1', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libwebp', '-quality', '78', join(OUT_DIR, poster));
        return { file: `${base}.mp4`, poster };
    }
    if (file.endsWith('.webp')) return { file };
    ff('-i', src, '-vf', "scale='min(1600,iw)':-2", '-c:v', 'libwebp', '-quality', '80', join(OUT_DIR, `${base}.webp`));
    rmSync(src);
    return { file: `${base}.webp` };
}

function toEntryFiles({ file, poster }) {
    return { url: `/studio/samples/${file}`, ...(poster ? { poster: `/studio/samples/${poster}` } : {}) };
}

function clean(params) {
    const { prompt, model, ...rest } = params;
    return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

function loadManifest() {
    const empty = { byModel: {}, byPreset: {}, feed: [] };
    try {
        const src = readFileSync(MANIFEST, 'utf8');
        const json = src.match(/export const SAMPLES = (\{[\s\S]*\});/)?.[1];
        // The file this script writes is JSON after the `=`; the hand-written starter (with comments) isn't, so it parses as empty.
        return { ...empty, ...JSON.parse(json) };
    } catch { return empty; }
}

function writeManifest(m) {
    writeFileSync(MANIFEST, `// Sample outputs shown on Explore, the Models gallery and model pages. GENERATED by
// \`node studio/scripts/generate-samples.mjs\` (files in studio/public/samples/). Re-run the script to add missing ones.
// Entry: { url, type: 'image' | 'video', poster?, prompt, settings }.

export const SAMPLES = ${JSON.stringify(m, null, 2)};
`);
}
