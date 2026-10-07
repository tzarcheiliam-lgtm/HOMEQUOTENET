/**
 * Pure rules for sending HQN lead outcomes back to Meta: which integration path a lead belongs to, which event
 * each outcome maps to, whether it is eligible, and the exact (minimal) payload. No I/O.
 *
 * TWO DIFFERENT META MECHANISMS - never mixed:
 *
 * 1. WEBSITE leads (HQN funnels, `leads.source = 'website'`): standard Conversions API web events to the funnel's
 *    Pixel/dataset, `action_source: website`, matched with fbp/fbc + hashed email/phone, de-duplicated against the
 *    browser Pixel with a shared event_id (`<session id>:<EventName>`).
 *      Lead     -> `Lead`          standard   (already sent by the funnel session route; NOT queued here)
 *      Schedule -> `Schedule`      standard   (already sent by the funnel session route for Calendly bookings;
 *                                              queued here only for manually recorded appointments)
 *      Qualified-> `QualifiedLead` CUSTOM     (needs a custom conversion in Events Manager to be optimizable)
 *      Won      -> `WonJob`        CUSTOM     with value + currency only when the real recorded sale amount exists.
 *    A won job is NOT sent as `Purchase`: Purchase means a checkout transaction on the advertiser's site, and an
 *    HQN sale is a contractor's contract value recorded off-site. That choice is left to the account owner.
 *
 * 2. META INSTANT FORM leads (`leads.source = 'meta'`, `external_lead_id` = Meta leadgen id): Conversions API for
 *    CRM ("Conversion Leads"). `action_source: system_generated`, `user_data.lead_id` = the 15-17 digit leadgen id,
 *    `custom_data: { event_source: 'crm', lead_event_source: 'HomeQuote Network' }`. Event names are free-form lead
 *    STAGES; Meta wants every stage from the initial lead onward. Only the lead id is sent: no email, phone or name.
 *    Optimization ("Maximize conversion leads") is supported by Meta for native Instant Form leads only.
 *
 * Meta constraints encoded here: event_time must be within 7 days of sending (older -> the whole request is
 * rejected), must be after the lead was created, and is the REAL occurrence time (never rewritten).
 */
import { buildUserData, type MetaUserData } from './capi';

export type Stage = 'lead' | 'qualified' | 'appointment' | 'won';
export type SourceKind = 'website_pixel' | 'instant_form_crm';

export const META_MAX_EVENT_AGE_MS = 7 * 24 * 3600 * 1000;
export const LIVE_CONFIRMATION = 'ENABLE LIVE';
export const CRM_SOURCE_NAME = 'HomeQuote Network';

export const WEBSITE_EVENT_NAME: Record<Stage, string> = { lead: 'Lead', appointment: 'Schedule', qualified: 'QualifiedLead', won: 'WonJob' };
/** Stages the funnel session route already sends directly; the queue must never duplicate them. */
export const WEBSITE_LEGACY_DIRECT: ReadonlySet<Stage> = new Set<Stage>(['lead']);
export const CRM_EVENT_NAME: Record<Stage, string> = { lead: 'lead', qualified: 'qualified', appointment: 'appointment_booked', won: 'won' };

/** HQN ledger outcome -> stage. Everything else (not_qualified, lost, no_show, ...) is never sent. */
export const OUTCOME_TO_STAGE: Record<string, Stage | undefined> = {
  qualified: 'qualified', appointment_booked: 'appointment', won: 'won',
};

export type LeadForMeta = {
  id: string; source: string | null; external_lead_id: string | null; created_at: string;
  email: string | null; phone: string | null; first_name: string | null; last_name: string | null; zip: string | null;
  fbp: string | null; fbc: string | null; fbclid: string | null; ad_id: string | null; landing_page_url: string | null;
};
export type SessionForMeta = {
  id: string; createdAt: string; measurementAllowed: boolean | null; consentMode: 'opt_in' | 'opt_out';
  pixelId?: string; isDemo: boolean; slug?: string; bookedAt?: string | null;
};

export type EligibilityInput = {
  stage: Stage; occurredAt: string; now?: number;
  lead: LeadForMeta; session: SessionForMeta | null;
  datasetId: string | null;           // admin-configured dataset for CRM events
  value?: number | null; currency?: string | null;
  siteUrl?: string | null;
};

