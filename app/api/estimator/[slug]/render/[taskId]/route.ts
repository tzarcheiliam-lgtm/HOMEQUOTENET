import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEstimator } from '@/lib/estimator/registry';
import { RENDER_ACTIVITY_KIND, fetchRenderTask, rendersEnabled, verifyRenderToken, verifyTaskRef } from '@/lib/estimator/render';
import type { RenderStatus } from '@/lib/estimator/render-client';

/**
 * Poll one photoreal render: GET ?token=<renderToken>. The task id is the
 * signed ref POST returned, so a token only ever sees its own lead's renders.
 * One kie.ai status check per call; the browser polls every few seconds.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string; taskId: string }> };

/** A render started near the end of the token's life may still be polled for a while. */
const POLL_GRACE_MS = 30 * 60 * 1000;

const reply = (data: RenderStatus, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request, context: Context) {
  const { slug, taskId: ref } = await context.params;
  if (!getEstimator(slug)) return reply({ status: 'failed', message: 'This estimator is not available.' }, 404);
  if (!rendersEnabled()) return reply({ status: 'failed', message: 'Realistic renders are not switched on.' }, 200);

  const grant = verifyRenderToken(slug, new URL(request.url).searchParams.get('token'), Date.now() - POLL_GRACE_MS);
  if (!grant) return reply({ status: 'failed', message: 'This design session has expired. Refresh the page to start a new one.' }, 401);
  const taskId = verifyTaskRef(slug, grant.leadId, ref);
  if (!taskId) return reply({ status: 'failed', message: 'We couldn’t find that render.' }, 404);

  let result: RenderStatus;
  try {
    result = await fetchRenderTask(taskId);
  } catch (error) {
    console.error('[estimator-render] status check failed', error instanceof Error ? error.message.slice(0, 120) : 'unknown');
    return reply({ status: 'failed', message: 'The render didn’t work this time. Please try again.' }, 502);
  }

  // Put the finished picture on the lead's timeline entry (kie.ai links are temporary, about 14 days).
  if (result.status !== 'running') {
    const metadata = result.status === 'done'
      ? { kind: RENDER_ACTIVITY_KIND, estimator: slug, status: 'done', task_id: taskId, image_url: result.imageUrl }
      : { kind: RENDER_ACTIVITY_KIND, estimator: slug, status: 'failed', task_id: taskId };
    const { error } = await createAdminClient().from('lead_activities').update({ metadata })
      .eq('lead_id', grant.leadId).contains('metadata', { kind: RENDER_ACTIVITY_KIND, task_id: taskId });
    if (error) console.error('[estimator-render] could not record the result', error.code ?? 'unknown');
  }
  return reply(result);
}
