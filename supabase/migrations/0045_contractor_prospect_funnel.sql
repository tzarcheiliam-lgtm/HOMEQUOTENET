-- ============================================================================
-- HomeQuote Network — Contractor-prospect qualification funnel
-- ============================================================================
-- Backs /contractor-appointments (Meta ad landing page) and its Check My Fit
-- funnel. These rows are CONTRACTORS considering HomeQuote, never homeowner
-- leads: they do not touch `leads`, `funnel_sessions` or distribution.
--
-- Written and read server-side only (service-role key). RLS enabled with no
-- policies, same posture as contractor_applications (0006).
-- Numbered 0045 to stay clear of 0039-0043 already on main / meta-ads.
-- ============================================================================

create table if not exists public.contractor_funnel_submissions (
  id uuid primary key default gen_random_uuid(),

  -- Client-generated per funnel run. UNIQUE = double-submit / retry safe.
  submission_id uuid not null unique,
  -- SHA-256 of the secret returned to the browser; authorises the booking call.
  access_token_hash text not null,

  -- Answers (screens 1-7)
  services          text[] not null default '{}',
  service_other     text,
  service_area      text not null,
  role              text not null,
  project_value     text not null,
  appointment_capacity text not null,
  customer_sources  text[] not null default '{}',
  start_timeline    text not null,

  -- Contact (screen 8)
  name     text not null,
  company  text not null,
  email    text not null,
  phone    text not null,
  website  text,
  email_normalized text,
  phone_e164       text,
  contact_consent   boolean not null default false,
  marketing_consent boolean not null default false,
  measurement_allowed boolean not null default false,

  -- Qualification
  qualification_status text not null check (qualification_status in ('qualified', 'needs_review')),
  qualification_reasons text[] not null default '{}',
  rules_snapshot jsonb not null default '{}'::jsonb,

  -- Calendar. 'confirmed' = Calendly API verified; 'reported' = the Calendly
  -- embed reported a booking but no API token was available to verify it.
  calendar_shown_at timestamptz,
  booking_status text not null default 'none' check (booking_status in ('none', 'reported', 'confirmed')),
  booking_event_uri text,
  booking_invitee_uri text,
  booked_at timestamptz,
  booking_start_time timestamptz,

  -- Attribution (UTMs, Meta macros, fbclid). Never contains contact data.
  attribution jsonb not null default '{}'::jsonb,

  -- Internal review
  review_status text not null default 'new'
    check (review_status in ('new', 'reviewing', 'contacted', 'booked', 'not_a_fit', 'spam')),
  review_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.normalize_contractor_funnel_submission_contact()
returns trigger language plpgsql as $$
begin
  new.email_normalized := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.phone_e164 := public.to_e164(new.phone);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_contractor_funnel_submissions_normalize on public.contractor_funnel_submissions;
create trigger trg_contractor_funnel_submissions_normalize
  before insert or update on public.contractor_funnel_submissions
  for each row execute function public.normalize_contractor_funnel_submission_contact();

create index if not exists idx_contractor_funnel_submissions_created on public.contractor_funnel_submissions (created_at desc);
create index if not exists idx_contractor_funnel_submissions_status on public.contractor_funnel_submissions (qualification_status, review_status);
create index if not exists idx_contractor_funnel_submissions_email on public.contractor_funnel_submissions (email_normalized);

alter table public.contractor_funnel_submissions enable row level security;
comment on table public.contractor_funnel_submissions is
  'Contractors who completed the HomeQuote Check My Fit funnel (/contractor-appointments). Not homeowner leads. Service-role access only.';

-- Single-row settings: sales calendar URL, Meta pixel id, qualification rules.
create table if not exists public.contractor_funnel_settings (
  id text primary key default 'default' check (id = 'default'),
  sales_calendar_url text,
  meta_pixel_id text,
  rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.contractor_funnel_settings enable row level security;
insert into public.contractor_funnel_settings (id) values ('default') on conflict do nothing;