export type Plan = {
  sourceKind: SourceKind; eventName: string; actionSource: 'website' | 'system_generated';
  datasetId: string; eventId: string; value: number | null; currency: string | null; eventSourceUrl: string | null;
};
export type Decision =
  | { ok: true; plan: Plan }
  /** `not_meta_lead`: not a Meta lead at all - nothing is recorded. Any other reason is stored as a visible "skipped" row. */
  | { ok: false; reason: 'not_meta_lead' | string; plan?: Partial<Plan> };

export const isLeadgenId = (v: string | null | undefined): v is string => !!v && /^\d{15,17}$/.test(v);

export function decide(i: EligibilityInput): Decision {
  const now = i.now ?? Date.now();
  const at = new Date(i.occurredAt).getTime();
  const created = new Date(i.lead.created_at).getTime();
  const tooOldOrEarly = (): string | null => {
    if (!Number.isFinite(at)) return 'invalid_event_time';
    if (now - at > META_MAX_EVENT_AGE_MS) return 'too_old';
    if (at < created) return 'before_lead_created';
    return null;
  };

  // ---- Instant Form (CRM) --------------------------------------------------------------------
  if (i.lead.source === 'meta') {
    if (!isLeadgenId(i.lead.external_lead_id)) return { ok: false, reason: 'missing_meta_lead_id' };
    const plan: Partial<Plan> = {
      sourceKind: 'instant_form_crm', eventName: CRM_EVENT_NAME[i.stage], actionSource: 'system_generated',
      eventId: `crm:${i.lead.external_lead_id}:${i.stage}`, value: null, currency: null, eventSourceUrl: null,
    };
    if (!i.datasetId) return { ok: false, reason: 'no_dataset', plan };
    const bad = tooOldOrEarly();
    if (bad) return { ok: false, reason: bad, plan: { ...plan, datasetId: i.datasetId } };
    return { ok: true, plan: { ...(plan as Plan), datasetId: i.datasetId } };
  }

  // ---- Website funnel ------------------------------------------------------------------------
  if (i.lead.source === 'website') {
    const hasSignal = !!(i.lead.fbc || i.lead.fbp || i.lead.fbclid || i.lead.ad_id);
    if (!i.session || !hasSignal) return { ok: false, reason: 'not_meta_lead' };
    if (i.session.isDemo) return { ok: false, reason: 'demo' };
    const eventName = WEBSITE_EVENT_NAME[i.stage];
    const plan: Partial<Plan> = {
      sourceKind: 'website_pixel', eventName, actionSource: 'website', eventId: `${i.session.id}:${eventName}`,
      eventSourceUrl: i.lead.landing_page_url ?? (i.siteUrl && i.session.slug ? `${i.siteUrl}/estimate/${i.session.slug}` : null),
      value: null, currency: null,
    };
    if (WEBSITE_LEGACY_DIRECT.has(i.stage)) return { ok: false, reason: 'sent_directly_by_funnel', plan };
    if (i.stage === 'appointment' && i.session.bookedAt) return { ok: false, reason: 'sent_directly_by_funnel', plan };
    if (!i.session.pixelId) return { ok: false, reason: 'no_pixel', plan };
    plan.datasetId = i.session.pixelId;
    const allowed = i.session.measurementAllowed ?? i.session.consentMode === 'opt_out';
    if (!allowed) return { ok: false, reason: 'measurement_not_allowed', plan };
    if (!plan.eventSourceUrl) return { ok: false, reason: 'no_source_url', plan };
    const bad = tooOldOrEarly();
    if (bad) return { ok: false, reason: bad, plan };
    if (new Date(i.occurredAt).getTime() < new Date(i.session.createdAt).getTime()) return { ok: false, reason: 'before_lead_created', plan };
    // Value only when a real recorded amount AND currency exist; a won event without them is sent value-less.
    if (i.stage === 'won' && i.value != null && i.value > 0 && /^[A-Z]{3}$/.test(i.currency ?? '')) { plan.value = i.value; plan.currency = i.currency!; }
    return { ok: true, plan: plan as Plan };
  }

  return { ok: false, reason: 'not_meta_lead' };
}

