/**
 * Conversion-event outbox orchestration, independent of the database driver (see queue.server.ts for the
 * Supabase-backed store). Two phases, both idempotent and safe to run concurrently:
 *
 *   feedFromLedger : lead_outcome_events -> meta_conversion_events (decides eligibility, one row per stable event_id)
 *   dispatchBatch  : claims due rows, sends them, records pending / accepted / failed
 *
 * Nothing runs while meta_settings.delivery_mode = 'off'. In 'test' mode every request carries Meta's
 * test_event_code so it appears only under Events Manager > Test events and never in reporting/optimization.
 */
import {
  OUTCOME_TO_STAGE, META_MAX_EVENT_AGE_MS, buildPayload, decide, identifierSummary, interpretResponse,
  type ActionSource, type LeadForMeta, type OutcomeRef, type Plan, type SessionForMeta, type SourceKind, type Stage, type SendOutcome,
} from './conversions';

export type DeliveryMode = 'off' | 'test' | 'live';
export type Settings = { deliveryMode: DeliveryMode; testEventCode: string | null; testDatasetId: string | null; datasetId: string | null; cursorAt: string | null; cursorId: string | null };

export type LedgerRow = {
  id: string; lead_id: string; outcome: string; occurred_at: string; recorded_at: string;
  actor_kind: 'user' | 'ai' | 'system'; amount: number | null; currency: string | null;
  appointment_id: string | null; sale_id: string | null; reason_code: string | null;
};
export type LoadedLead = { lead: LeadForMeta; session: SessionForMeta | null; contractorId: string | null };

export type NewEvent = {
  lead_id: string; contractor_id: string | null; outcome_event_id: string | null;
  stage: Stage; source_kind: SourceKind; event_name: string; action_source: ActionSource;
  appointment_id: string | null; sale_id: string | null;
  dataset_id: string; event_id: string; event_time: string; value: number | null; currency: string | null;
  test_mode: boolean; status: 'pending' | 'skipped'; skip_reason: string | null;
};
export type ClaimedEvent = {
  id: string; lead_id: string; dataset_id: string; event_id: string; event_time: string; event_name: string;
  action_source: ActionSource; source_kind: SourceKind; value: number | null; currency: string | null;
  appointment_id: string | null; sale_id: string | null;
  test_mode: boolean; attempt_count: number; max_attempts: number; retry_of: string | null;
};
export type FinishPatch = {
  status: 'pending' | 'accepted' | 'failed' | 'skipped';
  next_attempt_at?: string; last_http_status?: number | null; last_error_code?: string | null; last_error_message?: string | null;
  permanent_failure?: boolean; fbtrace_id?: string | null; events_received?: number | null; sent_at?: string | null; skip_reason?: string | null;
};

export interface QueueStore {
  settings(): Promise<Settings>;
  ledgerAfter(cursorAt: string | null, cursorId: string | null, limit: number): Promise<LedgerRow[]>;
  advanceCursor(row: LedgerRow): Promise<void>;
  loadLead(leadId: string): Promise<LoadedLead | null>;
  /** Where the booking actually happened: funnel booking record, the recorder's stated channel, AI-call booked evidence. */
  bookingProvenance(appointmentId: string): Promise<Pick<OutcomeRef, 'funnelBooking' | 'bookedVia' | 'aiCallBooked'>>;
  insertEvent(e: NewEvent): Promise<'inserted' | 'duplicate'>;
  claim(limit: number, worker: string): Promise<ClaimedEvent[]>;
  finish(id: string, patch: FinishPatch): Promise<void>;
}

export type FeedResult = { examined: number; enqueued: number; skipped: number; duplicates: number; ignored: number };

