import { NextResponse } from 'next/server';
import { z } from 'zod';
import { decideAction } from '@/lib/assistant/execute';
import { getAssistantSession } from '@/lib/assistant/session';

export const dynamic = 'force-dynamic';

const body = z.object({ decision: z.enum(['confirm', 'cancel']), edits: z.object({ values: z.record(z.string().max(6000)).optional() }).optional() });

/** Confirm or cancel a proposed change. The backend result is what the UI shows: never an optimistic success. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const s = await getAssistantSession();
  if (!s.ok) return NextResponse.json({ error: s.message }, { status: s.status });

  const result = await decideAction(s.session, id, parsed.data.decision, parsed.data.edits);
  if (!result.ok) {
    const status = result.code === 'not_found' ? 404 : result.code === 'forbidden' ? 403 : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json(result);
}
