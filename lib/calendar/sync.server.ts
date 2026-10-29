/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  appointmentLink,
  eventDescription,
  eventLocation,
  eventTitle,
  loadAppointment,
} from './appointment-event.server';
import { accessTokenFor, CONNECTION_COLUMNS, recordConnectionError, type ConnectionRow } from './connections.server';
import { CalendarAuthError, deleteEvent, googleEventId, upsertEvent } from './google';

type Db = ReturnType<typeof createAdminClient>;

interface Job {
  id: string;
  appointment_id: string;
  contractor_id: string | null;
}

export interface SyncResult {
  claimed: number;
  done: number;
  retried: number;
}

/** Statuses whose calendar event should be removed rather than kept/updated. */
const REMOVE_STATUSES = new Set(['cancelled', 'rescheduled']);

async function removeFromConnection(db: Db, connection: ConnectionRow, appointmentId: string, externalId: string) {
  const token = await accessTokenFor(db, connection);
  await deleteEvent(token, connection.calendar_id, externalId);
  await db.from('appointment_calendar_events').delete().eq('appointment_id', appointmentId).eq('connection_id', connection.id);
}

/**
 * Bring every connected calendar in line with one appointment. Returns true when
 * nothing is left to retry (permanent failures like a revoked grant count as
 * settled: the connection is flagged for reconnect instead).
 */
