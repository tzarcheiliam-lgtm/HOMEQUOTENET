import 'server-only';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/signing/tokens';

/**
 * HomeQuote MCP keys: `hq_` + 256 random bits (base64url). Only the SHA-256 hash is stored (mcp_api_keys);
 * the plaintext is shown to the admin once. Revoking sets revoked_at, which blocks the key immediately.
 */
export const MCP_SCOPES = ['read', 'write', 'text', 'assign'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];
const KEY_RE = /^hq_[A-Za-z0-9_-]{43}$/;

export interface McpKey { id: string; name: string; scopes: McpScope[]; actorId: string | null }

export function newMcpKey() {
  const key = `hq_${randomBytes(32).toString('base64url')}`;
  return { key, hash: hashToken(key), prefix: key.slice(0, 9) };
}

/** Reads `Authorization: Bearer hq_…`; null if missing, malformed, revoked, or its admin is no longer an active admin. */
export async function verifyMcpKey(authorization: string | null): Promise<McpKey | null> {
  const key = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!key || !KEY_RE.test(key)) return null;
  const db = createAdminClient();
  const { data } = await db.from('mcp_api_keys').select('id, name, scopes, revoked_at, created_by').eq('key_hash', hashToken(key)).maybeSingle();
  if (!data || data.revoked_at) return null;
  // A key is only as good as the admin it acts for.
  if (data.created_by) {
    const { data: p } = await db.from('profiles').select('role, is_active, account_status, deleted_at').eq('id', data.created_by).maybeSingle();
    const ok = p && p.role === 'admin' && p.is_active !== false && (p.account_status ?? 'active') === 'active' && !p.deleted_at;
    if (!ok) return null;
  } else return null;
  void db.from('mcp_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {});
  const scopes = ((data.scopes ?? ['read']) as string[]).filter((s): s is McpScope => (MCP_SCOPES as readonly string[]).includes(s));
  return { id: data.id, name: data.name, scopes, actorId: data.created_by };
}
