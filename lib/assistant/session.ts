import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { DEFAULT_TZ } from '@/components/calls/format';
import type { Profile } from '@/lib/types';
import { canUseAssistant, tenantOf } from './access';

export interface AssistantSession {
  profile: Profile;
  /** User-scoped client: RLS applies. */
  db: SupabaseClient;
  /** Service role: writes assistant_* rows only. */
  admin: SupabaseClient;
  tz: string;
}

export type SessionResult =
  | { ok: true; session: AssistantSession }
  | { ok: false; status: 401 | 403 | 503; code: string; message: string };

/**
 * Identity comes ONLY from the authenticated Supabase session cookie. Nothing in the request body
 * (user id, tenant id, role) is ever read for authorization.
 */
export async function getAssistantSession(): Promise<SessionResult> {
  let profile: Profile | null;
  try {
    profile = await getProfile();
  } catch {
    return { ok: false, status: 503, code: 'auth_unavailable', message: 'Could not verify your sign-in. Try again.' };
  }
  if (!profile) return { ok: false, status: 401, code: 'unauthenticated', message: 'Please sign in again.' };
  if (!canUseAssistant(profile)) return { ok: false, status: 403, code: 'forbidden', message: 'The assistant is not available for your account.' };

  const db = await createClient();
  let tz = DEFAULT_TZ;
  const tenant = tenantOf(profile);
  if (tenant) {
    const { data } = await db.from('contractor_availability_settings').select('timezone').eq('contractor_id', tenant).maybeSingle();
    const candidate = (data as { timezone?: string } | null)?.timezone;
    if (candidate) {
      try { new Intl.DateTimeFormat('en-US', { timeZone: candidate }); tz = candidate; } catch { /* keep default */ }
    }
  }
  return { ok: true, session: { profile, db, admin: createAdminClient(), tz } };
}
