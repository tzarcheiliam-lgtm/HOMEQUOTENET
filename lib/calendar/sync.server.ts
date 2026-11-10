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
  mirrorEventDescription,
  mirrorEventTitle,
} from './appointment-event.server';
import { loadSalesMeeting, salesMeetingEvent, salesMeetingWanted } from './sales-event.server';
import { accessTokenFor, CONNECTION_COLUMNS, recordConnectionError, type ConnectionRow } from './connections.server';
import { CalendarAuthError, deleteEvent, googleEventId, upsertEvent } from './google';

type Db = ReturnType<typeof createAdminClient>;

/** 'appointment' = public.appointments; 'sales_meeting' = public.prospect_sales_appointments (0073). */
export type SyncKind = 'appointment' | 'sales_meeting';

interface Job {
  id: string;
  /** The appointment's or the sales meeting's id (by kind). */
  appointment_id: string;
  contractor_id: string | null;
  kind?: SyncKind | null;
}

export interface SyncResult {
  claimed: number;
  done: number;
  retried: number;
}

/** Statuses whose calendar event should be removed rather than kept/updated. */
const REMOVE_STATUSES = new Set(['cancelled', 'rescheduled']);

async function removeFromConnection(db: Db, connection: ConnectionRow, kind: SyncKind, appointmentId: string, externalId: string) {
  const token = await accessTokenFor(db, connection);
  await deleteEvent(token, connection.calendar_id, externalId);
  await db.from('appointment_calendar_events').delete().eq('kind', kind).eq('appointment_id', appointmentId).eq('connection_id', connection.id);
}

/**
 * Admins' own connections that mirror every appointment (0073): Google, active,
 * no contractor, the setting on, and the owner still an active admin (a demoted
 * user stops receiving everyone's appointments at the next change).
 */
export async function mirrorConnections(db: Db): Promise<ConnectionRow[]> {
  const { data } = await db
    .from('calendar_connections')
    .select(CONNECTION_COLUMNS)
    .eq('provider', 'google')
    .eq('status', 'active')
    .eq('mirror_all_appointments', true)
    .is('contractor_id', null);
  const rows = (data ?? []) as ConnectionRow[];
  if (!rows.length) return [];
  const { data: admins } = await db.from('profiles').select('id').in('id', rows.map((r) => r.user_id)).eq('role', 'admin').eq('is_active', true);
  const ok = new Set(((admins ?? []) as { id: string }[]).map((a) => a.id));
  return rows.filter((r) => ok.has(r.user_id));
}

const eventKey = (kind: SyncKind, id: string) => (kind === 'sales_meeting' ? `sales:${id}` : id);

