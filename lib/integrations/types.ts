// The common shape every integration normalizes inbound leads into.
// All current and future connectors MUST produce this model.
export interface NormalizedLead {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;

  // Attribution
  source?: string | null; // provider key by default
  platform?: string | null; // facebook | instagram | web | ...
  campaign?: string | null;
  campaign_id?: string | null;
  ad_set?: string | null;
  ad_set_id?: string | null;
  ad?: string | null;
  ad_id?: string | null;
  form?: string | null;
  form_id?: string | null;
  external_lead_id?: string | null;
  page_id?: string | null;

  // Project details (mapped from custom form questions where recognisable)
  timeline?: string | null;
  budget_range?: string | null;
  project_description?: string | null;
  /** Every non-standard form answer, label -> value, kept verbatim on the lead. */
  answers?: Record<string, string> | null;

  // TCPA consent (connectors populate where the source provides it)
  consent_granted?: boolean | null;
  consent_source?: string | null;
  consent_disclosure?: string | null;

  timestamp?: string | null;
}

export type ConnectorCategory = 'ads' | 'crm' | 'forms' | 'automation' | 'api';

export interface Connector {
  provider: string;
  label: string;
  description: string;
  category: ConnectorCategory;
  /** Whether a full ingestion implementation exists yet. */
  implemented: boolean;
  /**
   * Turn a raw inbound payload into zero or more normalized leads.
   * `config` is the integration's stored config (field mappings, etc.).
   */
  normalize(payload: any, config?: Record<string, unknown>): NormalizedLead[];
}

export interface IntakeContext {
  integrationId: string | null;
  provider: string;
  platform?: string | null;
  rawPayload: unknown;
}

export interface IntakeResult {
  status: 'created' | 'duplicate' | 'error';
  /** True when this exact external lead was already imported (webhook re-delivery). */
  redelivery?: boolean;
  /** Set when a new lead was created that shares an email/phone with another lead. */
  possibleDuplicateOf?: string;
  leadId?: string;
  duplicateOf?: string;
  error?: string;
  intakeEventId?: string;
}
