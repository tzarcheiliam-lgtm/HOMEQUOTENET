-- 0076: Video call history (Phase 2 of HomeQuote video rooms, §52).
--
-- LiveKit posts room / participant events to /api/video/webhook (signed with
-- the project's API key + secret). Each room session becomes a video_calls row
-- and each person in it a video_call_participants row, so HomeQuote knows who
-- joined, when and for how long. Used for: the "guest joined" alert, automatic
-- no-shows on sales meetings (host joined, guest never did), and the
-- "Joined 2:03 PM · 31 min" history on appointments and meeting links.
--
-- Writes: service role only (the webhook). Reads: admins and the calling
-- workspace (callers / setters); contractors never.
-- Also registers the notification category 'video_guest_joined'.
-- Idempotent. Applies after 0075.

create table if not exists public.video_calls (
  id                     uuid primary key default gen_random_uuid(),
  room_name              text not null,
  room_sid               text not null unique,
  kind                   text not null check (kind in ('appointment', 'sales_appointment', 'link')),
  ref_id                 uuid not null,
  started_at             timestamptz not null default now(),
  ended_at               timestamptz,
  host_first_joined_at   timestamptz,
  guest_first_joined_at  timestamptz,
  guest_notified_at      timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
comment on table public.video_calls is
  'One LiveKit room session of a HomeQuote video room (kind + ref_id = the appointment, sales meeting or meeting link).';
create index if not exists idx_video_calls_ref on public.video_calls (kind, ref_id, started_at desc);

create table if not exists public.video_call_participants (
  id               uuid primary key default gen_random_uuid(),
  call_id          uuid not null references public.video_calls(id) on delete cascade,
  participant_sid  text not null unique,
  identity         text not null,
  name             text,
  role             text not null check (role in ('host', 'guest')),
  user_id          uuid references public.profiles(id) on delete set null,
  joined_at        timestamptz,
  left_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_video_call_participants_call on public.video_call_participants (call_id);

drop trigger if exists trg_video_calls_updated_at on public.video_calls;
create trigger trg_video_calls_updated_at before update on public.video_calls
  for each row execute function public.set_updated_at();

alter table public.video_calls enable row level security;
alter table public.video_call_participants enable row level security;

drop policy if exists video_calls_select on public.video_calls;
create policy video_calls_select on public.video_calls for select
  using (public.is_admin() or public.is_call_agent());
drop policy if exists video_call_participants_select on public.video_call_participants;
create policy video_call_participants_select on public.video_call_participants for select
  using (public.is_admin() or public.is_call_agent());

grant select on public.video_calls, public.video_call_participants to authenticated;
grant all on public.video_calls, public.video_call_participants to service_role;

-- Notification category: "Someone joined your video call".
alter table public.notification_preferences add column if not exists video_guest_joined boolean not null default true;

alter table public.notification_events drop constraint if exists notification_events_type_check;
alter table public.notification_events add constraint notification_events_type_check check (type in (
  'new_lead', 'lead_assigned', 'appointment_booked', 'appointment_changed',
  'appointment_cancelled', 'callback_due', 'form_submission', 'payment_received',
  'workflow_alert', 'video_guest_joined'
));

alter table public.notification_routing_rules drop constraint if exists notification_routing_rules_type_check;
alter table public.notification_routing_rules add constraint notification_routing_rules_type_check check (type in (
  'new_lead', 'lead_assigned', 'appointment_booked', 'appointment_changed',
  'appointment_cancelled', 'callback_due', 'form_submission', 'payment_received',
  'workflow_alert', 'video_guest_joined'
));
