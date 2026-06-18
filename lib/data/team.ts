import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AccountStatus, AuditLog, Profile, UserRole } from '@/lib/types';

export interface UserRow extends Profile {
  contractor_name: string | null;
}

export interface UserFilters {
  q?: string;
  role?: UserRole;
  status?: AccountStatus;
  sort?: 'created' | 'last_login' | 'name';
}

export async function listUsers(filters: UserFilters = {}): Promise<UserRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select('*, contractor:contractors(name)')
    .is('deleted_at', null);

  if (filters.role) query = query.eq('role', filters.role);
  if (filters.status) query = query.eq('account_status', filters.status);
  if (filters.q) {
    const q = filters.q.replace(/[(),%*]/g, ' ').trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  if (filters.sort === 'last_login')
    query = query.order('last_login_at', { ascending: false, nullsFirst: false });
  else if (filters.sort === 'name')
    query = query.order('full_name', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const { data } = await query;
  return (data ?? []).map((u: any) => ({
    ...(u as Profile),
    contractor_name: u.contractor?.name ?? null,
  }));
}

export interface UserDetail {
  user: UserRow;
  audit: (AuditLog & { actor_name: string | null })[];
  activity: {
    id: string;
    type: string;
    body: string | null;
    created_at: string;
    lead_id: string;
  }[];
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('profiles')
    .select('*, contractor:contractors(name)')
    .eq('id', id)
    .single();
  if (!user) return null;

  const [{ data: audit }, { data: activity }] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_id_fkey(full_name, email)')
      .eq('target_user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('lead_activities')
      .select('id, type, body, created_at, lead_id')
      .eq('actor_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    user: { ...(user as Profile), contractor_name: (user as any).contractor?.name ?? null },
    audit: (audit ?? []).map((a: any) => ({
      ...(a as AuditLog),
      actor_name: a.actor?.full_name || a.actor?.email || null,
    })),
    activity: (activity ?? []) as UserDetail['activity'],
  };
}

export interface AuditRow extends AuditLog {
  actor_name: string | null;
  target_name: string | null;
}

export async function listAuditLogs(limit = 200): Promise<AuditRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_logs')
    .select(
      `*,
       actor:profiles!audit_logs_actor_id_fkey(full_name, email),
       target:profiles!audit_logs_target_user_id_fkey(full_name, email)`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((a: any) => ({
    ...(a as AuditLog),
    actor_name: a.actor?.full_name || a.actor?.email || null,
    target_name: a.target?.full_name || a.target?.email || null,
  }));
}
