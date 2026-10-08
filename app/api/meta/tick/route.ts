import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runMetaConversionTick } from '@/lib/meta/queue.server';
import { runMetaSync } from '@/lib/meta/sync';

// Scheduler endpoint for the Meta integration (Bearer META_TICK_SECRET), called every 5 minutes by
// .github/workflows/meta-tick.yml.
//  - Conversions: feeds the queue from the outcome ledger and dispatches due events. A no-op while the admin
//    delivery switch is 'off' (the default).
//  - Reporting sync: runs when the last successful sync is older than 6 hours and a Marketing API token is set.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  const expected = process.env.META_TICK_SECRET;
  if (!expected || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const out: Record<string, unknown> = {};
  try { out.conversions = await runMetaConversionTick(); }
  catch { out.conversions = { error: 'conversion tick failed' }; }

  const token = process.env.META_MARKETING_ACCESS_TOKEN;
  if (!token) out.sync = { skipped: 'META_MARKETING_ACCESS_TOKEN not set' };
  else {
    try {
      const db = createAdminClient();
      const { data: last } = await db.from('meta_sync_runs').select('started_at').in('status', ['ok', 'partial']).order('started_at', { ascending: false }).limit(1).maybeSingle();
      const due = !last || Date.now() - new Date(last.started_at).getTime() > 6 * 3_600_000;
      if (!due) out.sync = { skipped: 'recent sync exists' };
      else {
        const { data: s } = await db.from('meta_settings').select('insights_days').eq('id', true).maybeSingle();
        const r = await runMetaSync(db, { token }, { trigger: 'cron', days: s?.insights_days ?? 30 });
        out.sync = { status: r.status, accounts: r.accounts, errors: r.errors.length };
      }
    } catch { out.sync = { error: 'sync failed' }; }
  }
  return NextResponse.json(out);
}
