-- ============================================================================
-- HomeQuote Network — ADU quiz leads (/adu-quiz, paid Google/Meta landing page)
-- ============================================================================
-- Durable copy of every completed quiz BEFORE it is forwarded to the lead
-- webhook (GoHighLevel). It is the "never lose a lead" safety net and the retry
-- queue: webhook_status stays 'pending' until the webhook accepts the lead, and
-- the 5-minute /api/workflows/tick retries it.
--
-- Homeowner leads, but deliberately NOT inserted into `leads`, so no workflow,
-- assignment, AI call or distribution fires from this page. Written and read
-- server-side only (service role). RLS enabled with no policies, same posture
-- as contractor_funnel_submissions (0045).
-- ============================================================================

create table if not exists public.adu_quiz_leads (
  id uuid primary key default gen_random_uuid(),

  -- Client-generated per quiz run. UNIQUE = double-submit / retry safe.
  submission_id uuid not null unique,
  -- SHA-256 of the secret returned to the browser; authorises the booked call.
  access_token_hash text not null,

  first_name text not null,
  last_name  text not null,
  email      text not null,
  phone      text not null,
  email_normalized text,
  phone_e164       text,

  answers jsonb not null,
  qualified boolean not null,
  dq_reason text,
  dq_reasons text[] not null default '{}',
  title_unverified boolean not null default false,
  credit_unverified boolean not null default false,
  bankruptcy_unverified boolean not null default false,

  -- Exactly what the visitor saw and agreed to.
  consent_text text not null,
  consent_at timestamptz not null,
  consent_page_url text not null,
  measurement_allowed boolean not null default false,

  -- utm_*, gclid, fbclid, fbp, fbc, landing page, referrer, timestamp, device.
  tracking jsonb not null default '{}'::jsonb,

  -- Webhook delivery / retry queue.
  webhook_status text not null default 'pending' check (webhook_status in ('pending', 'sent', 'skipped')),
  webhook_attempts integer not null default 0 check (webhook_attempts >= 0),
  webhook_last_error text,
  webhook_next_attempt_at timestamptz not null default now(),
  webhook_sent_at timestamptz,

  booked_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.normalize_adu_quiz_lead_contact()
returns trigger language plpgsql as $$
begin
  new.email_normalized := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.phone_e164 := public.to_e164(new.phone);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_adu_quiz_leads_normalize on public.adu_quiz_leads;
create trigger trg_adu_quiz_leads_normalize
  before insert or update on public.adu_quiz_leads
  for each row execute function public.normalize_adu_quiz_lead_contact();

create index if not exists idx_adu_quiz_leads_created on public.adu_quiz_leads (created_at desc);
create index if not exists idx_adu_quiz_leads_retry on public.adu_quiz_leads (webhook_next_attempt_at) where webhook_status = 'pending';
create index if not exists idx_adu_quiz_leads_email on public.adu_quiz_leads (email_normalized);

alter table public.adu_quiz_leads enable row level security;
comment on table public.adu_quiz_leads is
  'Completed /adu-quiz submissions: contact, answers, qualification, consent proof, tracking, webhook retry state. Service-role access only.';
