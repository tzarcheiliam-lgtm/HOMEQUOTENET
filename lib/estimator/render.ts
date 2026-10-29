import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RenderStatus } from './render-client.ts';

/**
 * Server side of the optional photoreal render (see render-client.ts for the
 * flow). Three pieces:
 *
 * - Tokens. A saved estimator lead gets a renderToken: HMAC-SHA256 over
 *   "slug.leadId.expiry", valid 2 hours. The key is derived from env
 *   ESTIMATOR_RENDER_SECRET (or SUPABASE_SERVICE_ROLE_KEY when unset); it
 *   never leaves the server. Render task ids handed to the browser are signed
 *   the same way against the lead, so a token can only poll its own renders.
 * - Limits. Each render is a lead_activities row on that lead (metadata.kind
 *   'estimator_render'; internal visibility, so staff see it on the lead
 *   timeline), which is also the durable counter: at most RENDERS_PER_LEAD per
 *   lead, RENDERS_PER_IP_HOUR per visitor per hour and ESTIMATOR_RENDER_DAILY_CAP
 *   (default 100) across all estimators per 24 h. The row is inserted BEFORE
 *   counting, so parallel requests always see each other (see the POST route).
 * - kie.ai. The PNG is uploaded (file-stream-upload on kie.ai's upload host), then an image-edit
 *   task (nano-banana-pro, image_input) turns it into a photo that keeps the
 *   layout: a drone photo for a pool, an eye-level interior photo for a
 *   bathroom (renderPromptFor picks by the template's trade). Renders are on
 *   only when env KIE_API_KEY is set.
 *
 * Never log the key, the secret, a token or image data.
 */

export const RENDER_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
export const RENDERS_PER_LEAD = 3;
/** Render starts per visitor (hashed IP + day, never the raw address) per hour, across leads. */
export const RENDERS_PER_IP_HOUR = 6;
/** Header the browser sends the renderToken in (never the query string, which lands in access logs). */
export const RENDER_TOKEN_HEADER = 'x-render-token';
export const DEFAULT_DAILY_RENDER_CAP = 100;
/** Decoded image limit. Vercel caps request bodies at 4.5 MB, so the client re-encodes big PNGs as JPEG. */
export const MAX_RENDER_IMAGE_BYTES = 6 * 1024 * 1024;
/** Base64 of the largest image plus JSON overhead. */
export const MAX_RENDER_BODY_BYTES = Math.ceil((MAX_RENDER_IMAGE_BYTES * 4) / 3) + 16 * 1024;
/** lead_activities.metadata.kind of a render row. */
export const RENDER_ACTIVITY_KIND = 'estimator_render';

