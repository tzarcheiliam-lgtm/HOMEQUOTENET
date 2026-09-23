-- ============================================================================
-- HomeQuote Network — Contractor prospecting (partner cold-calling workspace)
-- ============================================================================
-- Additive migration. Run AFTER 0001-0006. Re-runnable: every statement is
-- guarded with if-not-exists / or-replace / drop-if-exists.
--
-- WHAT THIS IS
--   The pool-remodeling contractors that HomeQuote partners (callers) cold call
--   to sell the pay-per-appointment service. These are NOT homeowner leads and
--   they are NOT the contractors already signed up in public.contractors. They
--   get their own tables so the homeowner pipeline, analytics and billing are
--   untouched:
--
--     contractor_prospects          the business being called
--     prospect_call_attempts        append-only log of every call
--     prospect_sales_appointments   a booked sales call WITH the contractor
--                                   (distinct from public.appointments, which
--                                   are homeowner appointments sold TO one)
--
-- WHO CAN SEE WHAT
--   A new `caller` role. Callers are deliberately NOT staff — is_staff() stays
--   admin/setter — so every existing policy keeps homeowner data away from them
--   with no changes. Callers see only prospects assigned to them; admins see
--   everything and own assignment. Setters and contractors see none of this.
--
-- NOTE on the enum: `alter type ... add value` cannot be *used* in the same
-- transaction that adds it. Nothing below casts the literal 'caller' to
-- user_role — is_caller() compares role::text — so the file runs as a single
-- script in the Supabase SQL editor. (Same caveat as 0002.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role
-- ---------------------------------------------------------------------------
alter type public.user_role add value if not exists 'caller';

-- ---------------------------------------------------------------------------
-- Enums (guarded so the migration is re-runnable)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'prospect_disposition') then
    create type public.prospect_disposition as enum (
      'new',
      'calling',
      'no_answer',
      'left_voicemail',
      'gatekeeper',
      'spoke_with_dm',
      'callback_requested',
      'interested',
      'follow_up_required',
      'appointment_booked',
      'not_interested',
      'wrong_number',
      'duplicate',
      'do_not_call'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sales_appointment_status') then
    create type public.sales_appointment_status as enum (
      'scheduled',
      'confirmed',
      'rescheduled',
      'completed',
      'no_show',
      'cancelled'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------------
-- Compares role::text on purpose: see the enum note in the header.
create or replace function public.is_caller()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role::text = 'caller'
  )
$$;

-- Normalizes a website to a bare registrable host: lower-case, no scheme,
-- no "www.", no path/query. Used for dedupe. Returns null for blank input.
create or replace function public.to_website_domain(p text)
returns text language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := lower(trim(p));
  if d = '' then return null; end if;
  d := regexp_replace(d, '^[a-z]+://', '');
  d := regexp_replace(d, '^www\.', '');
  d := split_part(d, '/', 1);
  d := split_part(d, '?', 1);
  d := split_part(d, '#', 1);
  d := split_part(d, ':', 1);
  if d = '' then return null; end if;
  return d;
end;
$$;

-- ---------------------------------------------------------------------------
-- CONTRACTOR PROSPECTS
-- ---------------------------------------------------------------------------
create table if not exists public.contractor_prospects (
  id                    uuid primary key default gen_random_uuid(),

  -- Identity
  company_name          text not null,
  phone                 text,
  phone_e164            text,          -- derived, see trg_prospects_normalize
  website               text,
  website_domain        text,          -- derived
  email                 text,

  -- Market
  city                  text,
  county                text,
  state                 text not null default 'CA',
  service_area          text,

  -- Fit
  primary_services      text[] not null default '{}',
  category              text,          -- e.g. 'pool_remodeler', 'pool_builder', 'outdoor_living'
  rating                numeric(2,1),
  review_count          integer,
  is_pool_cleaning_only boolean not null default false,
  flags                 text[] not null default '{}',   -- 'invalid_phone' | 'closed' | 'possible_duplicate' | ...

  -- Assignment (one caller at a time; history goes to audit_logs)
  assigned_to           uuid references public.profiles(id) on delete set null,
  assigned_at           timestamptz,
  assigned_by           uuid references public.profiles(id) on delete set null,

  -- Calling state (denormalized from prospect_call_attempts for fast lists)
  disposition           public.prospect_disposition not null default 'new',
  call_attempt_count    integer not null default 0,
  last_contacted_at     timestamptz,
  next_callback_at      timestamptz,
  follow_up_at          timestamptz,
  appointment_at        timestamptz,   -- next scheduled sales appointment
  decision_maker_name   text,
  best_contact_method   text,
  do_not_call_at        timestamptz,
  notes                 text,

  -- Provenance
  source                text,          -- 'import' | 'manual' | ...
  import_batch          text,
  archived_at           timestamptz,

  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint prospects_rating_range check (rating is null or (rating >= 0 and rating <= 5)),
  constraint prospects_review_count_nonneg check (review_count is null or review_count >= 0),
  constraint prospects_attempts_nonneg check (call_attempt_count >= 0)
);

comment on table public.contractor_prospects is
  'Pool-remodeling contractors that HomeQuote partners cold call. Not homeowner leads; not signed contractors (see public.contractors).';

drop trigger if exists trg_prospects_updated_at on public.contractor_prospects;
create trigger trg_prospects_updated_at
  before update on public.contractor_prospects
  for each row execute function public.set_updated_at();

-- Derived contact columns, kept in step with the raw ones.
create or replace function public.normalize_prospect_contact()
returns trigger language plpgsql as $$
begin
  new.phone_e164     := public.to_e164(new.phone);
  new.website_domain := public.to_website_domain(new.website);
  -- The DNC timestamp follows the disposition so the two can never disagree.
  if new.disposition = 'do_not_call' and new.do_not_call_at is null then
    new.do_not_call_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prospects_normalize on public.contractor_prospects;
create trigger trg_prospects_normalize
  before insert or update on public.contractor_prospects
  for each row execute function public.normalize_prospect_contact();

-- Callers may change calling state on their own prospects and nothing else:
-- not who it is, not who it is assigned to, and never lift a do-not-call.
create or replace function public.guard_prospect_caller_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.company_name        is distinct from old.company_name
     or new.phone            is distinct from old.phone
     or new.website          is distinct from old.website
     or new.email            is distinct from old.email
     or new.city             is distinct from old.city
     or new.county           is distinct from old.county
     or new.state            is distinct from old.state
     or new.service_area     is distinct from old.service_area
     or new.primary_services is distinct from old.primary_services
     or new.category         is distinct from old.category
     or new.rating           is distinct from old.rating
     or new.review_count     is distinct from old.review_count
     or new.is_pool_cleaning_only is distinct from old.is_pool_cleaning_only
     or new.flags            is distinct from old.flags
     or new.assigned_to      is distinct from old.assigned_to
     or new.assigned_at      is distinct from old.assigned_at
     or new.assigned_by      is distinct from old.assigned_by
     or new.source           is distinct from old.source
     or new.import_batch     is distinct from old.import_batch
     or new.archived_at      is distinct from old.archived_at
     or new.created_by       is distinct from old.created_by
  then
    raise exception 'Callers may only update calling fields on a prospect';
  end if;

  if old.disposition = 'do_not_call' and new.disposition <> 'do_not_call' then
    raise exception 'Only an admin can remove a prospect from the do-not-call list';
  end if;
  if old.do_not_call_at is not null and new.do_not_call_at is null then
    raise exception 'Only an admin can clear do_not_call_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prospects_guard on public.contractor_prospects;
create trigger trg_prospects_guard
  before update on public.contractor_prospects
  for each row execute function public.guard_prospect_caller_update();

-- One live record per phone number. Domain and name are indexed for the
-- import dedupe pass but not unique: two branches can legitimately share a site.
create unique index if not exists uq_prospects_phone_e164
  on public.contractor_prospects (phone_e164)
  where phone_e164 is not null and archived_at is null;
create index if not exists idx_prospects_domain      on public.contractor_prospects (website_domain);
create index if not exists idx_prospects_name_lower  on public.contractor_prospects (lower(company_name));
create index if not exists idx_prospects_assigned    on public.contractor_prospects (assigned_to, disposition);
create index if not exists idx_prospects_disposition on public.contractor_prospects (disposition);
create index if not exists idx_prospects_callback    on public.contractor_prospects (next_callback_at) where next_callback_at is not null;
create index if not exists idx_prospects_county      on public.contractor_prospects (county);
create index if not exists idx_prospects_city        on public.contractor_prospects (city);

-- ---------------------------------------------------------------------------
-- CALL ATTEMPTS  (append-only; no update/delete policy for anyone)
-- ---------------------------------------------------------------------------
create table if not exists public.prospect_call_attempts (
  id                   uuid primary key default gen_random_uuid(),
  prospect_id          uuid not null references public.contractor_prospects(id) on delete cascade,
  caller_id            uuid references public.profiles(id) on delete set null,
  caller_name          text,                       -- snapshot at call time
  outcome              public.prospect_disposition not null,
  notes                text,
  attempt_number       integer not null,
  previous_disposition public.prospect_disposition,
  new_disposition      public.prospect_disposition not null,
  callback_at          timestamptz,
  appointment_at       timestamptz,
  created_by           uuid references public.profiles(id) on delete set null,
  updated_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.prospect_call_attempts is
  'Permanent record of every cold call. Append-only: RLS grants insert and select only.';

create index if not exists idx_call_attempts_prospect on public.prospect_call_attempts (prospect_id, created_at desc);
create index if not exists idx_call_attempts_caller   on public.prospect_call_attempts (caller_id, created_at desc);
create index if not exists idx_call_attempts_outcome  on public.prospect_call_attempts (outcome, created_at desc);

-- Fills the snapshot fields and refuses calls to a do-not-call prospect. The
-- one exception is the attempt that *records* the DNC request itself.
create or replace function public.prepare_call_attempt()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.contractor_prospects%rowtype;
begin
  select * into p from public.contractor_prospects where id = new.prospect_id;
  if not found then
    raise exception 'Unknown prospect';
  end if;

  if p.disposition = 'do_not_call' and new.outcome <> 'do_not_call' then
    raise exception 'Prospect is on the do-not-call list';
  end if;

  if new.caller_id is null then new.caller_id := auth.uid(); end if;
  if new.created_by is null then new.created_by := auth.uid(); end if;
  if new.updated_by is null then new.updated_by := new.created_by; end if;
  if new.caller_name is null and new.caller_id is not null then
    select coalesce(nullif(full_name, ''), email) into new.caller_name
      from public.profiles where id = new.caller_id;
  end if;
  if new.previous_disposition is null then
    new.previous_disposition := p.disposition;
  end if;
  new.attempt_number := p.call_attempt_count + 1;
  return new;
end;
$$;

drop trigger if exists trg_call_attempts_prepare on public.prospect_call_attempts;
create trigger trg_call_attempts_prepare
  before insert on public.prospect_call_attempts
  for each row execute function public.prepare_call_attempt();

-- The counter and last-contact stamp on the prospect follow the log, so they
-- cannot drift from it whatever path inserted the attempt.
create or replace function public.apply_call_attempt()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.contractor_prospects
     set call_attempt_count = greatest(call_attempt_count, new.attempt_number),
         last_contacted_at  = greatest(coalesce(last_contacted_at, new.created_at), new.created_at),
         updated_by         = coalesce(new.created_by, updated_by)
   where id = new.prospect_id;
  return new;
end;
$$;

drop trigger if exists trg_call_attempts_apply on public.prospect_call_attempts;
create trigger trg_call_attempts_apply
  after insert on public.prospect_call_attempts
  for each row execute function public.apply_call_attempt();

-- ---------------------------------------------------------------------------
-- SALES APPOINTMENTS  (a call booked WITH a contractor prospect)
-- ---------------------------------------------------------------------------
create table if not exists public.prospect_sales_appointments (
  id                  uuid primary key default gen_random_uuid(),
  prospect_id         uuid not null references public.contractor_prospects(id) on delete cascade,
  partner_id          uuid references public.profiles(id) on delete set null,   -- the HomeQuote partner who booked it
  call_attempt_id     uuid references public.prospect_call_attempts(id) on delete set null,
  decision_maker_name text,
  scheduled_at        timestamptz not null,
  time_zone           text not null default 'America/Los_Angeles',
  appointment_type    text,                          -- 'phone' | 'video' | 'in_person'
  contact_info        text,                          -- confirmation phone / email / meeting link
  status              public.sales_appointment_status not null default 'scheduled',
  confirmed_at        timestamptz,
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  updated_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.prospect_sales_appointments is
  'Sales calls booked with contractor prospects by HomeQuote partners. NOT the homeowner appointments in public.appointments.';

drop trigger if exists trg_sales_appointments_updated_at on public.prospect_sales_appointments;
create trigger trg_sales_appointments_updated_at
  before update on public.prospect_sales_appointments
  for each row execute function public.set_updated_at();

create index if not exists idx_sales_appointments_prospect  on public.prospect_sales_appointments (prospect_id, scheduled_at);
create index if not exists idx_sales_appointments_partner   on public.prospect_sales_appointments (partner_id, scheduled_at);
create index if not exists idx_sales_appointments_scheduled on public.prospect_sales_appointments (scheduled_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Security definer so policies on the child tables can ask "is this prospect
-- mine?" without a second pass through the prospects policy.
create or replace function public.prospect_assigned_to_me(p_prospect_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contractor_prospects
    where id = p_prospect_id and assigned_to = auth.uid()
  )
$$;

alter table public.contractor_prospects        enable row level security;
alter table public.prospect_call_attempts      enable row level security;
alter table public.prospect_sales_appointments enable row level security;

-- ---- contractor_prospects ---------------------------------------------------
drop policy if exists prospects_select on public.contractor_prospects;
create policy prospects_select on public.contractor_prospects for select
  using (public.is_admin() or (public.is_caller() and assigned_to = auth.uid()));

drop policy if exists prospects_insert on public.contractor_prospects;
create policy prospects_insert on public.contractor_prospects for insert
  with check (public.is_admin());

-- WITH CHECK keeps assigned_to = auth.uid() for callers, so a caller cannot
-- hand a prospect to someone else even before the column guard runs.
drop policy if exists prospects_update on public.contractor_prospects;
create policy prospects_update on public.contractor_prospects for update
  using      (public.is_admin() or (public.is_caller() and assigned_to = auth.uid()))
  with check (public.is_admin() or (public.is_caller() and assigned_to = auth.uid()));

drop policy if exists prospects_delete on public.contractor_prospects;
create policy prospects_delete on public.contractor_prospects for delete
  using (public.is_admin());

-- ---- prospect_call_attempts -------------------------------------------------
-- History stays readable to whoever currently holds the prospect, so a
-- reassigned record does not arrive blank.
drop policy if exists call_attempts_select on public.prospect_call_attempts;
create policy call_attempts_select on public.prospect_call_attempts for select
  using (public.is_admin() or public.prospect_assigned_to_me(prospect_id));

drop policy if exists call_attempts_insert on public.prospect_call_attempts;
create policy call_attempts_insert on public.prospect_call_attempts for insert
  with check (
    public.is_admin()
    or (
      public.is_caller()
      and caller_id = auth.uid()
      and public.prospect_assigned_to_me(prospect_id)
    )
  );
-- No update or delete policy: the log is permanent.

-- ---- prospect_sales_appointments -------------------------------------------
drop policy if exists sales_appointments_select on public.prospect_sales_appointments;
create policy sales_appointments_select on public.prospect_sales_appointments for select
  using (public.is_admin() or public.prospect_assigned_to_me(prospect_id));

drop policy if exists sales_appointments_insert on public.prospect_sales_appointments;
create policy sales_appointments_insert on public.prospect_sales_appointments for insert
  with check (
    public.is_admin()
    or (
      public.is_caller()
      and partner_id = auth.uid()
      and public.prospect_assigned_to_me(prospect_id)
    )
  );

drop policy if exists sales_appointments_update on public.prospect_sales_appointments;
create policy sales_appointments_update on public.prospect_sales_appointments for update
  using      (public.is_admin() or (public.is_caller() and partner_id = auth.uid()))
  with check (public.is_admin() or (public.is_caller() and partner_id = auth.uid()));

drop policy if exists sales_appointments_delete on public.prospect_sales_appointments;
create policy sales_appointments_delete on public.prospect_sales_appointments for delete
  using (public.is_admin());