// --------------------------------------------------------------------------------------------------
// Payloads
// --------------------------------------------------------------------------------------------------
export type EventRow = {
  event_name: string; event_id: string; event_time: string; action_source: 'website' | 'system_generated';
  value: number | null; currency: string | null; source_kind: SourceKind;
};

/** The exact JSON body for POST /{dataset}/events (token excluded). */
export function buildPayload(row: EventRow, lead: LeadForMeta, opts: { eventSourceUrl?: string | null; testEventCode?: string | null }) {
  const eventTime = Math.floor(new Date(row.event_time).getTime() / 1000);
  let event: Record<string, unknown>;
  if (row.source_kind === 'instant_form_crm') {
    event = {
      event_name: row.event_name, event_time: eventTime, event_id: row.event_id, action_source: 'system_generated',
      // lead_id only: Meta's own identifier for the lead, so no customer PII leaves HQN for CRM events.
      user_data: { lead_id: lead.external_lead_id },
      custom_data: { event_source: 'crm', lead_event_source: CRM_SOURCE_NAME },
    };
  } else {
    const user: MetaUserData = {
      email: lead.email, phone: lead.phone, firstName: lead.first_name, lastName: lead.last_name, zip: lead.zip, fbp: lead.fbp, fbc: lead.fbc,
      // Raw IP / user agent from the original request are deliberately never stored, so never sent.
    };
    event = {
      event_name: row.event_name, event_time: eventTime, event_id: row.event_id, action_source: 'website',
      event_source_url: opts.eventSourceUrl, user_data: buildUserData(user),
      ...(row.value != null && row.currency ? { custom_data: { value: row.value, currency: row.currency } } : {}),
    };
  }
  return { data: [event], ...(opts.testEventCode ? { test_event_code: opts.testEventCode } : {}) };
}

/** Which identifier families a payload carries - safe to store/show; contains no values. */
export function identifierSummary(payload: ReturnType<typeof buildPayload>): string[] {
  const ud = (payload.data[0] as { user_data?: Record<string, unknown> }).user_data ?? {};
  return Object.keys(ud).sort();
}

// --------------------------------------------------------------------------------------------------
// Retry policy
// --------------------------------------------------------------------------------------------------
/** Minutes until the next attempt: exponential, longer for rate limits, capped at 6h. */
export function backoffMinutes(attempt: number, kind: 'rate_limit' | 'transient'): number {
  const base = kind === 'rate_limit' ? 5 : 1;
  return Math.min(360, base * 2 ** Math.max(0, attempt - 1));
}

export type SendOutcome =
  | { kind: 'accepted'; eventsReceived: number; fbtraceId: string | null }
  | { kind: 'retry'; minutes: number; code: string; message: string; httpStatus: number | null }
  | { kind: 'permanent'; code: string; message: string; httpStatus: number | null; fbtraceId: string | null };

/** "Accepted" = Graph returned success AND counted at least one event. It says nothing about ad attribution. */
export function interpretResponse(
  attempt: number, maxAttempts: number,
  res: { ok: true; body: { events_received?: number; fbtrace_id?: string } } |
       { ok: false; failure: { kind: string; retryable: boolean; code: number | null; message: string; httpStatus: number | null; fbtraceId: string | null } },
): SendOutcome {
  if (res.ok) {
    const n = res.body.events_received ?? 0;
    return n >= 1
      ? { kind: 'accepted', eventsReceived: n, fbtraceId: res.body.fbtrace_id ?? null }
      : { kind: 'permanent', code: 'not_received', message: 'Meta returned success but received 0 events', httpStatus: 200, fbtraceId: res.body.fbtrace_id ?? null };
  }
  const f = res.failure;
  const code = `${f.kind}${f.code != null ? `:${f.code}` : ''}`;
  if (f.retryable && attempt < maxAttempts) {
    return { kind: 'retry', minutes: backoffMinutes(attempt, f.kind === 'rate_limit' ? 'rate_limit' : 'transient'), code, message: f.message, httpStatus: f.httpStatus };
  }
  return { kind: 'permanent', code: f.retryable ? `${code}:retries_exhausted` : code, message: f.message, httpStatus: f.httpStatus, fbtraceId: f.fbtraceId };
}
