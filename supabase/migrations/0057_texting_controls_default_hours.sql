-- In-app controls: the text bot's extra instructions + house sender name, a per-contractor
-- texting switch, and editable default booking hours. All idempotent.

alter table public.sms_settings add column if not exists bot_extra_instructions text;
alter table public.sms_settings add column if not exists house_sender_name text;

-- Per-contractor texting switch. Contractors keep the behaviour they have today:
-- if contractor-funnel texting is already on, existing contractors start enabled.
-- (Only on first run, so re-running never re-enables a contractor you switched off.)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contractors' and column_name = 'texting_enabled'
  ) then
    alter table public.contractors add column texting_enabled boolean not null default false;
    update public.contractors set texting_enabled = true
      where exists (select 1 from public.sms_settings where contractor_funnels_enabled);
  end if;
end $$;

-- Default weekly hours for a contractor who has never set availability (singleton row).
create table if not exists public.availability_defaults (
  id          boolean primary key default true check (id),
  timezone    text not null default 'America/Los_Angeles',
  -- [{ "weekday": 0-6 (0 = Sunday), "startMinute": 0-1439, "endMinute": 1-1440 }]
  rules       jsonb not null default '[
    {"weekday":0,"startMinute":540,"endMinute":1140},
    {"weekday":1,"startMinute":540,"endMinute":1110},
    {"weekday":2,"startMinute":540,"endMinute":1110},
    {"weekday":3,"startMinute":540,"endMinute":1110},
    {"weekday":4,"startMinute":540,"endMinute":1110},
    {"weekday":5,"startMinute":540,"endMinute":900}
  ]'::jsonb,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);
insert into public.availability_defaults (id) values (true) on conflict (id) do nothing;
alter table public.availability_defaults enable row level security;
drop policy if exists availability_defaults_select on public.availability_defaults;
create policy availability_defaults_select on public.availability_defaults for select
  using (public.is_staff() or public.auth_contractor_id() is not null);
drop policy if exists availability_defaults_write on public.availability_defaults;
create policy availability_defaults_write on public.availability_defaults for all
  using (public.is_admin()) with check (public.is_admin());
