-- ============================================================================
-- HomeQuote Network — Web Push + in-app notifications
-- ============================================================================
-- Additive and re-runnable. Nothing existing is altered except three AFTER
-- triggers that only INSERT into the new outbox (each swallows its own errors,
-- so a notification problem can never fail a lead, appointment or webhook).
--
--   push_subscriptions        one row per device (endpoint is globally unique)
--   notification_preferences  per-user master switch + per-category booleans
--   notifications             the in-app notification center (bell)
--   push_notification_logs    delivery attempt log (admin-readable)
--   notification_events       service-role outbox: DB facts waiting to be pushed
-- ============================================================================

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null check (length(endpoint) between 20 and 2048 and endpoint like 'https://%'),
  p256dh       text not null check (length(p256dh) between 20 and 200),
  auth         text not null check (length(auth) between 8 and 100),
  user_agent   text check (length(user_agent) <= 500),
  device_name  text check (length(device_name) <= 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_used_at timestamptz,
  enabled      boolean not null default true,
  constraint push_subscriptions_endpoint_key unique (endpoint)
);
create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id) where enabled;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions for insert
  with check (user_id = auth.uid());
drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions for delete
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- notification_preferences
-- One boolean per category. To add a category later: add a column here and one
-- entry in lib/notifications/types.ts (that registry drives the settings UI).
-- ---------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  enabled             boolean not null default true,
  new_lead            boolean not null default true,
  lead_assigned       boolean not null default true,
  appointment_booked  boolean not null default true,
  appointment_changed boolean not null default true,
  appointment_cancelled boolean not null default true,
  callback_due        boolean not null default true,
  form_submission     boolean not null default true,
  payment_received    boolean not null default true,
  workflow_alert      boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select on public.notification_preferences;
create policy notification_preferences_select on public.notification_preferences for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists notification_preferences_insert on public.notification_preferences;
create policy notification_preferences_insert on public.notification_preferences for insert
  with check (user_id = auth.uid());
drop policy if exists notification_preferences_update on public.notification_preferences;
create policy notification_preferences_update on public.notification_preferences for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notifications (in-app center). Written only by the service role.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (length(type) between 1 and 60),
  title      text not null check (length(title) between 1 and 200),
  body       text check (length(body) <= 500),
  url        text check (url is null or url = '/app' or url like '/app/%'),
  entity_id  uuid,
  metadata   jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_recent
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No insert/delete policy: rows are created server-side (service role) only, so
-- a user can never fabricate a notification for themselves or anyone else.
-- Users may only flip read_at; everything else in the row is immutable to them.
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- push_notification_logs (service role writes; admins read)
-- ---------------------------------------------------------------------------
create table if not exists public.push_notification_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  subscription_id uuid,
  type            text not null,
  entity_id       uuid,
  title           text,
  body            text,
  status          text not null check (status in ('sent', 'failed', 'expired', 'no_subscription')),
  error           text check (length(error) <= 1000),
  created_at      timestamptz not null default now()
);
create index if not exists idx_push_logs_user on public.push_notification_logs (user_id, created_at desc);
create index if not exists idx_push_logs_recent on public.push_notification_logs (created_at desc);

alter table public.push_notification_logs enable row level security;
drop policy if exists push_notification_logs_select on public.push_notification_logs;
create policy push_notification_logs_select on public.push_notification_logs for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- notification_events — outbox of domain facts waiting to become notifications.
-- Service role only (RLS on, no policies). dedupe_key makes every producer
-- idempotent; processed_at is set once the event has been fanned out.
-- ---------------------------------------------------------------------------
create table if not exists public.notification_events (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in (
    'new_lead', 'lead_assigned', 'appointment_booked', 'appointment_changed',
    'appointment_cancelled', 'callback_due', 'form_submission', 'payment_received',
    'workflow_alert'
  )),
  entity_type   text not null,
  entity_id     uuid not null,
  lead_id       uuid,
  contractor_id uuid,
  payload       jsonb not null default '{}',
  dedupe_key    text not null unique,
  attempts      integer not null default 0,
  available_at  timestamptz not null default now(),
  processed_at  timestamptz,
  error         text check (length(error) <= 1000),
  created_at    timestamptz not null default now()
);
create index if not exists idx_notification_events_queue
  on public.notification_events (available_at) where processed_at is null;
alter table public.notification_events enable row level security;
-- Defense in depth on top of RLS-with-no-policies: no API role can even touch it.
revoke all on public.notification_events from anon, authenticated;

-- Claim a batch (SKIP LOCKED + short lease) so overlapping workers never
-- double-send. After 5 attempts an event is left for inspection.
create or replace function public.claim_notification_events(p_limit integer default 25)
returns setof public.notification_events language sql security definer set search_path = public as $$
  update notification_events e
     set attempts = attempts + 1, available_at = now() + interval '2 minutes'
   where e.id in (
     select id from notification_events
      where processed_at is null and attempts < 5 and available_at <= now()
      order by created_at
      for update skip locked
      limit greatest(1, least(p_limit, 100)))
  returning e.* $$;
