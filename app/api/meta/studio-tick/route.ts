import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { admin, readOptions, syncObjectState } from '@/lib/meta/studio/server';
import { runRulesTick } from '@/lib/meta/studio/rules.server';

// Hourly scheduler for the Meta Ads Studio (Bearer META_TICK_SECRET; see .github/workflows/meta-studio-tick.yml).
//  1. Reads live campaign/ad-set state (budgets, learning, Ads Manager edits). Read-only against Meta.
//  2. Evaluates enabled optimization rules. With live writes off, no write token, automation stopped, or rules in
//     recommend/approval mode, this only RECORDS evaluations/proposals - it never changes anything in Meta.
// Separate from /api/meta/tick (reporting sync + conversion delivery) so each can be paused independently.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  const expected = process.env.META_TICK_SECRET;
  if (!expected || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = admin();
  const out: Record<string, unknown> = {};
  const g = readOptions();
  if (!g) out.state = { skipped: 'META_MARKETING_ACCESS_TOKEN not set' };
  else {
    try { const r = await syncObjectState(db, g); out.state = { accounts: r.accounts, objects: r.objects, externalChanges: r.externalChanges, errors: r.errors.length }; }
    catch { out.state = { error: 'state sync failed' }; }
  }
  try { out.rules = await runRulesTick(db); } catch { out.rules = { error: 'rules tick failed' }; }
  return NextResponse.json(out);
}
