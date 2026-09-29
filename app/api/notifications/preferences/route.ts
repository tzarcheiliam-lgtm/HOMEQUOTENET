import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { NOTIFICATION_TYPE_IDS } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';

const shape: Record<string, z.ZodOptional<z.ZodBoolean>> = { enabled: z.boolean().optional() };
for (const id of NOTIFICATION_TYPE_IDS) shape[id] = z.boolean().optional();
const schema = z.object(shape).strict();

/** Upsert the caller's own preference row (RLS: user_id = auth.uid()). */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Invalid preferences' }, { status: 422 });
  }
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: 'Could not save preferences' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
