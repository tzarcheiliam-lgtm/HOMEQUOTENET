-- ============================================================================
-- HomeQuote Network — Contractor applications (public marketing site)
-- ============================================================================
-- Additive migration. Run AFTER 0001-0005.
--
-- Backs the public contractor application form at /apply and /pool-contractors.
-- Rows are written server-side only, via the service-role key in
-- lib/applications/deliver.ts. This table is NOT publicly readable or writable:
-- RLS is enabled with no anon/authenticated policies, so the anon key cannot
-- reach it at all. Admins read it through the service role or the SQL editor.
-- ============================================================================

create table if not exists public.contractor_applications (
  id uuid primary key default gen_random_uuid(),

  -- Contact
  first_name text not null,
  last_name  text not null,
  company    text not null,
  phone      text not null,
  email      text not null,
  website    text,

  -- Work
  primary_services text[] not null default '{}',
  service_areas    text   not null,

  -- Qualification
  avg_project_value     text not null,
  min_project_size      text not null,
  monthly_lead_capacity text not null,
  response_time         text not null,
  uses_crm              text not null,

  -- Preferred arrangement: 'pay_per_lead' | 'managed'
  track text not null check (track in ('pay_per_lead', 'managed')),

  notes text,

  -- Consent to business follow-up (the form cannot be submitted without it).
  consent boolean not null default false,

  -- Review workflow
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'contacted', 'approved', 'declined', 'spam')),
  reviewed_at timestamptz,
  review_notes text,

  -- Provenance
  source_page text,
  user_agent  text,

  submitted_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Normalized contact columns, reusing the helpers added in 0005 so contractor
-- applications dedupe the same way leads do.
alter table public.contractor_applications
  add column if not exists email_normalized text,
  add column if not exists phone_e164       text;

create or replace function public.normalize_application_contact()
returns trigger language plpgsql as $$
begin
  new.email_normalized := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.phone_e164 := public.to_e164(new.phone);
  return new;
end;
$$;

drop trigger if exists trg_applications_normalize on public.contractor_applications;
create trigger trg_applications_normalize
  before insert or update on public.contractor_applications
  for each row execute function public.normalize_application_contact();

-- Backfill any rows created before the trigger existed.
update public.contractor_applications
set email_normalized = nullif(lower(trim(coalesce(email, ''))), ''),
    phone_e164       = public.to_e164(phone)
where email_normalized is null or phone_e164 is null;

-- Indexes for the review queue and for spotting repeat applicants.
create index if not exists idx_applications_submitted_at
  on public.contractor_applications (submitted_at desc);
create index if not exists idx_applications_status
  on public.contractor_applications (status);
create index if not exists idx_applications_email_norm
  on public.contractor_applications (email_normalized);
create index if not exists idx_applications_phone_e164
  on public.contractor_applications (phone_e164);

-- ---- RLS -------------------------------------------------------------------
-- Enabled with no policies: anon and authenticated roles get zero access.
-- Only the service-role key (server-side) can read or write this table.
alter table public.contractor_applications enable row level security;

comment on table public.contractor_applications is
  'Public contractor applications from the marketing site. Written server-side with the service-role key only; RLS enabled with no policies so the anon key cannot access it.';
