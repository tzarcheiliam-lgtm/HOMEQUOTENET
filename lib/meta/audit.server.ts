import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectSendAudit, MetaLeadEvent } from './capi';
import type { Stage } from './conversions';

/** A direct send that has not finished within this window is considered interrupted (ambiguous: it may or may not have reached Meta). */
export const DIRECT_SEND_LEASE_SECONDS = 600;

const eventTime = (e: MetaLeadEvent) => new Date((e.eventTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();

/**
 * Audit + mutual exclusion for events sent DIRECTLY (funnel Lead/Schedule, the legacy QualifiedLead sender).
 *  reserve: inserts a 'processing' row (origin legacy_direct) BEFORE the request. The partial unique index
 *           (dataset, event id, test_mode) where status <> 'failed' makes this atomic: if the queue (or another request)
 *           already owns a non-failed row for the event, the direct send is skipped, so the same event is never sent twice -
 *           including when delivery is switched while a direct request is in flight.
 *  finish:  records accepted/failed on that row. A FAILED row no longer collides, so a legitimate retry is never blocked.
 * If the process dies between reserve and finish the row stays 'processing' until sweepStaleDirectSends marks it failed
 * (ambiguous), after which an admin can retry it.
 */
export function directSendAudit(db: SupabaseClient, ctx: { leadId: string; stage: Stage; contractorId?: string | null; appointmentId?: string | null }): DirectSendAudit {
  return {
    async reserve(event) {
      const { error } = await db.from('meta_conversion_events').insert({
        lead_id: ctx.leadId, contractor_id: ctx.contractorId ?? null, appointment_id: ctx.appointmentId ?? null,
        stage: ctx.stage, source_kind: 'website_pixel', event_name: event.eventName, action_source: 'website', origin: 'legacy_direct',
        dataset_id: event.pixelId, event_id: event.eventId, event_time: eventTime(event),
        test_mode: !!process.env.META_TEST_EVENT_CODE?.trim(), status: 'processing', attempt_count: 1, max_attempts: 1,
        locked_until: new Date(Date.now() + DIRECT_SEND_LEASE_SECONDS * 1000).toISOString(),
      });
      if (!error) return 'ok';
      if (error.code === '23505') return 'duplicate';
      throw new Error('reserve failed');
    },
    async finish(event, r) {
      await db.from('meta_conversion_events').update({
        status: r.status === 'accepted' ? 'accepted' : 'failed', test_mode: r.testMode, permanent_failure: r.status === 'failed', locked_until: null,
        last_http_status: r.httpStatus, last_error_code: r.code, last_error_message: r.message, fbtrace_id: r.fbtraceId, events_received: r.eventsReceived,
        sent_at: r.status === 'accepted' ? new Date().toISOString() : null,
      }).eq('dataset_id', event.pixelId).eq('event_id', event.eventId).eq('origin', 'legacy_direct').eq('status', 'processing');
    },
  };
}

/** Marks direct sends whose lease expired as failed/ambiguous so they stop blocking and become retryable. Returns how many. */
export async function sweepStaleDirectSends(db: SupabaseClient, now = new Date()): Promise<number> {
  const { data } = await db.from('meta_conversion_events').update({
    status: 'failed', locked_until: null, last_error_code: 'interrupted_ambiguous',
    last_error_message: 'The direct send was interrupted before it reported a result; Meta may or may not have received it.',
  }).eq('origin', 'legacy_direct').eq('status', 'processing').lt('locked_until', now.toISOString()).select('id');
  return (data ?? []).length;
}

/**
 * Creates a QUEUE row that retries a FAILED row (usually a failed direct send) with the SAME event id. Refuses unless the
 * row failed, is inside Meta's 7-day window, and no live/accepted row for that event exists now.
 */
export async function requeueFailedEvent(db: SupabaseClient, id: string, now = Date.now()): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const { data: r } = await db.from('meta_conversion_events').select('*').eq('id', id).maybeSingle();
  if (!r || r.status !== 'failed') return { ok: false, reason: 'not_failed' };
  if (now - new Date(r.event_time).getTime() > 7 * 24 * 3600 * 1000) return { ok: false, reason: 'too_old' };
  const { data: existing } = await db.from('meta_conversion_events').select('id').eq('dataset_id', r.dataset_id).eq('event_id', r.event_id).eq('test_mode', r.test_mode).neq('status', 'failed').limit(1).maybeSingle();
  if (existing) return { ok: false, reason: 'already_in_flight_or_accepted' };
  const { data: row, error } = await db.from('meta_conversion_events').insert({
    lead_id: r.lead_id, contractor_id: r.contractor_id, outcome_event_id: r.outcome_event_id, appointment_id: r.appointment_id, sale_id: r.sale_id,
    stage: r.stage, source_kind: r.source_kind, event_name: r.event_name, action_source: r.action_source, dataset_id: r.dataset_id, event_id: r.event_id,
    event_time: r.event_time, value: r.value, currency: r.currency, test_mode: r.test_mode, status: 'pending', origin: 'queue', retry_of: r.id,
  }).select('id').single();
  if (error) return { ok: false, reason: error.code === '23505' ? 'already_in_flight_or_accepted' : 'insert_failed' };
  return { ok: true, id: row.id };
}
