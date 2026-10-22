-- Contractor availability + calendar connections / sync.
--
-- Availability is per contractor COMPANY (contractors.id). Owners write it,
-- every user of that company and all internal staff (admin/setter) can read it
-- (setters need it to book). A company with weekly_schedule_enabled = false and
-- no exceptions is treated as unrestricted, so nothing existing changes until a
-- contractor opts in.
--
-- Calendar connections hold encrypted credentials. Authenticated clients get
-- column-level SELECT on the safe columns only (never the token column), and no
-- client write access at all; the server writes with the service role after its
-- own authorization checks.
--
-- Appointment -> calendar sync is an outbox (calendar_sync_jobs) filled by a
-- trigger on appointments, so every path that creates/changes an appointment
-- (app code, funnel RPCs, workflows) is covered. A failure here can never fail
-- the appointment write: the trigger swallows its own errors.
--
-- Deploy order: apply this migration BEFORE deploying the code that reads it.

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------
create table if not exists public.contractor_availability_settings (
  contractor_id             uuid primary key references public.contractors(id) on delete cascade,
  timezone                  text not null default 'America/Los_Angeles',
  -- false => no weekly restriction at all (the schedule rows below are ignored).
  weekly_schedule_enabled   boolean not null default false,
  min_notice_hours          integer not null default 0   check (min_notice_hours between 0 and 720),
  buffer_minutes            integer not null default 0   check (buffer_minutes between 0 and 480),
  max_appointments_per_day  integer                      check (max_appointments_per_day is null or max_appointments_per_day between 1 and 50),
  default_duration_minutes  integer not null default 60  check (default_duration_minutes between 15 and 480),
  updated_by                uuid references public.profiles(id) on delete set null,
  updated_at                timestamptz not null default now()
);
create trigger trg_contractor_availability_settings_updated_at
  before update on public.contractor_availability_settings
  for each row execute function public.set_updated_at();

-- Recurring weekly windows in which the contractor CAN take appointments.
-- weekday: 0 = Sunday .. 6 = Saturday. Minutes are local wall-clock minutes of the day.
create table if not exists public.contractor_availability_rules (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  start_minute  smallint not null check (start_minute between 0 and 1439),
  end_minute    smallint not null check (end_minute between 1 and 1440),
  created_at    timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index if not exists idx_availability_rules_contractor on public.contractor_availability_rules(contractor_id);

-- Date-specific changes. kind 'blocked' = cannot take appointments; 'available' =
-- extra availability on a normally-off day. null minutes = the whole day.
-- repeat_weekly repeats on the weekday of date_start (single day) until repeat_until.
create table if not exists public.contractor_availability_exceptions (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  kind          text not null default 'blocked' check (kind in ('blocked', 'available')),
  date_start    date not null,
  date_end      date not null,
  start_minute  smallint check (start_minute is null or start_minute between 0 and 1439),
  end_minute    smallint check (end_minute is null or end_minute between 1 and 1440),
  note          text check (note is null or length(note) <= 300),
  repeat_weekly boolean not null default false,
  repeat_until  date,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  check (date_end >= date_start),
  check ((start_minute is null) = (end_minute is null)),
  check (start_minute is null or end_minute > start_minute),
  check (not repeat_weekly or date_end = date_start),
  check (repeat_until is null or (repeat_weekly and repeat_until >= date_start))
);
create index if not exists idx_availability_exceptions_contractor
  on public.contractor_availability_exceptions(contractor_id, date_start);

alter table public.contractor_availability_settings enable row level security;
alter table public.contractor_availability_rules enable row level security;
alter table public.contractor_availability_exceptions enable row level security;

-- Read: internal staff, or anyone in that contractor company.
create policy availability_settings_select on public.contractor_availability_settings for select
  using (public.is_staff() or contractor_id = public.auth_contractor_id());
create policy availability_rules_select on public.contractor_availability_rules for select
  using (public.is_staff() or contractor_id = public.auth_contractor_id());
create policy availability_exceptions_select on public.contractor_availability_exceptions for select
  using (public.is_staff() or contractor_id = public.auth_contractor_id());

-- Write: HQN admins, or the owner of that company.
create policy availability_settings_write on public.contractor_availability_settings for all
  using (public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()))
  with check (public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()));
create policy availability_rules_write on public.contractor_availability_rules for all
  using (public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()))
  with check (public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()));
create policy availability_exceptions_write on public.contractor_availability_exceptions for all
  using (public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()))
  with check (public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()));

