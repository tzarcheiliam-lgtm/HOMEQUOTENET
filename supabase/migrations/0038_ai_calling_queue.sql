-- ============================================================================
-- AI calling: settings, per-contractor config, opt-outs and the call queue
-- ============================================================================
-- Builds on 0037 (ai_call_events, the Fish webhook ledger).
--
-- LAYERS (all must allow a call before one is dispatched)
--   1. env AI_CALLING_GLOBAL_ENABLED=true            (deployment master switch)
--   2. ai_calling_settings.enabled                   (admin emergency stop, this file)
--   3. ai_calling_contractor_settings.mode           ('off' | 'manual_only' | 'automatic')
--   4. per-job eligibility (consent, opt-out, number, calling window...) in app code
--
-- QUEUE
--   ai_call_jobs is the single queue + call record. A new lead assignment to a
--   contractor in 'automatic' mode enqueues one job (trigger below). The trigger
--   NEVER raises: a form submission cannot fail or slow down because of calling.
--   Workers claim jobs with claim_ai_call_jobs() (FOR UPDATE SKIP LOCKED), so
--   concurrent workers cannot take the same job.
--
-- Nothing here backfills: only assignments created after this migration enqueue.
-- All tables are service-role write only; admins may read.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Global settings (exactly one row)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_calling_settings (
  id                  boolean primary key default true check (id),
  -- Admin switch. Defaults OFF: calling starts only when an admin turns it on.
  enabled             boolean not null default false,
  -- Allowed local calling window for the contact, [start, end) in hours.
  window_start_hour   smallint not null default 8  check (window_start_hour between 0 and 23),
  window_end_hour     smallint not null default 21 check (window_end_hour between 1 and 24),
  -- Total send attempts per job (includes transport retries and redials).
  max_attempts        smallint not null default 3  check (max_attempts between 1 and 6),
  retry_delay_minutes integer  not null default 60 check (retry_delay_minutes between 5 and 1440),
  -- A queued job older than this is expired instead of dialed (no stale release).
  max_job_age_hours   integer  not null default 48 check (max_job_age_hours between 1 and 720),
  stopped_at          timestamptz,
  stopped_by          uuid references public.profiles(id) on delete set null,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles(id) on delete set null,
  constraint ai_calling_window_order check (window_start_hour < window_end_hour)
);
insert into public.ai_calling_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Per-contractor configuration
-- ---------------------------------------------------------------------------
create table if not exists public.ai_calling_contractor_settings (
  contractor_id   uuid primary key references public.contractors(id) on delete cascade,
  -- off: no AI calls. manual_only: admin-initiated only. automatic: new form leads too.
  mode            text not null default 'off' check (mode in ('off', 'manual_only', 'automatic')),
  -- Fish agent and the Fish phone-number id to dial from (identifiers, not secrets).
  agent_id        text,
  phone_number_id text,
  updated_by      uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Opt-outs (never call these numbers with the AI agent)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_call_opt_outs (
  phone_e164 text primary key,
  source     text not null,          -- 'admin' | 'call_analysis' | ...
  reason     text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The queue / call record
-- ---------------------------------------------------------------------------
create table if not exists public.ai_call_jobs (
  id                      uuid primary key default gen_random_uuid(),
  trigger_source          text not null check (trigger_source in ('auto_form', 'manual')),
  -- One job per trigger: 'lead:<lead id>' for automatic, 'manual:<token>' for manual.
  dedupe_key              text not null unique,
  contractor_id           uuid references public.contractors(id) on delete set null,
  lead_id                 uuid references public.leads(id) on delete set null,
  prospect_id             uuid references public.contractor_prospects(id) on delete set null,

  -- Destination snapshot (E.164) and timezone inputs.
  contact_name            text,
  contact_phone           text,
  contact_state           text,
  contact_zip             text,

  purpose                 text,
  context                 text,

  -- Recorded consent for this call (automatic: copied from the lead).
  consent_basis           text,
  consent_reference       text,
  consent_at              timestamptz,

  status                  text not null default 'queued' check (status in (
    'queued', 'blocked', 'dispatching', 'accepted', 'answered', 'completed',
    'no_answer', 'busy', 'failed', 'cancelled', 'expired')),
  block_reason            text,
  run_at                  timestamptz not null default now(),
  attempts                smallint not null default 0,
  max_attempts            smallint not null default 3,
  -- Part of the Fish Idempotency-Key. Bumped only when a NEW call is intended
  -- (redial/admin retry); transport retries reuse it so they cannot double-dial.
  key_seq                 smallint not null default 0,
  locked_by               text,
  locked_until            timestamptz,

  provider_session_id     text,
  last_error              text,
  dial_status             text,
  ended_reason            text,
  duration_seconds        integer,
  conversation_started_at timestamptz,
  conversation_ended_at   timestamptz,
  analysis                jsonb,

  initiated_by            uuid references public.profiles(id) on delete set null,
  scheduled_for           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_ai_call_jobs_due      on public.ai_call_jobs (status, run_at);
create index if not exists idx_ai_call_jobs_lead     on public.ai_call_jobs (lead_id);
create index if not exists idx_ai_call_jobs_phone    on public.ai_call_jobs (contact_phone, created_at desc);
create index if not exists idx_ai_call_jobs_contract on public.ai_call_jobs (contractor_id, created_at desc);
create index if not exists idx_ai_call_jobs_session  on public.ai_call_jobs (provider_session_id);

-- ---------------------------------------------------------------------------
-- Enqueue on assignment. Never raises (see header).
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_ai_call_for_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.ai_call_jobs (
      trigger_source, dedupe_key, contractor_id, lead_id,
      contact_name, contact_phone, contact_state, contact_zip,
      purpose, consent_basis, consent_reference, consent_at, max_attempts)
    select 'auto_form', 'lead:' || l.id::text, new.contractor_id, l.id,
           nullif(trim(coalesce(l.first_name, '') || ' ' || coalesce(l.last_name, '')), ''),
           l.phone_e164, l.state, l.zip,
           'New form lead follow-up', l.consent_source, l.id::text, l.consent_at, s.max_attempts
    from public.leads l
    join public.ai_calling_contractor_settings cs
      on cs.contractor_id = new.contractor_id and cs.mode = 'automatic'
    cross join public.ai_calling_settings s
    where l.id = new.lead_id and l.archived_at is null
    on conflict (dedupe_key) do nothing;
  exception when others then
    raise warning 'ai call enqueue failed for lead %: %', new.lead_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_ai_call on public.lead_assignments;
create trigger trg_enqueue_ai_call
  after insert on public.lead_assignments
  for each row execute function public.enqueue_ai_call_for_assignment();

-- ---------------------------------------------------------------------------
-- Claim due jobs. Also reclaims jobs whose worker lease expired (crashed
-- worker); the Fish Idempotency-Key makes a re-send of the same attempt safe.
-- ---------------------------------------------------------------------------
create or replace function public.claim_ai_call_jobs(
  p_limit int, p_worker text, p_lease_seconds int default 300, p_only uuid default null)
returns setof public.ai_call_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from public.ai_call_jobs
    where (p_only is null or id = p_only)
      and ((status = 'queued' and run_at <= now())
        or (status = 'dispatching' and locked_until < now()))
    order by run_at
    limit greatest(p_limit, 0)
    for update skip locked)
  update public.ai_call_jobs j
     set status = 'dispatching', locked_by = p_worker,
         locked_until = now() + make_interval(secs => p_lease_seconds), updated_at = now()
    from due where j.id = due.id
  returning j.*;
end;
$$;
revoke all on function public.claim_ai_call_jobs(int, text, int, uuid) from public, anon, authenticated;
grant execute on function public.claim_ai_call_jobs(int, text, int, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: admins may read; only the service role writes.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ai_calling_settings', 'ai_calling_contractor_settings', 'ai_call_opt_outs', 'ai_call_jobs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_select', t);
    execute format('create policy %I on public.%I for select using (public.is_admin())', t || '_admin_select', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
