/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { SigningError, messageFor } from '@/lib/signing/errors';
import type { Profile } from '@/lib/types';

/** Throws a SigningError for a failed RPC or a {ok:false,error} business result; returns the data otherwise. */
export function unwrap(res: { data: any; error: { message: string } | null }) {
  if (res.error) {
    const m = /signing:(\w+)/.exec(res.error.message);
    throw new SigningError(m?.[1] ?? 'server', messageFor(m?.[1] ?? 'server'));
  }
  if (res.data && res.data.ok === false) throw new SigningError(res.data.error, messageFor(res.data.error), res.data);
  return res.data;
}

/** Appends to the hash-chained audit log. */
export async function log(versionId: string, type: string, actor: Profile | null, meta: Record<string, unknown> = {}, recipientId: string | null = null) {
  await createAdminClient().rpc('signing_log_event', { p_version: versionId, p_recipient: recipientId, p_type: type, p_actor: actor?.id ?? null, p_ip: null, p_ua: null, p_meta: meta });
}