const KIE_BASE = 'https://api.kie.ai';
/** kie.ai serves file uploads from a separate host, with no /v1 (same as scripts/generate-scene-textures.mjs). */
const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co';
const MODELS = ['nano-banana-pro', 'nano-banana-2'] as const;
type RenderModel = (typeof MODELS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const KIE_TASK = /^[A-Za-z0-9_-]{4,128}$/;

export const RENDER_PROMPT = [
  'Turn this top-down design illustration into a photorealistic straight-down drone photograph of a Southern California backyard pool.',
  'Keep exactly the same layout, framing, pool shape and size, materials, colours and objects: do not add, remove, move or resize anything.',
  'Camera looks straight down from above, the same crop as the input.',
  'Realistic clear turquoise water with soft light caustics on the pool floor and a gentle sun glint; crisp coping edges and waterline tile;',
  'real paver, stone, concrete and wood textures with fine joints; natural grass, plants and trees; furniture as real outdoor furniture.',
  'Soft natural shadows, bright midday Southern California light, true-to-life colours, sharp detail.',
  'No text, no labels, no watermark, no people.',
].join(' ');

/** The bathroom builder's scene is a front-on elevation, so the photo is shot straight-on at eye level. */
export const BATHROOM_RENDER_PROMPT = [
  'Turn this bathroom design illustration into a photorealistic interior photograph of a newly remodeled bathroom,',
  'shot straight-on at eye level with a wide-angle lens.',
  'Keep exactly the same layout, fixtures, tile patterns, materials, colours and finishes;',
  'realistic grout lines, glass reflections, soft natural window light and warm accent lighting.',
  'No text, no people, no logos.',
].join(' ');

/** Edit prompt per trade (EstimatorTemplate.trade); anything unknown keeps the pool prompt. Kitchen slots in here. */
const RENDER_PROMPTS: Record<string, string> = { pool: RENDER_PROMPT, bathroom: BATHROOM_RENDER_PROMPT };

/** The render prompt for an estimator's trade. */
export function renderPromptFor(trade: string): string {
  return Object.hasOwn(RENDER_PROMPTS, trade) ? RENDER_PROMPTS[trade]! : RENDER_PROMPT;
}

/** True when the server can run renders (kie.ai key and a signing secret). */
export function rendersEnabled(): boolean {
  return !!process.env.KIE_API_KEY && !!renderKey();
}

/** Signing key, derived (never the raw secret) so the service-role fallback is not reused verbatim. */
function renderKey(): Buffer | null {
  const secret = process.env.ESTIMATOR_RENDER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHmac('sha256', secret).update('hqn-estimator-render-v1').digest() : null;
}

function sign(message: string): string | null {
  const key = renderKey();
  return key ? createHmac('sha256', key).update(message).digest('base64url') : null;
}

function sameSignature(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** "leadId.expiry.signature" for a saved lead, or null when renders are off. */
export function signRenderToken(slug: string, leadId: string, now = Date.now()): string | null {
  if (!rendersEnabled() || !SLUG.test(slug) || !UUID.test(leadId)) return null;
  const expiry = String(Math.floor((now + RENDER_TOKEN_TTL_MS) / 1000));
  const signature = sign(`${slug}.${leadId}.${expiry}`);
  return signature ? `${leadId}.${expiry}.${signature}` : null;
}

export type RenderGrant = { leadId: string; expiresAt: number };

/** The lead a token was issued for, or null (bad shape, wrong estimator, expired, forged). */
export function verifyRenderToken(slug: string, token: unknown, now = Date.now()): RenderGrant | null {
  if (typeof token !== 'string' || token.length > 200 || !SLUG.test(slug)) return null;
  const [leadId, expiry, signature, extra] = token.split('.');
  if (extra !== undefined || !leadId || !expiry || !signature || !UUID.test(leadId) || !/^\d{9,11}$/.test(expiry)) return null;
  const expected = sign(`${slug}.${leadId}.${expiry}`);
  if (!expected || !sameSignature(signature, expected)) return null;
  const expiresAt = Number(expiry) * 1000;
  return expiresAt > now ? { leadId, expiresAt } : null;
}

/** The id the browser polls with: the kie.ai task id plus a signature tying it to the lead. */
export function signTaskRef(slug: string, leadId: string, kieTaskId: string): string | null {
  if (!KIE_TASK.test(kieTaskId)) return null;
  const signature = sign(`task.${slug}.${leadId}.${kieTaskId}`);
  return signature ? `${kieTaskId}.${signature}` : null;
}

/** kie.ai task id from a signed ref, or null when it was not issued for this lead. */
export function verifyTaskRef(slug: string, leadId: string, ref: unknown): string | null {
  if (typeof ref !== 'string' || ref.length > 300) return null;
  const [taskId, signature, extra] = ref.split('.');
  if (extra !== undefined || !taskId || !signature || !KIE_TASK.test(taskId)) return null;
  const expected = sign(`task.${slug}.${leadId}.${taskId}`);
  return expected && sameSignature(signature, expected) ? taskId : null;
}

/** 24-hour cap on renders across every estimator (env ESTIMATOR_RENDER_DAILY_CAP). */
export function dailyRenderCap(): number {
  const value = Number(process.env.ESTIMATOR_RENDER_DAILY_CAP);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : DEFAULT_DAILY_RENDER_CAP;
}

const IMAGE_TYPES = {
  png: { mime: 'image/png', ext: 'png', magic: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', magic: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  webp: { mime: 'image/webp', ext: 'webp', magic: (b: Buffer) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
} as const;

export type RenderImage = { bytes: Buffer; mime: string; ext: string };

/**
 * Decode the browser's snapshot: a PNG (or the JPEG/WebP the client falls
 * back to for big pictures) data URL whose bytes really are that format.
 */
export function parseRenderImage(value: unknown): RenderImage | { error: 'invalid' | 'too_large' } {
  if (typeof value !== 'string') return { error: 'invalid' };
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return { error: 'invalid' };
  const encoded = match[2]!;
  if (Math.floor((encoded.length * 3) / 4) > MAX_RENDER_IMAGE_BYTES) return { error: 'too_large' };
  const type = IMAGE_TYPES[match[1] as keyof typeof IMAGE_TYPES];
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < 64 || !type.magic(bytes)) return { error: 'invalid' };
  return { bytes, mime: type.mime, ext: type.ext };
}

function kieKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error('Renders are not configured');
  return key;
}

function renderModel(): RenderModel {
  const wanted = process.env.ESTIMATOR_RENDER_MODEL;
  return (MODELS as readonly string[]).includes(wanted ?? '') ? (wanted as RenderModel) : 'nano-banana-pro';
}

type KieJson = { code?: number; msg?: string; data?: Record<string, unknown> | null };

async function kieJson(res: Response, step: string): Promise<KieJson> {
  const json = (await res.json().catch(() => null)) as KieJson | null;
  // Only the status codes go in errors: kie.ai bodies can echo request details.
  if (!res.ok || !json || (json.code !== undefined && json.code !== 200)) {
    throw new Error(`kie.ai ${step} failed (${res.status}${json?.code ? `/${json.code}` : ''})`);
  }
  return json;
}

/** Upload the snapshot to kie.ai's temporary file store; returns its public URL. */
export async function uploadRenderImage(image: RenderImage, name: string): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(image.bytes)], { type: image.mime }), `${name}.${image.ext}`);
  form.append('uploadPath', 'estimator-renders');
  form.append('fileName', `${name}.${image.ext}`);
  const res = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
    method: 'POST', headers: { Authorization: `Bearer ${kieKey()}` }, body: form, signal: AbortSignal.timeout(30_000),
  });
  const data = (await kieJson(res, 'upload')).data ?? {};
  const url = [data.downloadUrl, data.fileUrl, data.url].find((v): v is string => typeof v === 'string' && /^https:\/\//.test(v));
  if (!url) throw new Error('kie.ai upload returned no URL');
  return url;
}

