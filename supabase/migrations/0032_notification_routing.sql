-- ============================================================================
-- Admin-configurable notification routing (who each event is addressed to).
-- Additive. Read by the service role when notifications are built; only admins
-- can read or change rules. specific_user_ids is re-validated at send time
-- (active, non-contractor), so a stale id can never widen access.
-- ============================================================================
create table if not exists public.notification_routing_rules (
  type                text primary key check (type in (
    'new_lead', 'lead_assigned', 'appointment_booked', 'appointment_changed',
    'appointment_cancelled', 'callback_due', 'form_submission', 'payment_received',
    'workflow_alert'
  )),
  admins              boolean not null default false,
  assigned_setter     boolean not null default false,
  assigned_caller     boolean not null default false,
  assigned_contractor boolean not null default false,
  specific_user_ids   uuid[] not null default '{}' check (cardinality(specific_user_ids) <= 50),
  updated_by          uuid references public.profiles(id) on delete set null,
  updated_at          timestamptz not null default now()
);

alter table public.notification_routing_rules enable row level security;
drop policy if exists notification_routing_rules_admin on public.notification_routing_rules;
create policy notification_routing_rules_admin on public.notification_routing_rules for all
  using (public.is_admin()) with check (public.is_admin());
