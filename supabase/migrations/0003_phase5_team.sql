-- ============================================================================
-- HomeQuote Network — Phase 5: Team Management
-- ============================================================================
-- Additive migration. Run AFTER 0001 and 0002 (both already applied).
--
-- Adds a richer account status while keeping `is_active` working exactly as
-- before: is_active becomes a DERIVED flag (true only when status = 'active'
-- and not soft-deleted), maintained by a trigger. Every existing RLS helper
-- (is_admin / is_staff / auth_contractor_id) reads is_active and is unchanged.
-- ============================================================================

-- Account status (guarded so the migration is re-runnable).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum (
      'pending', 'active', 'suspended', 'disabled'
    );
  end if;
end $$;

alter table public.profiles
  add column if not exists account_status public.account_status not null default 'pending',
  add column if not exists last_login_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- Backfill existing rows from the old boolean.
update public.profiles
  set account_status = 'active'
  where is_active = true and account_status <> 'active';

-- is_active is now derived from account_status + soft delete.
create or replace function public.sync_profile_active()
returns trigger language plpgsql as $$
begin
  new.is_active := (new.account_status = 'active' and new.deleted_at is null);
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_active on public.profiles;
create trigger trg_profiles_sync_active
  before insert or update on public.profiles
  for each row execute function public.sync_profile_active();

-- Extend the privilege guard: non-admins still cannot change role, and now
-- also cannot change account_status, soft-delete, or contractor link.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.deleted_at is distinct from old.deleted_at
       or new.contractor_id is distinct from old.contractor_id then
      raise exception 'Only an admin can change role, status, or contractor link';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references public.profiles(id) on delete set null,
  action         text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_admin_select on public.audit_logs;
create policy audit_admin_select on public.audit_logs for select
  using (public.is_admin());

drop policy if exists audit_admin_insert on public.audit_logs;
create policy audit_admin_insert on public.audit_logs for insert
  with check (public.is_admin());
