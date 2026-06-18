'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth';
import type { AccountStatus, UserRole } from '@/lib/types';

export type TeamState = { error?: string; success?: boolean } | undefined;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// --- helpers ----------------------------------------------------------------

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? null : s;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function logAudit(
  action: string,
  targetUserId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient();
  await supabase.from('audit_logs').insert({
    actor_id: await currentUserId(),
    action,
    target_user_id: targetUserId,
    metadata,
  });
}

async function emailFor(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();
  return (data as any)?.email ?? null;
}

const ROLES: UserRole[] = ['admin', 'setter', 'contractor'];

// --- create / invite --------------------------------------------------------

const baseUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  full_name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'setter', 'contractor']),
});

function resolveContractorId(fd: FormData, role: UserRole): string | null {
  return role === 'contractor' ? str(fd, 'contractor_id') : null;
}

export async function createUser(
  _prev: TeamState,
  fd: FormData
): Promise<TeamState> {
  await requireRole(['admin']);

  const parsed = baseUserSchema
    .extend({ password: z.string().min(8, 'Password must be at least 8 characters') })
    .safeParse({
      email: str(fd, 'email'),
      full_name: str(fd, 'full_name'),
      role: str(fd, 'role'),
      password: str(fd, 'password'),
    });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const role = parsed.data.role as UserRole;
  const contractorId = resolveContractorId(fd, role);
  if (role === 'contractor' && !contractorId)
    return { error: 'Select a contractor company for contractor users' };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error) return { error: error.message };

  const userId = data.user!.id;
  const activate = fd.get('activate') === 'on';

  const { error: pErr } = await admin
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      role,
      contractor_id: contractorId,
      account_status: activate ? 'active' : 'pending',
    })
    .eq('id', userId);
  if (pErr) return { error: pErr.message };

  await logAudit('user.create', userId, {
    role,
    email: parsed.data.email,
    activated: activate,
  });
  revalidatePath('/app/team');
  redirect(`/app/team/${userId}`);
}

export async function inviteUser(
  _prev: TeamState,
  fd: FormData
): Promise<TeamState> {
  await requireRole(['admin']);

  const parsed = baseUserSchema.safeParse({
    email: str(fd, 'email'),
    full_name: str(fd, 'full_name'),
    role: str(fd, 'role'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const role = parsed.data.role as UserRole;
  const contractorId = resolveContractorId(fd, role);
  if (role === 'contractor' && !contractorId)
    return { error: 'Select a contractor company for contractor users' };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { full_name: parsed.data.full_name },
      redirectTo: `${SITE_URL}/sign-in`,
    }
  );
  if (error) return { error: error.message };

  const userId = data.user!.id;
  await admin
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      role,
      contractor_id: contractorId,
      account_status: 'pending',
    })
    .eq('id', userId);

  await logAudit('user.invite', userId, { role, email: parsed.data.email });
  revalidatePath('/app/team');
  redirect(`/app/team/${userId}`);
}

// --- status / role / contractor (void actions) ------------------------------

export async function setUserStatus(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const userId = str(fd, 'user_id');
  const status = str(fd, 'status') as AccountStatus | null;
  if (!userId || !status) return;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({ account_status: status })
    .eq('id', userId);

  await logAudit(`user.status.${status}`, userId, { status });
  revalidatePath('/app/team');
  revalidatePath(`/app/team/${userId}`);
}

export async function changeUserRole(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const userId = str(fd, 'user_id');
  const role = str(fd, 'role') as UserRole | null;
  if (!userId || !role || !ROLES.includes(role)) return;

  const contractorId = role === 'contractor' ? str(fd, 'contractor_id') : null;
  if (role === 'contractor' && !contractorId) return;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({ role, contractor_id: contractorId })
    .eq('id', userId);

  await logAudit('user.role', userId, { role, contractor_id: contractorId });
  revalidatePath('/app/team');
  revalidatePath(`/app/team/${userId}`);
}

export async function reassignContractor(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const userId = str(fd, 'user_id');
  const contractorId = str(fd, 'contractor_id');
  if (!userId || !contractorId) return;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({ contractor_id: contractorId })
    .eq('id', userId);

  await logAudit('user.reassign', userId, { contractor_id: contractorId });
  revalidatePath(`/app/team/${userId}`);
}

// --- password / invite emails (void) ----------------------------------------

export async function resetPassword(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const userId = str(fd, 'user_id');
  if (!userId) return;
  const email = await emailFor(userId);
  if (!email) return;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/sign-in`,
  });
  await logAudit('user.password_reset', userId, { email });
  revalidatePath(`/app/team/${userId}`);
}

export async function resendInvite(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const userId = str(fd, 'user_id');
  if (!userId) return;
  const email = await emailFor(userId);
  if (!email) return;

  const admin = createAdminClient();
  await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/sign-in`,
  });
  await logAudit('user.invite_resend', userId, { email });
  revalidatePath(`/app/team/${userId}`);
}

// --- soft delete + bulk -----------------------------------------------------

export async function softDeleteUser(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const userId = str(fd, 'user_id');
  if (!userId) return;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString(), account_status: 'disabled' })
    .eq('id', userId);

  await logAudit('user.delete', userId, {});
  revalidatePath('/app/team');
  redirect('/app/team');
}

export async function bulkUserAction(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const ids = fd.getAll('ids').map(String).filter(Boolean);
  const action = String(fd.get('bulk_action') ?? '');
  if (ids.length === 0 || !action) return;

  const supabase = await createClient();
  const map: Record<string, Record<string, unknown>> = {
    activate: { account_status: 'active' },
    suspend: { account_status: 'suspended' },
    disable: { account_status: 'disabled' },
    delete: {
      deleted_at: new Date().toISOString(),
      account_status: 'disabled',
    },
  };
  const update = map[action];
  if (!update) return;

  await supabase.from('profiles').update(update).in('id', ids);
  await logAudit(`user.bulk.${action}`, null, { ids });
  revalidatePath('/app/team');
}
