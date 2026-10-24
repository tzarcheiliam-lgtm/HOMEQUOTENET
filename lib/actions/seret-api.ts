'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { newApiKey } from '@/lib/seret/keys';

export type CreateKeyState = { ok: true; key: string; name: string } | { ok: false; error: string } | undefined;

/** Admin: create a Seret API key. The plaintext is returned once and never stored (only its hash). */
export async function createSeretApiKey(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const profile = await requireRole(['admin']);
  const name = String(formData.get('name') ?? '').trim() || 'Claude';
  if (name.length > 80) return { ok: false, error: 'The name is too long (80 characters max).' };
  const { key, hash, prefix } = newApiKey();
  const { error } = await createAdminClient().from('seret_api_keys').insert({ name, key_hash: hash, key_prefix: prefix, created_by: profile.id });
  if (error) return { ok: false, error: 'The key couldn’t be created. Try again.' };
  revalidatePath('/app/seret-api');
  return { ok: true, key, name };
}

/** Admin: revoke a key. Anything using it stops working immediately. */
export async function revokeSeretApiKey(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await createAdminClient().from('seret_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id).is('revoked_at', null);
  revalidatePath('/app/seret-api');
}