export async function feedFromLedger(store: QueueStore, opts: { now?: number; limit?: number } = {}): Promise<FeedResult> {
  const r: FeedResult = { examined: 0, enqueued: 0, skipped: 0, duplicates: 0, ignored: 0 };
  const s = await store.settings();
  if (s.deliveryMode === 'off' || !s.cursorAt) return r;           // off, or never activated: nothing to do
  // Test events are NOT sandboxed by Meta (they feed the dataset they are sent to), so test mode only ever targets a dedicated test dataset.
  if (s.deliveryMode === 'test' && !s.testDatasetId) return r;
  const rows = await store.ledgerAfter(s.cursorAt, s.cursorId, opts.limit ?? 200);
  for (const row of rows) {
    r.examined++;
    const stage = OUTCOME_TO_STAGE[row.outcome];
    // Only people's decisions are optimization signals: AI/system qualification is never sent.
    const eligibleActor = row.outcome !== 'qualified' || row.actor_kind === 'user';
    if (!stage || !eligibleActor) { r.ignored++; await store.advanceCursor(row); continue; }
    const loaded = await store.loadLead(row.lead_id);
    if (!loaded) { r.ignored++; await store.advanceCursor(row); continue; }
    const stagesToSend: { stage: Stage; at: string; ledger: string | null; value: number | null; currency: string | null; ref?: OutcomeRef }[] = [];
    const ref: OutcomeRef = { appointmentId: row.appointment_id, saleId: row.sale_id, reasonCode: row.reason_code, ...(row.appointment_id ? await store.bookingProvenance(row.appointment_id) : {}) };
    // Conversion Leads wants every stage starting from the initial lead.
    if (loaded.lead.source === 'meta' && stage !== 'lead') stagesToSend.push({ stage: 'lead', at: loaded.lead.created_at, ledger: null, value: null, currency: null });
    stagesToSend.push({ stage, at: row.occurred_at, ledger: row.id, value: row.amount, currency: row.currency, ref });
    for (const st of stagesToSend) {
      const d = decide({ stage: st.stage, occurredAt: st.at, now: opts.now, lead: loaded.lead, session: loaded.session, datasetId: s.datasetId, value: st.value, currency: st.currency, ref: st.ref });
      if (!d.ok && d.reason === 'not_meta_lead') continue;
      const p = (d.ok ? d.plan : d.plan) as Partial<Plan> | undefined;
      if (!p?.eventId || !p.eventName || !p.sourceKind || !p.actionSource) continue;
      const out = await store.insertEvent({
        lead_id: loaded.lead.id, contractor_id: loaded.contractorId, outcome_event_id: st.ledger, stage: st.stage,
        source_kind: p.sourceKind, event_name: p.eventName, action_source: p.actionSource,
        appointment_id: st.ref?.appointmentId ?? null, sale_id: st.ref?.saleId ?? null,
        dataset_id: s.deliveryMode === 'test' ? s.testDatasetId! : p.datasetId ?? 'unconfigured', event_id: p.eventId, event_time: st.at,
        value: p.value ?? null, currency: p.currency ?? null,
        test_mode: s.deliveryMode === 'test', status: d.ok ? 'pending' : 'skipped', skip_reason: d.ok ? null : d.reason,
      });
      if (out === 'duplicate') r.duplicates++; else if (d.ok) r.enqueued++; else r.skipped++;
    }
    await store.advanceCursor(row);
  }
  return r;
}

export type SendFn = (args: { datasetId: string; payload: unknown; testMode: boolean }) => Promise<
  { ok: true; body: { events_received?: number; fbtrace_id?: string } } |
  { ok: false; failure: { kind: string; retryable: boolean; code: number | null; message: string; httpStatus: number | null; fbtraceId: string | null } }
>;

export type DispatchResult = { claimed: number; accepted: number; retried: number; failed: number; held: string | null };

