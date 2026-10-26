import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
// The studio's own kie.ai client and model data (studio/src/lib), so the API and the studio map models the same way.
import { KieClient } from '@/studio/src/lib/kie.js';
import { getCatalog } from '@/studio/src/lib/catalog.js';
import { MODEL_INFO } from '@/studio/src/lib/modelInfo.js';
import { PRESETS } from '@/studio/src/lib/presets.js';
import { specsFor } from '@/studio/src/lib/specs.js';

export type Kind = 'image' | 'video';
const BUCKET = 'seret-media';
const SIGNED_URL_SECONDS = 7 * 24 * 3600;
const DEFAULT_MODEL: Record<Kind, string> = { image: 'nano-banana-2', video: 'seedance-v2.0-t2v' };

interface CatalogModel { id: string; name: string; kind: Kind; runsAs: string | null; reason?: string }
interface ModelInfoEntry { maker?: string; tagline?: string; bestFor?: string[]; price?: { text: string } }
interface Specs { aspect: string[]; res: string[]; dur: (string | number)[] }
export interface GenerationRow {
  id: string; kind: Kind; model: string; prompt: string; settings: Record<string, unknown>; kie_task_id: string | null;
  status: 'running' | 'success' | 'failed'; error: string | null; storage_path: string | null; source_url: string | null; created_at: string;
}

export class SeretError extends Error {}

/** kie.ai client using the server's key (env KIE_API_KEY), never a browser key. */
function kie() {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new SeretError('Seret API is not configured: set KIE_API_KEY on the server.');
  const client = new KieClient();
  client.getKey = () => key;
  return client;
}

const available = (): CatalogModel[] => (getCatalog() as CatalogModel[]).filter((m) => m.runsAs);
const info = (m: CatalogModel) => (MODEL_INFO as Record<string, ModelInfoEntry>)[m.runsAs ?? ''];

/** The models the API can run: one per kie.ai model, with the settings each accepts. */
export function listModels(kind?: Kind) {
  const seen = new Set<string>();
  return available()
    .filter((m) => !kind || m.kind === kind)
    .filter((m) => (seen.has(m.runsAs!) ? false : (seen.add(m.runsAs!), true)))
    .map((m) => {
      const s = specsFor(m) as Specs;
      const i = info(m);
      return {
        id: m.id, name: m.runsAs, kind: m.kind, maker: i?.maker ?? null, tagline: i?.tagline ?? null, best_for: i?.bestFor ?? [],
        aspect_ratios: s.aspect, resolutions: s.res, durations_seconds: s.dur.map(Number).filter(Boolean),
        approx_price: i?.price?.text ?? null, default: m.id === DEFAULT_MODEL[m.kind],
      };
    });
}

export const listPresets = () => PRESETS.map((p: { id: string; title: string; page: string; model?: string; aspect_ratio?: string; prompt: string }) => ({
  id: p.id, title: p.title, kind: p.page, model: p.model ?? null, aspect_ratio: p.aspect_ratio ?? null, prompt: p.prompt,
}));

/** Accepts a Seret model id or the kie.ai model name ("Veo 3 Fast"); falls back to the default for the kind. */
export function resolveModel(kind: Kind, wanted?: string): CatalogModel {
  const list = available().filter((m) => m.kind === kind);
  if (!wanted) return list.find((m) => m.id === DEFAULT_MODEL[kind])!;
  const w = wanted.trim().toLowerCase();
  const hit = list.find((m) => m.id.toLowerCase() === w) || list.find((m) => m.runsAs!.toLowerCase() === w) || list.find((m) => m.name.toLowerCase() === w);
  if (hit) return hit;
  const names = [...new Set(list.map((m) => m.runsAs))].join(', ');
  throw new SeretError(`Unknown or unavailable ${kind} model "${wanted}". Available: ${names}.`);
}

function check(value: string | number | undefined, allowed: (string | number)[], label: string) {
  if (value === undefined || value === '' || !allowed.length) return;
  if (!allowed.map(String).map((a) => a.toLowerCase()).includes(String(value).toLowerCase())) {
    throw new SeretError(`${label} "${value}" isn't supported by this model. Allowed: ${allowed.join(', ')}.`);
  }
}

