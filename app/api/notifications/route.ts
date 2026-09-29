import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeInternalUrl } from '@/lib/notifications/url';
import type { AppNotification } from '@/lib/notifications/types';

export const dynamic = 'force-dynamic';

/** The signed-in user's recent notifications + unread count. RLS limits rows to their own. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit')) || 20, 1), 50);
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, title, body, url, entity_id, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
  ]);
  if (error) return NextResponse.json({ error: 'Could not load notifications' }, { status: 500 });

  const items = ((data ?? []) as AppNotification[]).map((n) => ({ ...n, url: safeInternalUrl(n.url) }));
  return NextResponse.json({ items, unread: count ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
