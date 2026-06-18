-- ============================================================================
-- HomeQuote Network — Initial schema
-- ============================================================================
-- Run this in the Supabase SQL editor (or via the Supabase CLI) once.
--
-- Design notes:
--  * A LEAD is never owned by a single contractor. A lead is distributed to one
--    or many contractors through LEAD_ASSIGNMENTS. The sales funnel
--    (appointment -> estimate -> sale -> billing) lives on the ASSIGNMENT,
--    so the same lead sold to two contractors tracks two independent outcomes.
--  * Monetization is flexible: a PRICING_AGREEMENT (contractor x vertical x model)
--    plus BILLING_EVENTS generated as an assignment moves through the funnel.
--  * Three login roles: admin, setter (staff), contractor. Access is enforced
--    here with Row Level Security so a contractor can never read another
--    contractor's data even if the app has a bug.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'setter', 'contractor');

-- Lead pipeline (the lead's furthest overall stage). Per-contractor outcomes
-- are tracked separately on lead_assignments (the many-to-many funnel).
create type public.lead_status as enum (
  'new',
  'contact_attempted',
  'qualified',
  'assigned',
  'appointment_set',
  'appointment_completed',
  'estimate_sent',
  'sold',
  'lost',
  'cancelled'
);

-- Type of entry in a lead's activity timeline.
create type public.activity_type as enum (
  'note',
  'contact_attempt',
  'status_change',
  'qualification',
  'assignment',
  'appointment',
  'field_change',
  'system'
);

create type public.assignment_status as enum (
  'assigned',
  'accepted',
  'contacted',
  'appointment_set',
  'appointment_held',
  'estimate_given',
  'sold',
  'lost',
  'returned'
);

create type public.pricing_model as enum (
  'per_lead',
  'per_appointment',
  'revenue_share',
  'hybrid',
  'subscription'
);

create type public.appointment_status as enum (
  'scheduled', 'held', 'no_show', 'cancelled', 'rescheduled'
);

create type public.estimate_status as enum (
  'pending', 'sent', 'accepted', 'rejected'
);

create type public.billing_event_type as enum (
  'lead_fee', 'appointment_fee', 'revenue_share', 'subscription', 'adjustment'
);

create type public.billing_status as enum (
  'pending', 'invoiced', 'paid', 'void'
);

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===========================================================================
-- VERTICALS  (Fencing, ADUs, Home Improvement, ...) — a table so new verticals
-- can be added without a migration.
-- ===========================================================================
create table public.verticals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Sub-services within a vertical (e.g. Home Improvement -> Roofing, Kitchens).
create table public.sub_services (
  id          uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.verticals(id) on delete cascade,
  name        text not null,
  slug        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (vertical_id, slug)
);
create index idx_sub_services_vertical on public.sub_services(vertical_id);

-- ===========================================================================
-- CONTRACTORS  (the businesses that buy leads)
-- ===========================================================================
create table public.contractors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  email         text,
  phone         text,
  service_areas text[] not null default '{}',  -- zips / cities served
  status        text not null default 'active', -- active | paused | inactive
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_contractors_updated_at
  before update on public.contractors
  for each row execute function public.set_updated_at();

-- Which verticals a contractor serves (many-to-many).
create table public.contractor_verticals (
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  vertical_id   uuid not null references public.verticals(id) on delete cascade,
  primary key (contractor_id, vertical_id)
);

-- ===========================================================================
-- PROFILES  (one row per auth user; carries the role)
-- ===========================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          public.user_role not null default 'setter',
  full_name     text,
  email         text,
  phone         text,
  -- Set only for contractor-role users; links the login to a contractor business.
  contractor_id uuid references public.contractors(id) on delete set null,
  -- New signups start inactive; an admin activates them. Prevents a stray
  -- public signup from gaining staff access.
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile when an auth user is created. New users default to an
-- INACTIVE setter. Roles/activation are then set by an admin (or the bootstrap
-- SQL at the bottom of this file). The trigger never trusts a client-supplied
-- role, which prevents self-escalation via public signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent non-admins from changing their own role / activation / contractor link.
-- Service-role calls (auth.uid() is null) and admins are allowed through.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.contractor_id is distinct from old.contractor_id then
      raise exception 'Only an admin can change role, activation, or contractor link';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Auth helper functions (SECURITY DEFINER so they bypass RLS and avoid
-- recursive policy evaluation on the profiles table).
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'admin'
  )
$$;

-- Staff = admin OR setter (internal team).
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role in ('admin', 'setter')
  )
$$;

-- The contractor business the current user belongs to (null if not a contractor).
create or replace function public.auth_contractor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select contractor_id from public.profiles
  where id = auth.uid() and is_active and role = 'contractor'
$$;

