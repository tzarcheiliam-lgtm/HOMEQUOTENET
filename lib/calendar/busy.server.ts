import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { accessTokenFor, CONNECTION_COLUMNS, recordConnectionError, type ConnectionRow } from './connections.server';
import { CalendarAuthError, queryFreeBusy } from './google';
import type { BusyInterval } from '@/lib/availability/slots';

type Db = ReturnType<typeof createAdminClient>;

// Short in-process cache so a page that checks several slots makes one Google call.
const cache = new Map<string, { at: number; busy: BusyInterval[] }>();
const TTL_MS = 60_000;

/**
 * Busy time from the contractor's connected calendars (every user of the
 * company who connected one with "import busy" on). Only start/end are ever
 * read. A calendar outage must never block booking, so failures yield no busy
 * time for that connection and are recorded on it for the UI.
 */
export async function getExternalBusy(contractorId: string, fromMs: number, toMs: number, db: Db = createAdminClient()): Promise<BusyInterval[]> {
  const { data } = await db
    .from('calendar_connections')
    .select(CONNECTION_COLUMNS)
    .eq('contractor_id', contractorId)
    .eq('provider', 'google')
    .eq('status', 'active')
    .eq('import_busy', true);
  const connections = (data ?? []) as ConnectionRow[];
  const all: BusyInterval[] = [];
  for (const c of connections) {
    // Round the window to the hour so cache keys repeat across nearby checks.
    const from = Math.floor(fromMs / 3_600_000) * 3_600_000;
    const to = Math.ceil(toMs / 3_600_000) * 3_600_000;
    const key = `${c.id}:${from}:${to}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) {
      all.push(...hit.busy);
      continue;
    }
    try {
      const token = await accessTokenFor(db, c);
      const busy = await queryFreeBusy(token, c.calendar_id, from, to);
      cache.set(key, { at: Date.now(), busy });
      if (cache.size > 200) cache.clear();
      all.push(...busy);
      await recordConnectionError(db, c.id, null);
    } catch (e) {
      if (!(e instanceof CalendarAuthError)) {
        await recordConnectionError(db, c.id, e instanceof Error ? e.message : 'Calendar busy lookup failed');
      }
    }
  }
  return all;
}
