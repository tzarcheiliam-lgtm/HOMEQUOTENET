import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEstimator } from '@/lib/estimator/registry';
import { RENDER_ACTIVITY_KIND, RENDER_TOKEN_HEADER, fetchRenderTask, rendersEnabled, verifyRenderToken, verifyTaskRef } from '@/lib/estimator/render';
import type { RenderStatus } from '@/lib/estimator/render-client';

/**
 * Poll one photoreal render. The renderToken comes in the x-render-token
 * header (never the query string, which lands in access logs). The task id is
 * the signed ref POST returned, so a token only ever sees its own lead's
 * renders. At most one kie.ai status check per task every MIN_POLL_GAP_MS on
 * this server instance; a faster poll just hears "running".
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string; taskId: string }> };

/** A render started near the end of the token's life may still be polled for a while. */
const POLL_GRACE_MS = 30 * 60 * 1000;
const MIN_POLL_GAP_MS = 2000;
/** Last kie.ai check per task (per instance; bounded, oldest dropped first). */
const lastCheck = new Map<string, number>();

function tooSoon(taskId: string, now = Date.now()): boolean {
  const last = lastCheck.get(taskId);
  if (last !== undefined && now - last < MIN_POLL_GAP_MS) return true;
  lastCheck.delete(taskId);
  lastCheck.set(taskId, now);
  if (lastCheck.size > 500) lastCheck.delete(lastCheck.keys().next().value!);
  return false;
}

const reply = (data: RenderStatus, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request, context: Context) {
  const { slug, taskId: ref } = await context.params;
  if (!getEstimator(slug)) return reply({ status: 'failed', message: 'This estimator is not available.' }, 404);
  if (!rendersEnabled()) return reply({ status: 'failed', message: 'Realistic renders are not switched on.' }, 200);

  const grant = verifyRenderToken(slug, request.headers.get(RENDER_TOKEN_HEADER), Date.now() - POLL_GRACE_MS);
  if (!grant) return reply({ status: 'failed', message: 'This design session has expired. Refresh the page to start a new one.' }, 401);
  const taskId = verifyTaskRef(slug, grant.leadId, ref);
  if (!taskId) return reply({ status: 'failed', message: 'We couldn’t find that render.' }, 404);

  if (tooSoon(taskId)) return reply({ status: 'running' });

  let result: RenderStatus;
  try {
    result = await fetchRenderTask(taskId);
  } catch (error) {
    console.error('[estimator-render] status check failed', error instanceof Error ? error.message.slice(0, 120) : 'unknown');
    return reply({ status: 'failed', message: 'The render didn’t work this time. Please try again.' }, 502);
  }

  // Put the finished picture on the lead's timeline entry (kie.ai links are temporary, about 14 days).
  // The row's other metadata (rate_key counts toward the hourly limit) is kept.
  if (result.status !== 'running') {
    const db = createAdminClient();
    const { data: rows, error: readError } = await db.from('lead_activities').select('id, metadata')
      .eq('lead_id', grant.leadId).contains('metadata', { kind: RENDER_ACTIVITY_KIND, task_id: taskId });
    const row = (rows as { id: string; metadata: Record<string, unknown> | null }[] | null)?.[0];
    if (readError || !row) {
      if (readError) console.error('[estimator-render] could not read the render row', readError.code ?? 'unknown');
    } else if (row.metadata?.status !== result.status) {
      const metadata = result.status === 'done'
        ? { ...row.metadata, status: 'done', image_url: result.imageUrl }
        : { ...row.metadata, status: 'failed' };
      const { error } = await db.from('lead_activities').update({ metadata }).eq('id', row.id);
      if (error) console.error('[estimator-render] could not record the result', error.code ?? 'unknown');
    }
  }
  return reply(result);
}
