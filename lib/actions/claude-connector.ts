'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { MCP_SCOPES, newMcpKey, type McpScope } from '@/lib/mcp/keys';

export type CreateMcpKeyState = { ok: true; key: string; name: string; scopes: McpScope[] } | { ok: false; error: string } | undefined;

/** Admin: create a HomeQuote MCP key that acts for them. The plaintext is returned once; only its hash is stored. */
export async function createMcpKey(_prev: CreateMcpKeyState, formData: FormData): Promise<CreateMcpKeyState> {
  const profile = await requireRole(['admin']);
  const name = String(formData.get('name') ?? '').trim() || 'Claude';
  if (name.length > 80) return { ok: false, error: 'The name is too long (80 characters max).' };
  const picked = formData.getAll('scopes').map(String).filter((s): s is McpScope => (MCP_SCOPES as readonly string[]).includes(s));
  const scopes: McpScope[] = ['read', ...picked.filter((s) => s !== 'read')];
  const { key, hash, prefix } = newMcpKey();
  const { error } = await createAdminClient().from('mcp_api_keys').insert({ name, key_hash: hash, key_prefix: prefix, scopes, created_by: profile.id });
  if (error) return { ok: false, error: /mcp_api_keys/.test(error.message) ? 'The database update for this feature has not been run yet (0067).' : 'The key couldn’t be created. Try again.' };
  revalidatePath('/app/claude-connector');
  return { ok: true, key, name, scopes };
}

/** Admin: revoke a key. Claude stops being able to use it immediately. */
export async function revokeMcpKey(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await createAdminClient().from('mcp_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id).is('revoked_at', null);
  revalidatePath('/app/claude-connector');
}
