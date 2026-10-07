import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DirectSendAudit } from './capi';
import type { Stage } from './conversions';

/**
 * Records an event that was sent DIRECTLY (not via the queue) as a meta_conversion_events row with origin
 * 'legacy_direct'. It gives admins one place to see whether Lead / Schedule / QualifiedLead actually reached Meta, and
 * the unique (dataset, event id, test_mode) index then makes it impossible for the queue to send the same event id again.
 * Best effort: a failure to write the audit row is swallowed by the caller.
 */
export function directSendAudit(db: SupabaseClient, ctx: { leadId: string; stage: Stage; contractorId?: string | null; appointmentId?: string | null }): DirectSendAudit {
  return async (event, r) => {
    if (r.status === 'skipped') return; // nothing was attempted (no token / no pixel): not a delivery
    await db.from('meta_conversion_events').insert({
      lead_id: ctx.leadId, contractor_id: ctx.contractorId ?? null, appointment_id: ctx.appointmentId ?? null,
      stage: ctx.stage, source_kind: 'website_pixel', event_name: event.eventName, action_source: 'website', origin: 'legacy_direct',
      dataset_id: event.pixelId, event_id: event.eventId, event_time: new Date((event.eventTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      test_mode: r.testMode, status: r.status, attempt_count: 1, max_attempts: 1, permanent_failure: r.status === 'failed',
      last_http_status: r.httpStatus, last_error_code: r.code, last_error_message: r.message, fbtrace_id: r.fbtraceId, events_received: r.eventsReceived,
      sent_at: r.status === 'accepted' ? new Date().toISOString() : null,
    }); // a duplicate (same event id already recorded) simply errors on the unique index and is ignored
  };
}
