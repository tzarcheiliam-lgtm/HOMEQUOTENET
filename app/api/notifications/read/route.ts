import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const schema = z.union([z.object({ id: z.string().uuid() }), z.object({ all: z.literal(true) })]);

/** Mark one notification (or all) read. RLS + the column grant limit this to the caller's own read_at. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 });

  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if ('id' in parsed.data) query = query.eq('id', parsed.data.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: 'Could not update' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
