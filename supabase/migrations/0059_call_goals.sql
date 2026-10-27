-- =============================================================================
-- 0059 — Daily call goals + calling-workspace settings
--
--   profiles.daily_call_goal      per-person target for the calling HUD (100)
--   call_workspace_settings       single-row switches for the calling
--                                 workspace (today: the opt-in leaderboard)
--
-- The goal is an administrator setting: guard_profile_privileges() is extended
-- so a caller or setter cannot raise or lower their own goal through the API.
-- Idempotent; safe to re-run.
-- =============================================================================

alter table public.profiles
  add column if not exists daily_call_goal integer not null default 100;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_daily_call_goal_range'
  ) then
    alter table public.profiles
      add constraint profiles_daily_call_goal_range
      check (daily_call_goal between 1 and 1000);
  end if;
end $$;

comment on column public.profiles.daily_call_goal is
  'Calls per day the calling HUD counts toward. Set by an administrator.';

-- Same guard as 0017, plus the call goal.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.deleted_at is distinct from old.deleted_at
       or new.contractor_id is distinct from old.contractor_id
       or new.contractor_role is distinct from old.contractor_role
       or new.can_export_company_data is distinct from old.can_export_company_data
       or new.daily_call_goal is distinct from old.daily_call_goal then
      raise exception 'Only an HQN administrator can change account permissions';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- call_workspace_settings — exactly one row (id = true)
-- ---------------------------------------------------------------------------
create table if not exists public.call_workspace_settings (
  id                  boolean primary key default true check (id),
  leaderboard_enabled boolean not null default false,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles(id) on delete set null
);

comment on table public.call_workspace_settings is
  'Single-row switches for the calling workspace. leaderboard_enabled shows callers and setters each other''s daily counts.';

insert into public.call_workspace_settings (id) values (true) on conflict (id) do nothing;

alter table public.call_workspace_settings enable row level security;

drop policy if exists call_settings_select on public.call_workspace_settings;
create policy call_settings_select on public.call_workspace_settings for select
  using (public.is_admin() or public.is_call_agent());

drop policy if exists call_settings_update on public.call_workspace_settings;
create policy call_settings_update on public.call_workspace_settings for update
  using (public.is_admin())
  with check (public.is_admin());
-- No insert/delete policy: the single row is seeded above.
