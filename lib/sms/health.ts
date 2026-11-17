import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { note } from './core';

type Db = SupabaseClient;

/** A text that is due but still unsent after this long means the Mac is not picking things up. */
export const STUCK_AFTER_MINUTES = 5;
/** While it stays down the alert repeats at most this often. */
export const REALERT_AFTER_MINUTES = 60;

export interface Alert { title: string; body: string; url: string; /** Link text in the email. Defaults to "Open Texting". */ linkLabel?: string }
export interface HealthDeps {
  now?: () => Date;
  notify?: (alert: Alert) => Promise<void>;
}
export type HealthResult =
  | { state: 'off' | 'ok' | 'down_already_alerted' }
  | { state: 'alerted'; waiting: number }
  | { state: 'recovered' };

const mins = (ms: number) => Math.max(1, Math.round(ms / 60_000));

/** Pure: how many due texts are stuck and for how long. */
export function describeStuck(rows: { status: string; send_after: string; claimed_at: string | null }[], now: Date) {
  const stuck = rows.filter((r) => r.status === 'queued'
    ? +new Date(r.send_after) <= now.getTime() - STUCK_AFTER_MINUTES * 60_000
    : r.status === 'sending' && !!r.claimed_at && +new Date(r.claimed_at) <= now.getTime() - 3 * 60_000);
  if (!stuck.length) return null;
  const oldest = Math.min(...stuck.map((r) => +new Date(r.status === 'queued' ? r.send_after : (r.claimed_at as string))));
  return { waiting: stuck.length, minutes: mins(now.getTime() - oldest) };
}

/** Run on the existing 5-minute scheduler. Alerts the team when texts are waiting and the Mac is not sending them. */
export async function checkBridgeHealth(db: Db, deps: HealthDeps = {}): Promise<HealthResult> {
  const now = (deps.now ?? (() => new Date()))();
  const { data: s } = await db.from('sms_settings').select('enabled,stopped_at,bridge_last_seen_at,bridge_alert_sent_at').eq('id', true).maybeSingle();
  if (!s || !s.enabled || s.stopped_at) return { state: 'off' };
  const { data: rows } = await db.from('sms_messages').select('status,send_after,claimed_at').eq('direction', 'out').in('status', ['queued', 'sending']).limit(200);
  const stuck = describeStuck((rows ?? []) as { status: string; send_after: string; claimed_at: string | null }[], now);

  if (!stuck) {
    if (s.bridge_alert_sent_at) {
      await db.from('sms_settings').update({ bridge_alert_sent_at: null }).eq('id', true);
      await deps.notify?.({ title: 'Texting is back', body: 'The Mac bridge is sending texts again.', url: '/app/texting' });
      return { state: 'recovered' };
    }
    return { state: 'ok' };
  }
  const last = s.bridge_alert_sent_at ? new Date(s.bridge_alert_sent_at as string) : null;
  if (last && now.getTime() - +last < REALERT_AFTER_MINUTES * 60_000) return { state: 'down_already_alerted' };

  const seen = s.bridge_last_seen_at ? `Last heard from the Mac ${mins(now.getTime() - +new Date(s.bridge_last_seen_at as string))} min ago.` : 'The Mac has never connected.';
  // Claim the alert first so two overlapping ticks cannot both send it.
  await db.from('sms_settings').update({ bridge_alert_sent_at: now.toISOString() }).eq('id', true);
  await deps.notify?.({
    title: `Texting is stuck: ${stuck.waiting} text${stuck.waiting === 1 ? '' : 's'} waiting`,
    body: `Oldest has waited ${stuck.minutes} min. ${seen} Check that the Mac is on, awake and online, or follow up with new leads by hand.`,
    url: '/app/texting',
  });
  return { state: 'alerted', waiting: stuck.waiting };
}

export type FailedTextsResult = { state: 'none' } | { state: 'alerted'; count: number } | { state: 'unavailable' };

