/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
let sb: any;
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => sb }));

import { AUTOMATIONS } from '@/lib/automations/registry';
import { automationStatuses } from '@/lib/automations/status.server';
import { recordAutomationRun } from '@/lib/automations/runs.server';
import { AutomationMap } from '@/components/automations/automation-map';

const root = join(__dirname, '..');

describe('the automation registry', () => {
  it('has unique ids, plain-English text and settings links that exist', () => {
    expect(new Set(AUTOMATIONS.map((a) => a.id)).size).toBe(AUTOMATIONS.length);
    for (const a of AUTOMATIONS) {
      expect(a.name.length, a.id).toBeGreaterThan(3);
      expect(a.when.length, a.id).toBeGreaterThan(5);
      expect(a.what.length, a.id).toBeGreaterThan(10);
      if (a.settingsHref) expect(existsSync(join(root, 'app', a.settingsHref, 'page.tsx')), `${a.id} → ${a.settingsHref}`).toBe(true);
    }
  });
  it('lists every scheduled GitHub Actions job', () => {
    const dir = join(root, '.github/workflows');
    const scheduled = readdirSync(dir).filter((f) => /cron:/.test(readFileSync(join(dir, f), 'utf8')));
    expect(scheduled.length).toBeGreaterThan(0);
    for (const f of scheduled) expect(AUTOMATIONS.some((a) => a.trigger === 'schedule' && a.file.includes(f)), f).toBe(true);
  });
  it('lists every job inside the 5-minute tick', () => {
    const route = readFileSync(join(root, 'app/api/workflows/tick/route.ts'), 'utf8');
    const jobs: Record<string, string> = {
      processWorkflowTick: 'workflows', pruneWorkflowHistory: 'workflow_pruning', runNotificationMaintenance: 'push_notifications', runCalendarMaintenance: 'calendar_sync',
      signingMaintenance: 'signing_upkeep', checkBridgeHealth: 'sms_bridge_alert', runTextReminders: 'sms_reminders_contractor', runBookingNotifications: 'booking_notices', retryPendingAduQuizLeads: 'adu_quiz_retry', runRecovery: 'no_show_recovery',
    };
    const called = [...route.matchAll(/await (\w+)\(/g)].map((m) => m[1]).filter((n) => !['recordAutomationRun'].includes(n));
    for (const fn of called) {
      expect(jobs[fn], `${fn} is called by the tick but not mapped here; add it to lib/automations/registry.ts`).toBeDefined();
      expect(AUTOMATIONS.some((a) => a.id === jobs[fn])).toBe(true);
    }
  });
});

let db: PGlite;
const q = async (sql: string, p?: unknown[]) => (await db.query<any>(sql, p)).rows;
const NOW = new Date('2026-10-29T18:00:00Z');
const st = async () => new Map((await automationStatuses(sb, NOW)).statuses.map((s) => [s.id, s]));

describe('live status', () => {
  beforeAll(async () => { db = await fullSchema({ supabaseGrants: true }); sb = fakeSupabase(db); }, 180_000);
  afterAll(async () => { await db?.close(); });

  it('reports switched off, not active (missing setting) and on, without showing secret values', async () => {
    vi.stubEnv('SMS_BRIDGE_TOKEN', 'x'.repeat(30)); vi.stubEnv('ANTHROPIC_API_KEY', 'sk-secret-value'); vi.stubEnv('AI_CALLING_GLOBAL_ENABLED', '');
    await q(`update public.sms_settings set enabled=false, stopped_at=null where id`);
    let s = await st();
    expect(s.get('sms_first_text')).toMatchObject({ state: 'off', note: 'Texting is switched off on the Texting page.' });
    expect(s.get('ai_calls')!.state).toBe('dormant');
    expect(s.get('ai_calls')!.note).toContain('AI_CALLING_GLOBAL_ENABLED');
    expect(JSON.stringify([...s.values()])).not.toContain('sk-secret-value');

    await q(`update public.sms_settings set enabled=true, bridge_last_seen_at=$1 where id`, [new Date(NOW.getTime() - 30_000).toISOString()]);
    s = await st();
    expect(s.get('sms_bridge')).toMatchObject({ state: 'on', note: 'Connected.' });
    expect(s.get('sms_followups')).toMatchObject({ state: 'on', note: 'Days 1, 3, 7 after the first text.' });
    await q(`update public.sms_settings set reminder_config='{"followups":{"enabled":false}}' where id`);
    expect((await st()).get('sms_followups')!.state).toBe('off');
    await q(`update public.sms_settings set bridge_last_seen_at=$1 where id`, [new Date(NOW.getTime() - 3600_000).toISOString()]);
    expect((await st()).get('sms_bridge')).toMatchObject({ state: 'attention', note: 'Not connected. Last check-in 1 h ago.' });
  });

  it('records scheduler runs and flags a stalled or failing scheduler', async () => {
    vi.stubEnv('WORKFLOW_CRON_SECRET', 'secret');
    expect((await st()).get('workflow_tick')!.state).toBe('attention'); // no runs yet
    await recordAutomationRun('workflow_tick', new Date(NOW.getTime() - 3 * 60_000), true, { claimed: 2 });
    const [r] = await q(`select job, ok, summary from public.automation_runs`);
    expect(r).toMatchObject({ job: 'workflow_tick', ok: true, summary: { claimed: 2 } });
    await q(`update public.automation_runs set started_at=$1`, [new Date(NOW.getTime() - 3 * 60_000).toISOString()]);
    let s = (await st()).get('workflow_tick')!;
    expect(s).toMatchObject({ state: 'on', count7d: 1 });
    await q(`update public.automation_runs set started_at=$1`, [new Date(NOW.getTime() - 40 * 60_000).toISOString()]);
    expect((await st()).get('workflow_tick')!.note).toContain('Hasn’t run since 40 min ago');
    await q(`insert into public.automation_runs(job, started_at, ok) values ('workflow_tick', $1, false)`, [new Date(NOW.getTime() - 60_000).toISOString()]);
    s = (await st()).get('workflow_tick')!;
    expect(s).toMatchObject({ state: 'attention', failed7d: 1 });
  });

  it('shows "not set up" when a table is missing instead of failing the page', async () => {
    await q(`drop table public.automation_runs`);
    expect((await st()).get('workflow_tick')).toMatchObject({ state: 'not_set_up', note: 'Run database migration 0069 to see when this last ran.' });
    await recordAutomationRun('workflow_tick', NOW, true, {}); // never throws
  });
});

describe('the Automation Map page', () => {
  const statuses = AUTOMATIONS.map((a, i) => ({ id: a.id, state: (['on', 'off', 'attention', 'dormant', 'not_set_up'] as const)[i % 5], lastRunAt: i % 2 ? '2026-10-29T17:55:00Z' : null, count7d: a.record ? i : null, failed7d: 0, note: i % 5 === 2 ? 'Hasn’t run in a while.' : null, missingEnv: [] }));
  const workflows = [{ id: 'w1', name: 'Text new website leads', engine: 'graph' as const, live: true, status: 'published', triggerType: 'lead.created', contractorName: null, lastRunAt: '2026-10-29T17:00:00Z', runs7d: 12, failed7d: 1 }];
  it('groups every automation by area with its status, schedule and settings link, plus the workflows', () => {
    const html = renderToStaticMarkup(<AutomationMap statuses={statuses} workflows={workflows} filters={{}} now={NOW} />);
    for (const a of AUTOMATIONS) expect(html).toContain(a.name.replace(/&/g, '&amp;').replace(/“/g, '“'));
    expect(html).toContain('Schedulers'); expect(html).toContain('Needs a look'); expect(html).toContain('Settings →');
    expect(html).toContain('Text new website leads'); expect(html).toContain('12 runs in 7 days'); expect(html).toContain('1 failed');
    expect(html).toContain('5 min ago');
  });
  it('filters by area, status and search', () => {
    const texting = renderToStaticMarkup(<AutomationMap statuses={statuses} workflows={workflows} filters={{ area: 'texting' }} now={NOW} />);
    expect(texting).toContain('Mac texting bridge'); expect(texting).not.toContain('Stripe payments'); expect(texting).not.toContain('Text new website leads');
    const search = renderToStaticMarkup(<AutomationMap statuses={statuses} workflows={workflows} filters={{ q: 'stripe' }} now={NOW} />);
    expect(search).toContain('Stripe payments'); expect(search).not.toContain('Mac texting bridge');
    const none = renderToStaticMarkup(<AutomationMap statuses={statuses} workflows={workflows} filters={{ q: 'zzzz' }} now={NOW} />);
    expect(none).toContain('Nothing matches these filters.');
  });
});
