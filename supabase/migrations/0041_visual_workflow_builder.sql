-- ============================================================================
-- Visual workflow builder (graph engine)
-- ============================================================================
-- ADDITIVE. Existing "linear" workflows (engine = 'linear', the default) keep
-- working exactly as before: same tables, same tick, same dispatcher. New
-- "graph" workflows reuse workflows / workflow_runs / workflow_step_runs /
-- workflow_events / workflow_logs and add:
--
--   workflow_graph_drafts   one mutable, autosaved draft per graph workflow
--   workflow_versions       IMMUTABLE published snapshots (runs pin to one)
--   workflow_waits          durable "wait for a call result / an event" records
--   workflow_tasks          staff tasks / follow-up reminders created by workflows
--   workflow_builder_access which contractors may edit their own workflows
--
-- and extends the AI-call queue (ai_call_jobs) so a workflow call node is a
-- first-class, deduplicated, consent-checked call that wakes its run.
--
-- Roll-back plan: docs/visual-workflow-builder.md ("Production migration and
-- rollback"). Nothing here rewrites or deletes existing rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Event vocabulary: appointment.rescheduled, estimate.accepted,
--    ai_call.completed, ai_call.failed, workflow.manual_enrollment
--    (mirrored by lib/workflows/events.ts; a test fails if they drift)
-- ---------------------------------------------------------------------------
alter table public.workflows drop constraint if exists workflows_trigger_type_check;
alter table public.workflows add constraint workflows_trigger_type_check check (trigger_type in (
  'lead.created', 'lead.status_changed', 'lead.qualification_changed', 'lead.assigned',
  'assignment.status_changed',
  'appointment.booked', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show',
  'appointment.rescheduled',
  'estimate.sent', 'estimate.accepted', 'deal.won', 'deal.lost',
  'task.completed', 'message.received',
  'ai_call.completed', 'ai_call.failed', 'workflow.manual_enrollment'
));
alter table public.workflow_events drop constraint if exists workflow_events_type_check;
alter table public.workflow_events add constraint workflow_events_type_check check (type in (
  'lead.created', 'lead.status_changed', 'lead.qualification_changed', 'lead.assigned',
  'assignment.status_changed',
  'appointment.booked', 'appointment.cancelled', 'appointment.completed', 'appointment.no_show',
  'appointment.rescheduled',
  'estimate.sent', 'estimate.accepted', 'deal.won', 'deal.lost',
  'task.completed', 'message.received',
  'ai_call.completed', 'ai_call.failed', 'workflow.manual_enrollment'
));

-- Step-run node types: the legacy action types plus the graph node types.
-- Graph nodes are stored as step_type 'action' (action_type = node type) except
-- condition nodes, which are step_type 'branch' with no action_type.
alter table public.workflow_step_runs drop constraint if exists workflow_step_runs_action_type_check;
alter table public.workflow_step_runs add constraint workflow_step_runs_action_type_check check (action_type in (
  'send_sms', 'send_email', 'assign_user', 'change_pipeline_stage', 'create_task',
  'add_tag', 'remove_tag', 'wait', 'send_webhook', 'notify_team',
  'create_calendar_event', 'stop_workflow', 'send_push',
  'ai_call', 'add_note', 'update_lead_status', 'assign_lead', 'send_notification',
  'wait_duration', 'wait_business_hours', 'wait_event', 'end'
));

-- ---------------------------------------------------------------------------
-- 2. workflows: engine, lifecycle, enrollment cut-off
-- ---------------------------------------------------------------------------
alter table public.workflows
  add column if not exists engine text not null default 'linear' check (engine in ('linear', 'graph')),
  add column if not exists graph_status text check (graph_status in ('draft', 'published', 'paused')),
  add column if not exists published_version integer,
  add column if not exists published_at timestamptz,
  -- Events recorded BEFORE this instant never enroll (publish / resume never
  -- back-fills historical or paused-period events).
  add column if not exists enroll_from timestamptz;

alter table public.workflows drop constraint if exists workflows_graph_shape;
alter table public.workflows add constraint workflows_graph_shape check (
  (engine = 'linear' and graph_status is null)
  or (engine = 'graph' and graph_status is not null and not is_template)
);

create index if not exists idx_workflows_graph_dispatch
  on public.workflows (trigger_type, contractor_id)
  where engine = 'graph' and enabled and archived_at is null;

-- Which contractor companies may edit their own graph workflows. Admin-write.
create table if not exists public.workflow_builder_access (
  contractor_id uuid primary key references public.contractors(id) on delete cascade,
  enabled       boolean not null default false,
  updated_by    uuid references public.profiles(id) on delete set null,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Permission helpers (database-level, not just app code)
-- ---------------------------------------------------------------------------
create or replace function public.workflow_can_manage(p_contractor uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    p_contractor is not null and exists (
      select 1 from public.profiles p
      join public.workflow_builder_access a on a.contractor_id = p.contractor_id and a.enabled
      where p.id = auth.uid() and p.is_active and p.role = 'contractor'
        and p.contractor_role = 'owner' and p.contractor_id = p_contractor
    )
  )
$$;
revoke all on function public.workflow_can_manage(uuid) from public, anon;
grant execute on function public.workflow_can_manage(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Drafts and immutable versions
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_graph_drafts (
  workflow_id  uuid primary key references public.workflows(id) on delete cascade,
  graph        jsonb not null check (jsonb_typeof(graph) = 'object'),
  -- Optimistic concurrency token: every save must name the revision it started from.
  revision     integer not null default 1 check (revision >= 1),
  content_hash text,
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);

create table if not exists public.workflow_versions (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references public.workflows(id) on delete cascade,
  version      integer not null check (version >= 1),
  graph        jsonb not null check (jsonb_typeof(graph) = 'object'),
  content_hash text not null,
  note         text check (note is null or length(note) <= 500),
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (workflow_id, version)
);

create or replace function public.workflow_versions_immutable()
returns trigger language plpgsql as $$
begin
  -- A cascade from deleting the parent workflow is the only permitted delete.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'published workflow versions are immutable' using errcode = '42501';
end $$;
drop trigger if exists trg_workflow_versions_immutable on public.workflow_versions;
create trigger trg_workflow_versions_immutable
  before update or delete on public.workflow_versions
  for each row execute function public.workflow_versions_immutable();

alter table public.workflow_runs
  add column if not exists workflow_version_id uuid references public.workflow_versions(id),
  add column if not exists mode text not null default 'live' check (mode in ('live', 'test')),
  add column if not exists enrollment_source text not null default 'event'
    check (enrollment_source in ('event', 'manual', 'test'));
create index if not exists idx_workflow_runs_version on public.workflow_runs (workflow_version_id);

-- ---------------------------------------------------------------------------
-- 5. Durable waits (call result / event) — a wait always has a timeout, and the
--    run's resume_at is that timeout, so a missing webhook can never strand a run.
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_waits (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references public.workflow_runs(id) on delete cascade,
  step_key           text not null check (step_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  kind               text not null check (kind in ('call', 'event')),
  status             text not null default 'open' check (status in ('open', 'satisfied', 'timed_out', 'cancelled')),
  contractor_id      uuid references public.contractors(id) on delete cascade,
  lead_id            uuid references public.leads(id) on delete cascade,
  event_types        text[] not null default '{}',
  match              jsonb not null default '{}' check (jsonb_typeof(match) = 'object'),
  call_job_id        uuid references public.ai_call_jobs(id) on delete set null,
  since              timestamptz not null default now(),
  timeout_at         timestamptz not null,
  satisfied_event_id uuid references public.workflow_events(id) on delete set null,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (run_id, step_key)
);
create index if not exists idx_workflow_waits_open_event
  on public.workflow_waits (lead_id) where status = 'open' and kind = 'event';
create index if not exists idx_workflow_waits_call on public.workflow_waits (call_job_id) where call_job_id is not null;

-- ---------------------------------------------------------------------------
-- 6. Staff tasks / follow-up reminders
-- ---------------------------------------------------------------------------
create table if not exists public.workflow_tasks (
  id               uuid primary key default gen_random_uuid(),
  contractor_id    uuid references public.contractors(id) on delete cascade,
  lead_id          uuid references public.leads(id) on delete set null,
  run_id           uuid references public.workflow_runs(id) on delete set null,
  -- One task per workflow step run: a retried step never creates a second one.
  step_run_id      uuid unique references public.workflow_step_runs(id) on delete set null,
  title            text not null check (length(trim(title)) between 1 and 200),
  description      text check (description is null or length(description) <= 2000),
  due_at           timestamptz,
  assignee_user_id uuid references public.profiles(id) on delete set null,
  status           text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  completed_by     uuid references public.profiles(id) on delete set null,
  constraint workflow_tasks_done_shape check (status <> 'done' or completed_at is not null)
);
create index if not exists idx_workflow_tasks_open on public.workflow_tasks (contractor_id, due_at) where status = 'open';
create index if not exists idx_workflow_tasks_lead on public.workflow_tasks (lead_id);

-- Notes written by a workflow are idempotent per step run.
create unique index if not exists lead_activities_workflow_step_once
  on public.lead_activities ((metadata ->> 'step_run_id'))
  where metadata ? 'step_run_id' and metadata ->> 'source' = 'workflow';

-- ---------------------------------------------------------------------------
-- 7. AI call queue: workflow-sourced calls
-- ---------------------------------------------------------------------------
alter table public.ai_call_jobs drop constraint if exists ai_call_jobs_trigger_source_check;
alter table public.ai_call_jobs add constraint ai_call_jobs_trigger_source_check
  check (trigger_source in ('auto_form', 'manual', 'workflow'));
alter table public.ai_call_jobs
  add column if not exists workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  add column if not exists workflow_step_key text,
  -- Per-node overrides (bounded by the global settings in app code).
  add column if not exists retry_delay_minutes integer check (retry_delay_minutes is null or retry_delay_minutes between 5 and 1440),
  add column if not exists window_start_hour smallint check (window_start_hour is null or window_start_hour between 0 and 23),
  add column if not exists window_end_hour smallint check (window_end_hour is null or window_end_hour between 1 and 24);
create unique index if not exists ai_call_jobs_workflow_step_once
  on public.ai_call_jobs (workflow_run_id, workflow_step_key) where trigger_source = 'workflow';
create index if not exists idx_ai_call_jobs_workflow_run on public.ai_call_jobs (workflow_run_id);

-- A fourth contractor mode: calls come ONLY from published workflows (the
-- automatic form-to-call trigger stays off for this contractor).
alter table public.ai_calling_contractor_settings drop constraint if exists ai_calling_contractor_settings_mode_check;
alter table public.ai_calling_contractor_settings add constraint ai_calling_contractor_settings_mode_check
  check (mode in ('off', 'manual_only', 'automatic', 'workflow_only'));

-- ---------------------------------------------------------------------------
-- 8. Wake runs when something they wait for happens (never raises)
-- ---------------------------------------------------------------------------
create or replace function public.workflow_wake_run(p_run uuid)
returns void language sql security definer set search_path = public as $$
  update public.workflow_runs set resume_at = now()
   where id = p_run and status = 'waiting' and resume_at > now() and resume_at <> 'infinity';
$$;
revoke all on function public.workflow_wake_run(uuid) from public, anon, authenticated;
grant execute on function public.workflow_wake_run(uuid) to service_role;

create or replace function public.workflow_on_ai_call_job_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.status is distinct from old.status or new.analysis is distinct from old.analysis then
      -- Resume every run waiting on this call (its own and an adopted one).
      update public.workflow_runs r set resume_at = now()
        from public.workflow_waits w
       where w.call_job_id = new.id and w.status = 'open' and w.run_id = r.id
         and r.status = 'waiting' and r.resume_at > now() and r.resume_at <> 'infinity';
    end if;
    if new.status is distinct from old.status and new.lead_id is not null and new.contractor_id is not null then
      if new.status = 'completed' then
        perform public.emit_workflow_event('ai_call.completed', 'ai_call.completed|ai_call:' || new.id || ':completed',
          'lead', new.lead_id, 'db:ai_call_jobs', now(), new.contractor_id, new.lead_id, 'system', null,
          jsonb_build_object('leadId', new.lead_id, 'contractorId', new.contractor_id, 'callJobId', new.id,
            'executionStatus', 'completed', 'durationSeconds', new.duration_seconds, 'workflowRunId', new.workflow_run_id),
          '{}', null, null);
      elsif new.status in ('failed', 'expired', 'no_answer', 'busy') then
        perform public.emit_workflow_event('ai_call.failed', 'ai_call.failed|ai_call:' || new.id || ':' || new.status,
          'lead', new.lead_id, 'db:ai_call_jobs', now(), new.contractor_id, new.lead_id, 'system', null,
          jsonb_build_object('leadId', new.lead_id, 'contractorId', new.contractor_id, 'callJobId', new.id,
            'executionStatus', new.status, 'reason', left(coalesce(new.last_error, new.block_reason), 200), 'workflowRunId', new.workflow_run_id),
          '{}', null, null);
      end if;
    end if;
  exception when others then
    raise warning 'workflow ai-call hook failed for job %: %', new.id, sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists trg_ai_call_jobs_workflow on public.ai_call_jobs;
create trigger trg_ai_call_jobs_workflow
  after update of status, analysis on public.ai_call_jobs
  for each row execute function public.workflow_on_ai_call_job_change();

-- Safety net run by the scheduler tick: wake runs whose wait is already
-- satisfied, or whose call reached a final state without the trigger firing.
create or replace function public.workflow_sweep_waits()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with due as (
    select distinct w.run_id from public.workflow_waits w
    left join public.ai_call_jobs j on j.id = w.call_job_id
    where w.status = 'satisfied'
       or (w.kind = 'call' and w.status = 'open' and (
            j.status in ('no_answer', 'busy', 'failed', 'cancelled', 'expired', 'blocked')
            or (j.status = 'completed' and j.analysis is not null)))
  )
  update public.workflow_runs r set resume_at = now() from due
   where r.id = due.run_id and r.status = 'waiting' and r.resume_at > now() and r.resume_at <> 'infinity';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.workflow_sweep_waits() from public, anon, authenticated;
grant execute on function public.workflow_sweep_waits() to service_role;

-- An event arrived: satisfy every matching "wait for event" and wake its run.
create or replace function public.workflow_satisfy_event_waits(p_event uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; ev public.workflow_events;
begin
  select * into ev from public.workflow_events where id = p_event;
  if ev.id is null or ev.lead_id is null then return 0; end if;
  with hit as (
    update public.workflow_waits w
       set status = 'satisfied', satisfied_event_id = ev.id, resolved_at = now()
     where w.status = 'open' and w.kind = 'event' and w.lead_id = ev.lead_id
       and ev.type = any (w.event_types) and ev.recorded_at >= w.since
       and (w.contractor_id is null or w.contractor_id = ev.contractor_id)
       and (w.match -> 'toStatuses' is null
            or ev.payload ->> 'toStatus' in (select jsonb_array_elements_text(w.match -> 'toStatuses')))
    returning w.run_id)
  update public.workflow_runs r set resume_at = now() from hit
   where r.id = hit.run_id and r.status = 'waiting' and r.resume_at > now() and r.resume_at <> 'infinity';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.workflow_satisfy_event_waits(uuid) from public, anon, authenticated;
grant execute on function public.workflow_satisfy_event_waits(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 9. Guards: manual enrollment events + audited "retry failed run"
--    (identical to 0020 except where marked)
-- ---------------------------------------------------------------------------
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
       or new.definition_snapshot is distinct from old.definition_snapshot
       or new.mode is distinct from old.mode
       or new.workflow_version_id is distinct from old.workflow_version_id then
      raise exception 'workflow run identity is immutable';
    end if;
    -- Terminal states are final — except an explicit, audited "retry failed run"
    -- (workflow_retry_run sets app.workflow_revive for its own transaction).
    if old.status in ('completed', 'failed', 'cancelled') and new.status is distinct from old.status then
      if not (old.status = 'failed' and new.status = 'pending'
              and coalesce(current_setting('app.workflow_revive', true), '') = 'on') then
        raise exception 'workflow run % is already %', old.id, old.status;
      end if;
    end if;
    return new;
  end if;

  select * into wf from public.workflows where id = new.workflow_id;
  if wf.is_template then raise exception 'workflow templates cannot run'; end if;
  select * into ev from public.workflow_events where id = new.trigger_event_id;
  if ev.type = 'workflow.manual_enrollment' then
    -- Manual enrollment / live test: the event must name THIS workflow.
    if ev.payload ->> 'workflowId' is distinct from wf.id::text then
      raise exception 'manual enrollment event names a different workflow';
    end if;
  elsif ev.type is distinct from wf.trigger_type then
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
      if not (old.status = 'failed' and new.status = 'retry_scheduled'
              and coalesce(current_setting('app.workflow_revive', true), '') = 'on') then
        raise exception 'workflow step run % is already %', old.id, old.status;
      end if;
    end if;
    return new;
  end if;
  select contractor_id into new.contractor_id from public.workflow_runs where id = new.run_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. New event emitters (additive; existing events unchanged)
-- ---------------------------------------------------------------------------
-- appointment.rescheduled: the booked time moved.
create or replace function public.emit_appointment_workflow_events() returns trigger language plpgsql security definer set search_path=public as $$
declare a lead_assignments;typ text;actor text:=workflow_actor_type();cause uuid:=workflow_context_uuid('app.workflow_causation_id');corr uuid:=workflow_context_uuid('app.workflow_correlation_id');micros text;booking_provider text;booking_external text;
begin select * into a from lead_assignments where id=new.assignment_id;
 if tg_op='INSERT' then
  select fb.provider,fb.external_id into booking_provider,booking_external from funnel_bookings fb
   join funnel_sessions fs on fs.id=fb.session_id join funnels f on f.id=fs.funnel_id
   where fb.appointment_id is null and fs.lead_id=a.lead_id and f.contractor_id=a.contractor_id
    and fb.scheduled_at is not distinct from new.scheduled_at order by fb.id limit 1;
  perform emit_workflow_event('appointment.booked','appointment.booked|'||case when booking_external is null then 'appointment:'||new.id else 'booking:'||coalesce(booking_provider,'integration')||':'||booking_external end,'appointment',new.id,'db:appointments',new.created_at,a.contractor_id,a.lead_id,actor,
  case when actor='workflow' then null else new.created_by end,jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'appointmentId',new.id,'scheduledAt',new.scheduled_at),'{}',corr,cause);return new;end if;
 -- NEW in 0041: the time moved (only for an appointment that still stands).
 if new.scheduled_at is distinct from old.scheduled_at and old.scheduled_at is not null and new.scheduled_at is not null
    and new.status in ('scheduled','rescheduled') then
  perform emit_workflow_event('appointment.rescheduled','appointment.rescheduled|appointment:'||new.id||':rescheduled:'||((extract(epoch from new.scheduled_at)*1000000)::bigint)::text,'appointment',new.id,'db:appointments',new.updated_at,a.contractor_id,a.lead_id,actor,null,
   jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'appointmentId',new.id,'scheduledAt',new.scheduled_at,'previousScheduledAt',old.scheduled_at),'{}',corr,cause);
 end if;
 if new.status is not distinct from old.status then return new;end if;typ:=case new.status when 'cancelled' then 'appointment.cancelled' when 'held' then 'appointment.completed' when 'no_show' then 'appointment.no_show' end;if typ is null then return new;end if;
 micros:=((extract(epoch from new.updated_at)*1000000)::bigint)::text;perform emit_workflow_event(typ,typ||'|appointment:'||new.id||':status:'||new.status||':'||micros,'appointment',new.id,'db:appointments',new.updated_at,a.contractor_id,a.lead_id,actor,null,
 jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'appointmentId',new.id,'scheduledAt',new.scheduled_at,'fromStatus',old.status,'toStatus',new.status),'{}',corr,cause);return new;end $$;
drop trigger if exists trg_appointments_workflow_events on public.appointments;
create trigger trg_appointments_workflow_events after insert or update of status, scheduled_at on public.appointments for each row execute function emit_appointment_workflow_events();

-- estimate.accepted (estimate.sent is unchanged).
create or replace function public.emit_estimate_workflow_event() returns trigger language plpgsql security definer set search_path=public as $$
declare a lead_assignments;begin
 if new.status not in ('sent','accepted') or (tg_op='UPDATE' and old.status=new.status) then return new;end if;
 select * into a from lead_assignments where id=new.assignment_id;
 perform emit_workflow_event('estimate.'||new.status,'estimate.'||new.status||'|estimate:'||new.id||':'||new.status,'estimate',new.id,'db:estimates',new.updated_at,a.contractor_id,a.lead_id,workflow_actor_type(),null,
 jsonb_build_object('leadId',a.lead_id,'assignmentId',a.id,'contractorId',a.contractor_id,'estimateId',new.id,'amount',new.amount),'{}',workflow_context_uuid('app.workflow_correlation_id'),workflow_context_uuid('app.workflow_causation_id'));return new;end $$;

-- task.completed (workflow_tasks).
create or replace function public.emit_task_workflow_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status = 'done' and old.status is distinct from 'done' then
  perform emit_workflow_event('task.completed','task.completed|task:'||new.id||':completed:'||((extract(epoch from new.completed_at)*1000000)::bigint)::text,'task',new.id,'db:workflow_tasks',new.completed_at,new.contractor_id,new.lead_id,
   case when new.completed_by is null then 'system' else 'user' end,new.completed_by,
   jsonb_build_object('taskId',new.id,'leadId',new.lead_id,'completedBy',new.completed_by),'{}',null,null);
 end if; return new; end $$;
drop trigger if exists trg_workflow_tasks_event on public.workflow_tasks;
create trigger trg_workflow_tasks_event after update of status on public.workflow_tasks for each row execute function emit_task_workflow_event();

-- ---------------------------------------------------------------------------
-- 11. Graph workflow RPCs (permission checked in the database)
-- ---------------------------------------------------------------------------
create or replace function public.wfg_create(
  p_name text, p_description text, p_contractor uuid, p_graph jsonb,
  p_trigger_type text, p_trigger_config jsonb, p_template_key text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare wid uuid;
begin
  if not public.workflow_can_manage(p_contractor) then raise exception 'not allowed to create workflows here' using errcode = '42501'; end if;
  insert into public.workflows(contractor_id, name, description, is_template, template_key, trigger_type, trigger_config,
    conditions, exit_events, reentry_policy, enabled, version, engine, graph_status, created_by, updated_by)
  values(p_contractor, p_name, p_description, false, p_template_key, p_trigger_type, coalesce(p_trigger_config, '{}'),
    null, '{}', 'once_per_event', false, 1, 'graph', 'draft', auth.uid(), auth.uid())
  returning id into wid;
  insert into public.workflow_graph_drafts(workflow_id, graph, updated_by) values(wid, p_graph, auth.uid());
  return wid;
end $$;
revoke all on function public.wfg_create(text, text, uuid, jsonb, text, jsonb, text) from public, anon;
grant execute on function public.wfg_create(text, text, uuid, jsonb, text, jsonb, text) to authenticated;

-- Autosave target. Returns the new revision; a stale revision fails with 40001.
create or replace function public.wfg_save_draft(
  p_workflow uuid, p_expected_revision integer, p_graph jsonb, p_name text, p_description text, p_hash text
) returns integer language plpgsql security definer set search_path = public as $$
declare wf public.workflows; cur integer; nxt integer;
begin
  select * into wf from public.workflows where id = p_workflow and engine = 'graph' for update;
  if wf.id is null or wf.archived_at is not null then raise exception 'workflow not found' using errcode = 'P0002'; end if;
  if not public.workflow_can_manage(wf.contractor_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  select revision into cur from public.workflow_graph_drafts where workflow_id = p_workflow for update;
  if cur is distinct from p_expected_revision then raise exception 'draft changed elsewhere' using errcode = '40001'; end if;
  nxt := cur + 1;
  update public.workflow_graph_drafts set graph = p_graph, revision = nxt, content_hash = p_hash, updated_by = auth.uid(), updated_at = now()
   where workflow_id = p_workflow;
  update public.workflows set name = coalesce(nullif(trim(p_name), ''), name), description = p_description, updated_by = auth.uid()
   where id = p_workflow;
  return nxt;
end $$;
revoke all on function public.wfg_save_draft(uuid, integer, jsonb, text, text, text) from public, anon;
grant execute on function public.wfg_save_draft(uuid, integer, jsonb, text, text, text) to authenticated;

-- Publish = copy the draft into a NEW immutable version. Service role only: the
-- server action validates the graph (integration readiness included) first.
create or replace function public.wfg_publish_internal(
  p_workflow uuid, p_expected_revision integer, p_actor uuid, p_note text,
  p_trigger_type text, p_trigger_config jsonb, p_exit_events text[], p_reentry text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare wf public.workflows; d public.workflow_graph_drafts; nv integer; vid uuid;
begin
  select * into wf from public.workflows where id = p_workflow and engine = 'graph' for update;
  if wf.id is null or wf.archived_at is not null then raise exception 'workflow not found' using errcode = 'P0002'; end if;
  select * into d from public.workflow_graph_drafts where workflow_id = p_workflow for update;
  if d.revision is distinct from p_expected_revision then raise exception 'draft changed elsewhere' using errcode = '40001'; end if;
  select coalesce(max(version), 0) + 1 into nv from public.workflow_versions where workflow_id = p_workflow;
  insert into public.workflow_versions(workflow_id, version, graph, content_hash, note, published_by)
    values(p_workflow, nv, d.graph, coalesce(d.content_hash, ''), p_note, p_actor) returning id into vid;
  update public.workflows set
      trigger_type = p_trigger_type, trigger_config = coalesce(p_trigger_config, '{}'),
      exit_events = coalesce(p_exit_events, '{}'), reentry_policy = p_reentry,
      version = nv, published_version = nv, published_at = now(), enroll_from = now(),
      graph_status = case when graph_status = 'paused' then 'paused' else 'published' end,
      enabled = (graph_status <> 'paused'), updated_by = p_actor
    where id = p_workflow;
  return jsonb_build_object('version', nv, 'versionId', vid);
end $$;
revoke all on function public.wfg_publish_internal(uuid, integer, uuid, text, text, jsonb, text[], text) from public, anon, authenticated;
grant execute on function public.wfg_publish_internal(uuid, integer, uuid, text, text, jsonb, text[], text) to service_role;

-- Pause / resume. Defined semantics (see docs):
--   pause : new enrollments stop at once (events recorded while paused never enroll,
--           not even after resume); waiting runs are PARKED (their timers freeze);
--           a run mid-action finishes that action then parks; calls already placed
--           continue at the provider and are recorded, but the run does not advance.
--   resume: enrollment restarts from now; parked runs resume at their original wake
--           time (or immediately if it already passed).
create or replace function public.wfg_set_paused(p_workflow uuid, p_paused boolean)
returns void language plpgsql security definer set search_path = public as $$
declare wf public.workflows;
begin
  select * into wf from public.workflows where id = p_workflow and engine = 'graph' for update;
  if wf.id is null or wf.archived_at is not null then raise exception 'workflow not found' using errcode = 'P0002'; end if;
  if not public.workflow_can_manage(wf.contractor_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if wf.published_version is null then raise exception 'publish the workflow before pausing it' using errcode = '22023'; end if;
  if p_paused then
    update public.workflows set graph_status = 'paused', enabled = false, updated_by = auth.uid() where id = p_workflow;
    update public.workflow_runs
       set metadata = metadata || jsonb_build_object('_parked_resume_at', resume_at), resume_at = 'infinity'
     where workflow_id = p_workflow and status in ('waiting', 'pending') and resume_at <> 'infinity';
  else
    update public.workflows set graph_status = 'published', enabled = true, enroll_from = now(), updated_by = auth.uid() where id = p_workflow;
    update public.workflow_runs
       set resume_at = greatest(coalesce((metadata ->> '_parked_resume_at')::timestamptz, now()), now()),
           metadata = metadata - '_parked_resume_at'
     where workflow_id = p_workflow and status in ('waiting', 'pending') and resume_at = 'infinity';
  end if;
end $$;
revoke all on function public.wfg_set_paused(uuid, boolean) from public, anon;
grant execute on function public.wfg_set_paused(uuid, boolean) to authenticated;

create or replace function public.wfg_archive(p_workflow uuid)
returns void language plpgsql security definer set search_path = public as $$
declare wf public.workflows;
begin
  select * into wf from public.workflows where id = p_workflow and engine = 'graph' for update;
  if wf.id is null then raise exception 'workflow not found' using errcode = 'P0002'; end if;
  if not public.workflow_can_manage(wf.contractor_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.workflows set enabled = false, archived_at = now(), updated_by = auth.uid() where id = p_workflow;
end $$;
revoke all on function public.wfg_archive(uuid) from public, anon;
grant execute on function public.wfg_archive(uuid) to authenticated;

-- Cancel one run. Stops it at its next step boundary; queued (not yet dialed)
-- calls are cancelled. A call already in progress at the provider cannot be ended
-- (no end-call API) — its result is recorded but the run no longer advances.
create or replace function public.wfg_cancel_run(p_run uuid, p_reason text default 'cancelled_by_user')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.workflow_runs; calls_cancelled integer := 0; inflight boolean := false;
begin
  select * into r from public.workflow_runs where id = p_run for update;
  if r.id is null then raise exception 'run not found' using errcode = 'P0002'; end if;
  if not public.workflow_can_manage(r.contractor_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status in ('completed', 'failed', 'cancelled') then
    return jsonb_build_object('cancelled', false, 'status', r.status);
  end if;
  -- A call is "in progress" if this run is waiting on one (its own or an adopted one) that is already with the provider.
  select exists(
    select 1 from public.ai_call_jobs j
     where j.status in ('dispatching', 'accepted', 'answered')
       and (j.workflow_run_id = p_run
            or j.id in (select w.call_job_id from public.workflow_waits w where w.run_id = p_run and w.status = 'open' and w.call_job_id is not null))
  ) into inflight;
  update public.workflow_runs set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 200),
      resume_at = null, locked_by = null, locked_until = null where id = p_run;
  update public.workflow_step_runs set status = 'cancelled', locked_by = null, locked_until = null, completed_at = now()
   where run_id = p_run and status in ('pending', 'running', 'waiting', 'retry_scheduled');
  update public.workflow_waits set status = 'cancelled', resolved_at = now() where run_id = p_run and status = 'open';
  with c as (update public.ai_call_jobs set status = 'cancelled', block_reason = 'workflow_run_cancelled', locked_by = null, locked_until = null
              where workflow_run_id = p_run and status = 'queued' returning 1)
  select count(*) into calls_cancelled from c;
  insert into public.workflow_logs(level, code, message, run_id, data)
    values('info', 'run.cancelled', 'Run cancelled by a user', p_run, jsonb_build_object('reason', left(p_reason, 200), 'queued_calls_cancelled', calls_cancelled));
  return jsonb_build_object('cancelled', true, 'queuedCallsCancelled', calls_cancelled, 'callInProgress', inflight);
end $$;
revoke all on function public.wfg_cancel_run(uuid, text) from public, anon;
grant execute on function public.wfg_cancel_run(uuid, text) to authenticated;

-- Re-open a FAILED run at its failed step. Steps that already succeeded are not
-- repeated, and the failed step keeps its idempotency key, so a retry can never
-- resend an email or place a second call whose first attempt succeeded.
create or replace function public.wfg_retry_run(p_run uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.workflow_runs; n integer;
begin
  select * into r from public.workflow_runs where id = p_run for update;
  if r.id is null then raise exception 'run not found' using errcode = 'P0002'; end if;
  if not public.workflow_can_manage(r.contractor_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'failed' then return jsonb_build_object('retried', false, 'status', r.status); end if;
  perform set_config('app.workflow_revive', 'on', true);
  update public.workflow_step_runs
     set status = 'retry_scheduled', failure_kind = 'temporary', next_retry_at = now(),
         max_attempts = least(20, max_attempts + 3), completed_at = null
   where run_id = p_run and status = 'failed';
  get diagnostics n = row_count;
  update public.workflow_runs
     set status = 'pending', resume_at = now(), locked_by = null, locked_until = null,
         metadata = metadata - '_runtime_errors' || jsonb_build_object('_retried_at', now())
   where id = p_run;
  insert into public.workflow_logs(level, code, message, run_id, data)
    values('info', 'run.retried', 'Failed run re-opened by a user', p_run, jsonb_build_object('steps_reopened', n));
  perform set_config('app.workflow_revive', 'off', true);
  return jsonb_build_object('retried', true, 'stepsReopened', n);
end $$;
revoke all on function public.wfg_retry_run(uuid) from public, anon;
grant execute on function public.wfg_retry_run(uuid) to authenticated;

create or replace function public.wfg_complete_task(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.workflow_tasks;
begin
  select * into t from public.workflow_tasks where id = p_task for update;
  if t.id is null then raise exception 'task not found' using errcode = 'P0002'; end if;
  if not (public.is_admin() or (t.contractor_id is not null and t.contractor_id = public.auth_contractor_id())) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.workflow_tasks set status = 'done', completed_at = now(), completed_by = auth.uid() where id = p_task and status = 'open';
end $$;
revoke all on function public.wfg_complete_task(uuid) from public, anon;
grant execute on function public.wfg_complete_task(uuid) to authenticated;

-- Assign a lead's contractor-side record to an eligible user (the 0017 trigger
-- re-validates that the user is an active user of that same contractor).
create or replace function public.workflow_assign_lead_user(p_assignment uuid, p_user uuid, p_causation uuid, p_correlation uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.workflow_actor_type', 'workflow', true);
  perform set_config('app.workflow_causation_id', coalesce(p_causation::text, ''), true);
  perform set_config('app.workflow_correlation_id', coalesce(p_correlation::text, ''), true);
  update public.lead_assignments set assigned_user_id = p_user where id = p_assignment;
  if not found then raise exception 'workflow target not found' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.workflow_assign_lead_user(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.workflow_assign_lead_user(uuid, uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 12. Row level security for the new tables
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['workflow_graph_drafts', 'workflow_versions', 'workflow_waits', 'workflow_tasks', 'workflow_builder_access'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

drop policy if exists workflow_graph_drafts_select on public.workflow_graph_drafts;
create policy workflow_graph_drafts_select on public.workflow_graph_drafts for select
  using (public.is_admin() or exists (
    select 1 from public.workflows w where w.id = workflow_graph_drafts.workflow_id
      and w.contractor_id is not null and w.contractor_id = public.auth_contractor_id()));

drop policy if exists workflow_versions_select on public.workflow_versions;
create policy workflow_versions_select on public.workflow_versions for select
  using (public.is_admin() or exists (
    select 1 from public.workflows w where w.id = workflow_versions.workflow_id
      and w.contractor_id is not null and w.contractor_id = public.auth_contractor_id()));

drop policy if exists workflow_waits_select on public.workflow_waits;
create policy workflow_waits_select on public.workflow_waits for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));

drop policy if exists workflow_tasks_select on public.workflow_tasks;
create policy workflow_tasks_select on public.workflow_tasks for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));

drop policy if exists workflow_builder_access_select on public.workflow_builder_access;
create policy workflow_builder_access_select on public.workflow_builder_access for select
  using (public.is_admin() or contractor_id = public.auth_contractor_id());
drop policy if exists workflow_builder_access_admin_write on public.workflow_builder_access;
create policy workflow_builder_access_admin_write on public.workflow_builder_access for all
  using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.workflow_builder_access to authenticated;

comment on table public.workflow_versions is 'Immutable published snapshots of a graph workflow. Runs pin to one version.';
comment on table public.workflow_waits is 'Durable waits for an AI call result or a domain event. The run''s resume_at is the wait timeout, so a missing webhook cannot strand a run.';

notify pgrst, 'reload schema';
