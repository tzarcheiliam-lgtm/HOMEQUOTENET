// Domain types mirroring the database schema (supabase/migrations/0001_initial_schema.sql).
// Hand-maintained for readability. If you change the schema, update these to match.

export type UserRole = 'admin' | 'setter' | 'contractor' | 'caller';

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'disabled';

export type LeadStatus =
  | 'new'
  | 'contact_attempted'
  | 'qualified'
  | 'assigned'
  | 'appointment_set'
  | 'appointment_completed'
  | 'estimate_sent'
  | 'sold'
  | 'lost'
  | 'cancelled';

export type ActivityType =
  | 'note'
  | 'contact_attempt'
  | 'status_change'
  | 'qualification'
  | 'assignment'
  | 'appointment'
  | 'field_change'
  | 'system';

export type AssignmentStatus =
  | 'assigned'
  | 'accepted'
  | 'contacted'
  | 'appointment_set'
  | 'appointment_held'
  | 'estimate_given'
  | 'sold'
  | 'lost'
  | 'returned';

export type PricingModel =
  | 'per_lead'
  | 'per_appointment'
  | 'revenue_share'
  | 'hybrid'
  | 'subscription';

export type AppointmentStatus =
  | 'scheduled'
  | 'held'
  | 'no_show'
  | 'cancelled'
  | 'rescheduled';

export type EstimateStatus = 'pending' | 'sent' | 'accepted' | 'rejected';

export type SaleStatus = 'won' | 'pending' | 'refunded' | 'cancelled';

export type BillingEventType =
  | 'lead_fee'
  | 'appointment_fee'
  | 'revenue_share'
  | 'subscription'
  | 'adjustment';

// 0001 created the enum with invoiced/void; 0002 added overdue/waived.
export type BillingStatus =
  | 'pending'
  | 'invoiced'
  | 'paid'
  | 'void'
  | 'overdue'
  | 'waived';

