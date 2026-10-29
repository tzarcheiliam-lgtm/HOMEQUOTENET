import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type AutomationJob = 'workflow_tick' | 'meta_tick' | 'meta_studio_tick' | 'ai_calling_tick';

/**
 * Record one scheduler run (migration 0069) for the Automations map. Best effort: never throws, so a missing table
 * or a database hiccup can't break the tick. The summary keeps only small counts, never message bodies.
 */
export async function recordAutomationRun(job: AutomationJob, startedAt: Date, ok: boolean, summary: unknown) {
  try {
    const db = createAdminClient();
    const json = JSON.stringify(summary ?? {});
    await db.from('automation_runs').insert({ job, started_at: startedAt.toISOString(), finished_at: new Date().toISOString(), ok, summary: json.length > 4000 ? { truncated: true } : JSON.parse(json) });
    if (job === 'workflow_tick' && Math.random() < 0.02) {
      await db.from('automation_runs').delete().lt('started_at', new Date(Date.now() - 30 * 86_400_000).toISOString());
    }
  } catch { /* the heartbeat is a courtesy */ }
}
