-- ============================================================================
-- HomeQuote Network — Refresh Prospects (sourcing real businesses by niche)
-- ============================================================================
-- Additive migration. Run AFTER 0007. Re-runnable.
--
-- Adds to contractor_prospects what a sourced business carries that a manual
-- or CSV one might not: the niche it was sourced for, the provider's stable
-- business id (so a re-run can never re-add the same listing), and the
-- address/status details the provider returns. Adds prospect_refresh_runs as
-- the durable record of every "Find New Prospects" run: who asked, for what,
-- and what happened.
-- ============================================================================

alter table public.contractor_prospects
  add column if not exists niche           text,
  add column if not exists external_source text,   -- 'google_places'
  add column if not exists external_id     text,   -- provider's stable id
  add column if not exists address         text,
  add column if not exists zip             text,
  add column if not exists business_status text,   -- 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY'
  add column if not exists maps_url        text;

create index if not exists idx_prospects_niche on public.contractor_prospects (niche);

-- A listing is added once, ever: the same provider id cannot come back as a
-- second prospect even if its phone or website has changed.
create unique index if not exists uq_prospects_external
  on public.contractor_prospects (external_source, external_id)
  where external_id is not null;

comment on column public.contractor_prospects.niche is
  'The niche this prospect was sourced or filed under, e.g. "Pool Contractors". Drives the Niche filter on /app/calls.';
comment on column public.contractor_prospects.external_id is
  'Stable business id from external_source (Google Place id). Unique per source; used for dedupe on refresh.';

-- Callers may not touch the sourcing columns either — extend the column guard.
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
     or new.niche            is distinct from old.niche
     or new.external_source  is distinct from old.external_source
     or new.external_id      is distinct from old.external_id
     or new.address          is distinct from old.address
     or new.zip              is distinct from old.zip
     or new.business_status  is distinct from old.business_status
     or new.maps_url         is distinct from old.maps_url
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

-- ---------------------------------------------------------------------------
-- REFRESH RUNS  (one row per "Find New Prospects" click)
-- ---------------------------------------------------------------------------
create table if not exists public.prospect_refresh_runs (
  id                 uuid primary key default gen_random_uuid(),
  requested_by       uuid references public.profiles(id) on delete set null,
  niche              text not null,
  callers            uuid[] not null default '{}',
  requested_per_caller integer not null,
  counties           text[] not null default '{}',
  provider           text not null default 'google_places',
  status             text not null default 'running'
                     check (status in ('running', 'completed', 'failed', 'not_configured')),
  added_count        integer not null default 0,
  duplicate_count    integer not null default 0,
  unqualified_count  integer not null default 0,
  fetched_count      integer not null default 0,
  log                jsonb not null default '[]',   -- [{at, message}]
  error              text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz
);

comment on table public.prospect_refresh_runs is
  'Durable record of each Refresh Prospects run: parameters, progress log and outcome counts.';

create index if not exists idx_refresh_runs_started on public.prospect_refresh_runs (started_at desc);

alter table public.prospect_refresh_runs enable row level security;

drop policy if exists refresh_runs_admin on public.prospect_refresh_runs;
create policy refresh_runs_admin on public.prospect_refresh_runs for all
  using (public.is_admin()) with check (public.is_admin());