-- ---------------------------------------------------------------------------
-- Calendar connections (Google OAuth; Apple/CalDAV reserved)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_connections (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  contractor_id         uuid not null references public.contractors(id) on delete cascade,
  provider              text not null check (provider in ('google', 'apple_caldav')),
  account_email         text,
  calendar_id           text not null default 'primary',
  calendar_name         text,
  encrypted_credentials text not null,
  granted_scope         text,
  status                text not null default 'active' check (status in ('active', 'needs_reconnect')),
  -- Send newly assigned / changed / cancelled appointments to this calendar.
  push_appointments     boolean not null default true,
  -- Treat this calendar's busy times as unavailable in HomeQuote.
  import_busy           boolean not null default true,
  last_synced_at        timestamptz,
  last_error            text,
  connected_at          timestamptz not null default now(),
  unique (user_id, provider)
);
create index if not exists idx_calendar_connections_contractor on public.calendar_connections(contractor_id);

alter table public.calendar_connections enable row level security;
create policy calendar_connections_select on public.calendar_connections for select
  using (user_id = auth.uid() or public.is_admin() or (public.is_contractor_owner() and contractor_id = public.auth_contractor_id()));

-- Never let a client read the credentials column; no client writes.
revoke all on public.calendar_connections from anon, authenticated;
grant select (id, user_id, contractor_id, provider, account_email, calendar_id, calendar_name, granted_scope,
              status, push_appointments, import_busy, last_synced_at, last_error, connected_at)
  on public.calendar_connections to authenticated;

-- Which external event represents which appointment on which connection.
-- No FK to appointments on purpose: a deleted appointment must still be able to
-- remove its external events.
create table if not exists public.appointment_calendar_events (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null,
  connection_id     uuid not null references public.calendar_connections(id) on delete cascade,
  external_event_id text not null,
  sequence          integer not null default 0,
  last_error        text,
  updated_at        timestamptz not null default now(),
  unique (appointment_id, connection_id)
);
alter table public.appointment_calendar_events enable row level security;
-- service-role only (no policies)

-- Outbox of appointments needing a calendar sync. Coalesced: at most one pending
-- job per appointment.
create table if not exists public.calendar_sync_jobs (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  contractor_id  uuid,
  attempts       integer not null default 0,
  available_at   timestamptz not null default now(),
  processed_at   timestamptz,
  error          text,
  created_at     timestamptz not null default now()
);
create unique index if not exists uq_calendar_sync_jobs_pending
  on public.calendar_sync_jobs(appointment_id) where processed_at is null;
create index if not exists idx_calendar_sync_jobs_due
  on public.calendar_sync_jobs(available_at) where processed_at is null;
alter table public.calendar_sync_jobs enable row level security;
-- service-role only (no policies)

create or replace function public.enqueue_calendar_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
  asg uuid;
  cid uuid;
begin
  if tg_op = 'DELETE' then aid := old.id; asg := old.assignment_id; else aid := new.id; asg := new.assignment_id; end if;
  begin
    select la.contractor_id into cid from public.lead_assignments la where la.id = asg;
    insert into public.calendar_sync_jobs (appointment_id, contractor_id)
    values (aid, cid)
    on conflict (appointment_id) where processed_at is null
    do update set available_at = now(), attempts = 0, error = null;
  exception when others then
    raise warning 'calendar sync enqueue failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_appointments_calendar_sync on public.appointments;
create trigger trg_appointments_calendar_sync
  after insert or delete or update of scheduled_at, status, location, notes, assignment_id on public.appointments
  for each row execute function public.enqueue_calendar_sync();

create or replace function public.claim_calendar_sync_jobs(p_limit integer default 25)
returns setof public.calendar_sync_jobs language sql security definer set search_path = public as $$
  update calendar_sync_jobs j
     set attempts = attempts + 1, available_at = now() + (interval '2 minutes' * power(2, least(attempts, 5)))
   where j.id in (
     select id from calendar_sync_jobs
      where processed_at is null and attempts < 6 and available_at <= now()
      order by created_at
      for update skip locked
      limit greatest(1, least(p_limit, 100)))
  returning j.* $$;
revoke all on function public.claim_calendar_sync_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_calendar_sync_jobs(integer) to service_role;

create or replace function public.prune_calendar_sync_jobs()
returns void language sql security definer set search_path = public as $$
  delete from calendar_sync_jobs where processed_at is not null and processed_at < now() - interval '14 days' $$;
revoke all on function public.prune_calendar_sync_jobs() from public, anon, authenticated;
grant execute on function public.prune_calendar_sync_jobs() to service_role;

-- ---------------------------------------------------------------------------
-- Private subscribe feed (.ics) per user: an unguessable, revocable token.
-- Service-role only; the feed route looks the token up on the server.
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_feed_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  token         text not null unique check (length(token) >= 32),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create unique index if not exists uq_calendar_feed_one_per_user on public.calendar_feed_tokens(user_id);
alter table public.calendar_feed_tokens enable row level security;
-- service-role only (no policies)

comment on table public.calendar_connections is
  'Per-user external calendar connections. Credentials are AES-256-GCM encrypted by the server; clients can only select safe columns and never write.';
comment on table public.contractor_availability_settings is
  'Per-contractor-company scheduling rules. weekly_schedule_enabled=false means no weekly restriction.';
