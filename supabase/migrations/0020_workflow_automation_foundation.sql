-- ============================================================================
-- HomeQuote Network — Workflow automation foundation (Phase 1: data model)
-- ============================================================================
-- Additive migration. Run AFTER 0001-0016. Creates new tables, functions and
-- policies only; no existing table, function, policy or row is changed.
--
-- Source of truth: docs/workflow-automation-architecture.md. The value lists in
-- the CHECK constraints below are mirrored by lib/workflows (the canonical
-- TypeScript contract) and a unit test fails if the two drift apart. Extend
-- both deliberately, in a new migration, never in parallel.
--
-- Shape:  TRIGGER (workflow_events) -> optional CONDITIONS -> ordered STEPS
--
--   workflows            definition: owner, trigger, conditions, policies
--   workflow_steps       ordered steps (action | branch), tree-capable
--   workflow_events      canonical, idempotent domain-event ledger + fan-out queue
--   workflow_runs        one execution of one workflow for one event
--   workflow_step_runs   one execution of one step inside a run (retry state)
--   workflow_logs        append-only structured log
--
-- Tenancy: the tenant is the contractor business (contractors.id). There is no
-- organizations table. contractor_id NULL means HomeQuote itself (house /
-- network level), which only staff can see — the same convention funnels,
-- lead_activities scope metadata and lead_recipients already use.
--
-- Phase 1 builds NO engine: nothing emits events, claims runs or sends
-- anything. Every write path is service-role only (RLS has no write policies
-- on runtime tables), matching funnel_deliveries / lead_email_deliveries.
-- ============================================================================

