import { z } from 'zod';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadCapabilities } from '@/lib/data/workflow-graph';
import { parseWorkflowGraph } from '@/lib/workflows/graph/model';
import { AI_MAX_ANSWER_CHARS, AI_MAX_DESCRIPTION_CHARS } from '@/lib/workflows/ai-builder/config';
import { canUseAiBuilder, runAiBuild, type BuildEvent, type BuildResult, type BuildTarget } from '@/lib/workflows/ai-builder/build.server';

/**
 * POST /api/workflows/ai-build — the AI workflow builder (admins only). Streams NDJSON progress events
 * (`{type:'step'}`) and ends with exactly one `{type:'result'}`. Identity comes only from the session cookie;
 * a change request re-checks edit permission and the draft's optimistic revision on the server.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const answers = z.array(z.object({ question: z.string().max(200), answer: z.string().trim().max(AI_MAX_ANSWER_CHARS) })).max(2).optional();
const body = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('create'), description: z.string().trim().min(1).max(AI_MAX_DESCRIPTION_CHARS), answers, contractorId: z.string().uuid().nullable().optional() }),
  z.object({ mode: z.literal('change'), description: z.string().trim().min(1).max(AI_MAX_DESCRIPTION_CHARS), answers, workflowId: z.string().uuid(), expectedRevision: z.number().int().min(1) }),
]);

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { code: 'invalid', message: 'Describe the workflow in up to 2,000 characters.' });
  const input = parsed.data;

  let profile;
  try { profile = await getProfile(); } catch { return json(503, { code: 'auth_unavailable', message: 'Could not verify your sign-in. Try again.' }); }
  if (!profile) return json(401, { code: 'unauthenticated', message: 'Please sign in again.' });
  if (!canUseAiBuilder(profile)) return json(403, { code: 'forbidden', message: 'The AI workflow builder is available to HomeQuote admins only.' });

  const db = await createClient();
  const caps = await loadCapabilities(profile);
  let target: BuildTarget;
  if (input.mode === 'create') {
    const contractorId = input.contractorId ?? null;
    if (!caps.edit(contractorId)) return json(403, { code: 'forbidden', message: 'You do not have permission to create workflows here.' });
    target = { kind: 'create', contractorId };
  } else {
    const { data: wf } = await db.from('workflows').select('id,name,contractor_id,archived_at').eq('id', input.workflowId).eq('engine', 'graph').maybeSingle();
    const row = wf as { id: string; name: string; contractor_id: string | null; archived_at: string | null } | null;
    if (!row || row.archived_at || !caps.edit(row.contractor_id)) return json(404, { code: 'not_found', message: 'You do not have permission to edit this workflow.' });
    const { data: draft } = await db.from('workflow_graph_drafts').select('graph,revision').eq('workflow_id', row.id).maybeSingle();
    if (!draft) return json(404, { code: 'not_found', message: 'Not found.' });
    if (draft.revision !== input.expectedRevision) return json(409, { code: 'conflict', message: 'This workflow was changed in another window. Reload before changing it with AI.' });
    let base;
    try { base = parseWorkflowGraph(draft.graph); } catch { return json(422, { code: 'invalid', message: 'The saved draft is malformed.' }); }
    target = { kind: 'change', workflowId: row.id, contractorId: row.contractor_id, base, baseRevision: draft.revision as number, name: row.name };
  }

  const admin = createAdminClient();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (e: BuildEvent | { type: 'result'; result: BuildResult }) => {
        if (!open) return;
        try { controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`)); } catch { open = false; }
      };
      try {
        const result = await runAiBuild({ admin, db }, { profile, description: input.description, answers: input.answers, target }, send);
        send({ type: 'result', result });
      } catch {
        send({ type: 'result', result: { ok: false, outcome: 'error', message: 'Something went wrong. Try again.', remaining: null } });
      } finally {
        open = false;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store, no-transform', 'x-accel-buffering': 'no' } });
}
