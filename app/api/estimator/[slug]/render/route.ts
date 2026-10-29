import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hash, sameOrigin } from '@/lib/funnels/server';
import { getEstimator } from '@/lib/estimator/registry';
import {
  MAX_RENDER_BODY_BYTES, RENDER_ACTIVITY_KIND, RENDERS_PER_IP_HOUR, RENDERS_PER_LEAD, createRenderTask, dailyRenderCap, parseRenderImage,
  renderPromptFor, rendersEnabled, signTaskRef, uploadRenderImage, verifyRenderToken,
} from '@/lib/estimator/render';
import type { RenderStart } from '@/lib/estimator/render-client';

/**
 * Start a photoreal render of the homeowner's finished design (optional; on
 * only with KIE_API_KEY). Body: { renderToken, image: data URL of the scene }.
 * The token comes from the saved-lead response, so only someone who just
 * finished the estimator can spend renders, and each one is recorded on that
 * lead's timeline (which is also the durable per-lead, per-visitor and daily
 * counter).
 *
 * The limits are reserve-then-count: the row is inserted first, then the rows
 * are counted (this one included) and the request backs out (deleting its row)
 * when over a limit. Every request counts after its own insert, so of N
 * parallel requests the k-th to count sees at least k rows: no more than the
 * limit ever reach kie.ai, without a lock or a migration.
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
  const registered = getEstimator(slug);
  if (!registered) return refuse('invalid', 'This estimator is not available.', 404);
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
  // Hourly per-visitor key: a daily hash of the address (the lead route's scheme), never the raw IP.
  const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'local';
  const rateKey = hash(`render:${address.split(',')[0]!.trim()}:${new Date().toISOString().slice(0, 10)}`);
  const metadata = { kind: RENDER_ACTIVITY_KIND, estimator: slug, rate_key: rateKey };
  let activityId: string | null = null;
  const release = async () => {
    if (!activityId) return;
    const { error: releaseError } = await db.from('lead_activities').delete().eq('id', activityId);
    if (releaseError) console.error('[estimator-render] could not release the slot', releaseError.code ?? 'unknown');
    activityId = null;
  };
  try {
    // 1. Reserve: this row is counted below, by this request and by any running in parallel.
    const { data: row, error: insertError } = await db.from('lead_activities').insert({
      lead_id: grant.leadId, type: 'system', body: 'Homeowner asked for a realistic render of their estimator design',
      metadata: { ...metadata, status: 'starting' },
    }).select('id').single();
    if (insertError) throw insertError;
    activityId = (row as { id: string }).id;

    // 2. Count (own row included): this lead, this visitor in the last hour, everyone in the last 24 hours.
    const since = (ms: number) => new Date(Date.now() - ms).toISOString();
    const [mine, visitor, all] = await Promise.all([
      db.from('lead_activities').select('id', { count: 'exact', head: true })
        .eq('lead_id', grant.leadId).contains('metadata', { kind: RENDER_ACTIVITY_KIND }),
      db.from('lead_activities').select('id', { count: 'exact', head: true })
        .contains('metadata', { kind: RENDER_ACTIVITY_KIND, rate_key: rateKey }).gte('created_at', since(3_600_000)),
      db.from('lead_activities').select('id', { count: 'exact', head: true })
        .contains('metadata', { kind: RENDER_ACTIVITY_KIND }).gte('created_at', since(86_400_000)),
    ]);
    for (const result of [mine, visitor, all]) if (result.error) throw result.error;
    if ((mine.count ?? 0) > RENDERS_PER_LEAD) {
      await release();
      return refuse('limit', `You’ve made ${RENDERS_PER_LEAD} realistic renders, the most for one design. Your designer can make more with you.`, 429);
    }
    if ((visitor.count ?? 0) > RENDERS_PER_IP_HOUR) {
      await release();
      return refuse('limit', 'You’ve made a lot of realistic renders this hour. Please try again later, or your designer can make more with you.', 429);
    }
    if ((all.count ?? 0) > dailyRenderCap()) {
      await release();
      return refuse('limit', 'We’ve reached today’s limit for realistic renders. Your design is saved and your designer will follow up.', 429);
    }

    const imageUrl = await uploadRenderImage(picture, `${slug}-${activityId}`);
    const taskId = await createRenderTask(imageUrl, renderPromptFor(registered.template.trade));
    const taskRef = signTaskRef(slug, grant.leadId, taskId);
    if (!taskRef) throw new Error('Could not sign the task');

    const { error: updateError } = await db.from('lead_activities')
      .update({ metadata: { ...metadata, status: 'running', task_id: taskId } }).eq('id', activityId);
    if (updateError) console.error('[estimator-render] could not record the task', updateError.code ?? 'unknown');
    return reply({ ok: true, taskId: taskRef });
  } catch (error) {
    console.error('[estimator-render] start failed', error instanceof Error ? error.message.slice(0, 120) : (error as { code?: string })?.code ?? 'unknown');
    await release();
    return refuse('error', 'We couldn’t start the render. Please try again in a moment.', 502);
  }
}
