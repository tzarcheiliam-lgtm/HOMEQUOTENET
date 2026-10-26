import { z } from 'zod';
import { after } from 'next/server';
import { assistantLimits, isAnthropicConfigured, isAssistantEnabled } from '@/lib/assistant/config';
import { parseRoute, isUuid } from '@/lib/assistant/context';
import { loadAccessibleLead } from '@/lib/assistant/access';
import { checkLimits } from '@/lib/assistant/limits';
import { runChat, summarize, type ChatEvent, type HistoryMessage } from '@/lib/assistant/chat';
import { getAssistantSession } from '@/lib/assistant/session';
import { dateInZone } from '@/lib/assistant/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const body = z.object({
  conversationId: z.string().refine(isUuid).optional(),
  message: z.string().trim().min(1).max(2000),
  clientId: z.string().min(8).max(80),
  path: z.string().max(200).default('/app'),
});

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  if (!isAssistantEnabled()) return json(503, { code: 'disabled', message: 'The assistant is turned off.' });
  if (!isAnthropicConfigured()) return json(503, { code: 'not_configured', message: 'The assistant is not set up yet. An admin needs to add ANTHROPIC_API_KEY.' });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { code: 'invalid', message: 'Invalid request.' });
  const input = parsed.data;
  const limits = assistantLimits();
  if (input.message.length > limits.maxUserMessageChars) return json(400, { code: 'too_long', message: 'That message is too long.' });

  const auth = await getAssistantSession();
  if (!auth.ok) return json(auth.status, { code: auth.code, message: auth.message });
  const { profile, db, admin, tz } = auth.session;

  const verdict = await checkLimits(admin, { userId: profile.id, contractorId: profile.contractor_id });
  if (!verdict.ok) return json(429, { code: 'limit', limit: verdict.code, message: verdict.message });

  // Conversation: an existing one must belong to THIS user, otherwise start fresh (never reveal another user's id exists).
  let conversationId: string | null = null;
  let summary: string | null = null;
  if (input.conversationId) {
    const { data } = await admin.from('assistant_conversations').select('id, summary').eq('id', input.conversationId).eq('user_id', profile.id).maybeSingle();
    if (data) { conversationId = data.id as string; summary = (data.summary as string | null) ?? null; }
  }
  if (!conversationId) {
    const { data, error } = await admin.from('assistant_conversations').insert({
      user_id: profile.id, contractor_id: profile.role === 'contractor' ? profile.contractor_id : null, title: input.message.slice(0, 60),
    }).select('id').single();
    if (error || !data) return json(500, { code: 'server', message: 'Could not start the conversation.' });
    conversationId = data.id as string;
  }
  const convId = conversationId;

  // The page the user is on is only a hint; the lead is re-authorized before it is named to the model.
  const route = parseRoute(input.path);
  let selected: { type: 'lead'; id: string; label: string } | null = null;
  if (route.kind === 'lead') {
    const lead = await loadAccessibleLead(db, profile, route.leadId);
    if (lead) selected = { type: 'lead', id: lead.id, label: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead' };
  }

  // Store the user message once per clientId, so a retry after a dropped connection never duplicates it.
  const { error: insertErr } = await admin.from('assistant_messages').insert({
    conversation_id: convId, user_id: profile.id, role: 'user', content: input.message, client_id: input.clientId,
    context: { path: route.kind === 'lead' ? `/app/leads/${route.leadId}` : route.path, selected },
  });
  if (insertErr && insertErr.code !== '23505') return json(500, { code: 'server', message: 'Could not save your message.' });

  const { data: recent } = await admin.from('assistant_messages').select('role, content').eq('conversation_id', convId).eq('user_id', profile.id)
    .in('status', ['complete', 'cancelled']).order('created_at', { ascending: false }).limit(limits.historyMessages);
  const history = ((recent ?? []) as HistoryMessage[]).reverse();

  const encoder = new TextEncoder();
  const abort = new AbortController();
  request.signal.addEventListener('abort', () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (e: ChatEvent) => {
        if (!open) return;
        try { controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`)); } catch { open = false; }
      };
      emit({ type: 'meta', conversationId: convId, context: selected });
      try {
        const now = new Date();
        const run = await runChat({
          ctx: { db, admin, profile, tz, conversationId: convId, now },
          facts: {
            nowLabel: new Intl.DateTimeFormat('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' }).format(now) + ` (${dateInZone(now, tz)})`,
            tz, role: profile.role, page: route.kind === 'lead' ? 'lead detail' : route.page, selected, summary,
          },
          history, signal: abort.signal, emit,
        });

        if (run.failed) {
          emit({ type: 'error', code: run.failed.code, message: run.failed.message });
        } else {
          let messageId: string | null = null;
          if (run.text.trim() || run.actions.length || run.blocks.length) {
            const { data: saved } = await admin.from('assistant_messages').insert({
              conversation_id: convId, user_id: profile.id, role: 'assistant', content: run.text.trim() || 'I prepared a change for you to review.',
              status: run.cancelled ? 'cancelled' : 'complete', context: run.blocks.length ? { blocks: run.blocks } : {},
            }).select('id').single();
            messageId = (saved?.id as string | undefined) ?? null;
            if (messageId && run.actions.length) {
              await admin.from('assistant_actions').update({ message_id: messageId }).in('id', run.actions.map(a => a.id)).eq('user_id', profile.id);
            }
          }
          await admin.from('assistant_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId).eq('user_id', profile.id);
          emit({ type: 'done', messageId, cancelled: run.cancelled || undefined, truncated: run.truncated || undefined });
        }
      } catch {
        emit({ type: 'error', code: 'server', message: 'Something went wrong. Try again.' });
      } finally {
        open = false;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() { abort.abort(); },
  });

  // Roll older turns into the stored summary after the reply, so history stays bounded without delaying the answer.
  after(async () => {
    try {
      const { data: conv } = await admin.from('assistant_conversations').select('summary, summarized_through').eq('id', convId).eq('user_id', profile.id).maybeSingle();
      let q = admin.from('assistant_messages').select('role, content, created_at').eq('conversation_id', convId).eq('user_id', profile.id).order('created_at', { ascending: true });
      if (conv?.summarized_through) q = q.gt('created_at', conv.summarized_through as string);
      const { data: pending } = await q.limit(200);
      const rows = (pending ?? []) as (HistoryMessage & { created_at: string })[];
      if (rows.length < 20) return;
      const older = rows.slice(0, rows.length - 6);
      const text = await summarize({ admin, profile, conversationId: convId, previous: (conv?.summary as string | null) ?? null, messages: older });
      if (text) await admin.from('assistant_conversations').update({ summary: text, summarized_through: older[older.length - 1].created_at }).eq('id', convId).eq('user_id', profile.id);
    } catch { /* summaries are an optimisation */ }
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store, no-transform', 'x-accel-buffering': 'no' },
  });
}
