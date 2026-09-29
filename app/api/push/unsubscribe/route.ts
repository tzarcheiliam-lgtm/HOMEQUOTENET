import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const schema = z.object({ endpoint: z.string().url().max(2048) });

/** Remove one of the signed-in user's own devices (RLS scopes the delete to them). */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 });

  const supabase = await createClient();
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', parsed.data.endpoint)
    .eq('user_id', profile.id);
  if (error) return NextResponse.json({ error: 'Could not remove subscription' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
