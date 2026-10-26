import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCalendarSecret } from './config';
import { CalendarAuthError, refreshAccessToken } from './google';

type Db = ReturnType<typeof createAdminClient>;

export interface ConnectionRow {
  id: string;
  user_id: string;
  contractor_id: string;
  provider: 'google' | 'apple_caldav';
  calendar_id: string;
  encrypted_credentials: string;
  status: 'active' | 'needs_reconnect';
  push_appointments: boolean;
  import_busy: boolean;
}

export const CONNECTION_COLUMNS =
  'id, user_id, contractor_id, provider, calendar_id, encrypted_credentials, status, push_appointments, import_busy';

export async function markNeedsReconnect(db: Db, connectionId: string, message: string) {
  await db.from('calendar_connections').update({ status: 'needs_reconnect', last_error: message.slice(0, 300) }).eq('id', connectionId);
}

export async function recordConnectionError(db: Db, connectionId: string, message: string | null) {
  await db
    .from('calendar_connections')
    .update(message ? { last_error: message.slice(0, 300) } : { last_error: null, last_synced_at: new Date().toISOString() })
    .eq('id', connectionId);
}

/**
 * A fresh access token for a connection. A revoked/expired grant flips the
 * connection to needs_reconnect and rethrows CalendarAuthError.
 */
export async function accessTokenFor(db: Db, connection: ConnectionRow): Promise<string> {
  try {
    return await refreshAccessToken(decryptCalendarSecret(connection.encrypted_credentials));
  } catch (e) {
    if (e instanceof CalendarAuthError) await markNeedsReconnect(db, connection.id, e.message);
    throw e;
  }
}
