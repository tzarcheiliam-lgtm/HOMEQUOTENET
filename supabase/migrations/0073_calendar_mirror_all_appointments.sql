-- 0073: "Put every appointment on my calendar" for HomeQuote admins.
--
-- Owner: "when an appointment is set for a contractor it makes me a google
-- calendar event, automatically; do this as well for contractor appointments".
-- An admin's own Google connection (calendar_connections.contractor_id null)
-- can mirror EVERY homeowner appointment (all contractors) and EVERY sales
-- meeting with a contractor prospect (prospect_sales_appointments).
--
-- Reuses the 0047 outbox and mapping tables instead of a second pipeline:
--   * calendar_sync_jobs / appointment_calendar_events get a `kind`
--     ('appointment' = public.appointments, 'sales_meeting' =
--     public.prospect_sales_appointments). Existing rows are 'appointment'.
--     The ids of both kinds are random uuids; the unique keys include kind anyway.
--   * enqueue_calendar_sync() (0070 version) is unchanged except for the
--     conflict target; a new trigger queues sales meetings.
-- Idempotent. Applies after 0072.

-- 1. The per-connection setting (on for an admin when they connect; see the OAuth callback).
alter table public.calendar_connections add column if not exists mirror_all_appointments boolean not null default false;
grant select (mirror_all_appointments) on public.calendar_connections to authenticated;
comment on column public.calendar_connections.mirror_all_appointments is
  'Admin-only: also put every homeowner appointment (all contractors) and every sales meeting with a contractor on this calendar.';

-- 2. Kind on the outbox and on the mapping table.
alter table public.calendar_sync_jobs add column if not exists kind text not null default 'appointment';
alter table public.calendar_sync_jobs drop constraint if exists calendar_sync_jobs_kind_check;
alter table public.calendar_sync_jobs add constraint calendar_sync_jobs_kind_check check (kind in ('appointment', 'sales_meeting'));
-- The 0047 index (appointment_id) stays: both kinds' ids are random uuids, and a re-run of an
-- older migration's trigger function (conflict target appointment_id) keeps working.
create unique index if not exists uq_calendar_sync_jobs_pending_kind
  on public.calendar_sync_jobs(kind, appointment_id) where processed_at is null;

alter table public.appointment_calendar_events add column if not exists kind text not null default 'appointment';
alter table public.appointment_calendar_events drop constraint if exists appointment_calendar_events_kind_check;
alter table public.appointment_calendar_events add constraint appointment_calendar_events_kind_check check (kind in ('appointment', 'sales_meeting'));
alter table public.appointment_calendar_events drop constraint if exists appointment_calendar_events_appointment_id_connection_id_key;
create unique index if not exists uq_appointment_calendar_events_kind
  on public.appointment_calendar_events(kind, appointment_id, connection_id);

-- 3. Homeowner appointments: the 0070 trigger function, new conflict target.
create or replace function public.enqueue_calendar_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
  cid uuid;
begin
  begin
    if tg_op = 'DELETE' then
      aid := old.id; cid := public.appointment_contractor_id(old.assignment_id, old.calendar_id);
    else
      aid := new.id; cid := public.appointment_contractor_id(new.assignment_id, new.calendar_id);
    end if;
    insert into public.calendar_sync_jobs (kind, appointment_id, contractor_id)
    values ('appointment', aid, cid)
    on conflict (kind, appointment_id) where processed_at is null
    do update set available_at = now(), attempts = 0, error = null;
  exception when others then
    raise warning 'calendar sync enqueue failed: %', sqlerrm;
  end;
  return null;
end $$;

-- 4. Sales meetings with contractors: queue on every change that shows on the event.
create or replace function public.enqueue_sales_meeting_calendar_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  begin
    sid := case when tg_op = 'DELETE' then old.id else new.id end;
    insert into public.calendar_sync_jobs (kind, appointment_id, contractor_id)
    values ('sales_meeting', sid, null)
    on conflict (kind, appointment_id) where processed_at is null
    do update set available_at = now(), attempts = 0, error = null;
  exception when others then
    raise warning 'sales meeting calendar sync enqueue failed: %', sqlerrm;
  end;
  return null;
end $$;
revoke all on function public.enqueue_sales_meeting_calendar_sync() from public, anon, authenticated;

drop trigger if exists trg_sales_appointments_calendar_sync on public.prospect_sales_appointments;
create trigger trg_sales_appointments_calendar_sync
  after insert or delete or update of scheduled_at, ends_at, status, notes, contact_info, appointment_type, decision_maker_name, prospect_id
  on public.prospect_sales_appointments
  for each row execute function public.enqueue_sales_meeting_calendar_sync();
