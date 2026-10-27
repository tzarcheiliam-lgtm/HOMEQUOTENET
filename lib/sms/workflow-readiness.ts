import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';
import { smsConfigured } from './config';

type Db = ReturnType<typeof createAdminClient>;

export interface TextingReadiness {
  /** Can a workflow text step be published? Texting is switched on, not stopped, and the bridge secret is set. */
  ready: boolean;
  /** Is the Mac checking in right now? (A text waits in line if not, so this is a warning, not a blocker.) */
  bridgeConnected: boolean;
  /** Plain-language reason when not ready. */
  reason: string | null;
}

/** What a workflow "send text" step needs, read on the server. */
export async function loadTextingReadiness(db: Db): Promise<TextingReadiness> {
  const { data } = await db.from('sms_settings').select('enabled,stopped_at,bridge_last_seen_at').eq('id', true).maybeSingle();
  const s = data as { enabled?: boolean; stopped_at?: string | null; bridge_last_seen_at?: string | null } | null;
  const bridgeConnected = !!s?.bridge_last_seen_at && Date.now() - new Date(s.bridge_last_seen_at).getTime() < 120_000;
  if (!smsConfigured()) return { ready: false, bridgeConnected, reason: 'The Mac bridge secret (SMS_BRIDGE_TOKEN) is not set.' };
  if (!s?.enabled || s.stopped_at) return { ready: false, bridgeConnected, reason: 'Automatic texting is turned off. Turn it on under Texting.' };
  return { ready: true, bridgeConnected, reason: null };
}
