-- =============================================================================
-- 0068 — HomeQuote-native booking calendars (replaces Calendly for bookings)
--
--   booking_calendars             one bookable calendar: a contractor's own
--                                 (kind 'contractor', one per contractor), the
--                                 HomeQuote project-specialist team ('team') or
--                                 the HomeQuote sales calendar ('sales')
--   booking_calendar_rules        weekly hours (weekday 0 = Sunday, local minutes)
--   booking_calendar_exceptions   blocked / extra-available dates
--   booking_calendar_members      the hosts of a calendar (notified + synced)
--
-- Why separate rules instead of reusing contractor_availability_* (0047): those
-- describe when a contractor can take ON-SITE appointments that staff book (no
-- schedule = unrestricted, 60-min default, Sun–Fri default hours), are keyed by
-- contractor only, and are already live in production with contractors' own
-- choices. A booking calendar is a 30-minute VIRTUAL call offered to homeowners
-- and contractor prospects, exists for HomeQuote's own team and sales desk too
-- (no contractor), and must be re-checked inside one SQL transaction. One rule
-- shape for every kind keeps that check in one place. (A contractor calendar
-- still treats that contractor's existing on-site appointments as busy time.)
--
-- appointments (homeowner) gain calendar_id/ends_at/source/contact snapshot/
-- manage token/cancel/reminder columns, and assignment_id becomes NULLABLE so a
-- call on the HomeQuote team calendar can exist before any contractor is
-- matched (lead_id is the anchor then). prospect_sales_appointments gain the
-- same booking columns. Everything is additive; existing rows keep working.
--
-- RPCs (security definer, service_role only): book_appointment,
-- reschedule_appointment, cancel_appointment, book_sales_appointment,
-- reschedule_sales_appointment, cancel_sales_appointment, booking_slot_problem,
-- booking_calendar_busy, ensure_contractor_booking_calendar,
-- claim_booking_reminders. Every booking re-checks hours / exceptions / other
-- appointments (+ buffer) / notice / horizon / daily cap under a per-calendar
-- pg_advisory_xact_lock, so two visitors can never take the same slot.
--
-- Defaults (owner's decision, 2026-10-29): Mon–Fri 9:00–17:00
-- America/Los_Angeles, 30-minute calls, 15-minute buffer, 2 h notice, 14-day
-- horizon, no daily cap. Seeds: "HomeQuote team", "HomeQuote sales", and Pool
-- Masters' contractor calendar (looked up, skipped if absent).
--
-- Homeowners never get table access: public pages go through server routes that
-- use the service role, gated by the funnel session token or the manage token
-- (only its SHA-256 is stored). Idempotent where practical; deploy order: apply
-- this migration BEFORE deploying code that calls these RPCs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Calendars, rules, exceptions, members
-- ---------------------------------------------------------------------------
create or replace function public.booking_valid_timezone(p_tz text)
returns boolean language sql stable set search_path = public as $$
  select p_tz is not null and exists (select 1 from pg_timezone_names where name = p_tz)
$$;
-- The timezone check constraint runs it as whoever writes the calendar (admins / contractor owners).
revoke all on function public.booking_valid_timezone(text) from public, anon;
grant execute on function public.booking_valid_timezone(text) to authenticated, service_role;

create table if not exists public.booking_calendars (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('contractor', 'team', 'sales')),
  contractor_id      uuid references public.contractors(id) on delete cascade,
  name               text not null check (length(trim(name)) between 1 and 120),
  timezone           text not null default 'America/Los_Angeles' check (public.booking_valid_timezone(timezone)),
  duration_minutes   integer not null default 30  check (duration_minutes between 10 and 240),
  -- Start times are offered on this step (local wall clock).
  slot_step_minutes  integer not null default 30  check (slot_step_minutes between 5 and 240),
  buffer_minutes     integer not null default 15  check (buffer_minutes between 0 and 240),
  min_notice_minutes integer not null default 120 check (min_notice_minutes between 0 and 43200),
  horizon_days       integer not null default 14  check (horizon_days between 1 and 120),
  max_per_day        integer check (max_per_day is null or max_per_day between 1 and 100),
  meeting_type       text not null default 'phone' check (meeting_type in ('phone', 'video')),
  video_link         text check (video_link is null or (video_link ~ '^https://' and length(video_link) <= 500)),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint booking_calendars_contractor_kind check ((kind = 'contractor') = (contractor_id is not null))
);
comment on table public.booking_calendars is
  'HomeQuote-native bookable calendars (virtual calls). kind contractor = one per contractor; team = HomeQuote project specialists (network funnels); sales = HomeQuote sales desk (contractor sales funnel).';
create unique index if not exists uq_booking_calendars_contractor on public.booking_calendars(contractor_id) where kind = 'contractor';
-- One team and one sales calendar for now (drop this index to allow several).
create unique index if not exists uq_booking_calendars_singleton on public.booking_calendars(kind) where kind in ('team', 'sales');
drop trigger if exists trg_booking_calendars_updated_at on public.booking_calendars;
create trigger trg_booking_calendars_updated_at before update on public.booking_calendars
  for each row execute function public.set_updated_at();

create table if not exists public.booking_calendar_rules (
  id           uuid primary key default gen_random_uuid(),
  calendar_id  uuid not null references public.booking_calendars(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute   smallint not null check (end_minute between 1 and 1440),
  created_at   timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index if not exists idx_booking_calendar_rules_calendar on public.booking_calendar_rules(calendar_id, weekday);

-- Same shape as contractor_availability_exceptions: 'blocked' = no bookings,
-- 'available' = extra hours; null minutes = whole day; repeat_weekly repeats
-- the weekday of date_start until repeat_until.
create table if not exists public.booking_calendar_exceptions (
  id            uuid primary key default gen_random_uuid(),
  calendar_id   uuid not null references public.booking_calendars(id) on delete cascade,
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
create index if not exists idx_booking_calendar_exceptions_calendar on public.booking_calendar_exceptions(calendar_id, date_start);

-- Hosts: who is notified (push/email) and whose connected Google calendar is
-- synced / read for busy time.
create table if not exists public.booking_calendar_members (
  calendar_id uuid not null references public.booking_calendars(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  notify      boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (calendar_id, user_id)
);
create index if not exists idx_booking_calendar_members_user on public.booking_calendar_members(user_id);

-- Access helpers (security definer: no recursive policy evaluation).
create or replace function public.owns_booking_calendar(p_calendar uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_calendar is not null and exists (
    select 1 from public.booking_calendars c
     where c.id = p_calendar and c.kind = 'contractor' and c.contractor_id = public.auth_contractor_id())
$$;
create or replace function public.can_view_booking_calendar(p_calendar uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or public.owns_booking_calendar(p_calendar)
$$;
create or replace function public.can_manage_booking_calendar(p_calendar uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.is_contractor_owner() and public.owns_booking_calendar(p_calendar))
$$;
-- Who may host a calendar (receives every booking's contact details): an active
-- user of that contractor company for a contractor calendar; an active HomeQuote
-- admin or setter for the team / sales calendars.
create or replace function public.eligible_booking_calendar_host(p_calendar uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.booking_calendars c join public.profiles p on p.id = p_user
     where c.id = p_calendar and p.is_active
       and case when c.kind = 'contractor' then p.role = 'contractor' and p.contractor_id = c.contractor_id
                else p.role in ('admin', 'setter') end)
$$;
-- Only the RLS policies and the server need these. owns_booking_calendar stays
-- callable by anon because the appointments policies use it (it is false for anon,
-- so anon still reads nothing); the others guard tables anon has no grant on.
revoke all on function public.owns_booking_calendar(uuid), public.can_view_booking_calendar(uuid),
  public.can_manage_booking_calendar(uuid), public.eligible_booking_calendar_host(uuid, uuid) from public, anon;
grant execute on function public.can_view_booking_calendar(uuid), public.can_manage_booking_calendar(uuid),
  public.eligible_booking_calendar_host(uuid, uuid) to authenticated, service_role;
grant execute on function public.owns_booking_calendar(uuid) to anon, authenticated, service_role;

alter table public.booking_calendars enable row level security;
alter table public.booking_calendar_rules enable row level security;
alter table public.booking_calendar_exceptions enable row level security;
alter table public.booking_calendar_members enable row level security;
revoke all on public.booking_calendars, public.booking_calendar_rules, public.booking_calendar_exceptions,
  public.booking_calendar_members from anon;

-- Calendars: staff read all; a contractor company reads its own. Admins create /
-- delete; a contractor owner may edit their own calendar's settings.
drop policy if exists booking_calendars_select on public.booking_calendars;
create policy booking_calendars_select on public.booking_calendars for select
  using (public.is_staff() or (kind = 'contractor' and contractor_id = public.auth_contractor_id()));
drop policy if exists booking_calendars_insert on public.booking_calendars;
create policy booking_calendars_insert on public.booking_calendars for insert with check (public.is_admin());
drop policy if exists booking_calendars_update on public.booking_calendars;
create policy booking_calendars_update on public.booking_calendars for update
  using (public.is_admin() or (public.is_contractor_owner() and kind = 'contractor' and contractor_id = public.auth_contractor_id()))
  with check (public.is_admin() or (public.is_contractor_owner() and kind = 'contractor' and contractor_id = public.auth_contractor_id()));
drop policy if exists booking_calendars_delete on public.booking_calendars;
create policy booking_calendars_delete on public.booking_calendars for delete using (public.is_admin());

drop policy if exists booking_calendar_rules_select on public.booking_calendar_rules;
create policy booking_calendar_rules_select on public.booking_calendar_rules for select using (public.can_view_booking_calendar(calendar_id));
drop policy if exists booking_calendar_rules_write on public.booking_calendar_rules;
create policy booking_calendar_rules_write on public.booking_calendar_rules for all
  using (public.can_manage_booking_calendar(calendar_id)) with check (public.can_manage_booking_calendar(calendar_id));

drop policy if exists booking_calendar_exceptions_select on public.booking_calendar_exceptions;
create policy booking_calendar_exceptions_select on public.booking_calendar_exceptions for select using (public.can_view_booking_calendar(calendar_id));
drop policy if exists booking_calendar_exceptions_write on public.booking_calendar_exceptions;
create policy booking_calendar_exceptions_write on public.booking_calendar_exceptions for all
  using (public.can_manage_booking_calendar(calendar_id)) with check (public.can_manage_booking_calendar(calendar_id));

drop policy if exists booking_calendar_members_select on public.booking_calendar_members;
create policy booking_calendar_members_select on public.booking_calendar_members for select using (public.can_view_booking_calendar(calendar_id));
drop policy if exists booking_calendar_members_write on public.booking_calendar_members;
create policy booking_calendar_members_write on public.booking_calendar_members for all
  using (public.can_manage_booking_calendar(calendar_id))
  with check (public.can_manage_booking_calendar(calendar_id) and public.eligible_booking_calendar_host(calendar_id, user_id));

-- Staff (team / sales hosts) may connect Google too: a connection no longer
-- has to belong to a contractor company. Existing rows are unchanged.
alter table public.calendar_connections alter column contractor_id drop not null;

-- ---------------------------------------------------------------------------
-- 2. appointments (homeowner): booking columns, nullable assignment
-- ---------------------------------------------------------------------------
alter table public.appointments alter column assignment_id drop not null;
alter table public.appointments add column if not exists lead_id uuid references public.leads(id) on delete cascade;
alter table public.appointments add column if not exists calendar_id uuid references public.booking_calendars(id) on delete set null;
alter table public.appointments add column if not exists ends_at timestamptz;
-- The calendar's zone at booking time (hosts see times in it).
alter table public.appointments add column if not exists time_zone text;
-- The homeowner's browser zone, for their confirmations / manage page.
alter table public.appointments add column if not exists invitee_time_zone text;
alter table public.appointments add column if not exists source text;
alter table public.appointments add column if not exists meeting_type text;
-- Contact snapshot at booking time (team bookings have no assignment to read it from).
alter table public.appointments add column if not exists contact_name text;
alter table public.appointments add column if not exists contact_phone text;
alter table public.appointments add column if not exists contact_email text;
-- SHA-256 (hex) of the homeowner's self-service link token. The token itself is never stored.
alter table public.appointments add column if not exists manage_token_hash text;
alter table public.appointments add column if not exists cancelled_at timestamptz;
alter table public.appointments add column if not exists cancel_reason text;
alter table public.appointments add column if not exists rescheduled_from_id uuid references public.appointments(id) on delete set null;
alter table public.appointments add column if not exists reschedule_count integer not null default 0;
-- When the booking confirmation went out (null again after a reschedule).
alter table public.appointments add column if not exists confirmed_at timestamptz;
alter table public.appointments add column if not exists reminder_24h_sent_at timestamptz;
alter table public.appointments add column if not exists reminder_1h_sent_at timestamptz;
-- When the homeowner's cancellation notice was claimed (sent at most once).
alter table public.appointments add column if not exists cancel_notified_at timestamptz;

alter table public.appointments drop constraint if exists appointments_source_check;
alter table public.appointments add constraint appointments_source_check
  check (source is null or source in ('funnel', 'estimator', 'manual', 'sales_funnel', 'ai', 'workflow'));
alter table public.appointments drop constraint if exists appointments_meeting_type_check;
alter table public.appointments add constraint appointments_meeting_type_check
  check (meeting_type is null or meeting_type in ('phone', 'video', 'in_person'));
alter table public.appointments drop constraint if exists appointments_manage_token_hash_check;
alter table public.appointments add constraint appointments_manage_token_hash_check
  check (manage_token_hash is null or manage_token_hash ~ '^[0-9a-f]{64}$');
alter table public.appointments drop constraint if exists appointments_cancel_reason_check;
alter table public.appointments add constraint appointments_cancel_reason_check
  check (cancel_reason is null or length(cancel_reason) <= 500);
alter table public.appointments drop constraint if exists appointments_ends_after_start;
alter table public.appointments add constraint appointments_ends_after_start
  check (ends_at is null or scheduled_at is null or ends_at > scheduled_at);
alter table public.appointments drop constraint if exists appointments_has_owner;
alter table public.appointments add constraint appointments_has_owner
  check (assignment_id is not null or lead_id is not null);
-- 'website' = the homeowner booked it themselves on a HomeQuote page (native calendar).
alter table public.appointments drop constraint if exists appointments_booked_via_check;
alter table public.appointments add constraint appointments_booked_via_check
  check (booked_via is null or booked_via in ('phone_call', 'email', 'chat', 'in_person', 'other', 'website'));

-- Backfill without touching updated_at (ICS feeds, Google sync and cursors read it):
-- the only trigger that fires on a lead_id-only update is set_updated_at.
alter table public.appointments disable trigger trg_appointments_updated_at;
update public.appointments ap set lead_id = la.lead_id
  from public.lead_assignments la where la.id = ap.assignment_id and ap.lead_id is null;
alter table public.appointments enable trigger trg_appointments_updated_at;

create unique index if not exists uq_appointments_manage_token on public.appointments(manage_token_hash) where manage_token_hash is not null;
create index if not exists idx_appointments_lead on public.appointments(lead_id);
create index if not exists idx_appointments_calendar on public.appointments(calendar_id, scheduled_at) where calendar_id is not null;
-- Backstop behind the advisory lock: one live booking per calendar start time.
create unique index if not exists uq_appointments_calendar_start on public.appointments(calendar_id, scheduled_at)
  where calendar_id is not null and status = 'scheduled';

-- lead_id always follows the assignment when there is one (every existing
-- insert path keeps working without knowing about lead_id).
create or replace function public.appointments_fill_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lead uuid;
begin
  if new.assignment_id is not null then
    select lead_id into v_lead from public.lead_assignments where id = new.assignment_id;
    if new.lead_id is not null and v_lead is not null and new.lead_id <> v_lead then
      raise exception 'Appointment lead does not match its assignment' using errcode = '23514';
    end if;
    new.lead_id := coalesce(v_lead, new.lead_id);
  end if;
  return new;
end $$;
drop trigger if exists trg_appointments_fill_lead on public.appointments;
create trigger trg_appointments_fill_lead before insert or update of assignment_id, lead_id on public.appointments
  for each row execute function public.appointments_fill_lead();

-- The contractor an appointment belongs to: its assignment's, else its contractor calendar's.
create or replace function public.appointment_contractor_id(p_assignment uuid, p_calendar uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select contractor_id from public.lead_assignments where id = p_assignment),
    (select contractor_id from public.booking_calendars where id = p_calendar and kind = 'contractor'))
$$;
-- Used only inside security-definer triggers / RPCs: not callable through the API.
revoke all on function public.appointment_contractor_id(uuid, uuid) from public, anon, authenticated;
grant execute on function public.appointment_contractor_id(uuid, uuid) to service_role;

-- RLS: staff see all; a contractor sees rows whose assignment they own OR that
-- sit on their own contractor calendar (never team / sales / another company's).
-- Homeowners have no access at all. Contractors may write only rows that stay
-- inside their company; delete stays admin-only (0017).
create or replace function public.contractor_may_write_appointment(p_assignment uuid, p_calendar uuid, p_lead uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (p_assignment is null or public.owns_assignment(p_assignment))
     and (p_calendar is null or public.owns_booking_calendar(p_calendar))
     and (p_assignment is not null or (p_calendar is not null and p_lead is not null and public.lead_assigned_to_me(p_lead)))
$$;
revoke all on function public.contractor_may_write_appointment(uuid, uuid, uuid) from public;
grant execute on function public.contractor_may_write_appointment(uuid, uuid, uuid) to anon, authenticated, service_role;
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select
  using (public.is_staff() or public.owns_assignment(assignment_id) or public.owns_booking_calendar(calendar_id));
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert
  with check (public.is_staff() or public.contractor_may_write_appointment(assignment_id, calendar_id, lead_id));
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update
  using (public.is_staff() or public.owns_assignment(assignment_id) or public.owns_booking_calendar(calendar_id))
  with check (public.is_staff() or public.contractor_may_write_appointment(assignment_id, calendar_id, lead_id));

-- ---------------------------------------------------------------------------
-- 3. Existing appointment triggers: work without an assignment
--    (lead from appointments.lead_id, contractor from the contractor calendar)
-- ---------------------------------------------------------------------------
-- 0041's emitter, unchanged except: lead/contractor fall back as above, and the
-- payload also carries calendarId / source / endsAt.
create or replace function public.emit_appointment_workflow_events() returns trigger language plpgsql security definer set search_path=public as $$
declare a lead_assignments;typ text;actor text:=workflow_actor_type();cause uuid:=workflow_context_uuid('app.workflow_causation_id');corr uuid:=workflow_context_uuid('app.workflow_correlation_id');micros text;booking_provider text;booking_external text;
 v_lead uuid; v_contractor uuid; extra jsonb;
begin select * into a from lead_assignments where id=new.assignment_id;
 v_lead := coalesce(a.lead_id, new.lead_id);
 v_contractor := coalesce(a.contractor_id, (select contractor_id from booking_calendars where id=new.calendar_id and kind='contractor'));
 extra := jsonb_strip_nulls(jsonb_build_object('calendarId',new.calendar_id,'source',new.source,'endsAt',new.ends_at));
 if tg_op='INSERT' then
  select fb.provider,fb.external_id into booking_provider,booking_external from funnel_bookings fb
   join funnel_sessions fs on fs.id=fb.session_id join funnels f on f.id=fs.funnel_id
   where fb.appointment_id is null and fs.lead_id=v_lead and f.contractor_id=v_contractor
    and fb.scheduled_at is not distinct from new.scheduled_at order by fb.id limit 1;
  perform emit_workflow_event('appointment.booked','appointment.booked|'||case when booking_external is null then 'appointment:'||new.id else 'booking:'||coalesce(booking_provider,'integration')||':'||booking_external end,'appointment',new.id,'db:appointments',new.created_at,v_contractor,v_lead,actor,
  case when actor='workflow' then null else new.created_by end,jsonb_build_object('leadId',v_lead,'assignmentId',a.id,'contractorId',v_contractor,'appointmentId',new.id,'scheduledAt',new.scheduled_at)||extra,'{}',corr,cause);return new;end if;
 if new.scheduled_at is distinct from old.scheduled_at and old.scheduled_at is not null and new.scheduled_at is not null
    and new.status in ('scheduled','rescheduled') then
  perform emit_workflow_event('appointment.rescheduled','appointment.rescheduled|appointment:'||new.id||':rescheduled:'||((extract(epoch from new.scheduled_at)*1000000)::bigint)::text,'appointment',new.id,'db:appointments',new.updated_at,v_contractor,v_lead,actor,null,
   jsonb_build_object('leadId',v_lead,'assignmentId',a.id,'contractorId',v_contractor,'appointmentId',new.id,'scheduledAt',new.scheduled_at,'previousScheduledAt',old.scheduled_at)||extra,'{}',corr,cause);
 end if;
 if new.status is not distinct from old.status then return new;end if;typ:=case new.status when 'cancelled' then 'appointment.cancelled' when 'held' then 'appointment.completed' when 'no_show' then 'appointment.no_show' end;if typ is null then return new;end if;
 micros:=((extract(epoch from new.updated_at)*1000000)::bigint)::text;perform emit_workflow_event(typ,typ||'|appointment:'||new.id||':status:'||new.status||':'||micros,'appointment',new.id,'db:appointments',new.updated_at,v_contractor,v_lead,actor,null,
 jsonb_build_object('leadId',v_lead,'assignmentId',a.id,'contractorId',v_contractor,'appointmentId',new.id,'scheduledAt',new.scheduled_at,'fromStatus',old.status,'toStatus',new.status)||extra,'{}',corr,cause);return new;end $$;
-- (trigger trg_appointments_workflow_events from 0041 is unchanged)

-- 0031 producer 2 (time moved -> push), with the same fallbacks.
create or replace function public.enqueue_appointment_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lead uuid; v_contractor uuid;
begin
  if old.scheduled_at is null or new.scheduled_at is null
     or new.scheduled_at = old.scheduled_at or new.status = 'cancelled' then
    return new;
  end if;
  begin
    v_lead := coalesce((select lead_id from lead_assignments where id = new.assignment_id), new.lead_id);
    v_contractor := public.appointment_contractor_id(new.assignment_id, new.calendar_id);
    insert into notification_events (type, entity_type, entity_id, lead_id, contractor_id, payload, dedupe_key)
    values ('appointment_changed', 'appointment', new.id, v_lead, v_contractor,
      jsonb_build_object('leadId', v_lead, 'assignmentId', new.assignment_id, 'contractorId', v_contractor,
        'appointmentId', new.id, 'scheduledAt', new.scheduled_at, 'previousScheduledAt', old.scheduled_at)
        || jsonb_strip_nulls(jsonb_build_object('calendarId', new.calendar_id)),
      'appt-changed:' || new.id || ':' || ((extract(epoch from new.updated_at) * 1000000)::bigint)::text)
    on conflict (dedupe_key) do nothing;
  exception when others then
    raise warning 'notification enqueue failed: %', sqlerrm;
  end;
  return new;
end $$;

-- 0042 outcome ledger: a team-calendar booking (no assignment yet) is still a
-- booking for the lead (network level, contractor_id null).
create or replace function public.ledger_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record; v_outcome text; v_lead uuid; v_contractor uuid;
begin
  select la.lead_id, la.contractor_id, la.id as assignment_id into a from public.lead_assignments la where la.id = new.assignment_id;
  v_lead := coalesce(a.lead_id, new.lead_id);
  v_contractor := coalesce(a.contractor_id, (select contractor_id from public.booking_calendars where id = new.calendar_id and kind = 'contractor'));
  if v_lead is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.status::text in ('scheduled', 'rescheduled', 'held') then
      insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, occurred_at, actor_id, actor_kind, appointment_id)
      values (v_lead, a.assignment_id, v_contractor, 'appointment_booked', new.created_at, coalesce(new.created_by, auth.uid()),
              case when coalesce(new.created_by, auth.uid()) is null then 'system' else 'user' end, new.id)
      on conflict do nothing;
    end if;
  elsif new.status is distinct from old.status then
    v_outcome := case new.status::text when 'held' then 'appointment_held' when 'no_show' then 'appointment_no_show'
                 when 'cancelled' then 'appointment_cancelled' else null end;
    if v_outcome is not null then
      insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, occurred_at, actor_id, actor_kind, appointment_id)
      values (v_lead, a.assignment_id, v_contractor, v_outcome, now(), auth.uid(),
              case when auth.uid() is null then 'system' else 'user' end, new.id);
    end if;
  end if;
  return new;
end;
$$;

-- 0047 calendar-sync outbox: contractor from the assignment or the contractor
-- calendar (null for team calendars; the worker resolves hosts from calendar_id).
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
  after insert or delete or update of scheduled_at, ends_at, status, location, notes, assignment_id, calendar_id on public.appointments
  for each row execute function public.enqueue_calendar_sync();

-- When a lead is assigned to a contractor, a call the homeowner already booked
-- on THAT contractor's calendar becomes part of the assignment (team-calendar
-- calls stay HomeQuote's and are not attached).
create or replace function public.attach_calendar_appointments_to_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.appointments ap set assignment_id = new.id
   where ap.assignment_id is null and ap.lead_id = new.lead_id
     and ap.calendar_id in (select id from public.booking_calendars where kind = 'contractor' and contractor_id = new.contractor_id);
  get diagnostics n = row_count;
  if n > 0 then
    update public.lead_assignments set status = 'appointment_set'
     where id = new.id and status in ('assigned', 'accepted', 'contacted')
       and exists (select 1 from public.appointments where assignment_id = new.id and status = 'scheduled');
  end if;
  return null;
end $$;
drop trigger if exists trg_assignments_attach_calendar_appointments on public.lead_assignments;
create trigger trg_assignments_attach_calendar_appointments after insert on public.lead_assignments
  for each row execute function public.attach_calendar_appointments_to_assignment();

-- ---------------------------------------------------------------------------
-- 4. prospect_sales_appointments: booking columns (sales calendar)
-- ---------------------------------------------------------------------------
alter table public.prospect_sales_appointments add column if not exists calendar_id uuid references public.booking_calendars(id) on delete set null;
alter table public.prospect_sales_appointments add column if not exists ends_at timestamptz;
alter table public.prospect_sales_appointments add column if not exists source text;
alter table public.prospect_sales_appointments add column if not exists manage_token_hash text;
alter table public.prospect_sales_appointments add column if not exists cancelled_at timestamptz;
alter table public.prospect_sales_appointments add column if not exists cancel_reason text;
alter table public.prospect_sales_appointments add column if not exists reschedule_count integer not null default 0;
alter table public.prospect_sales_appointments add column if not exists booking_confirmed_at timestamptz;
alter table public.prospect_sales_appointments add column if not exists reminder_24h_sent_at timestamptz;
alter table public.prospect_sales_appointments add column if not exists reminder_1h_sent_at timestamptz;
alter table public.prospect_sales_appointments add column if not exists cancel_notified_at timestamptz;
alter table public.prospect_sales_appointments drop constraint if exists sales_appointments_source_check;
alter table public.prospect_sales_appointments add constraint sales_appointments_source_check
  check (source is null or source in ('sales_funnel', 'manual', 'ai', 'workflow'));
alter table public.prospect_sales_appointments drop constraint if exists sales_appointments_manage_token_hash_check;
alter table public.prospect_sales_appointments add constraint sales_appointments_manage_token_hash_check
  check (manage_token_hash is null or manage_token_hash ~ '^[0-9a-f]{64}$');
alter table public.prospect_sales_appointments drop constraint if exists sales_appointments_cancel_reason_check;
alter table public.prospect_sales_appointments add constraint sales_appointments_cancel_reason_check
  check (cancel_reason is null or length(cancel_reason) <= 500);
create unique index if not exists uq_sales_appointments_manage_token on public.prospect_sales_appointments(manage_token_hash) where manage_token_hash is not null;
create unique index if not exists uq_sales_appointments_calendar_start on public.prospect_sales_appointments(calendar_id, scheduled_at)
  where calendar_id is not null and status in ('scheduled', 'confirmed', 'rescheduled');

alter table public.contractor_funnel_submissions add column if not exists sales_appointment_id uuid
  references public.prospect_sales_appointments(id) on delete set null;
alter table public.contractor_funnel_submissions drop constraint if exists contractor_funnel_submissions_booking_status_check;
alter table public.contractor_funnel_submissions add constraint contractor_funnel_submissions_booking_status_check
  check (booking_status in ('none', 'reported', 'confirmed', 'cancelled'));

-- ---------------------------------------------------------------------------
-- 5. Availability engine (SQL side; lib/booking/slots.ts mirrors it)
-- ---------------------------------------------------------------------------
create or replace function public.booking_exception_applies(p_start date, p_end date, p_repeat boolean, p_until date, p_date date)
returns boolean language sql immutable as $$
  select (p_date between p_start and p_end)
      or (p_repeat and p_date > p_start and (p_until is null or p_date <= p_until)
          and extract(dow from p_date) = extract(dow from p_start))
$$;
revoke all on function public.booking_exception_applies(date, date, boolean, date, date) from public, anon;
grant execute on function public.booking_exception_applies(date, date, boolean, date, date) to authenticated, service_role;

-- Busy time on a calendar: its live bookings; for a contractor calendar also
-- that contractor's other live appointments (on-site visits booked by staff);
-- for the sales calendar every open sales meeting on it or on no calendar (the
-- meetings setters book by hand go to the same sales desk).
create or replace function public.booking_busy_rows(p_calendar uuid, p_from timestamptz, p_to timestamptz,
  p_exclude uuid default null)
returns table(kind text, id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  with c as (select * from public.booking_calendars where booking_calendars.id = p_calendar),
  legacy as (select coalesce((select s.default_duration_minutes from public.contractor_availability_settings s, c
                                where s.contractor_id = c.contractor_id), 60) as mins)
  select 'appointment'::text, ap.id, ap.scheduled_at,
         coalesce(ap.ends_at, ap.scheduled_at + make_interval(mins => case when ap.calendar_id = c.id then c.duration_minutes else (select mins from legacy) end))
    from c join public.appointments ap
      on ap.calendar_id = c.id
      or (c.kind = 'contractor' and (ap.calendar_id is null or ap.calendar_id <> c.id)
          and exists (select 1 from public.lead_assignments la where la.id = ap.assignment_id and la.contractor_id = c.contractor_id))
   where c.kind <> 'sales' and ap.scheduled_at is not null
     and ap.status not in ('cancelled', 'rescheduled', 'no_show')
     and (p_exclude is null or ap.id <> p_exclude)
     and ap.scheduled_at < p_to and ap.scheduled_at > p_from - interval '1 day'
  union all
  select 'sales_appointment'::text, sa.id, sa.scheduled_at, coalesce(sa.ends_at, sa.scheduled_at + make_interval(mins => c.duration_minutes))
    from c join public.prospect_sales_appointments sa on sa.calendar_id = c.id or sa.calendar_id is null
   where c.kind = 'sales' and sa.status in ('scheduled', 'confirmed', 'rescheduled')
     and (p_exclude is null or sa.id <> p_exclude)
     and sa.scheduled_at < p_to and sa.scheduled_at > p_from - interval '1 day'
$$;
revoke all on function public.booking_busy_rows(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.booking_busy_rows(uuid, timestamptz, timestamptz, uuid) to service_role;

-- The same rows as a JSON array (what the slot picker reads through PostgREST).
create or replace function public.booking_calendar_busy(p_calendar uuid, p_from timestamptz, p_to timestamptz,
  p_exclude uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', b.kind, 'id', b.id, 'starts_at', b.starts_at, 'ends_at', b.ends_at)
                  order by b.starts_at), '[]'::jsonb)
    from public.booking_busy_rows(p_calendar, p_from, p_to, p_exclude) b
   where b.ends_at > p_from
$$;
revoke all on function public.booking_calendar_busy(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.booking_calendar_busy(uuid, timestamptz, timestamptz, uuid) to service_role;

-- Why [p_start, p_end) cannot be booked on the calendar, or null if it can.
-- Codes: calendar_not_found, calendar_inactive, invalid_time, too_soon, too_far,
-- blocked_time, outside_hours, slot_taken, daily_cap. p_override (staff "book
-- anyway") skips everything except a real overlap with another booking.
-- A slot must sit inside one local day; wall-clock minutes come from the
-- calendar's zone, so DST changes are handled by Postgres' tz database.
create or replace function public.booking_slot_problem(p_calendar uuid, p_start timestamptz, p_end timestamptz,
  p_exclude uuid default null, p_override boolean default false)
returns text language plpgsql stable security definer set search_path = public as $$
declare c public.booking_calendars; ls timestamp; le timestamp; d date; smin integer; emin integer; wd integer; buf interval;
begin
  select * into c from public.booking_calendars where id = p_calendar;
  if not found then return 'calendar_not_found'; end if;
  if not c.active then return 'calendar_inactive'; end if;
  if p_start is null or p_end is null or p_end <= p_start or p_end - p_start > interval '8 hours' then return 'invalid_time'; end if;

  if not p_override then
    if p_start < now() + make_interval(mins => c.min_notice_minutes) then return 'too_soon'; end if;
    if p_start > now() + make_interval(days => c.horizon_days) then return 'too_far'; end if;

    ls := p_start at time zone c.timezone;
    le := p_end at time zone c.timezone;
    d := ls::date;
    smin := extract(hour from ls)::integer * 60 + extract(minute from ls)::integer;
    emin := extract(hour from le)::integer * 60 + extract(minute from le)::integer;
    if le::date = d + 1 and emin = 0 then emin := 1440;
    elsif le::date <> d then return 'outside_hours';
    end if;
    wd := extract(dow from d)::integer;

    if exists (select 1 from public.booking_calendar_exceptions e
                where e.calendar_id = c.id and e.kind = 'blocked'
                  and public.booking_exception_applies(e.date_start, e.date_end, e.repeat_weekly, e.repeat_until, d)
                  and (e.start_minute is null or (e.start_minute < emin and smin < e.end_minute))) then
      return 'blocked_time';
    end if;

    -- Every minute of the slot must be inside a weekly window or an extra-available exception (union of windows).
    if exists (select 1 from generate_series(smin, emin - 1) m
                where not exists (select 1 from public.booking_calendar_rules r
                                   where r.calendar_id = c.id and r.weekday = wd and r.start_minute <= m and r.end_minute > m)
                  and not exists (select 1 from public.booking_calendar_exceptions e
                                   where e.calendar_id = c.id and e.kind = 'available'
                                     and public.booking_exception_applies(e.date_start, e.date_end, e.repeat_weekly, e.repeat_until, d)
                                     and (e.start_minute is null or (e.start_minute <= m and e.end_minute > m)))) then
      return 'outside_hours';
    end if;
    -- Starts sit on the calendar's grid (9:00, 9:30, … local), whole minutes only.
    if extract(second from ls) <> 0 or smin % greatest(5, c.slot_step_minutes) <> 0 then return 'invalid_time'; end if;
  end if;

  buf := make_interval(mins => case when p_override then 0 else c.buffer_minutes end);
  if exists (select 1 from public.booking_busy_rows(c.id, p_start - buf - interval '1 day', p_end + buf + interval '1 day', p_exclude) b
              where b.starts_at < p_end + buf and p_start < b.ends_at + buf) then
    return 'slot_taken';
  end if;

  if not p_override and c.max_per_day is not null then
    if (select count(*) from public.booking_busy_rows(c.id, p_start - interval '2 days', p_end + interval '2 days', p_exclude) b
         where (b.starts_at at time zone c.timezone)::date = d) >= c.max_per_day then
      return 'daily_cap';
    end if;
  end if;
  return null;
end $$;
revoke all on function public.booking_slot_problem(uuid, timestamptz, timestamptz, uuid, boolean) from public, anon, authenticated;
grant execute on function public.booking_slot_problem(uuid, timestamptz, timestamptz, uuid, boolean) to service_role;

create or replace function public.booking_lock_calendar(p_calendar uuid)
returns void language sql security definer set search_path = public as $$
  select pg_advisory_xact_lock(hashtextextended('booking_calendar:' || p_calendar::text, 0))
$$;
revoke all on function public.booking_lock_calendar(uuid) from public, anon, authenticated;
grant execute on function public.booking_lock_calendar(uuid) to service_role;

-- Every write path, not only the RPCs: a row that lands on (or moves within) a
-- booking calendar takes the same per-calendar lock and may not overlap another
-- live booking there (staff "book anyway" never allows that either). Direct
-- PostgREST updates, the lead page and status undos (held -> scheduled) are
-- covered too. Sales meetings setters add by hand (no calendar) take the sales
-- calendar's lock, so a funnel booking's re-check always sees them.
create or replace function public.booking_guard_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_end timestamptz;
begin
  if new.calendar_id is null or new.scheduled_at is null or new.status <> 'scheduled' then return new; end if;
  if tg_op = 'UPDATE' and new.scheduled_at is not distinct from old.scheduled_at and new.ends_at is not distinct from old.ends_at
     and new.calendar_id is not distinct from old.calendar_id and new.status is not distinct from old.status then
    return new;
  end if;
  perform public.booking_lock_calendar(new.calendar_id);
  v_end := coalesce(new.ends_at, new.scheduled_at + make_interval(mins => coalesce((select duration_minutes from public.booking_calendars where id = new.calendar_id), 30)));
  if exists (select 1 from public.booking_busy_rows(new.calendar_id, new.scheduled_at - interval '1 day', v_end + interval '1 day', new.id) b
              where b.starts_at < v_end and new.scheduled_at < b.ends_at) then
    raise exception 'That time is already booked on this calendar' using errcode = '23505';
  end if;
  return new;
end $$;
drop trigger if exists trg_appointments_booking_guard on public.appointments;
create trigger trg_appointments_booking_guard before insert or update of scheduled_at, ends_at, calendar_id, status on public.appointments
  for each row execute function public.booking_guard_appointment();

create or replace function public.booking_guard_sales_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cal uuid; v_end timestamptz;
begin
  if new.scheduled_at is null or new.status not in ('scheduled', 'confirmed', 'rescheduled') then return new; end if;
  if tg_op = 'UPDATE' and new.scheduled_at is not distinct from old.scheduled_at and new.ends_at is not distinct from old.ends_at
     and new.calendar_id is not distinct from old.calendar_id and new.status is not distinct from old.status then
    return new;
  end if;
  v_cal := coalesce(new.calendar_id, (select id from public.booking_calendars where kind = 'sales'));
  if v_cal is null then return new; end if;
  perform public.booking_lock_calendar(v_cal);
  -- Hand-booked meetings (no calendar) may overlap by design; calendar bookings may not.
  if new.calendar_id is null then return new; end if;
  v_end := coalesce(new.ends_at, new.scheduled_at + make_interval(mins => coalesce((select duration_minutes from public.booking_calendars where id = v_cal), 30)));
  if exists (select 1 from public.booking_busy_rows(v_cal, new.scheduled_at - interval '1 day', v_end + interval '1 day', new.id) b
              where b.starts_at < v_end and new.scheduled_at < b.ends_at) then
    raise exception 'That time is already booked on the sales calendar' using errcode = '23505';
  end if;
  return new;
end $$;
drop trigger if exists trg_sales_appointments_booking_guard on public.prospect_sales_appointments;
create trigger trg_sales_appointments_booking_guard before insert or update of scheduled_at, ends_at, calendar_id, status on public.prospect_sales_appointments
  for each row execute function public.booking_guard_sales_appointment();

-- Maps who acted to the workflow ledger's actor types (homeowner = 'contact').
create or replace function public.booking_set_actor(p_actor_kind text)
returns void language sql security definer set search_path = public as $$
  select set_config('app.workflow_actor_type',
    case p_actor_kind when 'homeowner' then 'contact' when 'contact' then 'contact' when 'user' then 'user'
                      when 'workflow' then 'workflow' when 'integration' then 'integration' else 'system' end, true)
$$;
revoke all on function public.booking_set_actor(text) from public, anon, authenticated;
grant execute on function public.booking_set_actor(text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Homeowner booking RPCs
-- ---------------------------------------------------------------------------
-- Returns {ok:true, appointment_id, starts_at, ends_at, calendar_id, time_zone}
-- or {ok:false, error:<code>[, appointment_id]}. Error codes (besides the
-- booking_slot_problem ones): invalid_source, invalid_token, wrong_calendar,
-- session_invalid, session_incomplete, not_qualified, already_booked,
-- lead_not_found, assignment_mismatch.
-- With a funnel session it also does the funnel side effects of the Calendly
-- path: funnel_bookings (provider 'homequote', verified), funnel_sessions.booked_at,
-- funnel_events appointment_booked. Always: lead_activities entry, assignment
-- -> appointment_set, lead -> appointment_set. Workflow appointment.booked,
-- push, ledger and calendar sync come from the appointments triggers.
create or replace function public.book_appointment(
  p_calendar uuid,
  p_starts_at timestamptz,
  p_lead uuid default null,
  p_assignment uuid default null,
  p_session uuid default null,
  p_session_hash text default null,
  p_source text default 'manual',
  p_contact jsonb default '{}'::jsonb,
  p_manage_token_hash text default null,
  p_actor uuid default null,
  p_actor_kind text default null,
  p_notes text default null,
  p_invitee_time_zone text default null,
  p_override boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.booking_calendars; s public.funnel_sessions; ld public.leads; v_lead uuid := p_lead; v_asg uuid := p_assignment;
  v_asg_contractor uuid; v_asg_lead uuid; v_end timestamptz; problem text; v_id uuid; v_existing uuid; v_contractor uuid;
  v_name text; v_phone text; v_email text;
begin
  if p_source is null or p_source not in ('funnel', 'estimator', 'manual', 'sales_funnel', 'ai', 'workflow') then
    return jsonb_build_object('ok', false, 'error', 'invalid_source');
  end if;
  if p_manage_token_hash is not null and p_manage_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if p_calendar is null then return jsonb_build_object('ok', false, 'error', 'calendar_not_found'); end if;

  perform public.booking_lock_calendar(p_calendar);
  select * into c from public.booking_calendars where id = p_calendar;
  if not found then return jsonb_build_object('ok', false, 'error', 'calendar_not_found'); end if;
  if c.kind = 'sales' then return jsonb_build_object('ok', false, 'error', 'wrong_calendar'); end if;

  if p_session is not null then
    select * into s from public.funnel_sessions where id = p_session and token_hash = p_session_hash and expires_at > now() for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'session_invalid'); end if;
    if s.contact_submitted_at is null or s.lead_id is null then return jsonb_build_object('ok', false, 'error', 'session_incomplete'); end if;
    if s.qualified is not true then return jsonb_build_object('ok', false, 'error', 'not_qualified'); end if;
    if v_lead is not null and v_lead <> s.lead_id then return jsonb_build_object('ok', false, 'error', 'session_invalid'); end if;
    if s.booked_at is not null then
      -- Still booked unless every booking the session made was cancelled (a cancelled
      -- call frees the session to book again). Old Calendly bookings have no appointment row.
      if exists (select 1 from public.funnel_bookings fb left join public.appointments ap on ap.id = fb.appointment_id
                  where fb.session_id = s.id and (ap.id is null or ap.status <> 'cancelled'))
         or not exists (select 1 from public.funnel_bookings fb where fb.session_id = s.id) then
        select fb.appointment_id into v_existing from public.funnel_bookings fb
          join public.appointments ap on ap.id = fb.appointment_id
         where fb.session_id = s.id and ap.status <> 'cancelled' order by ap.created_at desc limit 1;
        return jsonb_build_object('ok', false, 'error', 'already_booked', 'appointment_id', v_existing);
      end if;
    end if;
    v_lead := s.lead_id;
    v_asg := coalesce(v_asg, s.assignment_id);
  end if;

  if v_asg is not null then
    select lead_id, contractor_id into v_asg_lead, v_asg_contractor from public.lead_assignments where id = v_asg;
    if v_asg_lead is null or (v_lead is not null and v_asg_lead <> v_lead) then
      return jsonb_build_object('ok', false, 'error', 'assignment_mismatch');
    end if;
    v_lead := v_asg_lead;
  end if;
  select * into ld from public.leads where id = v_lead;
  if not found then return jsonb_build_object('ok', false, 'error', 'lead_not_found'); end if;

  if c.kind = 'contractor' then
    if v_asg is null then
      select id into v_asg from public.lead_assignments where lead_id = v_lead and contractor_id = c.contractor_id;
    elsif v_asg_contractor <> c.contractor_id then
      return jsonb_build_object('ok', false, 'error', 'assignment_mismatch');
    end if;
    v_contractor := c.contractor_id;
  else
    v_contractor := v_asg_contractor;
  end if;

  v_end := p_starts_at + make_interval(mins => c.duration_minutes);
  problem := public.booking_slot_problem(c.id, p_starts_at, v_end, null, p_override);
  if problem is not null then return jsonb_build_object('ok', false, 'error', problem); end if;

  v_name := nullif(trim(coalesce(p_contact->>'name', concat_ws(' ', ld.first_name, ld.last_name))), '');
  v_phone := nullif(trim(coalesce(p_contact->>'phone', ld.phone)), '');
  v_email := nullif(lower(trim(coalesce(p_contact->>'email', ld.email))), '');

  perform public.booking_set_actor(coalesce(p_actor_kind, case when p_actor is not null then 'user' else 'system' end));
  begin
    insert into public.appointments(assignment_id, lead_id, calendar_id, scheduled_at, ends_at, time_zone, invitee_time_zone,
      source, meeting_type, location, notes, contact_name, contact_phone, contact_email, manage_token_hash, booked_via, created_by, status)
    values (v_asg, v_lead, c.id, p_starts_at, v_end, c.timezone,
      case when public.booking_valid_timezone(p_invitee_time_zone) then p_invitee_time_zone end,
      p_source, c.meeting_type,
      case when c.meeting_type = 'video' then coalesce(c.video_link, 'Video call') else 'Phone call' end,
      left(p_notes, 2000), left(v_name, 160), left(v_phone, 40), left(v_email, 254), p_manage_token_hash,
      case when p_source in ('funnel', 'estimator') then 'website' end, p_actor, 'scheduled')
    returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end;

  if v_asg is not null then
    update public.lead_assignments set status = 'appointment_set' where id = v_asg and status in ('assigned', 'accepted', 'contacted');
  end if;
  update public.leads set status = 'appointment_set' where id = v_lead and status in ('new', 'contact_attempted', 'qualified', 'assigned');

  if p_session is not null then
    insert into public.funnel_bookings(provider, integration_id, external_id, session_id, appointment_id, verified, scheduled_at)
      values ('homequote', null, v_id::text, s.id, v_id, true, p_starts_at);
    update public.funnel_sessions set booked_at = now() where id = s.id;
    insert into public.funnel_events(session_id, event) values (s.id, 'appointment_booked') on conflict do nothing;
  end if;

  insert into public.lead_activities(lead_id, actor_id, type, body, metadata) values (v_lead, p_actor, 'appointment',
    case when c.kind = 'team' then 'Call booked with the HomeQuote team' else 'Call booked on the ' || c.name || ' calendar' end,
    case when v_contractor is null then '{}'::jsonb else jsonb_build_object('contractor_id', v_contractor) end
      || jsonb_strip_nulls(jsonb_build_object('appointment_id', v_id, 'calendar_id', c.id, 'scheduled_at', p_starts_at,
           'source', p_source, 'session_id', p_session, 'provider', 'homequote')));

  return jsonb_build_object('ok', true, 'appointment_id', v_id, 'starts_at', p_starts_at, 'ends_at', v_end,
    'calendar_id', c.id, 'time_zone', c.timezone);
end $$;
revoke all on function public.book_appointment(uuid, timestamptz, uuid, uuid, uuid, text, text, jsonb, text, uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, timestamptz, uuid, uuid, uuid, text, text, jsonb, text, uuid, text, text, text, boolean) to service_role;

-- Moves a live calendar booking to a new start (same length). The row is moved
-- in place, so the existing triggers fire appointment.rescheduled (workflows),
-- appointment_changed (push) and the calendar sync. Reminders and confirmed_at
-- reset so the new time is confirmed and reminded again.
-- Errors: not_found, not_bookable (no calendar), not_active, + slot codes.
create or replace function public.reschedule_appointment(
  p_appointment uuid,
  p_starts_at timestamptz,
  p_actor uuid default null,
  p_actor_kind text default null,
  p_override boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare ap public.appointments; c public.booking_calendars; v_cal uuid; v_end timestamptz; problem text; v_contractor uuid;
begin
  select calendar_id into v_cal from public.appointments where id = p_appointment;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_cal is null then return jsonb_build_object('ok', false, 'error', 'not_bookable'); end if;
  perform public.booking_lock_calendar(v_cal);
  select * into ap from public.appointments where id = p_appointment for update;
  -- Moved to another calendar between the read and the lock: the lock held is the wrong one.
  if ap.calendar_id is distinct from v_cal then return jsonb_build_object('ok', false, 'error', 'not_bookable'); end if;
  select * into c from public.booking_calendars where id = ap.calendar_id;
  if ap.status <> 'scheduled' then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if ap.scheduled_at = p_starts_at then
    return jsonb_build_object('ok', true, 'appointment_id', ap.id, 'starts_at', ap.scheduled_at, 'ends_at', ap.ends_at, 'unchanged', true);
  end if;
  v_end := p_starts_at + coalesce(ap.ends_at - ap.scheduled_at, make_interval(mins => c.duration_minutes));
  problem := public.booking_slot_problem(c.id, p_starts_at, v_end, ap.id, p_override);
  if problem is not null then return jsonb_build_object('ok', false, 'error', problem); end if;

  perform public.booking_set_actor(coalesce(p_actor_kind, case when p_actor is not null then 'user' else 'system' end));
  begin
    update public.appointments set scheduled_at = p_starts_at, ends_at = v_end, reschedule_count = reschedule_count + 1,
      confirmed_at = null, reminder_24h_sent_at = null, reminder_1h_sent_at = null
     where id = ap.id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end;
  update public.funnel_bookings set scheduled_at = p_starts_at where appointment_id = ap.id;
  v_contractor := public.appointment_contractor_id(ap.assignment_id, ap.calendar_id);
  insert into public.lead_activities(lead_id, actor_id, type, body, metadata) values (ap.lead_id, p_actor, 'appointment',
    case when p_actor_kind in ('homeowner', 'contact') then 'Homeowner rescheduled their call' else 'Call rescheduled' end,
    case when v_contractor is null then '{}'::jsonb else jsonb_build_object('contractor_id', v_contractor) end
      || jsonb_build_object('appointment_id', ap.id, 'calendar_id', ap.calendar_id, 'scheduled_at', p_starts_at,
           'previous_scheduled_at', ap.scheduled_at, 'actor_kind', coalesce(p_actor_kind, 'user')));
  return jsonb_build_object('ok', true, 'appointment_id', ap.id, 'starts_at', p_starts_at, 'ends_at', v_end,
    'previous_starts_at', ap.scheduled_at, 'time_zone', c.timezone);
end $$;
revoke all on function public.reschedule_appointment(uuid, timestamptz, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz, uuid, text, boolean) to service_role;

-- Cancels an appointment (any appointment; idempotent). appointment.cancelled
-- (workflows + push) and the outcome ledger come from the triggers.
-- Errors: not_found, not_active (already held / no-show).
create or replace function public.cancel_appointment(
  p_appointment uuid,
  p_reason text default null,
  p_actor uuid default null,
  p_actor_kind text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare ap public.appointments; v_contractor uuid;
begin
  select * into ap from public.appointments where id = p_appointment for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if ap.status = 'cancelled' then return jsonb_build_object('ok', true, 'appointment_id', ap.id, 'already', true); end if;
  if ap.status in ('held', 'no_show') then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  perform public.booking_set_actor(coalesce(p_actor_kind, case when p_actor is not null then 'user' else 'system' end));
  update public.appointments set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(left(trim(p_reason), 500), '')
   where id = ap.id;
  if ap.lead_id is not null then
    v_contractor := public.appointment_contractor_id(ap.assignment_id, ap.calendar_id);
    insert into public.lead_activities(lead_id, actor_id, type, body, metadata) values (ap.lead_id, p_actor, 'appointment',
      case when p_actor_kind in ('homeowner', 'contact') then 'Homeowner cancelled their call' else 'Appointment cancelled' end
        || coalesce(': ' || nullif(left(trim(p_reason), 500), ''), ''),
      case when v_contractor is null then '{}'::jsonb else jsonb_build_object('contractor_id', v_contractor) end
        || jsonb_strip_nulls(jsonb_build_object('appointment_id', ap.id, 'calendar_id', ap.calendar_id, 'scheduled_at', ap.scheduled_at,
             'actor_kind', coalesce(p_actor_kind, 'user'))));
  end if;
  return jsonb_build_object('ok', true, 'appointment_id', ap.id);
end $$;
revoke all on function public.cancel_appointment(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_appointment(uuid, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Sales booking RPCs (contractor sales funnel -> HomeQuote sales calendar)
-- ---------------------------------------------------------------------------
-- Decision: sales meetings stay in prospect_sales_appointments (the setter
-- pay/credit, calls workspace, push producer 3 and 0066 calendar adds all read
-- it). A self-booked funnel meeting has partner_id NULL, so no setter is
-- credited or paid (0062: only meetings a setter booked AND the owner sold pay);
-- a setter booking on someone's behalf passes p_partner = themselves, exactly
-- like booking from the call workspace. The prospect is found by phone (one
-- live prospect per number, 0007) or created from the submission.
-- Extra errors: submission_invalid, not_qualified, already_booked, prospect_required.
create or replace function public.book_sales_appointment(
  p_calendar uuid,
  p_starts_at timestamptz,
  p_submission uuid default null,
  p_submission_hash text default null,
  p_prospect uuid default null,
  p_partner uuid default null,
  p_source text default 'sales_funnel',
  p_contact jsonb default '{}'::jsonb,
  p_manage_token_hash text default null,
  p_actor uuid default null,
  p_notes text default null,
  p_invitee_time_zone text default null,
  p_override boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.booking_calendars; sub public.contractor_funnel_submissions; v_prospect uuid := p_prospect; v_end timestamptz;
  problem text; v_id uuid; v_name text; v_phone text; v_email text;
begin
  if p_source is null or p_source not in ('sales_funnel', 'manual', 'ai', 'workflow') then
    return jsonb_build_object('ok', false, 'error', 'invalid_source');
  end if;
  if p_manage_token_hash is not null and p_manage_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if p_calendar is null then return jsonb_build_object('ok', false, 'error', 'calendar_not_found'); end if;
  perform public.booking_lock_calendar(p_calendar);
  select * into c from public.booking_calendars where id = p_calendar;
  if not found then return jsonb_build_object('ok', false, 'error', 'calendar_not_found'); end if;
  if c.kind <> 'sales' then return jsonb_build_object('ok', false, 'error', 'wrong_calendar'); end if;

  if p_submission is not null then
    select * into sub from public.contractor_funnel_submissions
     where submission_id = p_submission and access_token_hash = p_submission_hash for update;
    if not found then return jsonb_build_object('ok', false, 'error', 'submission_invalid'); end if;
    if sub.qualification_status <> 'qualified' then return jsonb_build_object('ok', false, 'error', 'not_qualified'); end if;
    -- Booked already, unless that meeting was cancelled (then the prospect may pick a new time).
    if sub.booking_status in ('reported', 'confirmed')
       and not exists (select 1 from public.prospect_sales_appointments where id = sub.sales_appointment_id and status = 'cancelled') then
      return jsonb_build_object('ok', false, 'error', 'already_booked', 'sales_appointment_id', sub.sales_appointment_id);
    end if;
  end if;

  v_end := p_starts_at + make_interval(mins => c.duration_minutes);
  problem := public.booking_slot_problem(c.id, p_starts_at, v_end, null, p_override);
  if problem is not null then return jsonb_build_object('ok', false, 'error', problem); end if;

  v_name := nullif(trim(coalesce(p_contact->>'name', sub.name)), '');
  v_phone := nullif(trim(coalesce(p_contact->>'phone', sub.phone)), '');
  v_email := nullif(lower(trim(coalesce(p_contact->>'email', sub.email))), '');

  if v_prospect is null and v_phone is not null then
    select id into v_prospect from public.contractor_prospects
     where phone_e164 = public.to_e164(v_phone) and archived_at is null limit 1;
  end if;
  if v_prospect is null and sub.id is not null then
    insert into public.contractor_prospects(company_name, phone, email, website, service_area, decision_maker_name, source, notes)
    values (left(coalesce(nullif(trim(sub.company), ''), v_name, 'Contractor'), 200), v_phone, v_email, sub.website, sub.service_area,
            v_name, 'contractor_funnel', 'Booked a sales call from the contractor funnel')
    returning id into v_prospect;
  end if;
  if v_prospect is null then return jsonb_build_object('ok', false, 'error', 'prospect_required'); end if;

  begin
    insert into public.prospect_sales_appointments(prospect_id, partner_id, decision_maker_name, scheduled_at, ends_at, time_zone,
      appointment_type, contact_info, status, notes, created_by, calendar_id, source, manage_token_hash)
    values (v_prospect, p_partner, left(v_name, 160), p_starts_at, v_end,
      case when public.booking_valid_timezone(p_invitee_time_zone) then p_invitee_time_zone else c.timezone end,
      c.meeting_type, left(concat_ws(' · ', v_phone, v_email, case when c.meeting_type = 'video' then c.video_link end), 500),
      'scheduled', left(p_notes, 2000), p_actor, c.id, p_source, p_manage_token_hash)
    returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end;

  update public.contractor_prospects set disposition = 'appointment_booked', appointment_at = p_starts_at,
    decision_maker_name = coalesce(decision_maker_name, left(v_name, 160))
   where id = v_prospect;
  if sub.id is not null then
    update public.contractor_funnel_submissions set booking_status = 'confirmed', booked_at = now(), booking_start_time = p_starts_at,
      review_status = 'booked', sales_appointment_id = v_id
     where id = sub.id;
  end if;
  return jsonb_build_object('ok', true, 'sales_appointment_id', v_id, 'prospect_id', v_prospect, 'starts_at', p_starts_at,
    'ends_at', v_end, 'calendar_id', c.id, 'time_zone', c.timezone);
end $$;
revoke all on function public.book_sales_appointment(uuid, timestamptz, uuid, text, uuid, uuid, text, jsonb, text, uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.book_sales_appointment(uuid, timestamptz, uuid, text, uuid, uuid, text, jsonb, text, uuid, text, text, boolean) to service_role;

create or replace function public.reschedule_sales_appointment(
  p_appointment uuid,
  p_starts_at timestamptz,
  p_actor uuid default null,
  p_override boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare sa public.prospect_sales_appointments; c public.booking_calendars; v_cal uuid; v_end timestamptz; problem text;
begin
  select calendar_id into v_cal from public.prospect_sales_appointments where id = p_appointment;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_cal is null then return jsonb_build_object('ok', false, 'error', 'not_bookable'); end if;
  perform public.booking_lock_calendar(v_cal);
  select * into sa from public.prospect_sales_appointments where id = p_appointment for update;
  if sa.calendar_id is distinct from v_cal then return jsonb_build_object('ok', false, 'error', 'not_bookable'); end if;
  select * into c from public.booking_calendars where id = sa.calendar_id;
  if sa.status not in ('scheduled', 'confirmed', 'rescheduled') then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  if sa.scheduled_at = p_starts_at then
    return jsonb_build_object('ok', true, 'sales_appointment_id', sa.id, 'starts_at', sa.scheduled_at, 'ends_at', sa.ends_at, 'unchanged', true);
  end if;
  v_end := p_starts_at + coalesce(sa.ends_at - sa.scheduled_at, make_interval(mins => c.duration_minutes));
  problem := public.booking_slot_problem(c.id, p_starts_at, v_end, sa.id, p_override);
  if problem is not null then return jsonb_build_object('ok', false, 'error', problem); end if;
  begin
    update public.prospect_sales_appointments set scheduled_at = p_starts_at, ends_at = v_end, reschedule_count = reschedule_count + 1,
      booking_confirmed_at = null, reminder_24h_sent_at = null, reminder_1h_sent_at = null, updated_by = coalesce(p_actor, updated_by)
     where id = sa.id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end;
  update public.contractor_prospects set appointment_at = p_starts_at where id = sa.prospect_id;
  update public.contractor_funnel_submissions set booking_start_time = p_starts_at where sales_appointment_id = sa.id;
  return jsonb_build_object('ok', true, 'sales_appointment_id', sa.id, 'starts_at', p_starts_at, 'ends_at', v_end,
    'previous_starts_at', sa.scheduled_at, 'time_zone', c.timezone);
end $$;
revoke all on function public.reschedule_sales_appointment(uuid, timestamptz, uuid, boolean) from public, anon, authenticated;
grant execute on function public.reschedule_sales_appointment(uuid, timestamptz, uuid, boolean) to service_role;

create or replace function public.cancel_sales_appointment(
  p_appointment uuid,
  p_reason text default null,
  p_actor uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare sa public.prospect_sales_appointments;
begin
  select * into sa from public.prospect_sales_appointments where id = p_appointment for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if sa.status = 'cancelled' then return jsonb_build_object('ok', true, 'sales_appointment_id', sa.id, 'already', true); end if;
  if sa.status in ('completed', 'no_show') then return jsonb_build_object('ok', false, 'error', 'not_active'); end if;
  update public.prospect_sales_appointments set status = 'cancelled', cancelled_at = now(),
    cancel_reason = nullif(left(trim(p_reason), 500), ''), updated_by = coalesce(p_actor, updated_by)
   where id = sa.id;
  update public.contractor_prospects set appointment_at = null
   where id = sa.prospect_id and appointment_at = sa.scheduled_at;
  update public.contractor_funnel_submissions set booking_status = 'cancelled' where sales_appointment_id = sa.id;
  return jsonb_build_object('ok', true, 'sales_appointment_id', sa.id);
end $$;
revoke all on function public.cancel_sales_appointment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.cancel_sales_appointment(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Reminders: claim due 24 h / 1 h reminders (at most once; stamps sent_at)
-- ---------------------------------------------------------------------------
-- 24 h: due once the call is <= 24 h away, only for calls booked >= 24 h ahead
--       and still > 2 h away (otherwise the 1 h reminder covers it).
-- 1 h:  due once the call is <= 65 min away, not for calls booked in the last
--       15 minutes (their confirmation just went out).
-- Only calendar bookings (calendar_id set) are reminded. Returns a JSON array of
-- {kind:'appointment'|'sales_appointment', id, reminder:'24h'|'1h', starts_at}.
create or replace function public.claim_booking_reminders(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb := '[]'::jsonb; lim integer := greatest(1, least(coalesce(p_limit, 50), 200)); r record;
begin
  for r in
    select 'appointment' as kind, ap.id, '1h' as reminder, ap.scheduled_at from public.appointments ap
     where ap.calendar_id is not null and ap.status = 'scheduled' and ap.reminder_1h_sent_at is null
       and ap.scheduled_at > now() and ap.scheduled_at <= now() + interval '65 minutes' and ap.created_at < now() - interval '15 minutes'
    union all
    select 'appointment', ap.id, '24h', ap.scheduled_at from public.appointments ap
     where ap.calendar_id is not null and ap.status = 'scheduled' and ap.reminder_24h_sent_at is null
       and ap.scheduled_at > now() + interval '2 hours' and ap.scheduled_at <= now() + interval '24 hours 5 minutes'
       and ap.created_at <= ap.scheduled_at - interval '24 hours'
    union all
    select 'sales_appointment', sa.id, '1h', sa.scheduled_at from public.prospect_sales_appointments sa
     where sa.calendar_id is not null and sa.status in ('scheduled', 'confirmed', 'rescheduled') and sa.reminder_1h_sent_at is null
       and sa.scheduled_at > now() and sa.scheduled_at <= now() + interval '65 minutes' and sa.created_at < now() - interval '15 minutes'
    union all
    select 'sales_appointment', sa.id, '24h', sa.scheduled_at from public.prospect_sales_appointments sa
     where sa.calendar_id is not null and sa.status in ('scheduled', 'confirmed', 'rescheduled') and sa.reminder_24h_sent_at is null
       and sa.scheduled_at > now() + interval '2 hours' and sa.scheduled_at <= now() + interval '24 hours 5 minutes'
       and sa.created_at <= sa.scheduled_at - interval '24 hours'
    order by 4
    limit lim
  loop
    if r.kind = 'appointment' then
      if r.reminder = '1h' then
        update public.appointments set reminder_1h_sent_at = now() where id = r.id and reminder_1h_sent_at is null;
      else
        update public.appointments set reminder_24h_sent_at = now() where id = r.id and reminder_24h_sent_at is null;
      end if;
    elsif r.reminder = '1h' then
      update public.prospect_sales_appointments set reminder_1h_sent_at = now() where id = r.id and reminder_1h_sent_at is null;
    else
      update public.prospect_sales_appointments set reminder_24h_sent_at = now() where id = r.id and reminder_24h_sent_at is null;
    end if;
    if found then
      out := out || jsonb_build_object('kind', r.kind, 'id', r.id, 'reminder', r.reminder, 'starts_at', r.scheduled_at);
    end if;
  end loop;
  return out;
end $$;
revoke all on function public.claim_booking_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_booking_reminders(integer) to service_role;

-- ---------------------------------------------------------------------------
-- 9. Contractor calendars on demand + seeds
-- ---------------------------------------------------------------------------
create or replace function public.booking_seed_default_rules(p_calendar uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.booking_calendar_rules(calendar_id, weekday, start_minute, end_minute)
  select p_calendar, wd, 540, 1020 from generate_series(1, 5) wd
   where not exists (select 1 from public.booking_calendar_rules where calendar_id = p_calendar)
$$;
revoke all on function public.booking_seed_default_rules(uuid) from public, anon, authenticated;
grant execute on function public.booking_seed_default_rules(uuid) to service_role;

-- The contractor's calendar, created with the default hours (and the company's
-- owners as hosts) the first time it is needed. Returns null for an unknown contractor.
create or replace function public.ensure_contractor_booking_calendar(p_contractor uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid; v_name text;
begin
  select id into v from public.booking_calendars where kind = 'contractor' and contractor_id = p_contractor;
  if v is not null then return v; end if;
  select name into v_name from public.contractors where id = p_contractor;
  if not found then return null; end if;
  insert into public.booking_calendars(kind, contractor_id, name)
    values ('contractor', p_contractor, left(coalesce(nullif(trim(v_name), ''), 'Contractor'), 120))
    on conflict do nothing returning id into v;
  if v is null then
    select id into v from public.booking_calendars where kind = 'contractor' and contractor_id = p_contractor;
    return v;
  end if;
  perform public.booking_seed_default_rules(v);
  insert into public.booking_calendar_members(calendar_id, user_id)
    select v, p.id from public.profiles p
     where p.contractor_id = p_contractor and p.role = 'contractor' and p.is_active and p.contractor_role = 'owner'
    on conflict do nothing;
  return v;
end $$;
revoke all on function public.ensure_contractor_booking_calendar(uuid) from public, anon, authenticated;
grant execute on function public.ensure_contractor_booking_calendar(uuid) to service_role;

do $$
declare v uuid; pm uuid;
begin
  insert into public.booking_calendars(kind, name) values ('team', 'HomeQuote team') on conflict do nothing;
  insert into public.booking_calendars(kind, name) values ('sales', 'HomeQuote sales') on conflict do nothing;
  for v in select id from public.booking_calendars where kind in ('team', 'sales') loop
    perform public.booking_seed_default_rules(v);
    -- Active admins host both until the owner changes it.
    insert into public.booking_calendar_members(calendar_id, user_id)
      select v, p.id from public.profiles p where p.role = 'admin' and p.is_active
      on conflict do nothing;
  end loop;
  -- Pool Masters: the contractor behind its client funnel, else by name. Skipped if absent.
  select f.contractor_id into pm from public.funnels f
   where f.slug like 'pool-masters%' and f.contractor_id is not null order by f.created_at limit 1;
  if pm is null then
    select c.id into pm from public.contractors c where c.name ilike '%pool masters%' order by c.created_at limit 1;
  end if;
  if pm is not null then perform public.ensure_contractor_booking_calendar(pm); end if;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Switch the live funnels off Calendly (run AFTER the code deploy)
-- ---------------------------------------------------------------------------
-- Live funnels read funnels.config from the database and sessions keep a
-- config_snapshot, so editing content/funnels/*.json changes nothing on its own.
-- This is a function, not a data step in the migration, because the code that
-- understands calendarProvider 'homequote' must be live first (older code
-- rejects the value and the funnel would stop loading).
--   select public.booking_switch_funnels_to_native();       -- dry run: what would change
--   select public.booking_switch_funnels_to_native(true);   -- apply
-- Switches every funnel on Calendly (provider or calendly.com URL) plus the
-- network / Pool Masters funnels by slug, removing calendarUrl / calendarId.
-- Open sessions that have not reached the contact step yet follow; sessions
-- already at the calendar keep their snapshot so a Calendly window someone has
-- open still records its booking. Funnels on a GHL calendar are only listed.
create or replace function public.booking_switch_funnels_to_native(p_apply boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ids uuid[]; v_slugs text[]; v_sessions integer := 0; v_ghl text[];
begin
  select coalesce(array_agg(id order by slug), '{}'), coalesce(array_agg(slug order by slug), '{}') into v_ids, v_slugs
    from public.funnels
   where coalesce(config->>'calendarProvider', '') <> 'homequote'
     and (config->>'calendarProvider' = 'calendly' or coalesce(config->>'calendarUrl', '') ilike '%calendly.com%'
          or slug like 'pool-masters%' or slug in ('bathroom-remodel', 'kitchen-remodel', 'pool-remodeling'));
  select coalesce(array_agg(slug order by slug), '{}') into v_ghl from public.funnels
   where config->>'calendarProvider' = 'ghl' and config ? 'calendarId' and not (id = any(v_ids));
  if p_apply and cardinality(v_ids) > 0 then
    update public.funnels set config = (config - 'calendarUrl' - 'calendarId') || '{"calendarProvider":"homequote"}'::jsonb
     where id = any(v_ids);
    update public.funnel_sessions set config_snapshot = (config_snapshot - 'calendarUrl' - 'calendarId') || '{"calendarProvider":"homequote"}'::jsonb
     where funnel_id = any(v_ids) and contact_submitted_at is null and booked_at is null and expires_at > now();
    get diagnostics v_sessions = row_count;
  end if;
  return jsonb_build_object('applied', p_apply, 'funnels', to_jsonb(v_slugs), 'sessions', v_sessions, 'ghl_left_alone', to_jsonb(v_ghl),
    'still_mentioning_calendly', (select coalesce(jsonb_agg(slug order by slug), '[]'::jsonb) from public.funnels
                                   where config::text ilike '%calendly.com%'));
end $$;
revoke all on function public.booking_switch_funnels_to_native(boolean) from public, anon, authenticated;
grant execute on function public.booking_switch_funnels_to_native(boolean) to service_role;