async function syncAppointment(db: Db, job: Job): Promise<{ settled: boolean; error?: string }> {
  const appointment = await loadAppointment(db, job.appointment_id);
  const contractorId = appointment?.contractorId ?? job.contractor_id;

  const { data: existingRows } = await db.from('appointment_calendar_events').select('connection_id, external_event_id, sequence').eq('appointment_id', job.appointment_id);
  const existing = new Map((existingRows ?? []).map((r: any) => [r.connection_id as string, r]));

  const wanted = !!appointment && !!appointment.scheduledAt && !REMOVE_STATUSES.has(appointment.status);

  const connectionIds = new Set<string>(existing.keys());
  let targets: ConnectionRow[] = [];
  if (contractorId) {
    const { data } = await db
      .from('calendar_connections')
      .select(CONNECTION_COLUMNS)
      .eq('contractor_id', contractorId)
      .eq('provider', 'google')
      .eq('status', 'active')
      .eq('push_appointments', true);
    targets = (data ?? []) as ConnectionRow[];
  } else if (appointment?.calendarId) {
    // HomeQuote team calendar booking with no contractor yet: its hosts' own connections.
    const { data: members } = await db.from('booking_calendar_members').select('user_id').eq('calendar_id', appointment.calendarId);
    const hostIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
    if (hostIds.length) {
      const { data } = await db
        .from('calendar_connections')
        .select(CONNECTION_COLUMNS)
        .in('user_id', hostIds)
        .is('contractor_id', null)
        .eq('provider', 'google')
        .eq('status', 'active')
        .eq('push_appointments', true);
      targets = (data ?? []) as ConnectionRow[];
    }
  }
  const targetIds = new Set(targets.map((t) => t.id));
  for (const t of targets) connectionIds.add(t.id);

  // Every connection we have written to, plus every current target.
  const { data: allConns } = connectionIds.size
    ? await db.from('calendar_connections').select(CONNECTION_COLUMNS).in('id', [...connectionIds])
    : { data: [] as any[] };
  const byId = new Map(((allConns ?? []) as ConnectionRow[]).map((c) => [c.id, c]));

  let retry: string | undefined;
  for (const id of connectionIds) {
    const connection = byId.get(id);
    if (!connection) continue;
    const prior = existing.get(id) as { external_event_id: string; sequence: number } | undefined;
    try {
      if (wanted && targetIds.has(id) && appointment) {
        const eventId = prior?.external_event_id ?? googleEventId(appointment.id, id);
        const startMs = new Date(appointment.scheduledAt!).getTime();
        // A calendar booking carries its own end; an on-site visit uses the company's default length.
        const endsMs = appointment.endsAt ? new Date(appointment.endsAt).getTime() : NaN;
        let duration = Number.isFinite(endsMs) && endsMs > startMs ? Math.round((endsMs - startMs) / 60_000) : 0;
        if (!duration) {
          const { data: settings } = contractorId
            ? await db.from('contractor_availability_settings').select('default_duration_minutes').eq('contractor_id', contractorId).maybeSingle()
            : { data: null };
          duration = (settings as any)?.default_duration_minutes ?? 60;
        }
        const token = await accessTokenFor(db, connection);
        await upsertEvent(token, connection.calendar_id, eventId, {
          summary: eventTitle(appointment),
          description: eventDescription(appointment),
          location: eventLocation(appointment),
          startIso: new Date(startMs).toISOString(),
          endIso: new Date(startMs + duration * 60_000).toISOString(),
          url: appointmentLink(appointment),
        });
        await db.from('appointment_calendar_events').upsert(
          {
            appointment_id: appointment.id,
            connection_id: id,
            external_event_id: eventId,
            sequence: (prior?.sequence ?? 0) + 1,
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'appointment_id,connection_id' }
        );
        await recordConnectionError(db, id, null);
      } else if (prior) {
        // Cancelled/rescheduled/deleted, or reassigned to a company this connection does not belong to.
        await removeFromConnection(db, connection, job.appointment_id, prior.external_event_id);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Calendar sync failed';
      if (e instanceof CalendarAuthError) {
        // Permanent until the user reconnects (accessTokenFor already flagged it). Not retried.
        await db.from('appointment_calendar_events').update({ last_error: message.slice(0, 300) }).eq('appointment_id', job.appointment_id).eq('connection_id', id);
        continue;
      }
      retry = message;
      await recordConnectionError(db, id, message);
      await db.from('appointment_calendar_events').update({ last_error: message.slice(0, 300) }).eq('appointment_id', job.appointment_id).eq('connection_id', id);
    }
  }
  if (!appointment) {
    // Appointment is gone: drop leftover mapping rows once the provider copies are removed.
    if (!retry) await db.from('appointment_calendar_events').delete().eq('appointment_id', job.appointment_id);
  }
  return retry ? { settled: false, error: retry } : { settled: true };
}

export async function processCalendarSyncJobs(opts: { limit?: number; db?: Db } = {}): Promise<SyncResult> {
  const db = opts.db ?? createAdminClient();
  const { data, error } = await db.rpc('claim_calendar_sync_jobs', { p_limit: opts.limit ?? 25 });
  if (error) throw new Error(`Could not claim calendar sync jobs: ${error.message}`);
  const jobs = (data ?? []) as Job[];
  const result: SyncResult = { claimed: jobs.length, done: 0, retried: 0 };
  for (const job of jobs) {
    try {
      const outcome = await syncAppointment(db, job);
      if (outcome.settled) {
        await db.from('calendar_sync_jobs').update({ processed_at: new Date().toISOString(), error: null }).eq('id', job.id);
        result.done++;
      } else {
        await db.from('calendar_sync_jobs').update({ error: (outcome.error ?? '').slice(0, 500) }).eq('id', job.id);
        result.retried++;
      }
    } catch (e) {
      result.retried++;
      await db.from('calendar_sync_jobs').update({ error: (e instanceof Error ? e.message : String(e)).slice(0, 500) }).eq('id', job.id);
    }
  }
  return result;
}

/** Deliver whatever the database just queued, after the response. The 5-minute tick is the backstop. */
export function flushCalendarSyncSoon(): void {
  try {
    after(async () => {
      try {
        await processCalendarSyncJobs();
      } catch (e) {
        console.error('[calendar] flush failed:', e instanceof Error ? e.message : e);
      }
    });
  } catch {
    /* outside a request scope; the scheduled tick will pick it up */
  }
}

export async function runCalendarMaintenance(): Promise<SyncResult> {
  const db = createAdminClient();
  const result = await processCalendarSyncJobs({ limit: 50, db });
  await db.rpc('prune_calendar_sync_jobs');
  return result;
}

/** After a calendar is connected, queue every upcoming appointment of that company so it appears there. */
export async function backfillUpcomingAppointments(db: Db, contractorId: string): Promise<number> {
  const { data } = await db
    .from('appointments')
    .select('id, assignment:lead_assignments!inner(contractor_id)')
    .eq('assignment.contractor_id', contractorId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString());
  const ids = ((data ?? []) as any[]).map((a) => a.id as string);
  for (const id of ids) {
    // A pending job already queued for this appointment violates the partial unique index; that is fine.
    await db.from('calendar_sync_jobs').insert({ appointment_id: id, contractor_id: contractorId });
  }
  return ids.length;
}
