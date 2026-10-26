import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/assistant/context';
import { getAssistantSession } from '@/lib/assistant/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const s = await getAssistantSession();
  if (!s.ok) return NextResponse.json({ error: s.message }, { status: s.status });
  const { db } = s.session;
  const { data: conversation } = await db.from('assistant_conversations').select('id, title').eq('id', id).maybeSingle();
  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [messages, actions] = await Promise.all([
    db.from('assistant_messages').select('id, role, content, status, context, created_at').eq('conversation_id', id).order('created_at', { ascending: false }).limit(60),
    db.from('assistant_actions').select('id, message_id, kind, status, preview, result, error').eq('conversation_id', id).order('created_at', { ascending: true }).limit(100),
  ]);
  return NextResponse.json({ conversation, messages: (messages.data ?? []).reverse(), actions: actions.data ?? [] });
}