export async function dispatchBatch(store: QueueStore, send: SendFn, opts: { now?: number; limit?: number; worker?: string } = {}): Promise<DispatchResult> {
  const r: DispatchResult = { claimed: 0, accepted: 0, retried: 0, failed: 0, held: null };
  const s = await store.settings();
  if (s.deliveryMode === 'off') { r.held = 'delivery_off'; return r; }
  if (s.deliveryMode === 'test' && !s.testEventCode) { r.held = 'test_mode_needs_test_event_code'; return r; }
  if (s.deliveryMode === 'test' && !s.testDatasetId) { r.held = 'test_mode_needs_test_dataset'; return r; }
  const now = opts.now ?? Date.now();
  const claimed = await store.claim(opts.limit ?? 20, opts.worker ?? `w-${now}`);
  r.claimed = claimed.length;
  for (const ev of claimed) {
    // A row queued in one mode is only sent in that mode (a test row never goes live, nor the reverse).
    if (ev.test_mode !== (s.deliveryMode === 'test')) { await store.finish(ev.id, { status: 'pending', next_attempt_at: new Date(now + 5 * 60_000).toISOString() }); continue; }
    if (now - new Date(ev.event_time).getTime() > META_MAX_EVENT_AGE_MS) {
      // Never alter event_time to get around Meta's 7-day limit.
      await store.finish(ev.id, { status: 'failed', permanent_failure: true, last_error_code: 'event_too_old', last_error_message: 'Older than Meta\'s 7-day window; not sent and not re-dated.' });
      r.failed++; continue;
    }
    const loaded = await store.loadLead(ev.lead_id);
    if (!loaded) { await store.finish(ev.id, { status: 'skipped', skip_reason: 'lead_missing' }); continue; }
    // Re-check consent at send time: a later opt-out must stop events that are still waiting.
    const d = decide({ stage: stageOf(ev), occurredAt: ev.event_time, now, lead: loaded.lead, session: loaded.session, datasetId: ev.dataset_id, value: ev.value, currency: ev.currency,
      ref: { appointmentId: ev.appointment_id, saleId: ev.sale_id, retryOfDirect: !!ev.retry_of, ...(ev.appointment_id ? await store.bookingProvenance(ev.appointment_id) : {}) } });
    if (!d.ok) { await store.finish(ev.id, { status: 'skipped', skip_reason: d.reason }); continue; }
    const payload = buildPayload(ev, loaded.lead, { eventSourceUrl: loaded.lead.landing_page_url, testEventCode: ev.test_mode ? s.testEventCode : null });
    let out: SendOutcome;
    try { out = interpretResponse(ev.attempt_count, ev.max_attempts, await send({ datasetId: ev.dataset_id, payload, testMode: ev.test_mode })); }
    catch (e) { out = interpretResponse(ev.attempt_count, ev.max_attempts, { ok: false, failure: { kind: 'transient', retryable: true, code: null, message: e instanceof Error ? e.name : 'send error', httpStatus: null, fbtraceId: null } }); }
    if (out.kind === 'accepted') {
      await store.finish(ev.id, { status: 'accepted', sent_at: new Date(now).toISOString(), events_received: out.eventsReceived, fbtrace_id: out.fbtraceId, last_error_code: null, last_error_message: null, last_http_status: 200 });
      r.accepted++;
    } else if (out.kind === 'retry') {
      await store.finish(ev.id, { status: 'pending', next_attempt_at: new Date(now + out.minutes * 60_000).toISOString(), last_error_code: out.code, last_error_message: out.message, last_http_status: out.httpStatus });
      r.retried++;
    } else {
      await store.finish(ev.id, { status: 'failed', permanent_failure: true, last_error_code: out.code, last_error_message: out.message, last_http_status: out.httpStatus, fbtrace_id: out.fbtraceId });
      r.failed++;
    }
  }
  return r;
}

function stageOf(ev: ClaimedEvent): Stage {
  const n = ev.event_name;
  if (n === 'Lead' || n === 'lead_received') return 'lead';
  if (n === 'QualifiedLead' || n === 'qualified') return 'qualified';
  if (n === 'Schedule' || n === 'appointment_booked') return 'appointment';
  return 'won';
}

export { identifierSummary };
