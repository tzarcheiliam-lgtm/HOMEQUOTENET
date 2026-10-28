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

/**
 * Admin: approve or decline something Claude asked to do (today: assigning a lead). This is the ONLY place a
 * Claude-proposed assignment is carried out, so it always needs a signed-in admin clicking Approve.
 */
export async function decideMcpAction(formData: FormData): Promise<void> {
  const profile = await requireRole(['admin']);
  const id = String(formData.get('id') ?? '');
  const approve = formData.get('decision') === 'approve';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = createAdminClient();
  const now = new Date().toISOString();
  // Claim the request first so two clicks can never run it twice.
  const { data: claimed } = await db.from('mcp_pending_actions')
    .update({ status: approve ? 'approved' : 'declined', decided_by: profile.id, decided_at: now })
    .eq('id', id).eq('status', 'pending').gt('expires_at', now)
    .select('id, kind, payload, summary').maybeSingle();
  if (!claimed) { revalidatePath('/app/claude-connector'); return; }
  if (approve && claimed.kind === 'assign_lead') {
    const p = claimed.payload as { leadId: string; contractorIds: string[]; exclusive?: boolean; reason?: string | null };
    const { assignLeadToContractors } = await import('@/lib/leads/assign.server');
    const r = await assignLeadToContractors(db, {
      leadId: p.leadId, contractorIds: p.contractorIds, exclusive: !!p.exclusive, actorId: profile.id,
      note: `Assigned to ${p.contractorIds.length} contractor(s) — proposed by Claude, approved by ${profile.full_name || profile.email || 'an admin'}${p.reason ? `. Reason: ${p.reason}` : ''}`,
    });
    await db.from('mcp_pending_actions').update(r.ok ? { result: `Done: ${r.added} new assignment(s).` } : { status: 'failed', result: r.error }).eq('id', id);
    revalidatePath(`/app/leads/${p.leadId}`);
  }
  revalidatePath('/app/claude-connector');
}
