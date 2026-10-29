import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client */
import { reminderConfig } from '@/lib/sms/reminder-config';
import { createAdminClient } from '@/lib/supabase/admin';
import { AUTOMATIONS, type Automation, type AutomationRecord } from './registry';

type Db = ReturnType<typeof createAdminClient>;
export type AutomationState = 'on' | 'off' | 'dormant' | 'not_set_up' | 'attention';
export interface AutomationStatus {
  id: string;
  state: AutomationState;
  lastRunAt: string | null;
  count7d: number | null;
  failed7d: number;
  /** One plain line explaining the state ("Texting is switched off"). */
  note: string | null;
  /** Names only, never values. */
  missingEnv: string[];
}
export interface WorkflowSummaryItem {
  id: string; name: string; engine: 'graph' | 'linear'; live: boolean; status: string; triggerType: string;
  contractorName: string | null; lastRunAt: string | null; runs7d: number; failed7d: number;
}

const DAY = 86_400_000;
const MIN = 60_000;
/** How long without a run before a scheduler needs a look. */
const STALE_AFTER: Record<string, number> = { workflow_tick: 15 * MIN, meta_tick: 15 * MIN, ai_calling_tick: 15 * MIN, meta_studio_tick: 90 * MIN };

const envSet = (name: string) => !!process.env[name]?.trim();
export const missingEnvFor = (a: Automation) => (a.requiresEnv ?? []).filter((n) => !envSet(n));

function filtered(db: Db, r: AutomationRecord, select: string, opts?: { count: 'exact'; head: true }) {
  let q: any = db.from(r.table).select(select, opts);
  for (const w of r.where ?? []) {
    if (w.op === 'eq') q = q.eq(w.col, w.value);
    else if (w.op === 'in') q = q.in(w.col, w.value as string[]);
    else q = q.not(w.col, 'is', null);
  }
  return q;
}

/** Last run, 7-day count and 7-day failures for one record. null = the table/column isn't there (migration not run). */
async function probe(db: Db, r: AutomationRecord, now: Date) {
  try {
    const since = new Date(now.getTime() - 7 * DAY).toISOString();
    const failedQ = () => {
      if (!r.failed) return Promise.resolve({ count: 0, error: null });
      const q = filtered(db, r, 'id', { count: 'exact', head: true }).gte(r.at, since);
      const vals = r.failed.values;
      return vals.length === 1 && (vals[0] === 'false' || vals[0] === 'true') ? q.eq(r.failed.col, vals[0] === 'true') : q.in(r.failed.col, vals);
    };
    const [last, count, failed] = await Promise.all([
      filtered(db, r, r.at).not(r.at, 'is', null).order(r.at, { ascending: false }).limit(1).maybeSingle(),
      filtered(db, r, 'id', { count: 'exact', head: true }).gte(r.at, since),
      failedQ(),
    ]);
    if (last.error || count.error || failed.error) return null;
    return { lastRunAt: (last.data as any)?.[r.at] ?? null, count7d: count.count ?? 0, failed7d: failed.count ?? 0 };
  } catch {
    return null;
  }
}

async function row(db: Db, table: string, select: string) {
  try {
    const { data, error } = await db.from(table).select(select).limit(1).maybeSingle();
    return error ? null : (data as any);
  } catch { return null; }
}

