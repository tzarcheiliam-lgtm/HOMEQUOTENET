-- HomeQuote contractor growth services ("Grow Your Business").
--
-- Contractors can ask HomeQuote about optional services (brochures, websites,
-- CRM setup, ...). This first version only collects interest: nothing is
-- purchased, billed or enrolled. HQN admins review requests and move them
-- through New -> Contacted -> Proposal Sent -> Accepted / Closed.
--
-- Additive only. Existing tables' RLS, auth helpers, lead distribution and
-- contractor permissions are untouched; the new table gets its own policies
-- built on the existing helpers (auth_contractor_id(), is_admin()).
--
-- 1. contractors.website: optional company website, set by admins. Used to
--    recommend website services sparingly to a company without one.
-- 2. service_requests: one row per request, always tied to the requesting
--    user's own company. RLS rejects a request for any other company, so a
--    tampered form cannot file for someone else.

-- ---- 1. company website -------------------------------------------------------
alter table public.contractors add column if not exists website text;
alter table public.contractors drop constraint if exists contractors_website_length;
alter table public.contractors add constraint contractors_website_length
  check (website is null or length(website) <= 300);

-- ---- 2. service requests ------------------------------------------------------
create table if not exists public.service_requests (
  id                uuid primary key default gen_random_uuid(),
  contractor_id     uuid not null references public.contractors(id) on delete cascade,
  requested_by      uuid references public.profiles(id) on delete set null,
  service           text not null check (service in (
                      'brochures', 'brand_identity', 'website', 'landing_pages',
                      'social_ad_creative', 'photo_video', 'lead_follow_up',
                      'crm_setup', 'review_generation', 'local_seo')),
  notes             text check (notes is null or length(notes) <= 2000),
  status            text not null default 'new' check (status in (
                      'new', 'contacted', 'proposal_sent', 'accepted', 'closed')),
  status_changed_at timestamptz,
  status_changed_by uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_service_requests_status on public.service_requests (status, created_at desc);
create index if not exists idx_service_requests_contractor on public.service_requests (contractor_id, created_at desc);
-- One open request per company per service; a closed or accepted one can be asked again.
create unique index if not exists service_requests_one_open on public.service_requests (contractor_id, service)
  where status in ('new', 'contacted', 'proposal_sent');

drop trigger if exists trg_service_requests_updated_at on public.service_requests;
create trigger trg_service_requests_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

-- Stamp who moved the status and when (admins only reach updates via RLS).
create or replace function public.stamp_service_request_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := coalesce(auth.uid(), new.status_changed_by);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_service_requests_status on public.service_requests;
create trigger trg_service_requests_status before update on public.service_requests
  for each row execute function public.stamp_service_request_status();

alter table public.service_requests enable row level security;

-- A contractor sees their own company's requests; admins see all.
drop policy if exists service_requests_select on public.service_requests;
create policy service_requests_select on public.service_requests for select
  using (public.is_admin() or contractor_id = public.auth_contractor_id());

-- A contractor may only file a New request for their own company, as themselves.
drop policy if exists service_requests_insert on public.service_requests;
create policy service_requests_insert on public.service_requests for insert
  with check (
    contractor_id = public.auth_contractor_id()
    and requested_by = auth.uid()
    and status = 'new'
    and status_changed_by is null
  );

-- Only admins change status. No one deletes through the API; closing is a status.
drop policy if exists service_requests_update on public.service_requests;
create policy service_requests_update on public.service_requests for update
  using (public.is_admin()) with check (public.is_admin());
