import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { equalSecret, getFunnel, readBody } from '@/lib/funnels/server';

const schema = z.object({ sessionId: z.string().uuid(), appointmentId: z.string().min(1).max(200), calendarId: z.string().min(1).max(100), scheduledAt: z.string().datetime({ offset: true }) });
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const funnel = await getFunnel((await params).slug);
    if (!funnel?.integration_id || funnel.is_demo) return NextResponse.json({ error: 'Not configured' }, { status: 404 });
    const db = createAdminClient();
    const { data: integration } = await db.from('integrations').select('secret,is_enabled').eq('id', funnel.integration_id).single();
    if (!integration?.is_enabled || !integration.secret || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${integration.secret}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = schema.safeParse(await readBody(request));
    if (!body.success) return NextResponse.json({ error: 'Invalid booking payload' }, { status: 422 });
    // Prevent an integration shared by several funnels from confirming the wrong client.
    const { data: session } = await db.from('funnel_sessions').select('id').eq('id', body.data.sessionId).eq('funnel_id', funnel.id).maybeSingle();
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const { error } = await db.rpc('record_funnel_booking', { p_session: body.data.sessionId, p_integration: funnel.integration_id,
      p_external: body.data.appointmentId, p_calendar: body.data.calendarId, p_time: body.data.scheduledAt });
    if (error) return NextResponse.json({ error: 'Booking does not match this request' }, { status: 422 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: 'Booking unavailable' }, { status: 503 }); }
}