export async function workflowSummary(db: Db, now = new Date()): Promise<WorkflowSummaryItem[]> {
  const base = (cols: string) => db.from('workflows').select(cols).eq('is_template', false).is('archived_at', null).order('updated_at', { ascending: false }).limit(200);
  let { data, error } = await base('id,name,engine,graph_status,enabled,trigger_type,contractor:contractors(name)');
  if (error) ({ data, error } = await base('id,name,enabled,trigger_type,contractor:contractors(name)'));
  if (error || !data) return [];
  const rows = data as any[];
  const ids = rows.map((r) => r.id);
  const { data: runs } = ids.length
    ? await db.from('workflow_runs').select('workflow_id,status,created_at').in('workflow_id', ids).gte('created_at', new Date(now.getTime() - 30 * DAY).toISOString()).order('created_at', { ascending: false }).limit(5000)
    : { data: [] };
  const weekAgo = now.getTime() - 7 * DAY;
  return rows.map((r) => {
    const own = ((runs ?? []) as any[]).filter((x) => x.workflow_id === r.id);
    const week = own.filter((x) => new Date(x.created_at).getTime() >= weekAgo);
    const engine = r.engine === 'graph' ? 'graph' : 'linear';
    const status = engine === 'graph' ? (r.graph_status ?? 'draft') : r.enabled ? 'enabled' : 'disabled';
    const contractor = Array.isArray(r.contractor) ? r.contractor[0] : r.contractor;
    return {
      id: r.id, name: r.name, engine, live: engine === 'graph' ? status === 'published' : !!r.enabled, status, triggerType: r.trigger_type,
      contractorName: contractor?.name ?? null, lastRunAt: own[0]?.created_at ?? null, runs7d: week.length, failed7d: week.filter((x) => x.status === 'failed').length,
    };
  });
}