-- ===========================================================================
-- WORKFLOWS
-- ===========================================================================
create table if not exists public.workflows (
  id                 uuid primary key default gen_random_uuid(),
  -- NULL = HomeQuote network workflow (sees every event). Set = that
  -- contractor's workflow (sees only events scoped to that contractor).
  contractor_id      uuid references public.contractors(id) on delete cascade,
  name               text not null check (length(trim(name)) between 1 and 120),
  description        text check (description is null or length(description) <= 2000),
  -- Templates are reusable definitions that are cloned, never run.
  is_template        boolean not null default false,
  -- Templates: their stable key. Clones: the key of the template they came from.
  template_key       text check (template_key is null or template_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  source_template_id uuid references public.workflows(id) on delete set null,
  trigger_type       text not null check (trigger_type in (
    'lead.created', 'lead.status_changed', 'lead.qualification_changed', 'lead.assigned',
    'assignment.status_changed',
    'appointment.booked', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show',
    'estimate.sent', 'deal.won', 'deal.lost',
    'task.completed', 'message.received'
  )),
  trigger_config     jsonb not null default '{}' check (jsonb_typeof(trigger_config) = 'object'),
  -- Entry conditions (a condition group) evaluated once when the event arrives.
  conditions         jsonb check (conditions is null or jsonb_typeof(conditions) = 'object'),
  -- Events that cancel this workflow's active runs for the same lead
  -- (e.g. estimate follow-up stops on deal.won). Validated in lib/workflows.
  exit_events        text[] not null default '{}',
  reentry_policy     text not null default 'once_per_event'
    check (reentry_policy in ('once_per_event', 'once_per_entity', 'one_active_per_entity')),
  enabled            boolean not null default false,
  -- Bumped by the app whenever trigger/conditions/steps change; runs record the
  -- version and a snapshot they started with, so edits never alter live runs.
  version            integer not null default 1 check (version >= 1),
  created_by         uuid references public.profiles(id) on delete set null,
  updated_by         uuid references public.profiles(id) on delete set null,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Templates are global and inert.
  constraint workflows_template_shape check (
    not is_template or (contractor_id is null and not enabled and template_key is not null)
  ),
  constraint workflows_archived_disabled check (archived_at is null or not enabled)
);

drop trigger if exists trg_workflows_updated_at on public.workflows;
create trigger trg_workflows_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

create unique index if not exists workflows_template_key_unique
  on public.workflows (template_key) where is_template;
create index if not exists idx_workflows_contractor on public.workflows (contractor_id);
-- The dispatcher's lookup: enabled workflows for an event type.
create index if not exists idx_workflows_dispatch
  on public.workflows (trigger_type, contractor_id) where enabled and archived_at is null;

-- ===========================================================================
-- WORKFLOW STEPS  (flat rows forming an ordered tree)
-- ===========================================================================
-- Root steps have parent_step_id NULL / branch NULL and run in position order.
-- A 'branch' step evaluates its conditions and runs its 'then' or 'else'
-- children (future phase). wait and stop_workflow are action types, so there
-- is exactly one registry of step behaviors.
create table if not exists public.workflow_steps (
  id             uuid primary key default gen_random_uuid(),
  workflow_id    uuid not null references public.workflows(id) on delete cascade,
  -- Stable identifier within the workflow; runs reference steps by key.
  key            text not null check (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  position       integer not null check (position >= 0),
  parent_step_id uuid,
  branch         text check (branch in ('then', 'else')),
  step_type      text not null check (step_type in ('action', 'branch')),
  action_type    text check (action_type in (
    'send_sms', 'send_email', 'assign_user', 'change_pipeline_stage', 'create_task',
    'add_tag', 'remove_tag', 'wait', 'send_webhook', 'notify_team',
    'create_calendar_event', 'stop_workflow'
  )),
  name           text check (name is null or length(name) <= 120),
  config         jsonb not null default '{}' check (jsonb_typeof(config) = 'object'),
  -- action: optional guard (step is skipped when false). branch: required.
  conditions     jsonb check (conditions is null or jsonb_typeof(conditions) = 'object'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (workflow_id, key),
  unique (workflow_id, id),
  -- A child step's parent must be in the same workflow.
  foreign key (workflow_id, parent_step_id)
    references public.workflow_steps (workflow_id, id) on delete cascade,
  -- Deferred so the app can reorder steps inside one transaction.
  constraint workflow_steps_position_unique
    unique nulls not distinct (workflow_id, parent_step_id, branch, position)
    deferrable initially deferred,
  constraint workflow_steps_parent_branch check ((parent_step_id is null) = (branch is null)),
  constraint workflow_steps_type_shape check (
    (step_type = 'action' and action_type is not null)
    or (step_type = 'branch' and action_type is null and conditions is not null)
  )
);

drop trigger if exists trg_workflow_steps_updated_at on public.workflow_steps;
create trigger trg_workflow_steps_updated_at
  before update on public.workflow_steps
  for each row execute function public.set_updated_at();

create index if not exists idx_workflow_steps_parent on public.workflow_steps (parent_step_id);

-- ===========================================================================
-- WORKFLOW EVENTS  (canonical domain-event ledger + dispatch queue)
-- ===========================================================================
-- Every trigger enters the system as one row here. idempotency_key is derived
-- deterministically from the source fact (see lib/workflows/idempotency.ts),
-- so the same webhook, retry or refresh always maps to the same row.
create table if not exists public.workflow_events (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in (
    'lead.created', 'lead.status_changed', 'lead.qualification_changed', 'lead.assigned',
    'assignment.status_changed',
    'appointment.booked', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show',
    'estimate.sent', 'deal.won', 'deal.lost',
    'task.completed', 'message.received'
  )),
  schema_version  integer not null default 1 check (schema_version >= 1),
  idempotency_key text not null check (length(idempotency_key) between 1 and 300),
  occurred_at     timestamptz not null,
  recorded_at     timestamptz not null default now(),
  -- Tenant: the contractor whose side of the lead this event belongs to.
  -- NULL = HomeQuote network side (only network workflows can match it).
  -- SET NULL: deleting a contractor must not be blocked by network runs that
  -- reacted to its events; events are staff-only, so nothing becomes visible.
  contractor_id   uuid references public.contractors(id) on delete set null,
  actor_type      text not null default 'system'
    check (actor_type in ('user', 'system', 'integration', 'contact', 'workflow')),
  actor_id        uuid references public.profiles(id) on delete set null,
  entity_type     text not null check (entity_type in (
    'lead', 'lead_assignment', 'appointment', 'estimate', 'sale', 'task', 'message'
  )),
  entity_id       uuid not null,
  -- SET NULL (not cascade) so deleting a lead keeps the audit trail and is
  -- never blocked by the runs that reference this event.
  lead_id         uuid references public.leads(id) on delete set null,
  -- Where the fact came from, e.g. 'db:leads', 'funnel:calendly', 'app:lead_actions'.
  source          text not null check (length(source) between 1 and 100),
  -- Tracing: correlation groups a chain; causation points at the direct cause
  -- (an event produced by a workflow action points at that action's event).
  correlation_id  uuid,
  causation_id    uuid references public.workflow_events(id) on delete set null,
  payload         jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  metadata        jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  -- Dispatch queue (lease pattern shared with funnel_deliveries).
  dispatch_status text not null default 'pending'
    check (dispatch_status in ('pending', 'dispatching', 'dispatched', 'failed', 'ignored')),
  dispatch_attempts integer not null default 0 check (dispatch_attempts >= 0),
  available_at    timestamptz not null default now(),
  dispatched_at   timestamptz,
  last_error      text,
  constraint workflow_events_idempotency_unique unique (idempotency_key),
  constraint workflow_events_dispatched_shape check (dispatch_status <> 'dispatched' or dispatched_at is not null)
);

create index if not exists idx_workflow_events_queue
  on public.workflow_events (available_at) where dispatch_status in ('pending', 'dispatching', 'failed');
create index if not exists idx_workflow_events_lead on public.workflow_events (lead_id, occurred_at desc);
create index if not exists idx_workflow_events_entity on public.workflow_events (entity_type, entity_id);
create index if not exists idx_workflow_events_contractor on public.workflow_events (contractor_id, occurred_at desc);
create index if not exists idx_workflow_events_type on public.workflow_events (type, occurred_at desc);

-- ===========================================================================
-- WORKFLOW RUNS
-- ===========================================================================
create table if not exists public.workflow_runs (
  id                  uuid primary key default gen_random_uuid(),
  -- NO ACTION: a workflow with history is archived, not deleted directly
  -- (deleting its contractor still cascades cleanly at end of statement).
  workflow_id         uuid not null references public.workflows(id),
  workflow_version    integer not null check (workflow_version >= 1),
  -- The trigger, conditions and steps as they were when the run started.
  definition_snapshot jsonb not null check (jsonb_typeof(definition_snapshot) = 'object'),
  -- Copied from the workflow by trigger; never trusted from the caller.
  contractor_id       uuid references public.contractors(id) on delete cascade,
  trigger_event_id    uuid not null references public.workflow_events(id),
  lead_id             uuid references public.leads(id) on delete set null,
  entity_type         text not null check (entity_type in (
    'lead', 'lead_assignment', 'appointment', 'estimate', 'sale', 'task', 'message'
  )),
  entity_id           uuid not null,
  status              text not null default 'pending'
    check (status in ('pending', 'running', 'waiting', 'completed', 'failed', 'cancelled')),
  current_step_key    text,
  -- reentry_policy = once_per_entity -> '<entity_type>:<entity_id>' (unique forever)
  dedupe_key          text,
  -- reentry_policy = one_active_per_entity -> '<entity_type>:<entity_id>' (unique while active)
  concurrency_key     text,
  -- When the run should next be picked up (pending: now; waiting: wake time).
  resume_at           timestamptz,
  -- Lease held by a worker while status = 'running'; expired lease = crashed worker.
  locked_by           text,
  locked_until        timestamptz,
  context             jsonb not null default '{}' check (jsonb_typeof(context) = 'object'),
  metadata            jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  -- WorkflowError shape: {code, message, kind, retryable, details?}
  last_error          jsonb check (last_error is null or jsonb_typeof(last_error) = 'object'),
  cancel_reason       text,
  started_at          timestamptz,
  completed_at        timestamptz,
  failed_at           timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, workflow_id),
  -- Idempotency layer 2: one run per workflow per event, always.
  constraint workflow_runs_event_unique unique (workflow_id, trigger_event_id),
  constraint workflow_runs_completed_shape check (status <> 'completed' or completed_at is not null),
  constraint workflow_runs_failed_shape check (status <> 'failed' or (failed_at is not null and last_error is not null)),
  constraint workflow_runs_cancelled_shape check (status <> 'cancelled' or cancelled_at is not null),
  -- Every wait has a wake-up time, so no run can wait forever.
  constraint workflow_runs_waiting_shape check (status <> 'waiting' or resume_at is not null)
);

drop trigger if exists trg_workflow_runs_updated_at on public.workflow_runs;
create trigger trg_workflow_runs_updated_at
  before update on public.workflow_runs
  for each row execute function public.set_updated_at();

create unique index if not exists workflow_runs_dedupe_unique
  on public.workflow_runs (workflow_id, dedupe_key) where dedupe_key is not null;
create unique index if not exists workflow_runs_active_unique
  on public.workflow_runs (workflow_id, concurrency_key)
  where concurrency_key is not null and status in ('pending', 'running', 'waiting');
-- The scheduler's lookup: due runs (survives deploys/restarts — no setTimeout).
create index if not exists idx_workflow_runs_due
  on public.workflow_runs (resume_at) where status in ('pending', 'waiting', 'running');
create index if not exists idx_workflow_runs_lead on public.workflow_runs (lead_id, created_at desc);
create index if not exists idx_workflow_runs_workflow on public.workflow_runs (workflow_id, created_at desc);
create index if not exists idx_workflow_runs_contractor on public.workflow_runs (contractor_id, created_at desc);
create index if not exists idx_workflow_runs_event on public.workflow_runs (trigger_event_id);

-- ===========================================================================
-- WORKFLOW STEP RUNS
-- ===========================================================================
create table if not exists public.workflow_step_runs (
  id                uuid primary key default gen_random_uuid(),
  run_id            uuid not null references public.workflow_runs(id) on delete cascade,
  -- Copied from the run by trigger; never trusted from the caller.
  contractor_id     uuid references public.contractors(id) on delete cascade,
  step_key          text not null check (step_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  -- Reserved for loops / re-entry of the same step within one run. 0 today.
  iteration         integer not null default 0 check (iteration >= 0),
  step_type         text not null check (step_type in ('action', 'branch')),
  action_type       text check (action_type in (
    'send_sms', 'send_email', 'assign_user', 'change_pipeline_stage', 'create_task',
    'add_tag', 'remove_tag', 'wait', 'send_webhook', 'notify_team',
    'create_calendar_event', 'stop_workflow'
  )),
  status            text not null default 'pending'
    check (status in ('pending', 'running', 'waiting', 'retry_scheduled', 'succeeded', 'failed', 'skipped', 'cancelled')),
  -- '<run_id>:<step_key>:<iteration>' — passed to every side-effecting handler
  -- and provider so a retried step never double-sends.
  idempotency_key   text not null,
  attempt_count     integer not null default 0 check (attempt_count >= 0),
  max_attempts      integer not null default 1 check (max_attempts between 1 and 20),
  next_retry_at     timestamptz,
  resume_at         timestamptz,
  failure_kind      text check (failure_kind in ('temporary', 'permanent')),
  input             jsonb not null default '{}' check (jsonb_typeof(input) = 'object'),
  output            jsonb check (output is null or jsonb_typeof(output) = 'object'),
  last_error        jsonb check (last_error is null or jsonb_typeof(last_error) = 'object'),
  -- ProviderMetadata shape: {provider, providerMessageId?, statusCode?, ...}
  provider          jsonb check (provider is null or jsonb_typeof(provider) = 'object'),
  skip_reason       text,
  locked_by         text,
  locked_until      timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Idempotency layer 3: one execution record per step per iteration per run.
  constraint workflow_step_runs_step_unique unique (run_id, step_key, iteration),
  constraint workflow_step_runs_idempotency_unique unique (idempotency_key),
  constraint workflow_step_runs_retry_shape check (status <> 'retry_scheduled' or (next_retry_at is not null and failure_kind = 'temporary')),
  constraint workflow_step_runs_failed_shape check (status <> 'failed' or (last_error is not null and failure_kind is not null)),
  constraint workflow_step_runs_succeeded_shape check (status <> 'succeeded' or completed_at is not null),
  constraint workflow_step_runs_waiting_shape check (status <> 'waiting' or resume_at is not null),
  constraint workflow_step_runs_attempts_shape check (attempt_count <= max_attempts),
  constraint workflow_step_runs_type_shape check ((step_type = 'action') = (action_type is not null))
);

drop trigger if exists trg_workflow_step_runs_updated_at on public.workflow_step_runs;
create trigger trg_workflow_step_runs_updated_at
  before update on public.workflow_step_runs
  for each row execute function public.set_updated_at();

create index if not exists idx_workflow_step_runs_run on public.workflow_step_runs (run_id, created_at);
create index if not exists idx_workflow_step_runs_retry
  on public.workflow_step_runs (next_retry_at) where status = 'retry_scheduled';

-- ===========================================================================
-- WORKFLOW LOGS  (append-only)
-- ===========================================================================
create table if not exists public.workflow_logs (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid references public.workflows(id) on delete cascade,
  run_id        uuid references public.workflow_runs(id) on delete cascade,
  step_run_id   uuid references public.workflow_step_runs(id) on delete cascade,
  event_id      uuid references public.workflow_events(id) on delete cascade,
  -- Copied from the run (when there is one) by trigger.
  contractor_id uuid references public.contractors(id) on delete cascade,
  level         text not null check (level in ('debug', 'info', 'warn', 'error')),
  -- Canonical codes live in lib/workflows/logging.ts (WORKFLOW_LOG_CODES).
  code          text not null check (code ~ '^[a-z]+(\.[a-z_]+)+$'),
  message       text not null check (length(message) <= 1000),
  -- Ids and codes only — never contact details, message bodies or secrets.
  data          jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at    timestamptz not null default now()
);

create index if not exists idx_workflow_logs_run on public.workflow_logs (run_id, created_at);
create index if not exists idx_workflow_logs_event on public.workflow_logs (event_id);
create index if not exists idx_workflow_logs_created on public.workflow_logs (created_at desc);

-- ===========================================================================
-- TENANT GUARDS  (the database, not the app, decides who a run belongs to)
-- ===========================================================================
-- A run inherits its tenant from its workflow. A contractor workflow may only
-- run on events scoped to that same contractor, and only on leads assigned to
-- that contractor — shared leads must never leak one contractor's automation
-- into another's side. Templates never run.
create or replace function public.guard_workflow_run()
returns trigger language plpgsql set search_path = public as $$
declare wf public.workflows; ev public.workflow_events;
begin
  if tg_op = 'UPDATE' then
    if new.workflow_id is distinct from old.workflow_id
       or new.contractor_id is distinct from old.contractor_id
       or new.trigger_event_id is distinct from old.trigger_event_id
       or new.lead_id is distinct from old.lead_id and new.lead_id is not null
       or new.entity_type is distinct from old.entity_type
       or new.entity_id is distinct from old.entity_id
       or new.definition_snapshot is distinct from old.definition_snapshot then
      raise exception 'workflow run identity is immutable';
    end if;
    -- Terminal states are final.
    if old.status in ('completed', 'failed', 'cancelled') and new.status is distinct from old.status then
      raise exception 'workflow run % is already %', old.id, old.status;
    end if;
    return new;
  end if;

  select * into wf from public.workflows where id = new.workflow_id;
  if wf.is_template then raise exception 'workflow templates cannot run'; end if;
  select * into ev from public.workflow_events where id = new.trigger_event_id;
  if ev.type is distinct from wf.trigger_type then
    raise exception 'event type % does not match workflow trigger %', ev.type, wf.trigger_type;
  end if;
  new.contractor_id := wf.contractor_id;
  if wf.contractor_id is not null then
    if ev.contractor_id is distinct from wf.contractor_id then
      raise exception 'event belongs to a different tenant than the workflow';
    end if;
    if new.lead_id is not null and not exists (
      select 1 from public.lead_assignments la
      where la.lead_id = new.lead_id and la.contractor_id = wf.contractor_id
    ) then
      raise exception 'lead is not assigned to the workflow''s contractor';
    end if;
  end if;
  if new.lead_id is not null and ev.lead_id is not null and new.lead_id <> ev.lead_id then
    raise exception 'run lead does not match the event lead';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_workflow_runs_guard on public.workflow_runs;
create trigger trg_workflow_runs_guard
  before insert or update on public.workflow_runs
  for each row execute function public.guard_workflow_run();

create or replace function public.guard_workflow_step_run()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.run_id is distinct from old.run_id
       or new.contractor_id is distinct from old.contractor_id
       or new.step_key is distinct from old.step_key
       or new.iteration is distinct from old.iteration
       or new.idempotency_key is distinct from old.idempotency_key then
      raise exception 'workflow step run identity is immutable';
    end if;
    if old.status in ('succeeded', 'failed', 'skipped', 'cancelled') and new.status is distinct from old.status then
      raise exception 'workflow step run % is already %', old.id, old.status;
    end if;
    return new;
  end if;
  select contractor_id into new.contractor_id from public.workflow_runs where id = new.run_id;
  return new;
end;
$$;

drop trigger if exists trg_workflow_step_runs_guard on public.workflow_step_runs;
create trigger trg_workflow_step_runs_guard
  before insert or update on public.workflow_step_runs
  for each row execute function public.guard_workflow_step_run();

create or replace function public.guard_workflow_log()
returns trigger language plpgsql set search_path = public as $$
declare r public.workflow_runs;
begin
  if new.step_run_id is not null then
    select run_id into new.run_id from public.workflow_step_runs where id = new.step_run_id;
  end if;
  if new.run_id is not null then
    select * into r from public.workflow_runs where id = new.run_id;
    new.workflow_id := r.workflow_id;
    new.contractor_id := r.contractor_id;
    new.event_id := coalesce(new.event_id, r.trigger_event_id);
  elsif new.event_id is not null then
    select contractor_id into new.contractor_id from public.workflow_events where id = new.event_id;
  elsif new.workflow_id is not null then
    select contractor_id into new.contractor_id from public.workflows where id = new.workflow_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_workflow_logs_guard on public.workflow_logs;
create trigger trg_workflow_logs_guard
  before insert on public.workflow_logs
  for each row execute function public.guard_workflow_log();

-- ===========================================================================
-- EVENT ENTRY POINT  (the one way events get in)
-- ===========================================================================
-- Idempotent: a repeated idempotency_key returns the original event id and
-- changes nothing. Emitters (DB triggers, webhooks, server actions — Phase 2)
-- must call this rather than inserting directly. Service role only.
create or replace function public.emit_workflow_event(
  p_type text,
  p_idempotency_key text,
  p_entity_type text,
  p_entity_id uuid,
  p_source text,
  p_occurred_at timestamptz default now(),
  p_contractor_id uuid default null,
  p_lead_id uuid default null,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_payload jsonb default '{}',
  p_metadata jsonb default '{}',
  p_correlation_id uuid default null,
  p_causation_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid;
begin
  insert into public.workflow_events (type, idempotency_key, occurred_at, contractor_id, actor_type, actor_id,
    entity_type, entity_id, lead_id, source, correlation_id, causation_id, payload, metadata)
  values (p_type, p_idempotency_key, p_occurred_at, p_contractor_id, p_actor_type, p_actor_id,
    p_entity_type, p_entity_id, p_lead_id, p_source, p_correlation_id, p_causation_id,
    coalesce(p_payload, '{}'), coalesce(p_metadata, '{}'))
  on conflict (idempotency_key) do nothing
  returning id into e;
  if e is null then
    select id into e from public.workflow_events where idempotency_key = p_idempotency_key;
  end if;
  return e;
end;
$$;
revoke all on function public.emit_workflow_event(text,text,text,uuid,text,timestamptz,uuid,uuid,text,uuid,jsonb,jsonb,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.emit_workflow_event(text,text,text,uuid,text,timestamptz,uuid,uuid,text,uuid,jsonb,jsonb,uuid,uuid)
  to service_role;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
-- Reads: admins see everything. Appointment setters have no Automations
-- access (product decision 2026-09-25; nav, page guards and these policies
-- move together). A contractor login sees only rows scoped to its own
-- contractor_id — never NULL (HomeQuote) rows, never another contractor's.
-- Events and logs are admin-only: they carry network-level detail about
-- shared leads.
-- Writes: definitions are admin-only; runtime tables have no write policies
-- (service role only), like every other outbox/queue in this schema.
alter table public.workflows          enable row level security;
alter table public.workflow_steps     enable row level security;
alter table public.workflow_events    enable row level security;
alter table public.workflow_runs      enable row level security;
alter table public.workflow_step_runs enable row level security;
alter table public.workflow_logs      enable row level security;

drop policy if exists workflows_select on public.workflows;
create policy workflows_select on public.workflows for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));
drop policy if exists workflows_insert on public.workflows;
create policy workflows_insert on public.workflows for insert with check (public.is_admin());
drop policy if exists workflows_update on public.workflows;
create policy workflows_update on public.workflows for update
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists workflows_delete on public.workflows;
create policy workflows_delete on public.workflows for delete using (public.is_admin());

drop policy if exists workflow_steps_select on public.workflow_steps;
create policy workflow_steps_select on public.workflow_steps for select
  using (public.is_admin() or exists (
    select 1 from public.workflows w
    where w.id = workflow_steps.workflow_id
      and w.contractor_id is not null and w.contractor_id = public.auth_contractor_id()
  ));
drop policy if exists workflow_steps_write on public.workflow_steps;
create policy workflow_steps_write on public.workflow_steps for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists workflow_events_select on public.workflow_events;
create policy workflow_events_select on public.workflow_events for select using (public.is_admin());

drop policy if exists workflow_runs_select on public.workflow_runs;
create policy workflow_runs_select on public.workflow_runs for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));

drop policy if exists workflow_step_runs_select on public.workflow_step_runs;
create policy workflow_step_runs_select on public.workflow_step_runs for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));

drop policy if exists workflow_logs_select on public.workflow_logs;
create policy workflow_logs_select on public.workflow_logs for select using (public.is_admin());

comment on table public.workflow_events is
  'Canonical workflow domain-event ledger. Insert only through emit_workflow_event(); idempotency_key dedupes webhooks, retries and refreshes. See docs/workflow-automation-architecture.md.';
comment on table public.workflow_runs is
  'One execution of one workflow for one event. Tenant copied from the workflow by trg_workflow_runs_guard. Service-role writes only.';
comment on table public.workflow_logs is
  'Append-only structured workflow log. Ids and codes only; no contact details, message bodies or secrets.';