revoke all on function public.claim_notification_events(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_events(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Producer 1: every canonical workflow event that matters becomes a
-- notification event. Reuses the workflow ledger, which is already emitted by
-- DB triggers for every path (funnels, integrations, manual, workflows) and is
-- idempotent — so nothing here depends on which code created the row.
--   lead.created  from a funnel → form_submission, otherwise new_lead
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_notification_from_workflow_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  t := case new.type
    when 'lead.created' then case when new.payload ? 'funnelSlug' then 'form_submission' else 'new_lead' end
    when 'lead.assigned' then 'lead_assigned'
    when 'appointment.booked' then 'appointment_booked'
    when 'appointment.cancelled' then 'appointment_cancelled'
    else null end;
  if t is null then return new; end if;
  begin
    insert into notification_events (type, entity_type, entity_id, lead_id, contractor_id, payload, dedupe_key)
    values (t, new.entity_type, new.entity_id, new.lead_id, new.contractor_id, new.payload, 'wf:' || new.id)
    on conflict (dedupe_key) do nothing;
  exception when others then
    raise warning 'notification enqueue failed: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists trg_workflow_events_notify on public.workflow_events;
create trigger trg_workflow_events_notify after insert on public.workflow_events
  for each row execute function public.enqueue_notification_from_workflow_event();

-- ---------------------------------------------------------------------------
-- Producer 2: a homeowner appointment moved to a different time.
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_appointment_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare a lead_assignments;
begin
  if old.scheduled_at is null or new.scheduled_at is null
     or new.scheduled_at = old.scheduled_at or new.status = 'cancelled' then
    return new;
  end if;
  begin
    select * into a from lead_assignments where id = new.assignment_id;
    insert into notification_events (type, entity_type, entity_id, lead_id, contractor_id, payload, dedupe_key)
    values ('appointment_changed', 'appointment', new.id, a.lead_id, a.contractor_id,
      jsonb_build_object('leadId', a.lead_id, 'assignmentId', a.id, 'contractorId', a.contractor_id,
        'appointmentId', new.id, 'scheduledAt', new.scheduled_at, 'previousScheduledAt', old.scheduled_at),
      'appt-changed:' || new.id || ':' || ((extract(epoch from new.updated_at) * 1000000)::bigint)::text)
    on conflict (dedupe_key) do nothing;
  exception when others then
    raise warning 'notification enqueue failed: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists trg_appointments_notify_changed on public.appointments;
create trigger trg_appointments_notify_changed after update of scheduled_at on public.appointments
  for each row execute function public.enqueue_appointment_changed();

-- ---------------------------------------------------------------------------
-- Producer 3: the cold-calling workspace's sales appointments (prospects).
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_prospect_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text; micros text;
begin
  micros := ((extract(epoch from new.updated_at) * 1000000)::bigint)::text;
  if tg_op = 'INSERT' then
    t := 'appointment_booked';
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    t := 'appointment_cancelled';
  elsif new.scheduled_at is distinct from old.scheduled_at and new.status <> 'cancelled' then
    t := 'appointment_changed';
  else
    return new;
  end if;
  begin
    insert into notification_events (type, entity_type, entity_id, payload, dedupe_key)
    values (t, 'prospect_sales_appointment', new.id,
      jsonb_build_object('prospectId', new.prospect_id, 'partnerId', new.partner_id, 'scheduledAt', new.scheduled_at),
      'psa:' || t || ':' || new.id || ':' || micros)
    on conflict (dedupe_key) do nothing;
  exception when others then
    raise warning 'notification enqueue failed: %', sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists trg_prospect_appointments_notify on public.prospect_sales_appointments;
create trigger trg_prospect_appointments_notify
  after insert or update of scheduled_at, status on public.prospect_sales_appointments
  for each row execute function public.enqueue_prospect_appointment();

-- ---------------------------------------------------------------------------
-- Producer 4 (scheduled): callbacks that have just come due. Called from the
-- existing /api/workflows/tick cron. Only callbacks that became due in the
-- last 3 hours are queued, so a stale next_callback_at can never replay, and
-- the dedupe key (prospect + callback time) makes reruns harmless.
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_due_callbacks()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with ins as (
    insert into notification_events (type, entity_type, entity_id, payload, dedupe_key)
    select 'callback_due', 'prospect', p.id,
      jsonb_build_object('prospectId', p.id, 'assignedTo', p.assigned_to, 'callbackAt', p.next_callback_at),
      'callback:' || p.id || ':' || ((extract(epoch from p.next_callback_at))::bigint)::text
    from contractor_prospects p
    where p.next_callback_at <= now()
      and p.next_callback_at > now() - interval '3 hours'
      and p.do_not_call_at is null
      and p.disposition <> 'do_not_call'
    on conflict (dedupe_key) do nothing
    returning 1)
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function public.enqueue_due_callbacks() from public, anon, authenticated;
grant execute on function public.enqueue_due_callbacks() to service_role;

-- Keep the outbox and logs from growing forever (called by the same tick).
create or replace function public.prune_notification_history()
returns void language sql security definer set search_path = public as $$
  delete from notification_events where processed_at < now() - interval '30 days';
  delete from push_notification_logs where created_at < now() - interval '30 days';
  delete from notifications where created_at < now() - interval '90 days';
$$;
revoke all on function public.prune_notification_history() from public, anon, authenticated;
grant execute on function public.prune_notification_history() to service_role;
