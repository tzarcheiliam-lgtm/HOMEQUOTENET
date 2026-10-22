import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isHqnAdministrator, isContractorOwner } from '@/lib/permissions';
import type { Profile } from '@/lib/types';
import { openToken, sealToken } from './config';

export interface MetaConnection {
  id: string; contractorId: string | null; metaUserName: string | null; scopes: string[]; status: string; expiresAt: string | null; connectedAt: string;
  canCreateDataset: boolean;
}

/** Who may connect Meta and run tracking setup: HomeQuote admins, and contractor OWNERS (never staff, setters or callers). */
export function canSetUpMeta(p: Pick<Profile, 'role' | 'contractor_id' | 'contractor_role' | 'is_active'>): boolean {
  return isHqnAdministrator(p as Profile) || (p.is_active && p.role === 'contractor' && !!p.contractor_id && isContractorOwner(p as Profile));
}
/** The tenant a connection belongs to: the contractor's company, or null (HomeQuote) for admins. */
export const connectionOwner = (p: Pick<Profile, 'role' | 'contractor_id'>): string | null => (p.role === 'contractor' ? p.contractor_id : null);

export async function getConnection(admin: SupabaseClient, profile: Profile): Promise<MetaConnection | null> {
  if (!canSetUpMeta(profile)) return null;
  const owner = connectionOwner(profile);
  let q = admin.from('meta_connections').select('id, contractor_id, meta_user_name, scopes, status, token_expires_at, connected_at').order('connected_at', { ascending: false }).limit(1);
  q = owner ? q.eq('contractor_id', owner) : q.is('contractor_id', null);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const d = data as { id: string; contractor_id: string | null; meta_user_name: string | null; scopes: string[]; status: string; token_expires_at: string | null; connected_at: string };
  const expired = d.token_expires_at ? new Date(d.token_expires_at).getTime() <= Date.now() : false;
  return {
    id: d.id, contractorId: d.contractor_id, metaUserName: d.meta_user_name, scopes: d.scopes ?? [], status: expired && d.status === 'active' ? 'needs_reconnect' : d.status,
    expiresAt: d.token_expires_at, connectedAt: d.connected_at, canCreateDataset: (d.scopes ?? []).includes('ads_management'),
  };
}

/** Server-only: the decrypted token for a connection the caller is entitled to. Never returned to a client or the model. */
export async function tokenFor(admin: SupabaseClient, profile: Profile, connectionId: string): Promise<string | null> {
  const conn = await getConnection(admin, profile);
  if (!conn || conn.id !== connectionId || conn.status !== 'active') return null;
  const { data } = await admin.from('meta_connection_secrets').select('token_enc').eq('connection_id', connectionId).maybeSingle();
  if (!data) return null;
  try {
    await admin.from('meta_connections').update({ last_used_at: new Date().toISOString() }).eq('id', connectionId);
    return openToken((data as { token_enc: string }).token_enc);
  } catch { return null; }
}

export async function saveConnection(admin: SupabaseClient, input: {
  contractorId: string | null; connectedBy: string; metaUserId: string; metaUserName: string | null; scopes: string[]; expiresAt: Date | null; token: string;
}): Promise<string> {
  const base = {
    contractor_id: input.contractorId, connected_by: input.connectedBy, meta_user_id: input.metaUserId, meta_user_name: input.metaUserName,
    scopes: input.scopes, token_expires_at: input.expiresAt?.toISOString() ?? null, status: 'active', last_error: null, connected_at: new Date().toISOString(),
  };
  let q = admin.from('meta_connections').select('id').eq('meta_user_id', input.metaUserId);
  q = input.contractorId ? q.eq('contractor_id', input.contractorId) : q.is('contractor_id', null);
  const { data: existing } = await q.maybeSingle();
  let id = (existing as { id: string } | null)?.id;
  if (id) await admin.from('meta_connections').update(base).eq('id', id);
  else {
    const { data, error } = await admin.from('meta_connections').insert(base).select('id').single();
    if (error || !data) throw new Error('Could not save the Meta connection');
    id = (data as { id: string }).id;
  }
  const stored = await admin.from('meta_connection_secrets').upsert({ connection_id: id, token_enc: sealToken(input.token), updated_at: new Date().toISOString() }, { onConflict: 'connection_id' });
  // Never report "connected" when the token was not actually saved.
  if (stored.error) throw new Error('Could not save the Meta connection');
  return id as string;
}

export async function markNeedsReconnect(admin: SupabaseClient, connectionId: string, reason: string) {
  await admin.from('meta_connections').update({ status: 'needs_reconnect', last_error: reason.slice(0, 300) }).eq('id', connectionId);
}

export async function disconnect(admin: SupabaseClient, profile: Profile): Promise<boolean> {
  const conn = await getConnection(admin, profile);
  if (!conn) return false;
  await admin.from('meta_connection_secrets').delete().eq('connection_id', conn.id);
  await admin.from('meta_connections').update({ status: 'revoked' }).eq('id', conn.id);
  return true;
}

export async function logSetup(admin: SupabaseClient, e: { actor: string; contractorId: string | null; funnelId?: string | null; connectionId?: string | null; action: string; metadata?: Record<string, unknown> }) {
  await admin.from('meta_setup_log').insert({
    actor_user_id: e.actor, contractor_id: e.contractorId, funnel_id: e.funnelId ?? null, connection_id: e.connectionId ?? null, action: e.action, via: 'assistant', metadata: e.metadata ?? {},
  });
}
