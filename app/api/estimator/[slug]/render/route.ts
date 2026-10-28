import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sameOrigin } from '@/lib/funnels/server';
import { getEstimator } from '@/lib/estimator/registry';
import {
  MAX_RENDER_BODY_BYTES, RENDER_ACTIVITY_KIND, RENDERS_PER_LEAD, createRenderTask, dailyRenderCap, parseRenderImage,
  rendersEnabled, signTaskRef, uploadRenderImage, verifyRenderToken,
} from '@/lib/estimator/render';
import type { RenderStart } from '@/lib/estimator/render-client';

/**
 * Start a photoreal render of the homeowner's finished design (optional; on
 * only with KIE_API_KEY). Body: { renderToken, image: data URL of the scene }.
 * The token comes from the saved-lead response, so only someone who just
 * finished the estimator can spend renders, and each one is recorded on that
 * lead's timeline (which is also the durable per-lead and daily counter).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ slug: string }> };

const reply = (data: RenderStart, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const refuse = (reason: Exclude<RenderStart, { ok: true }>['reason'], message: string, status: number) => reply({ ok: false, reason, message }, status);

class TooLarge extends Error {}

/** JSON body up to `max` bytes (the funnel readBody stops at 20 KB; a snapshot is a few MB). */
async function readJson(request: Request, max: number): Promise<unknown> {
  if (Number(request.headers.get('content-length') ?? 0) > max) throw new TooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new TooLarge(); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return refuse('invalid', 'Invalid origin.', 403);
  const slug = (await context.params).slug;
  if (!getEstimator(slug)) return refuse('invalid', 'This estimator is not available.', 404);
  if (!rendersEnabled()) return refuse('disabled', 'Realistic renders are not switched on.', 200);

  let body: unknown;
  try {
    body = await readJson(request, MAX_RENDER_BODY_BYTES);
  } catch (error) {
    return error instanceof TooLarge
      ? refuse('invalid', 'That picture is too large to send.', 413)
      : refuse('invalid', 'We couldn’t read that request. Please try again.', 400);
  }
  const { renderToken, image } = (body && typeof body === 'object' ? body : {}) as { renderToken?: unknown; image?: unknown };

  const grant = verifyRenderToken(slug, renderToken);
  if (!grant) return refuse('invalid', 'This design session has expired. Refresh the page to start a new one.', 401);
  const picture = parseRenderImage(image);
  if ('error' in picture) {
    return picture.error === 'too_large'
      ? refuse('invalid', 'That picture is too large to send.', 413)
      : refuse('invalid', 'That picture could not be read.', 422);
  }

  const db = createAdminClient();
  let activityId: string | null = null;
  try {
    // Limits: renders already on this lead, then renders everywhere in the last 24 hours.
    const mine = await db.from('lead_activities').select('id', { count: 'exact', head: true })
      .eq('lead_id', grant.leadId).contains('metadata', { kind: RENDER_ACTIVITY_KIND });
    if (mine.error) throw mine.error;
    if ((mine.count ?? 0) >= RENDERS_PER_LEAD) {
      return refuse('limit', `You’ve made ${RENDERS_PER_LEAD} realistic renders, the most for one design. Your designer can make more with you.`, 429);
    }
    const all = await db.from('lead_activities').select('id', { count: 'exact', head: true })
      .contains('metadata', { kind: RENDER_ACTIVITY_KIND }).gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
    if (all.error) throw all.error;
    if ((all.count ?? 0) >= dailyRenderCap()) {
      return refuse('limit', 'We’ve reached today’s limit for realistic renders. Your design is saved and your designer will follow up.', 429);
    }

    // Reserve the slot first so parallel clicks count; released again if kie.ai refuses the job.
    const { data: row, error: insertError } = await db.from('lead_activities').insert({
      lead_id: grant.leadId, type: 'system', body: 'Homeowner asked for a realistic render of their estimator design',
      metadata: { kind: RENDER_ACTIVITY_KIND, estimator: slug, status: 'starting' },
    }).select('id').single();
    if (insertError) throw insertError;
    activityId = (row as { id: string }).id;

    const imageUrl = await uploadRenderImage(picture, `${slug}-${activityId}`);
    const taskId = await createRenderTask(imageUrl);
    const taskRef = signTaskRef(slug, grant.leadId, taskId);
    if (!taskRef) throw new Error('Could not sign the task');

    const { error: updateError } = await db.from('lead_activities')
      .update({ metadata: { kind: RENDER_ACTIVITY_KIND, estimator: slug, status: 'running', task_id: taskId } }).eq('id', activityId);
    if (updateError) console.error('[estimator-render] could not record the task', updateError.code ?? 'unknown');
    return reply({ ok: true, taskId: taskRef });
  } catch (error) {
    console.error('[estimator-render] start failed', error instanceof Error ? error.message.slice(0, 120) : (error as { code?: string })?.code ?? 'unknown');
    if (activityId) {
      const { error: releaseError } = await db.from('lead_activities').delete().eq('id', activityId);
      if (releaseError) console.error('[estimator-render] could not release the slot', releaseError.code ?? 'unknown');
    }
    return refuse('error', 'We couldn’t start the render. Please try again in a moment.', 502);
  }
}