export type CommissionType =
  | 'fixed'
  | 'percentage'
  | 'revenue_share'
  | 'hybrid'
  | 'manual'
  | 'none';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  contractor_id: string | null;
  is_active: boolean;
  account_status: AccountStatus;
  last_login_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Vertical {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface SubService {
  id: string;
  vertical_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Contractor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  service_areas: string[];
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingAgreement {
  id: string;
  contractor_id: string;
  vertical_id: string | null;
  model: PricingModel;
  per_lead_amount: number | null;
  per_appointment_amount: number | null;
  revenue_share_pct: number | null;
  subscription_amount: number | null;
  subscription_period: string | null;
  is_exclusive: boolean;
  active_from: string;
  active_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  vertical_id: string | null;
  sub_service_id: string | null;
  status: LeadStatus;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  project_description: string | null;
  // Economics
  lead_cost: number | null;
  estimated_job_value: number | null;
  actual_revenue: number | null;
  commission: number | null;
  profit: number | null; // generated column
  // Qualification
  qualified: boolean;
  qualified_at: string | null;
  qualified_by: string | null;
  budget_range: string | null;
  timeline: string | null;
  urgency: string | null;
  // Tracking
  notes: string | null;
  last_contact_date: string | null;
  archived_at: string | null;
  // Attribution
  source: string | null;
  campaign: string | null;
  ad_set: string | null;
  ad_name: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page_url: string | null;
  // Extended attribution (Phase 6)
  platform: string | null;
  campaign_id: string | null;
  ad_set_id: string | null;
  ad_id: string | null;
  form_name: string | null;
  form_id: string | null;
  external_lead_id: string | null;
  integration_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  provider: string;
  name: string;
  status: string; // connected | disconnected | error | disabled
  health: string; // healthy | degraded | error | unknown
  is_enabled: boolean;
  config: Record<string, unknown>;
  secret: string | null;
  last_sync_at: string | null;
  last_activity_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadIntakeEvent {
  id: string;
  integration_id: string | null;
  provider: string;
  platform: string | null;
  status: string; // received | created | duplicate | error
  external_lead_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  campaign: string | null;
  campaign_id: string | null;
  ad_set: string | null;
  ad_set_id: string | null;
  ad: string | null;
  ad_id: string | null;
  form: string | null;
  form_id: string | null;
  normalized: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
  lead_id: string | null;
  duplicate_of: string | null;
  error: string | null;
  received_at: string;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  actor_id: string | null;
  type: ActivityType;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LeadAttachment {
  id: string;
  lead_id: string;
  uploaded_by: string | null;
  name: string;
  url: string;
  created_at: string;
}

export interface LeadAssignment {
  id: string;
  lead_id: string;
  contractor_id: string;
  pricing_agreement_id: string | null;
  is_exclusive: boolean;
  status: AssignmentStatus;
  assigned_by: string | null;
  assigned_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  assignment_id: string;
  scheduled_at: string | null;
  status: AppointmentStatus;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: string;
  assignment_id: string;
  amount: number | null;
  estimate_date: string;
  status: EstimateStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  assignment_id: string;
  amount: number;
  sale_date: string;
  closed_at: string; // closed date
  sale_status: SaleStatus;
  commission_amount: number | null;
  commission_type: CommissionType | null;
  commission_is_override: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  assignment_id: string | null;
  contractor_id: string;
  pricing_agreement_id: string | null;
  event_type: BillingEventType;
  amount: number; // amount owed
  amount_paid: number;
  due_date: string | null;
  status: BillingStatus;
  occurred_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdSpend {
  id: string;
  source: string;
  campaign: string | null;
  vertical_id: string | null;
  amount: number;
  spend_date: string;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Contractor prospecting (supabase/migrations/0007_contractor_prospecting.sql)
//
// These are the pool-remodeling contractors that HomeQuote partners cold call —
// NOT homeowner leads (Lead) and NOT signed contractors (Contractor).
// ---------------------------------------------------------------------------

export type ProspectDisposition =
  | 'new'
  | 'calling'
  | 'no_answer'
  | 'left_voicemail'
  | 'gatekeeper'
  | 'spoke_with_dm'
  | 'callback_requested'
  | 'interested'
  | 'follow_up_required'
  | 'appointment_booked'
  | 'not_interested'
  | 'wrong_number'
  | 'duplicate'
  | 'do_not_call';

export type SalesAppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export interface ContractorProspect {
  id: string;
  company_name: string;
  phone: string | null;
  phone_e164: string | null;
  website: string | null;
  website_domain: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  state: string;
  service_area: string | null;
  primary_services: string[];
  category: string | null;
  rating: number | null;
  review_count: number | null;
  is_pool_cleaning_only: boolean;
  flags: string[];
  assigned_to: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  disposition: ProspectDisposition;
  call_attempt_count: number;
  last_contacted_at: string | null;
  next_callback_at: string | null;
  follow_up_at: string | null;
  appointment_at: string | null;
  decision_maker_name: string | null;
  decision_maker_email: string | null;
  best_contact_method: string | null;
  do_not_call_at: string | null;
  notes: string | null;
  source: string | null;
  import_batch: string | null;
  archived_at: string | null;
  // Sourcing (0008): set by Refresh Prospects, null for manual/CSV rows.
  niche: string | null;
  external_source: string | null;
  external_id: string | null;
  address: string | null;
  zip: string | null;
  business_status: string | null;
  maps_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProspectEmailStatus = 'pending' | 'sent' | 'failed';

/** One manually reviewed outbound email and its final delivery state. */
export interface ProspectEmailLog {
  id: string;
  prospect_id: string;
  company_name: string;
  sender_user_id: string | null;
  sender_name: string | null;
  sender_email: string;
  recipient_name: string | null;
  recipient_email: string;
  template_key: string;
  subject: string;
  message: string;
  status: ProspectEmailStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** One row per call. Append-only in the database. */
export interface ProspectCallAttempt {
  id: string;
  prospect_id: string;
  caller_id: string | null;
  caller_name: string | null;
  outcome: ProspectDisposition;
  notes: string | null;
  attempt_number: number;
  previous_disposition: ProspectDisposition | null;
  new_disposition: ProspectDisposition;
  callback_at: string | null;
  appointment_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** A sales call booked WITH a contractor prospect (not a homeowner Appointment). */
export interface ProspectSalesAppointment {
  id: string;
  prospect_id: string;
  partner_id: string | null;
  call_attempt_id: string | null;
  decision_maker_name: string | null;
  scheduled_at: string;
  time_zone: string;
  appointment_type: string | null;
  contact_info: string | null;
  status: SalesAppointmentStatus;
  confirmed_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