/** Live state of every automation in the registry. Never throws; anything it can't read shows as not set up. */
export async function automationStatuses(db: Db = createAdminClient(), now = new Date()): Promise<{ statuses: AutomationStatus[]; workflows: WorkflowSummaryItem[] }> {
  const [sms, meta, studio, aiCalling, waiting, workflows, probes] = await Promise.all([
    row(db, 'sms_settings', '*'),
    row(db, 'meta_settings', 'delivery_mode'),
    row(db, 'meta_studio_settings', 'live_writes_enabled,automation_enabled'),
    row(db, 'ai_calling_settings', 'enabled,stopped_at'),
    db.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'queued').lte('send_after', new Date(now.getTime() - 5 * MIN).toISOString()).then((r: any) => r.count ?? 0, () => 0),
    workflowSummary(db, now),
    Promise.all(AUTOMATIONS.map((a) => (a.record ? probe(db, a.record, now) : Promise.resolve(undefined)))),
  ]);
  const textingOn = !!sms?.enabled && !sms?.stopped_at;
  const rem = sms && 'reminder_config' in sms ? reminderConfig(sms.reminder_config) : null;
  const bridgeSeen = sms?.bridge_last_seen_at ? new Date(sms.bridge_last_seen_at) : null;
  const bridgeUp = !!bridgeSeen && now.getTime() - bridgeSeen.getTime() < 2 * MIN;
  const liveWorkflows = workflows.filter((w) => w.live).length;

  /** Switches that live in settings rows: [off?, note]. */
  const switchOf = (id: string): { off?: string; attention?: string; note?: string } => {
    if (id.startsWith('sms_')) {
      if (!sms) return { off: 'Texting isn’t set up yet.' };
      if (!textingOn) return { off: 'Texting is switched off on the Texting page.' };
      if (id === 'sms_bridge') return bridgeUp ? { note: 'Connected.' } : { attention: bridgeSeen ? `Not connected. Last check-in ${ago(bridgeSeen, now)}.` : 'The Mac bridge has never checked in.' };
      if (id === 'sms_first_text' && waiting > 0 && !bridgeUp) return { attention: `${waiting} text${waiting === 1 ? '' : 's'} waiting for the Mac bridge.` };
      if (id.startsWith('sms_reminders') || id === 'sms_followups' || id === 'sms_unconfirmed_alert' || id === 'sms_unbooked_followup') {
        if (!rem) return { off: 'Run database migration 0068 to turn this on.' };
        if (id === 'sms_reminders_contractor' && !rem.contractor.enabled) return { off: 'Switched off under Reminders & follow-ups.' };
        if (id === 'sms_reminders_homeowner' && !rem.homeowner.enabled) return { off: 'Switched off under Reminders & follow-ups.' };
        if (id === 'sms_followups' && !rem.followups.enabled) return { off: 'Switched off under Reminders & follow-ups.' };
        if (id === 'sms_followups') return { note: `Days ${rem.followups.days.join(', ')} after the first text.` };
        if (id === 'sms_unconfirmed_alert' && (!rem.unconfirmedAlert || !rem.contractor.enabled)) return { off: 'Switched off under Reminders & follow-ups.' };
        if (id === 'sms_unbooked_followup' && !rem.recovery.unbooked) return { off: 'Switched off under Reminders & follow-ups → Lead recovery.' };
      }
      return {};
    }
    if (id === 'meta_conversions') {
      if (!meta) return { off: 'Meta measurement isn’t set up yet.' };
      if (meta.delivery_mode === 'off') return { off: 'Sending is switched off in Meta Ads settings.' };
      if (meta.delivery_mode === 'test') return { note: 'Test mode: events go to Meta’s test tool only.' };
      return {};
    }
    if (id === 'meta_rules' || id === 'meta_studio_tick') {
      if (!studio) return { off: 'Meta Ads Studio isn’t set up yet (migration 0043).' };
      if (id === 'meta_rules' && !studio.automation_enabled) return { off: 'Rule automation is switched off.' };
      if (!studio.live_writes_enabled) return { note: 'Live changes are off, so it only records suggestions.' };
      return {};
    }
    if (id === 'ai_calls' || id === 'ai_calling_tick') {
      if (!aiCalling) return { off: 'AI calling isn’t set up yet.' };
      if (!aiCalling.enabled || aiCalling.stopped_at) return { off: 'AI calling is switched off.' };
      return {};
    }
    if (id === 'workflows') return liveWorkflows ? { note: `${liveWorkflows} live workflow${liveWorkflows === 1 ? '' : 's'}.` } : { off: 'No workflows are live.' };
    if (id === 'sms_bridge_alert') return textingOn ? {} : { off: 'Texting is switched off.' };
    if (id === 'speed_to_lead_alert' || id === 'no_show_recovery') {
      if (!rem) return { off: 'Run database migration 0068 to turn this on.' };
      if (id === 'speed_to_lead_alert' && !rem.recovery.speedAlert) return { off: 'Switched off under Reminders & follow-ups → Lead recovery.' };
      if (id === 'no_show_recovery' && !rem.recovery.noShow && !rem.recovery.heldPrompt) return { off: 'Switched off under Reminders & follow-ups → Lead recovery.' };
      return {};
    }
    return {};
  };

  const statuses = AUTOMATIONS.map((a, i): AutomationStatus => {
    const p = probes[i];
    const missingEnv = missingEnvFor(a);
    const base = { id: a.id, lastRunAt: p?.lastRunAt ?? null, count7d: p ? p.count7d : null, failed7d: p?.failed7d ?? 0, missingEnv };
    if (missingEnv.length) return { ...base, state: 'dormant', note: `Not active: ${missingEnv.join(', ')} ${missingEnv.length === 1 ? 'is' : 'are'} not set.` };
    const sw = switchOf(a.id);
    if (sw.off) return { ...base, state: 'off', note: sw.off };
    if (a.record && p === null) {
      return { ...base, state: 'not_set_up', note: a.record.table === 'automation_runs' ? 'Run database migration 0069 to see when this last ran.' : 'Its database table isn’t set up yet (a migration hasn’t been run).' };
    }
    if (sw.attention) return { ...base, state: 'attention', note: sw.attention };
    const stale = STALE_AFTER[a.id];
    if (stale && (!p?.lastRunAt || now.getTime() - new Date(p.lastRunAt).getTime() > stale)) {
      return { ...base, state: 'attention', note: p?.lastRunAt ? `Hasn’t run since ${ago(new Date(p.lastRunAt), now)}. Check the GitHub Actions schedule.` : 'No runs recorded yet. Check the GitHub Actions secrets.' };
    }
    if (base.failed7d > 0) return { ...base, state: 'attention', note: `${base.failed7d} failed in the last 7 days.` };
    return { ...base, state: 'on', note: sw.note ?? null };
  });
  return { statuses, workflows };
}

export function ago(d: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