/** Start an image or video on kie.ai and record it. Returns the generation row (status 'running'). */
export async function startGeneration(input: {
  kind: Kind; prompt: string; model?: string; aspect_ratio?: string; resolution?: string; duration?: number; apiKeyId: string;
}): Promise<GenerationRow> {
  const prompt = input.prompt?.trim();
  if (!prompt) throw new SeretError('A prompt is required.');
  if (prompt.length > 4000) throw new SeretError('The prompt is too long (4,000 characters max).');
  const m = resolveModel(input.kind, input.model);
  const s = specsFor(m) as Specs;
  check(input.aspect_ratio, s.aspect, 'Aspect ratio');
  check(input.resolution, s.res, 'Resolution');
  check(input.duration, s.dur, 'Duration');
  const settings = Object.fromEntries(Object.entries({ aspect_ratio: input.aspect_ratio, resolution: input.resolution, duration: input.duration })
    .filter(([, v]) => v !== undefined && v !== ''));

  const db = createAdminClient();
  const { data: row, error } = await db.from('seret_generations')
    .insert({ api_key_id: input.apiKeyId, kind: input.kind, model: m.id, prompt, settings })
    .select('*').single();
  if (error || !row) throw new SeretError(`Couldn't record the job: ${error?.message ?? 'unknown error'}`);

  try {
    const params = { model: m.id, prompt, ...settings, noWait: true };
    const res = input.kind === 'image' ? await kie().generateImage(params) : await kie().generateVideo(params);
    if (!res?.taskId) throw new Error('kie.ai did not return a task id');
    const { data } = await db.from('seret_generations').update({ kie_task_id: res.taskId, updated_at: new Date().toISOString() }).eq('id', row.id).select('*').single();
    return data as GenerationRow;
  } catch (e) {
    const message = (e as Error).message.slice(0, 900);
    await db.from('seret_generations').update({ status: 'failed', error: message, updated_at: new Date().toISOString() }).eq('id', row.id);
    throw new SeretError(`kie.ai rejected the job: ${message}`);
  }
}

/** Ask kie.ai once about a running job; on success copy the file into storage so it outlives kie.ai's retention. */
export async function refreshGeneration(row: GenerationRow): Promise<GenerationRow> {
  if (row.status !== 'running' || !row.kie_task_id) return row;
  const st = await kie().checkTask(row.kie_task_id) as { state: string; url?: string; error?: string };
  const db = createAdminClient();
  const now = new Date().toISOString();
  if (st.state === 'failed') {
    const { data } = await db.from('seret_generations').update({ status: 'failed', error: (st.error || 'Generation failed').slice(0, 900), updated_at: now }).eq('id', row.id).select('*').single();
    return data as GenerationRow;
  }
  if (st.state !== 'success' || !st.url) return row;

  const file = await fetch(st.url);
  if (!file.ok) return row; // try again on the next check
  const type = file.headers.get('content-type') || (row.kind === 'video' ? 'video/mp4' : 'image/png');
  const ext = /mp4/.test(type) ? 'mp4' : /webm/.test(type) ? 'webm' : /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /jpe?g/.test(type) ? 'jpg' : row.kind === 'video' ? 'mp4' : 'png';
  const path = `${row.id}.${ext}`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: type, upsert: true });
  const { data } = await db.from('seret_generations').update({
    status: 'success', source_url: st.url, storage_path: upErr ? null : path, updated_at: now,
  }).eq('id', row.id).select('*').single();
  return data as GenerationRow;
}

export async function getGeneration(id: string): Promise<GenerationRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from('seret_generations').select('*').eq('id', id).maybeSingle();
  return (data as GenerationRow) ?? null;
}

export async function recentGenerations(limit = 20): Promise<GenerationRow[]> {
  const { data } = await createAdminClient().from('seret_generations').select('*')
    .order('created_at', { ascending: false }).limit(Math.min(Math.max(limit, 1), 100));
  return (data as GenerationRow[]) ?? [];
}

/** Public view of a job: status plus a 7-day signed link to the stored file (or kie.ai's link if storing failed). */
export async function describe(row: GenerationRow) {
  let url: string | null = null;
  if (row.storage_path) {
    const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
    url = data?.signedUrl ?? null;
  }
  return {
    id: row.id, kind: row.kind, status: row.status, model: row.model, prompt: row.prompt, settings: row.settings,
    url: url ?? row.source_url ?? null, url_expires: url ? 'in 7 days (ask get_job again for a fresh link)' : null,
    error: row.error, created_at: row.created_at,
  };
}

/** Poll a job for up to `ms` (images usually finish in 10-40s; videos take minutes). */
export async function waitFor(row: GenerationRow, ms: number): Promise<GenerationRow> {
  const end = Date.now() + ms;
  let current = row;
  while (current.status === 'running' && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 3000));
    current = await refreshGeneration(current);
  }
  return current;
}
