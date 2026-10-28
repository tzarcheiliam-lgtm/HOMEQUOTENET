-- =============================================================================
-- 0066 — Remember which sales appointments a person added to their calendar
--
--   sales_appointment_calendar_adds   one row per (appointment, person,
--                                     calendar app) recording that the
--                                     "Add to Google / Apple Calendar" button
--                                     was used, and for which meeting time
--
-- Google's "add event" link cannot recognise an event it already has, so the
-- app keeps this record instead: the button turns into "In Google Calendar"
-- and is not offered again for the same time, and a rescheduled meeting is
-- flagged so the existing event can be moved instead of added twice. (Apple
-- Calendar matches the .ics UID itself; it is recorded the same way so the
-- button shows its state.)
--
-- Each person sees and writes only their own rows, and only for appointments
-- they can already see. Idempotent; safe to re-run.
-- =============================================================================

create table if not exists public.sales_appointment_calendar_adds (
  appointment_id uuid not null references public.prospect_sales_appointments (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  provider       text not null check (provider in ('google', 'apple')),
  scheduled_at   timestamptz not null,
  added_at       timestamptz not null default now(),
  primary key (appointment_id, user_id, provider)
);

comment on table public.sales_appointment_calendar_adds is
  'Which sales appointments each person added to Google or Apple Calendar, and for which meeting time. Stops the same meeting being added twice.';
comment on column public.sales_appointment_calendar_adds.scheduled_at is
  'The meeting time that was added. If the appointment moves, the app tells the person to update the existing event.';

create index if not exists idx_sales_appointment_calendar_adds_user
  on public.sales_appointment_calendar_adds (user_id);

alter table public.sales_appointment_calendar_adds enable row level security;

drop policy if exists sales_appointment_calendar_adds_select on public.sales_appointment_calendar_adds;
create policy sales_appointment_calendar_adds_select on public.sales_appointment_calendar_adds for select
  using (user_id = auth.uid());

drop policy if exists sales_appointment_calendar_adds_insert on public.sales_appointment_calendar_adds;
create policy sales_appointment_calendar_adds_insert on public.sales_appointment_calendar_adds for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.prospect_sales_appointments a where a.id = appointment_id)
  );

drop policy if exists sales_appointment_calendar_adds_update on public.sales_appointment_calendar_adds;
create policy sales_appointment_calendar_adds_update on public.sales_appointment_calendar_adds for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.prospect_sales_appointments a where a.id = appointment_id)
  );

drop policy if exists sales_appointment_calendar_adds_delete on public.sales_appointment_calendar_adds;
create policy sales_appointment_calendar_adds_delete on public.sales_appointment_calendar_adds for delete
  using (user_id = auth.uid());