/**
 * The last line of defence. A text that ended up `failed` (retries used up, Messages never confirmed, or the number can't
 * be reached) is announced ONCE to the team with who to follow up with, and noted on the lead's timeline, so a lead is
 * never silently left waiting. Cancelled texts (opt-out, "stop all texting", a person took over) are deliberate and ignored.
 * Runs on the existing 5-minute scheduler.
 */
export async function alertFailedTexts(db: Db, deps: HealthDeps = {}): Promise<FailedTextsResult> {
  const now = (deps.now ?? (() => new Date()))();
  const since = new Date(now.getTime() - 48 * 3600_000).toISOString();
  const { data, error } = await db.from('sms_messages').select('id,lead_id,conversation_id,error')
    .eq('direction', 'out').eq('status', 'failed').is('failure_notified_at', null)
    .gte('created_at', since).order('created_at').limit(50);
  if (error) return { state: 'unavailable' }; // migration 0078 not applied yet
  const all = (data ?? []) as { id: string; lead_id: string | null; conversation_id: string; error: string | null }[];
  // Deliberate cancellations are marked handled without an alert, so they never crowd real failures out of this page.
  const cancelled = all.filter((r) => /^cancelled/i.test(r.error ?? ''));
  if (cancelled.length) await db.from('sms_messages').update({ failure_notified_at: now.toISOString() }).in('id', cancelled.map((r) => r.id));
  const rows = all.filter((r) => !/^cancelled/i.test(r.error ?? ''));
  if (!rows.length) return { state: 'none' };

  // Claim first so two overlapping ticks cannot announce the same texts twice.
  const { data: claimed } = await db.from('sms_messages').update({ failure_notified_at: now.toISOString() })
    .in('id', rows.map((r) => r.id)).is('failure_notified_at', null).select('id');
  const mine = new Set(((claimed ?? []) as { id: string }[]).map((r) => r.id));
  const fresh = rows.filter((r) => mine.has(r.id));
  if (!fresh.length) return { state: 'none' };

  const leadIds = [...new Set(fresh.map((r) => r.lead_id).filter((x): x is string => !!x))];
  const convIds = [...new Set(fresh.map((r) => r.conversation_id))];
  const [{ data: leads }, { data: convs }] = await Promise.all([
    leadIds.length ? db.from('leads').select('id,first_name').in('id', leadIds) : Promise.resolve({ data: [] }),
    db.from('sms_conversations').select('id,phone_e164').in('id', convIds),
  ]);
  const nameOf = new Map(((leads ?? []) as { id: string; first_name: string | null }[]).map((l) => [l.id, l.first_name?.trim() || 'a lead']));
  const phoneOf = new Map(((convs ?? []) as { id: string; phone_e164: string }[]).map((c) => [c.id, c.phone_e164]));

  for (const r of fresh) {
    await note(db, r.lead_id, `Text could not be delivered (${r.error ?? 'unknown error'}). Follow up with a call or email.`, { sms_failed: true, message_id: r.id }).catch(() => undefined);
  }
  const who = fresh.slice(0, 5).map((r) => `${r.lead_id ? nameOf.get(r.lead_id) : 'a contact'} ${phoneOf.get(r.conversation_id) ?? ''}`.trim()).join(', ');
  const more = fresh.length > 5 ? ` and ${fresh.length - 5} more` : '';
  await deps.notify?.({
    title: `${fresh.length} text${fresh.length === 1 ? '' : 's'} could not be delivered`,
    body: `Texting gave up on: ${who}${more}. Call or email ${fresh.length === 1 ? 'them' : 'these leads'} so ${fresh.length === 1 ? 'they are' : 'nobody is'} left waiting.`,
    url: fresh.length === 1 && fresh[0].lead_id ? `/app/leads/${fresh[0].lead_id}` : '/app/texting',
    linkLabel: 'Open lead',
  });
  return { state: 'alerted', count: fresh.length };
}
