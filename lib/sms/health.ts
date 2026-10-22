import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

type Db = SupabaseClient;

/** A text that is due but still unsent after this long means the Mac is not picking things up. */
export const STUCK_AFTER_MINUTES = 5;
/** While it stays down the alert repeats at most this often. */
export const REALERT_AFTER_MINUTES = 60;

export interface Alert { title: string; body: string; url: string }
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