-- ===========================================================================
-- PRICING AGREEMENTS  (contractor x vertical x model)
-- vertical_id null => agreement applies to all verticals for that contractor.
-- ===========================================================================
create table public.pricing_agreements (
  id                  uuid primary key default gen_random_uuid(),
  contractor_id       uuid not null references public.contractors(id) on delete cascade,
  vertical_id         uuid references public.verticals(id) on delete set null,
  model               public.pricing_model not null,
  per_lead_amount     numeric(12,2),
  per_appointment_amount numeric(12,2),
  revenue_share_pct   numeric(5,2),       -- e.g. 10.00 = 10%
  subscription_amount numeric(12,2),
  subscription_period text,               -- e.g. 'monthly'
  is_exclusive        boolean not null default false, -- leads under this deal are exclusive
  active_from         date not null default current_date,
  active_to           date,
  is_active           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger trg_pricing_agreements_updated_at
  before update on public.pricing_agreements
  for each row execute function public.set_updated_at();

create index idx_pricing_agreements_contractor on public.pricing_agreements(contractor_id);

-- ===========================================================================
-- LEADS  (homeowners). Attribution captured at creation and never lost.
-- ===========================================================================
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  vertical_id     uuid references public.verticals(id) on delete set null,
  sub_service_id  uuid references public.sub_services(id) on delete set null,
  status          public.lead_status not null default 'new',

  -- Homeowner contact
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  address         text,
  city            text,
  state           text,
  zip             text,

  -- Service info
  project_description text,

  -- Lead economics
  lead_cost          numeric(12,2),   -- what HomeQuote paid to acquire it
  estimated_job_value numeric(12,2),  -- rough project budget if known
  actual_revenue     numeric(12,2),   -- what HomeQuote earned from it
  commission         numeric(12,2),   -- amount paid out (if any)
  -- Profit is always derived, never entered by hand.
  profit             numeric(12,2) generated always as (
                       coalesce(actual_revenue, 0)
                       - coalesce(lead_cost, 0)
                       - coalesce(commission, 0)
                     ) stored,

  -- Qualification
  qualified       boolean not null default false,
  qualified_at    timestamptz,
  qualified_by    uuid references public.profiles(id) on delete set null,
  budget_range    text,
  timeline        text,
  urgency         text,   -- low | medium | high

  -- Tracking
  notes             text,
  last_contact_date timestamptz,
  archived_at       timestamptz,   -- soft archive (null = active)

  -- Attribution (where the lead came from)
  source          text,   -- meta | google | website | landing_page | referral | manual | nextdoor | ...
  campaign        text,
  ad_set          text,
  ad_name         text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  referrer        text,
  landing_page_url text,

  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create index idx_leads_status on public.leads(status);
create index idx_leads_vertical on public.leads(vertical_id);
create index idx_leads_sub_service on public.leads(sub_service_id);
create index idx_leads_source on public.leads(source);
create index idx_leads_created_at on public.leads(created_at);
create index idx_leads_archived on public.leads(archived_at);
create index idx_leads_city on public.leads(city);
create index idx_leads_zip on public.leads(zip);

-- ===========================================================================
-- LEAD ASSIGNMENTS  (the funnel spine: lead -> contractor, one-to-many)
-- ===========================================================================
create table public.lead_assignments (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.leads(id) on delete cascade,
  contractor_id       uuid not null references public.contractors(id) on delete cascade,
  pricing_agreement_id uuid references public.pricing_agreements(id) on delete set null,
  is_exclusive        boolean not null default false,
  status              public.assignment_status not null default 'assigned',
  assigned_by         uuid references public.profiles(id) on delete set null,
  assigned_at         timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (lead_id, contractor_id)  -- a contractor receives a given lead once
);
create trigger trg_lead_assignments_updated_at
  before update on public.lead_assignments
  for each row execute function public.set_updated_at();

create index idx_assignments_lead on public.lead_assignments(lead_id);
create index idx_assignments_contractor on public.lead_assignments(contractor_id);
create index idx_assignments_status on public.lead_assignments(status);

-- Helper: does the current contractor own this assignment?
create or replace function public.owns_assignment(a_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lead_assignments la
    where la.id = a_id and la.contractor_id = public.auth_contractor_id()
  )
$$;

-- Helper: is this lead assigned to the current contractor? (drives lead/activity
-- visibility in the contractor portal). Staff see everything separately.
create or replace function public.lead_assigned_to_me(l_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lead_assignments la
    where la.lead_id = l_id and la.contractor_id = public.auth_contractor_id()
  )
$$;

-- ===========================================================================
-- APPOINTMENTS / ESTIMATES / SALES  (per assignment)
-- ===========================================================================
create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lead_assignments(id) on delete cascade,
  scheduled_at  timestamptz,
  status        public.appointment_status not null default 'scheduled',
  location      text,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();
create index idx_appointments_assignment on public.appointments(assignment_id);

create table public.estimates (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lead_assignments(id) on delete cascade,
  amount        numeric(12,2),
  status        public.estimate_status not null default 'pending',
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_estimates_updated_at
  before update on public.estimates
  for each row execute function public.set_updated_at();
create index idx_estimates_assignment on public.estimates(assignment_id);

create table public.sales (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lead_assignments(id) on delete cascade,
  amount        numeric(12,2) not null,  -- job / contract value
  closed_at     date not null default current_date,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_sales_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();
create index idx_sales_assignment on public.sales(assignment_id);

-- ===========================================================================
-- LEAD ACTIVITIES  (the activity timeline: notes, contact attempts, changes)
-- ===========================================================================
create table public.lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  type        public.activity_type not null default 'note',
  body        text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index idx_activities_lead on public.lead_activities(lead_id, created_at desc);

-- ===========================================================================
-- LEAD ATTACHMENTS  (links / files associated with a lead)
-- ===========================================================================
create table public.lead_attachments (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  name        text not null,
  url         text not null,
  created_at  timestamptz not null default now()
);
create index idx_attachments_lead on public.lead_attachments(lead_id);

-- ===========================================================================
-- BILLING EVENTS  (what HomeQuote earns from an assignment) — admin only
-- ===========================================================================
create table public.billing_events (
  id                  uuid primary key default gen_random_uuid(),
  assignment_id       uuid references public.lead_assignments(id) on delete set null,
  contractor_id       uuid not null references public.contractors(id) on delete cascade,
  pricing_agreement_id uuid references public.pricing_agreements(id) on delete set null,
  event_type          public.billing_event_type not null,
  amount              numeric(12,2) not null,
  status              public.billing_status not null default 'pending',
  occurred_at         timestamptz not null default now(),
  notes               text,
  created_at          timestamptz not null default now()
);
create index idx_billing_contractor on public.billing_events(contractor_id);
create index idx_billing_assignment on public.billing_events(assignment_id);

-- ===========================================================================
-- AD SPEND  (for marketing ROAS) — admin only
-- ===========================================================================
create table public.ad_spend (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,   -- meta | google | nextdoor | ...
  campaign     text,
  vertical_id  uuid references public.verticals(id) on delete set null,
  amount       numeric(12,2) not null,
  spend_date   date not null,
  notes        text,
  created_at   timestamptz not null default now()
);
create index idx_ad_spend_date on public.ad_spend(spend_date);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.profiles            enable row level security;
alter table public.verticals           enable row level security;
alter table public.sub_services        enable row level security;
alter table public.contractors         enable row level security;
alter table public.contractor_verticals enable row level security;
alter table public.pricing_agreements   enable row level security;
alter table public.leads                enable row level security;
alter table public.lead_assignments     enable row level security;
alter table public.appointments         enable row level security;
alter table public.estimates            enable row level security;
alter table public.sales                enable row level security;
alter table public.lead_activities      enable row level security;
alter table public.lead_attachments     enable row level security;
alter table public.billing_events       enable row level security;
alter table public.ad_spend             enable row level security;

-- ---- profiles -------------------------------------------------------------
-- Users see their own profile; staff see all profiles.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff());
-- Users may update their own profile (the guard trigger blocks role/activation
-- changes); admins may update any profile.
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- Inserts happen via the on_auth_user_created trigger or the service role.

-- ---- verticals ------------------------------------------------------------
create policy verticals_select on public.verticals for select
  using (auth.uid() is not null);
create policy verticals_write on public.verticals for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- sub_services ---------------------------------------------------------
create policy sub_services_select on public.sub_services for select
  using (auth.uid() is not null);
create policy sub_services_write on public.sub_services for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- contractors ----------------------------------------------------------
-- Staff see all; a contractor sees only their own business.
create policy contractors_select on public.contractors for select
  using (public.is_staff() or id = public.auth_contractor_id());
create policy contractors_write on public.contractors for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- contractor_verticals -------------------------------------------------
create policy contractor_verticals_select on public.contractor_verticals for select
  using (public.is_staff() or contractor_id = public.auth_contractor_id());
create policy contractor_verticals_write on public.contractor_verticals for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- pricing_agreements (billing-sensitive: setters excluded) -------------
-- Admins see all; a contractor sees only their own pricing. Setters cannot.
create policy pricing_select on public.pricing_agreements for select
  using (public.is_admin() or contractor_id = public.auth_contractor_id());
create policy pricing_write on public.pricing_agreements for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- leads ----------------------------------------------------------------
-- Staff see all leads. A contractor sees a lead only if they hold an
-- assignment for it.
create policy leads_select on public.leads for select
  using (
    public.is_staff()
    or exists (
      select 1 from public.lead_assignments la
      where la.lead_id = leads.id
        and la.contractor_id = public.auth_contractor_id()
    )
  );
-- Staff create / edit leads (capture + qualification).
create policy leads_insert on public.leads for insert
  with check (public.is_staff());
create policy leads_update on public.leads for update
  using (public.is_staff()) with check (public.is_staff());
create policy leads_delete on public.leads for delete
  using (public.is_admin());

-- ---- lead_assignments -----------------------------------------------------
-- Staff see all; contractor sees their own assignments.
create policy assignments_select on public.lead_assignments for select
  using (public.is_staff() or contractor_id = public.auth_contractor_id());
-- Distribution (creating assignments) is staff-only.
create policy assignments_insert on public.lead_assignments for insert
  with check (public.is_staff());
-- Staff can update any; a contractor can update the status of their own.
create policy assignments_update on public.lead_assignments for update
  using (public.is_staff() or contractor_id = public.auth_contractor_id())
  with check (public.is_staff() or contractor_id = public.auth_contractor_id());
create policy assignments_delete on public.lead_assignments for delete
  using (public.is_admin());

-- ---- appointments / estimates / sales (per assignment) --------------------
-- Staff manage all; a contractor manages records for their own assignments.
create policy appointments_select on public.appointments for select
  using (public.is_staff() or public.owns_assignment(assignment_id));
create policy appointments_write on public.appointments for all
  using (public.is_staff() or public.owns_assignment(assignment_id))
  with check (public.is_staff() or public.owns_assignment(assignment_id));

create policy estimates_select on public.estimates for select
  using (public.is_staff() or public.owns_assignment(assignment_id));
create policy estimates_write on public.estimates for all
  using (public.is_staff() or public.owns_assignment(assignment_id))
  with check (public.is_staff() or public.owns_assignment(assignment_id));

create policy sales_select on public.sales for select
  using (public.is_staff() or public.owns_assignment(assignment_id));
create policy sales_write on public.sales for all
  using (public.is_staff() or public.owns_assignment(assignment_id))
  with check (public.is_staff() or public.owns_assignment(assignment_id));

-- ---- lead_activities ------------------------------------------------------
-- Staff see/add all; a contractor sees and adds activity only on leads
-- assigned to them. Activities are an audit trail, so only admins may delete.
create policy activities_select on public.lead_activities for select
  using (public.is_staff() or public.lead_assigned_to_me(lead_id));
create policy activities_insert on public.lead_activities for insert
  with check (public.is_staff() or public.lead_assigned_to_me(lead_id));
create policy activities_delete on public.lead_activities for delete
  using (public.is_admin());

-- ---- lead_attachments -----------------------------------------------------
create policy attachments_select on public.lead_attachments for select
  using (public.is_staff() or public.lead_assigned_to_me(lead_id));
create policy attachments_insert on public.lead_attachments for insert
  with check (public.is_staff() or public.lead_assigned_to_me(lead_id));
create policy attachments_delete on public.lead_attachments for delete
  using (public.is_staff() or public.lead_assigned_to_me(lead_id));

-- ---- billing_events / ad_spend (admin only) -------------------------------
create policy billing_admin on public.billing_events for all
  using (public.is_admin()) with check (public.is_admin());
create policy ad_spend_admin on public.ad_spend for all
  using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- SEED: default verticals
-- ===========================================================================
insert into public.verticals (name, slug) values
  ('Fencing', 'fencing'),
  ('ADU', 'adu'),
  ('Home Improvement', 'home-improvement')
on conflict (slug) do nothing;

-- Sub-services for Home Improvement.
insert into public.sub_services (vertical_id, name, slug)
select v.id, s.name, s.slug
from public.verticals v
cross join (values
  ('Bathrooms', 'bathrooms'),
  ('Kitchens', 'kitchens'),
  ('Roofing', 'roofing'),
  ('Flooring', 'flooring'),
  ('Painting', 'painting'),
  ('Electrical', 'electrical'),
  ('Plumbing', 'plumbing'),
  ('Stucco', 'stucco'),
  ('Concrete', 'concrete'),
  ('Windows', 'windows'),
  ('Doors', 'doors'),
  ('Landscaping', 'landscaping'),
  ('Other', 'other')
) as s(name, slug)
where v.slug = 'home-improvement'
on conflict (vertical_id, slug) do nothing;

-- ===========================================================================
-- BOOTSTRAP YOUR ADMIN ACCOUNT
-- ===========================================================================
-- 1. Sign up through the app at /sign-up (this creates an INACTIVE setter).
-- 2. Then run the line below with your email to become an active admin:
--
--   update public.profiles
--     set role = 'admin', is_active = true
--   where email = 'you@example.com';
-- ===========================================================================
