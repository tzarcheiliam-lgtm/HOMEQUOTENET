import { NextResponse } from 'next/server';
import { getAssistantSession } from '@/lib/assistant/session';

export const dynamic = 'force-dynamic';

/** Recent conversations. Read with the user's own client, so RLS (user_id = auth.uid()) is the filter. */
export async function GET() {
  const s = await getAssistantSession();
  if (!s.ok) return NextResponse.json({ error: s.message }, { status: s.status });
  const { data } = await s.session.db.from('assistant_conversations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(15);
  return NextResponse.json({ conversations: data ?? [] });
}
