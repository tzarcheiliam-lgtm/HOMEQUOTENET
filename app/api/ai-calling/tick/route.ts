import { NextResponse } from 'next/server';
import { recordAutomationRun } from '@/lib/automations/runs.server';
import { equalSecret } from '@/lib/funnels/server';
import { runAiCallQueue } from '@/lib/ai-calling/run.server';

// Scheduler endpoint for AI calling (Bearer AI_CALLING_CRON_SECRET), called every 5 minutes by
// .github/workflows/ai-calling-tick.yml. It claims due jobs and dials them ONLY when both the env
// switch (AI_CALLING_GLOBAL_ENABLED) and the admin switch are on; otherwise it reports why it skipped.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const expected = process.env.AI_CALLING_CRON_SECRET;
  if (!expected || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const startedAt = new Date();
  try {
    const result = await runAiCallQueue({ limit: 10 });
    const dialed = result.outcomes.filter((o) => o.result === 'accepted').length;
    await recordAutomationRun('ai_calling_tick', startedAt, true, { dialed, outcomes: result.outcomes.length });
    return NextResponse.json({ ...result, dialed });
  } catch {
    await recordAutomationRun('ai_calling_tick', startedAt, false, { error: 'AI call processing unavailable' });
    return NextResponse.json({ error: 'AI call processing unavailable' }, { status: 503 });
  }
}
