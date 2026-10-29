-- Reminder texts and follow-ups through the Mac bridge (no-show prevention).
--
-- 1. A text conversation can now be with a CONTRACTOR PROSPECT (sales meetings booked from the calling workspace),
--    not only with a homeowner lead: sms_conversations / sms_messages get a prospect_id, lead_id becomes optional,
--    and exactly one of the two is set.
-- 2. sms_messages remembers which reminder a text was (so a "YES" reply can confirm the right meeting).
-- 3. sms_reminders: one row per reminder step sent (or deliberately skipped) for a meeting, an appointment or a
--    no-reply follow-up. The unique key includes the meeting time, so a rescheduled meeting gets its reminders again
--    and nothing is ever sent twice.
-- 4. sms_settings.reminder_config: on/off switches, host name and editable wording (empty = built-in defaults).
--
-- Additive and safe to re-run. All writes go through the server with the service role; admins can read via RLS.

alter table public.sms_conversations add column if not exists prospect_id uuid references public.contractor_prospects(id) on delete cascade;
alter table public.sms_conversations alter column lead_id drop not null;
alter table public.sms_messages add column if not exists prospect_id uuid references public.contractor_prospects(id) on delete cascade;
alter table public.sms_messages alter column lead_id drop not null;
alter table public.sms_messages add column if not exists reminder_kind text check (reminder_kind is null or reminder_kind in ('sales_meeting', 'home_appointment', 'no_reply'));
alter table public.sms_messages add column if not exists reminder_ref uuid;
alter table public.sms_messages add column if not exists reminder_step text check (reminder_step is null or char_length(reminder_step) <= 40);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sms_conversations_one_owner') then
    alter table public.sms_conversations add constraint sms_conversations_one_owner check (num_nonnulls(lead_id, prospect_id) = 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sms_messages_one_owner') then
    alter table public.sms_messages add constraint sms_messages_one_owner check (num_nonnulls(lead_id, prospect_id) = 1);
  end if;
end $$;

create unique index if not exists uq_sms_conversations_prospect on public.sms_conversations (prospect_id) where prospect_id is not null;
create index if not exists idx_sms_messages_reminder on public.sms_messages (conversation_id, created_at desc) where reminder_kind is not null;

create table if not exists public.sms_reminders (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('sales_meeting', 'home_appointment', 'no_reply')),
  -- sales_meeting: prospect_sales_appointments.id; home_appointment: appointments.id; no_reply: sms_conversations.id
  ref_id      uuid not null,
  step        text not null check (char_length(step) between 1 and 40),
  -- The meeting time (or, for follow-ups, the message time) this step was planned from.
  anchor_at   timestamptz not null,
  -- confirmed / reschedule: the reply to a reminder (YES / R), kept with the steps for the appointment page.
  status      text not null check (status in ('queued', 'skipped', 'alerted', 'confirmed', 'reschedule')),
  message_id  uuid references public.sms_messages(id) on delete set null,
  detail      text check (detail is null or char_length(detail) <= 300),
  created_at  timestamptz not null default now(),
  unique (kind, ref_id, step, anchor_at)
);
create index if not exists idx_sms_reminders_ref on public.sms_reminders (kind, ref_id);

alter table public.sms_reminders enable row level security;
drop policy if exists sms_reminders_admin_select on public.sms_reminders;
create policy sms_reminders_admin_select on public.sms_reminders for select using (public.is_admin());

alter table public.sms_settings add column if not exists reminder_config jsonb not null default '{}'::jsonb;