/** One sales meeting with a contractor on every mirroring admin calendar. */
async function syncSalesMeeting(db: Db, job: Job): Promise<{ settled: boolean; error?: string }> {
  const meeting = await loadSalesMeeting(db, job.appointment_id);
  const { data: existingRows } = await db.from('appointment_calendar_events').select('connection_id, external_event_id, sequence')
    .eq('kind', 'sales_meeting').eq('appointment_id', job.appointment_id);
  const existing = new Map((existingRows ?? []).map((r: any) => [r.connection_id as string, r]));
  const targets = meeting && salesMeetingWanted(meeting) ? await mirrorConnections(db) : [];
  const targetIds = new Set(targets.map((t) => t.id));
  const ids = new Set<string>([...existing.keys(), ...targetIds]);
  const { data: allConns } = ids.size ? await db.from('calendar_connections').select(CONNECTION_COLUMNS).in('id', [...ids]) : { data: [] as any[] };
  const byId = new Map(((allConns ?? []) as ConnectionRow[]).map((c) => [c.id, c]));

  let retry: string | undefined;
  for (const id of ids) {
    const connection = byId.get(id);
    if (!connection) continue;
    const prior = existing.get(id) as { external_event_id: string; sequence: number } | undefined;
    try {
      if (meeting && targetIds.has(id)) {
        const eventId = prior?.external_event_id ?? googleEventId(eventKey('sales_meeting', meeting.id), id);
        const token = await accessTokenFor(db, connection);
        await upsertEvent(token, connection.calendar_id, eventId, salesMeetingEvent(meeting));
        await db.from('appointment_calendar_events').upsert(
          { kind: 'sales_meeting', appointment_id: meeting.id, connection_id: id, external_event_id: eventId, sequence: (prior?.sequence ?? 0) + 1, last_error: null, updated_at: new Date().toISOString() },
          { onConflict: 'kind,appointment_id,connection_id' }
        );
        await recordConnectionError(db, id, null);
      } else if (prior) {
        await removeFromConnection(db, connection, 'sales_meeting', job.appointment_id, prior.external_event_id);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Calendar sync failed';
      await db.from('appointment_calendar_events').update({ last_error: message.slice(0, 300) }).eq('kind', 'sales_meeting').eq('appointment_id', job.appointment_id).eq('connection_id', id);
      if (e instanceof CalendarAuthError) continue;
      retry = message;
      await recordConnectionError(db, id, message);
    }
  }
  if (!meeting && !retry) await db.from('appointment_calendar_events').delete().eq('kind', 'sales_meeting').eq('appointment_id', job.appointment_id);
  return retry ? { settled: false, error: retry } : { settled: true };
}

/**
 * Bring every connected calendar in line with one appointment. Returns true when
 * nothing is left to retry (permanent failures like a revoked grant count as
 * settled: the connection is flagged for reconnect instead).
 */
async function syncAppointment(db: Db, job: Job): Promise<{ settled: boolean; error?: string }> {
  const appointment = await loadAppointment(db, job.appointment_id);
  const contractorId = appointment?.contractorId ?? job.contractor_id;

  const { data: existingRows } = await db.from('appointment_calendar_events').select('connection_id, external_event_id, sequence').eq('kind', 'appointment').eq('appointment_id', job.appointment_id);
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
  // Admins who put every appointment on their calendar (0073). A connection that is also a host or
  // company target is one event, not two (same deterministic id, one mapping row).
  const mirrors = wanted ? await mirrorConnections(db) : [];
  const mirrorIds = new Set(mirrors.map((m) => m.id));
  for (const m of mirrors) if (!targets.some((t) => t.id === m.id)) targets.push(m);
  const targetIds = new Set(targets.map((t) => t.id));
  for (const t of targets) connectionIds.add(t.id);
  let contractorName: string | null = null;
  if (mirrors.length && contractorId) {
    const { data: c } = await db.from('contractors').select('name').eq('id', contractorId).maybeSingle();
    contractorName = (c as any)?.name ?? null;
  }

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
        const mirror = mirrorIds.has(id);
        await upsertEvent(token, connection.calendar_id, eventId, {
          summary: mirror ? mirrorEventTitle(appointment, contractorName) : eventTitle(appointment),
          description: mirror ? mirrorEventDescription(appointment, contractorName) : eventDescription(appointment),
          location: eventLocation(appointment),
          startIso: new Date(startMs).toISOString(),
          endIso: new Date(startMs + duration * 60_000).toISOString(),
          url: appointmentLink(appointment),
        });
        await db.from('appointment_calendar_events').upsert(
          {
            kind: 'appointment',
            appointment_id: appointment.id,
            connection_id: id,
            external_event_id: eventId,
            sequence: (prior?.sequence ?? 0) + 1,
            last_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'kind,appointment_id,connection_id' }
        );
        await recordConnectionError(db, id, null);
      } else if (prior) {
        // Cancelled/rescheduled/deleted, or reassigned to a company this connection does not belong to.
        await removeFromConnection(db, connection, 'appointment', job.appointment_id, prior.external_event_id);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Calendar sync failed';
      if (e instanceof CalendarAuthError) {
        // Permanent until the user reconnects (accessTokenFor already flagged it). Not retried.
        await db.from('appointment_calendar_events').update({ last_error: message.slice(0, 300) }).eq('kind', 'appointment').eq('appointment_id', job.appointment_id).eq('connection_id', id);
        continue;
      }
      retry = message;
      await recordConnectionError(db, id, message);
      await db.from('appointment_calendar_events').update({ last_error: message.slice(0, 300) }).eq('kind', 'appointment').eq('appointment_id', job.appointment_id).eq('connection_id', id);
    }
  }
  if (!appointment) {
    // Appointment is gone: drop leftover mapping rows once the provider copies are removed.
    if (!retry) await db.from('appointment_calendar_events').delete().eq('kind', 'appointment').eq('appointment_id', job.appointment_id);
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
      const outcome = job.kind === 'sales_meeting' ? await syncSalesMeeting(db, job) : await syncAppointment(db, job);
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

/** Queue one item; an item already pending is fine (the partial unique index keeps one job per item). */
async function enqueue(db: Db, kind: SyncKind, id: string, contractorId: string | null = null) {
  await db.from('calendar_sync_jobs').insert({ kind, appointment_id: id, contractor_id: contractorId });
}

const MIRROR_HORIZON_DAYS = 90;
const OPEN_SALES_STATUSES = ['scheduled', 'confirmed', 'rescheduled'];

/**
 * Backstop and backfill for the admins' "every appointment" calendars: queue every upcoming
 * homeowner appointment and open sales meeting (next 90 days) that a mirroring calendar is
 * missing, or that changed after its event was last written, and every mirrored event whose
 * item was cancelled. Converges even if a trigger or a flush was missed. Returns how many it queued.
 */
export async function reconcileMirrorCalendars(db: Db, opts: { connectionIds?: string[] } = {}): Promise<number> {
  let mirrors = await mirrorConnections(db);
  if (opts.connectionIds) mirrors = mirrors.filter((m) => opts.connectionIds!.includes(m.id));
  if (!mirrors.length) return 0;
  const now = new Date();
  const until = new Date(now.getTime() + MIRROR_HORIZON_DAYS * 86_400_000).toISOString();
  const { data: appts } = await db.from('appointments').select('id, status, updated_at')
    .gte('scheduled_at', now.toISOString()).lte('scheduled_at', until).limit(500);
  const { data: meetings } = await db.from('prospect_sales_appointments').select('id, status, updated_at')
    .gte('scheduled_at', now.toISOString()).lte('scheduled_at', until).limit(500);
  const mirrorIds = mirrors.map((m) => m.id);
  const { data: mapped } = await db.from('appointment_calendar_events').select('kind, appointment_id, connection_id, updated_at').in('connection_id', mirrorIds);
  const written = new Map<string, string>();
  for (const r of (mapped ?? []) as any[]) written.set(`${r.kind ?? 'appointment'}:${r.appointment_id}:${r.connection_id}`, r.updated_at);
  const queue = new Set<string>();
  const check = (kind: SyncKind, rows: any[], open: (status: string) => boolean) => {
    for (const r of rows) {
      for (const cid of mirrorIds) {
        const at = written.get(`${kind}:${r.id}:${cid}`);
        const stale = at && r.updated_at && new Date(r.updated_at).getTime() > new Date(at).getTime();
        if ((open(r.status) && !at) || stale || (!open(r.status) && at)) queue.add(`${kind}:${r.id}`);
      }
    }
  };
  check('appointment', (appts ?? []) as any[], (s) => s === 'scheduled');
  check('sales_meeting', (meetings ?? []) as any[], (s) => OPEN_SALES_STATUSES.includes(s));
  for (const key of queue) {
    const [kind, id] = key.split(':') as [SyncKind, string];
    await enqueue(db, kind, id);
  }
  return queue.size;
}

/**
 * The admin turned "every appointment" off: queue every event on that calendar so the
 * worker takes off the ones it no longer wants (it keeps calls the admin hosts).
 */
export async function unmirrorConnection(db: Db, connectionId: string): Promise<number> {
  const { data } = await db.from('appointment_calendar_events').select('kind, appointment_id').eq('connection_id', connectionId);
  const rows = (data ?? []) as { kind: SyncKind | null; appointment_id: string }[];
  for (const r of rows) await enqueue(db, r.kind ?? 'appointment', r.appointment_id);
  return rows.length;
}

export async function runCalendarMaintenance(): Promise<SyncResult> {
  const db = createAdminClient();
  try {
    await reconcileMirrorCalendars(db);
  } catch (e) {
    console.error('[calendar] mirror reconcile failed:', e instanceof Error ? e.message : e);
  }
  const result = await processCalendarSyncJobs({ limit: 50, db });
  await db.rpc('prune_calendar_sync_jobs');
  return result;
}

/** After a calendar is connected, queue every upcoming appointment of that company so it appears there. */
/**
 * A HomeQuote host just connected Google: queue the upcoming calls on the
 * booking calendars they host that belong to no contractor (team calendar
 * calls before a match). Contractor-calendar calls sync through the company.
 */
export async function backfillHostedAppointments(db: Db, userId: string): Promise<number> {
  const { data: hosted } = await db.from('booking_calendar_members').select('calendar_id').eq('user_id', userId);
  const calendarIds = ((hosted ?? []) as { calendar_id: string }[]).map((m) => m.calendar_id);
  if (!calendarIds.length) return 0;
  const { data } = await db.from('appointments').select('id').in('calendar_id', calendarIds).is('assignment_id', null)
    .eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString());
  const ids = ((data ?? []) as { id: string }[]).map((a) => a.id);
  for (const id of ids) {
    // A pending job already queued for this appointment violates the partial unique index; that is fine.
    await db.from('calendar_sync_jobs').insert({ appointment_id: id, contractor_id: null });
  }
  return ids.length;
}

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