/** Start the image-edit task (prompt from renderPromptFor; the pool prompt by default); returns kie.ai's task id. */
export async function createRenderTask(imageUrl: string, prompt: string = RENDER_PROMPT): Promise<string> {
  const res = await fetch(`${KIE_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kieKey()}` },
    body: JSON.stringify({
      model: renderModel(),
      input: { prompt, image_input: [imageUrl], aspect_ratio: '3:2', resolution: '2K', output_format: 'jpg' },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const taskId = (await kieJson(res, 'createTask')).data?.taskId;
  if (typeof taskId !== 'string' || !KIE_TASK.test(taskId)) throw new Error('kie.ai returned no task id');
  return taskId;
}

function resultUrl(data: Record<string, unknown>): string | null {
  const pick = (v: unknown) => (Array.isArray(v) ? v.find((u): u is string => typeof u === 'string' && /^https:\/\//.test(u)) ?? null : null);
  if (typeof data.resultJson === 'string') {
    try { return pick((JSON.parse(data.resultJson) as { resultUrls?: unknown }).resultUrls); } catch { return null; }
  }
  return pick(data.resultUrls) ?? pick((data.response as { resultUrls?: unknown } | undefined)?.resultUrls);
}

/** Ask kie.ai once how the task is doing. A hiccup reads as still running so the browser keeps polling. */
export async function fetchRenderTask(taskId: string): Promise<RenderStatus> {
  let data: Record<string, unknown>;
  try {
    const res = await fetch(`${KIE_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${kieKey()}` }, signal: AbortSignal.timeout(15_000), cache: 'no-store',
    });
    if (res.status >= 500) return { status: 'running' };
    data = (await kieJson(res, 'recordInfo')).data ?? {};
  } catch (error) {
    if (error instanceof Error && /timeout|abort|fetch failed/i.test(`${error.name} ${error.message}`)) return { status: 'running' };
    throw error;
  }
  const state = String(data.state ?? '').toLowerCase();
  if (state === 'success') {
    const url = resultUrl(data);
    return url ? { status: 'done', imageUrl: url } : { status: 'failed', message: 'The render finished without a picture. Please try again.' };
  }
  if (state === 'fail' || state === 'error') return { status: 'failed', message: 'The render didn’t work this time. Please try again.' };
  return { status: 'running' };
}
