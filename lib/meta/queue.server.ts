import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { sweepStaleDirectSends } from './audit.server';
import { aiCallBookedEvidence, type AiJobForBooking } from './provenance';
import { classifyGraphError, GRAPH_VERSION, redactSecrets } from './marketing-api';
import {
  dispatchBatch, feedFromLedger,
  type ClaimedEvent, type DeliveryMode, type FinishPatch, type LedgerRow, type LoadedLead, type NewEvent, type QueueStore, type SendFn, type Settings,
} from './queue';

/** Supabase-backed QueueStore (service role: the outbox has no client write policies). */
export function supabaseStore(db: SupabaseClient): QueueStore {
  return {
    async settings(): Promise<Settings> {
      const { data } = await db.from('meta_settings').select('delivery_mode, test_event_code, test_dataset_id, dataset_id, ledger_cursor_at, ledger_cursor_id').eq('id', true).maybeSingle();
      return {
        deliveryMode: (data?.delivery_mode as DeliveryMode) ?? 'off', testEventCode: data?.test_event_code ?? null, testDatasetId: data?.test_dataset_id ?? null, datasetId: data?.dataset_id ?? null,
        cursorAt: data?.ledger_cursor_at ?? null, cursorId: data?.ledger_cursor_id ?? null,
      };
    },
    async ledgerAfter(at, id, limit) {
      let q = db.from('lead_outcome_events').select('id, lead_id, outcome, occurred_at, recorded_at, actor_kind, amount, currency, appointment_id, sale_id, reason_code').order('recorded_at').order('id').limit(limit);
      if (at) q = id ? q.or(`recorded_at.gt."${at}",and(recorded_at.eq."${at}",id.gt.${id})`) : q.gt('recorded_at', at);
      const { data } = await q;
      return ((data ?? []) as (Omit<LedgerRow, 'amount'> & { amount: string | number | null })[]).map((r) => ({ ...r, amount: r.amount == null ? null : Number(r.amount) }));
    },
    async advanceCursor(row) {
      await db.from('meta_settings').update({ ledger_cursor_at: row.recorded_at, ledger_cursor_id: row.id }).eq('id', true);
    },
    async loadLead(leadId): Promise<LoadedLead | null> {
      const { data: lead } = await db.from('leads')
        .select('id, source, external_lead_id, created_at, email, phone, first_name, last_name, zip, fbp, fbc, fbclid, ad_id, landing_page_url')
        .eq('id', leadId).maybeSingle();
      if (!lead) return null;
      const { data: s } = await db.from('funnel_sessions')
        .select('id, created_at, measurement_allowed, booked_at, config_snapshot, funnels(is_demo, slug)')
        .eq('lead_id', leadId).order('created_at', { ascending: true }).limit(1).maybeSingle();
      const { data: a } = await db.from('lead_assignments').select('contractor_id').eq('lead_id', leadId).order('assigned_at').limit(1).maybeSingle();
      const config = s?.config_snapshot as { trackingPixels?: { metaPixelId?: string; consentMode?: 'opt_in' | 'opt_out' } } | undefined;
      const funnel = (Array.isArray(s?.funnels) ? s?.funnels[0] : s?.funnels) as { is_demo?: boolean; slug?: string } | null | undefined;
      return {
        lead, contractorId: a?.contractor_id ?? null,
        session: s ? { id: s.id, createdAt: s.created_at, measurementAllowed: s.measurement_allowed, bookedAt: s.booked_at, consentMode: config?.trackingPixels?.consentMode ?? 'opt_in',
          pixelId: config?.trackingPixels?.metaPixelId, isDemo: !!funnel?.is_demo, slug: funnel?.slug } : null,
      };
    },
    async bookingProvenance(appointmentId) {
      const out: { funnelBooking: 'calendly' | 'other' | null; bookedVia: string | null; aiCallBooked: boolean } = { funnelBooking: null, bookedVia: null, aiCallBooked: false };
      const { data: fb } = await db.from('funnel_bookings').select('provider').eq('appointment_id', appointmentId).limit(1).maybeSingle();
      if (fb) { out.funnelBooking = fb.provider === 'calendly' ? 'calendly' : 'other'; return out; }
      const { data: ap } = await db.from('appointments').select('booked_via, created_at, lead_assignments(lead_id, contractor_id)').eq('id', appointmentId).maybeSingle();
      if (!ap) return out;
      out.bookedVia = ap.booked_via ?? null;
      if (out.bookedVia) return out; // a person's explicit statement of the channel wins
      const la = (Array.isArray(ap.lead_assignments) ? ap.lead_assignments[0] : ap.lead_assignments) as { lead_id: string; contractor_id: string } | null;
      if (!la) return out;
      const { data: jobs } = await db.from('ai_call_jobs')
        .select('status, dial_status, last_error, block_reason, attempts, max_attempts, analysis, conversation_started_at, conversation_ended_at, updated_at')
        .eq('lead_id', la.lead_id).eq('contractor_id', la.contractor_id).eq('status', 'completed').not('conversation_started_at', 'is', null)
        .lte('conversation_started_at', ap.created_at).order('conversation_started_at', { ascending: false }).limit(10);
      out.aiCallBooked = aiCallBookedEvidence((jobs ?? []) as AiJobForBooking[], ap.created_at);
      return out;
    },
    async insertEvent(e: NewEvent) {
      const { error } = await db.from('meta_conversion_events').insert(e);
      if (!error) return 'inserted';
      if (error.code === '23505') return 'duplicate';
      throw new Error(`queue insert failed: ${error.code ?? 'unknown'}`);
    },
    async claim(limit, worker) {
      const { data, error } = await db.rpc('claim_meta_conversion_events', { p_limit: limit, p_worker: worker });
      if (error) throw new Error(`claim failed: ${error.code ?? 'unknown'}`);
      return ((data ?? []) as (Omit<ClaimedEvent, 'value'> & { value: string | number | null })[]).map((r) => ({ ...r, value: r.value == null ? null : Number(r.value) }));
    },
    async finish(id, patch: FinishPatch) {
      await db.from('meta_conversion_events').update({ ...patch, locked_by: null, locked_until: null }).eq('id', id);
    },
  };
}

/** The live HTTP send. The token is server-side only and travels in the Authorization header. */
export function graphSend(token: string, fetchImpl: typeof fetch = fetch): SendFn {
  return async ({ datasetId, payload }) => {
    try {
      const res = await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(datasetId)}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && !(body as { error?: unknown } | null)?.error) return { ok: true, body: body ?? {} };
      return { ok: false, failure: classifyGraphError(res.status, body) };
    } catch (e) {
      return { ok: false, failure: { kind: 'transient', retryable: true, httpStatus: null, code: null, subcode: null, message: redactSecrets(e instanceof Error ? e.name : 'network error'), fbtraceId: null } };
    }
  };
}

/** One scheduler tick: feed the queue from the outcome ledger, then dispatch due events. */
export async function runMetaConversionTick(opts: { dispatchLimit?: number } = {}) {
  const db = createAdminClient();
  const store = supabaseStore(db);
  const token = process.env.META_CONVERSIONS_API_TOKEN;
  await sweepStaleDirectSends(db).catch(() => 0);
  const feed = await feedFromLedger(store);
  if (!token) return { feed, dispatch: { claimed: 0, accepted: 0, retried: 0, failed: 0, held: 'META_CONVERSIONS_API_TOKEN not set' } };
  const dispatch = await dispatchBatch(store, graphSend(token), { limit: opts.dispatchLimit ?? 20 });
  return { feed, dispatch };
}
