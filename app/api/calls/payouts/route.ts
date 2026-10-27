import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { isHqnAdministrator } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentMonth, getPayouts, isMonth, payoutsCsv } from '@/lib/data/setter-money';

// A month's setter payouts as CSV: one line per sold meeting, then a total per setter. Admins only.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // A download link on our own pages is same-origin; refuse anything a third-party page tries to trigger.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let profile;
  try { profile = await getProfile(); } catch { return NextResponse.json({ error: 'Please try again' }, { status: 503 }); }
  if (!profile || !profile.is_active) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (!isHqnAdministrator(profile)) return NextResponse.json({ error: 'Only an administrator can export payouts' }, { status: 403 });

  const m = new URL(request.url).searchParams.get('month') ?? undefined;
  const month = isMonth(m) ? m : currentMonth();
  let csv: string;
  try { csv = payoutsCsv(await getPayouts(month)); } catch { return NextResponse.json({ error: 'Could not build the export' }, { status: 500 }); }

  await createAdminClient().from('audit_logs').insert({ actor_id: profile.id, action: 'calls.payouts_export', metadata: { month } });
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="setter-payouts-${month}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
