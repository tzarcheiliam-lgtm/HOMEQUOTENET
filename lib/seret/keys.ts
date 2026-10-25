import 'server-only';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/signing/tokens';

/**
 * Seret API keys: `seret_` + 256 random bits (base64url). Only the SHA-256 hash is stored (seret_api_keys);
 * the plaintext is shown to the admin once. Revoking sets revoked_at, which blocks the key immediately.
 */
const KEY_RE = /^seret_[A-Za-z0-9_-]{43}$/;

export function newApiKey() {
  const key = `seret_${randomBytes(32).toString('base64url')}`;
  return { key, hash: hashToken(key), prefix: key.slice(0, 12) };
}

/** Reads `Authorization: Bearer seret_…` and returns the key's row id, or null if missing, malformed or revoked. */
export async function verifyApiKey(authorization: string | null): Promise<{ id: string; name: string } | null> {
  const key = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!key || !KEY_RE.test(key)) return null;
  const db = createAdminClient();
  const { data } = await db
    .from('seret_api_keys')
    .select('id, name, revoked_at')
    .eq('key_hash', hashToken(key))
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  // Best effort; a failed timestamp update must never block the request.
  void db.from('seret_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {});
  return { id: data.id, name: data.name };
}
