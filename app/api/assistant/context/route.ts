import { NextResponse } from 'next/server';
import { loadAccessibleLead } from '@/lib/assistant/access';
import { parseRoute } from '@/lib/assistant/context';
import { getAssistantSession } from '@/lib/assistant/session';

export const dynamic = 'force-dynamic';

/** Names the record the user is looking at, only if they are allowed to see it. The path is a hint, never authority. */
export async function GET(request: Request) {
  const s = await getAssistantSession();
  if (!s.ok) return NextResponse.json({ context: null }, { status: s.status });
  const route = parseRoute(new URL(request.url).searchParams.get('path') ?? '/app');
  if (route.kind !== 'lead') return NextResponse.json({ context: null });
  const lead = await loadAccessibleLead(s.session.db, s.session.profile, route.leadId);
  if (!lead) return NextResponse.json({ context: null });
  return NextResponse.json({ context: { type: 'lead', id: lead.id, label: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead' } });
}
