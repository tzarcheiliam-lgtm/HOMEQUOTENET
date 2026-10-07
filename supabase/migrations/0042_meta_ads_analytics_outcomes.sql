-- ============================================================================
-- 0041: Meta Ads analytics, lead-outcome ledger, Meta conversion-event queue
-- ============================================================================
-- Additive and idempotent. Nothing here sends anything to Meta or changes a live
-- campaign. Conversion delivery ships OFF (meta_settings.delivery_mode = 'off').
--
-- 1. Reporting mirror (read-only import from the Marketing API):
--      meta_ad_accounts -> meta_campaigns -> meta_adsets -> meta_ads, meta_insights_daily
--    Account -> contractor mapping is explicit and admin-controlled
--    (meta_ad_accounts.contractor_id, optional per-campaign override).
-- 2. lead_outcome_events: append-only history of qualification / appointment / won / lost.
--    It is an AUDIT LEDGER written by triggers on the existing source-of-truth tables
--    (leads.qualification_status, appointments, sales). It is not a second status system.
-- 3. meta_conversion_events: durable outbox for Conversions API delivery.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Settings (exactly one row). Delivery defaults OFF.
-- ---------------------------------------------------------------------------
create table if not exists public.meta_settings (
  id              boolean primary key default true check (id),
  delivery_mode   text not null default 'off' check (delivery_mode in ('off', 'test', 'live')),
  -- Events Manager "Test events" code (e.g. TEST12345). Not a secret. Used only in 'test' mode.
  test_event_code text check (test_event_code is null or test_event_code ~ '^[A-Za-z0-9_-]{1,40}$'),
  -- Dataset (pixel) id events are sent to. Falls back to the funnel's configured pixel for website events.
  dataset_id      text check (dataset_id is null or dataset_id ~ '^[0-9]{5,20}$'),
  insights_days   smallint not null default 30 check (insights_days between 1 and 90),
  -- Outcome-ledger position the queue feeder has processed. Set to now() whenever delivery is switched on from
  -- 'off', so outcomes recorded BEFORE activation are never swept up (no automatic backfill).
  ledger_cursor_at timestamptz,
  ledger_cursor_id uuid,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null
);
insert into public.meta_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reporting mirror
-- ---------------------------------------------------------------------------
create table if not exists public.meta_ad_accounts (
  id                        text primary key,            -- 'act_1234567890'
  name                      text,
  currency                  text,                        -- ISO code reported by Meta
  timezone_name             text,                        -- Meta reporting timezone, e.g. America/Los_Angeles
  account_status            integer,
  -- Explicit admin mapping. NULL = HomeQuote network-level account (staff only).
  contractor_id             uuid references public.contractors(id) on delete set null,
  -- Ad spend is HomeQuote's cost; contractors only see it when an admin opts in.
  show_spend_to_contractor  boolean not null default false,
  sync_enabled              boolean not null default true,
  last_synced_at            timestamptz,
  last_sync_error           text,
  created_at                timestamptz not null default now()
);

create table if not exists public.meta_campaigns (
  id               text primary key,
  account_id       text not null references public.meta_ad_accounts(id) on delete cascade,
  name             text,
  objective        text,
  status           text,
  effective_status text,
  -- Optional override of the account's contractor mapping (shared HomeQuote accounts).
  contractor_id    uuid references public.contractors(id) on delete set null,
  synced_at        timestamptz not null default now()
);
create index if not exists idx_meta_campaigns_account on public.meta_campaigns(account_id);

create table if not exists public.meta_adsets (
  id                 text primary key,
  account_id         text not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id        text not null,
  name               text,
  status             text,
  effective_status   text,
  optimization_goal  text,
  attribution_spec   jsonb,
  synced_at          timestamptz not null default now()
);
create index if not exists idx_meta_adsets_campaign on public.meta_adsets(campaign_id);

create table if not exists public.meta_ads (
  id               text primary key,
  account_id       text not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id      text not null,
  adset_id         text not null,
  name             text,
  status           text,
  effective_status text,
  synced_at        timestamptz not null default now()
);
create index if not exists idx_meta_ads_adset on public.meta_ads(adset_id);
create index if not exists idx_meta_ads_campaign on public.meta_ads(campaign_id);

-- One row per ad per day, in the ad account's reporting timezone. Additive metrics only roll up;
-- reach is stored per day and must NOT be summed across days (the app shows it for single days only).
create table if not exists public.meta_insights_daily (
  ad_id                text not null,
  date                 date not null,
  account_id           text not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id          text not null,
  adset_id             text not null,
  spend                numeric(14,4) not null default 0,
  impressions          bigint not null default 0,
  reach                bigint,
  inline_link_clicks   bigint not null default 0,
  -- Meta "actions" array reduced to {action_type: count}, under attribution_setting below.
  actions              jsonb not null default '{}'::jsonb,
  attribution_setting  text not null default '7d_click,1d_view',
  synced_at            timestamptz not null default now(),
  primary key (ad_id, date)
);
create index if not exists idx_meta_insights_campaign_date on public.meta_insights_daily(campaign_id, date);
create index if not exists idx_meta_insights_account_date on public.meta_insights_daily(account_id, date);

create table if not exists public.meta_sync_runs (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  trigger       text not null default 'manual' check (trigger in ('manual', 'cron')),
  range_start   date,
  range_end     date,
  counts        jsonb not null default '{}'::jsonb,
  error_code    text,
  error_message text                       -- already redacted by the app (no tokens)
);
create index if not exists idx_meta_sync_runs_started on public.meta_sync_runs(started_at desc);

-- Visibility: admins see all; a contractor sees only campaigns mapped to them
-- (campaign override first, else the account mapping).
create or replace function public.meta_campaign_visible(p_account text, p_campaign text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    public.auth_contractor_id() is not null
    and public.auth_contractor_id() = coalesce(
      (select c.contractor_id from public.meta_campaigns c where c.id = p_campaign),
      (select a.contractor_id from public.meta_ad_accounts a where a.id = p_account))
  )
$$;

create or replace function public.meta_spend_visible(p_account text, p_campaign text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    public.meta_campaign_visible(p_account, p_campaign)
    and coalesce((select a.show_spend_to_contractor from public.meta_ad_accounts a where a.id = p_account), false)
  )
$$;

-- ---------------------------------------------------------------------------
-- Lead qualification provenance (extends the existing leads.qualification_status; no new status system)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists qualification_reason   text,
  add column if not exists qualification_source   text,
  add column if not exists qualification_evidence jsonb;
alter table public.leads drop constraint if exists leads_qualification_source_check;
alter table public.leads add constraint leads_qualification_source_check
  check (qualification_source is null or qualification_source in ('human', 'ai', 'funnel_rules', 'import'));
alter table public.leads drop constraint if exists leads_ai_qualification_needs_evidence;
alter table public.leads add constraint leads_ai_qualification_needs_evidence
  check (qualification_source is distinct from 'ai' or qualification_evidence is not null);

-- Sales gain an explicit currency so values are never silently mixed (existing rows: USD, the only
-- currency the app has ever recorded).
alter table public.sales add column if not exists currency text not null default 'USD';

-- ---------------------------------------------------------------------------
-- Outcome ledger (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_outcome_events (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  assignment_id     uuid references public.lead_assignments(id) on delete set null,
  -- Set for contractor-scoped outcomes (appointments, sales) so RLS can scope them; NULL = network-level.
  contractor_id     uuid references public.contractors(id) on delete set null,
  outcome           text not null check (outcome in (
    'qualified', 'not_qualified', 'needs_qualification',
    'appointment_booked', 'appointment_held', 'appointment_no_show', 'appointment_cancelled',
    'won', 'lost', 'correction')),
  reason_code       text,
  -- Internal free text. NEVER sent to Meta.
  note              text,
  amount            numeric(12,2),
  currency          text,
  -- When it actually happened. 'date' precision = only the calendar day is known (never faked to a time).
  occurred_at       timestamptz not null,
  occurred_precision text not null default 'exact' check (occurred_precision in ('exact', 'date')),
  recorded_at       timestamptz not null default now(),
  actor_id          uuid references public.profiles(id) on delete set null,
  actor_kind        text not null default 'user' check (actor_kind in ('user', 'ai', 'system')),
  evidence          jsonb,
  appointment_id    uuid references public.appointments(id) on delete set null,
  sale_id           uuid references public.sales(id) on delete set null,
  -- A correction/reversal points at the entry it corrects; the original row is never edited.
  corrects_id       uuid references public.lead_outcome_events(id) on delete set null,
  constraint outcome_booked_needs_booking check (outcome <> 'appointment_booked' or appointment_id is not null),
  constraint outcome_won_needs_sale check (outcome <> 'won' or sale_id is not null),
  constraint outcome_ai_needs_evidence check (actor_kind <> 'ai' or evidence is not null)
);
create index if not exists idx_outcome_events_lead on public.lead_outcome_events(lead_id, occurred_at desc);
create index if not exists idx_outcome_events_occurred on public.lead_outcome_events(outcome, occurred_at);
create index if not exists idx_outcome_events_contractor on public.lead_outcome_events(contractor_id, occurred_at);
-- A booking / sale is recorded once, however many times its row is touched.
create unique index if not exists uq_outcome_booked_once on public.lead_outcome_events(appointment_id) where outcome = 'appointment_booked';
create unique index if not exists uq_outcome_won_once on public.lead_outcome_events(sale_id) where outcome = 'won';

-- Append-only. The one allowed removal is the cascade from a permanently deleted lead.
create or replace function public.guard_outcome_event()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'lead_outcome_events is append-only; record a correction instead';
end;
$$;
drop trigger if exists trg_outcome_events_append_only on public.lead_outcome_events;
create trigger trg_outcome_events_append_only
  before update or delete on public.lead_outcome_events
  for each row execute function public.guard_outcome_event();

-- Qualification changes (any code path) -> ledger.
create or replace function public.ledger_lead_qualification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text;
begin
  if new.qualification_status is not distinct from old.qualification_status then return new; end if;
  v_kind := case when new.qualification_source = 'ai' then 'ai' when auth.uid() is null then 'system' else 'user' end;
  insert into public.lead_outcome_events(lead_id, outcome, reason_code, occurred_at, actor_id, actor_kind, evidence)
  values (new.id,
    case new.qualification_status when 'qualified' then 'qualified' when 'needs_qualification' then 'needs_qualification' else 'not_qualified' end,
    new.qualification_reason,
    case when new.qualification_status = 'qualified' then coalesce(new.qualified_at, now()) else now() end,
    case when v_kind = 'user' then auth.uid() else null end,
    v_kind, new.qualification_evidence);
  return new;
end;
$$;
drop trigger if exists trg_leads_ledger_qualification on public.leads;
create trigger trg_leads_ledger_qualification
  after update of qualification_status on public.leads
  for each row execute function public.ledger_lead_qualification();

-- Appointments: a booking exists only if an appointments row does.
create or replace function public.ledger_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record; v_outcome text;
begin
  select la.lead_id, la.contractor_id, la.id as assignment_id into a from public.lead_assignments la where la.id = new.assignment_id;
  if a.lead_id is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.status::text in ('scheduled', 'rescheduled', 'held') then
      insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, occurred_at, actor_id, actor_kind, appointment_id)
      values (a.lead_id, a.assignment_id, a.contractor_id, 'appointment_booked', new.created_at, coalesce(new.created_by, auth.uid()),
              case when coalesce(new.created_by, auth.uid()) is null then 'system' else 'user' end, new.id)
      on conflict do nothing;
    end if;
  elsif new.status is distinct from old.status then
    v_outcome := case new.status::text when 'held' then 'appointment_held' when 'no_show' then 'appointment_no_show'
                 when 'cancelled' then 'appointment_cancelled' else null end;
    if v_outcome is not null then
      insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, occurred_at, actor_id, actor_kind, appointment_id)
      values (a.lead_id, a.assignment_id, a.contractor_id, v_outcome, now(), auth.uid(),
              case when auth.uid() is null then 'system' else 'user' end, new.id);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_appointments_ledger on public.appointments;
create trigger trg_appointments_ledger
  after insert or update of status on public.appointments
  for each row execute function public.ledger_appointment();

-- Sales: won business with the real recorded value; refunds / cancellations append a correction.
create or replace function public.ledger_sale()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record; v_won uuid; v_at timestamptz; v_prec text;
begin
  if new.assignment_id is null then return new; end if;
  select la.lead_id, la.contractor_id, la.id as assignment_id into a from public.lead_assignments la where la.id = new.assignment_id;
  if a.lead_id is null then return new; end if;
  if tg_op = 'INSERT' and new.sale_status::text = 'won' then
    -- closed_at is a DATE. Same-day sales use the real insert time; earlier dates stay date-precision.
    if new.closed_at >= (new.created_at at time zone 'UTC')::date then v_at := new.created_at; v_prec := 'exact';
    else v_at := (new.closed_at::timestamp at time zone 'UTC'); v_prec := 'date'; end if;
    insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, amount, currency, occurred_at, occurred_precision,
                                           actor_id, actor_kind, sale_id)
    values (a.lead_id, a.assignment_id, a.contractor_id, 'won', new.amount, new.currency, v_at, v_prec,
            coalesce(new.created_by, auth.uid()), case when coalesce(new.created_by, auth.uid()) is null then 'system' else 'user' end, new.id)
    on conflict do nothing;
  elsif tg_op = 'UPDATE' and new.sale_status is distinct from old.sale_status and new.sale_status::text in ('refunded', 'cancelled') then
    select id into v_won from public.lead_outcome_events where sale_id = new.id and outcome = 'won';
    insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, reason_code, amount, currency, occurred_at, actor_id, actor_kind, sale_id, corrects_id)
    values (a.lead_id, a.assignment_id, a.contractor_id, 'correction', 'sale_' || new.sale_status::text, new.amount, new.currency, now(),
            auth.uid(), case when auth.uid() is null then 'system' else 'user' end, new.id, v_won);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_sales_ledger on public.sales;
create trigger trg_sales_ledger
  after insert or update of sale_status on public.sales
  for each row execute function public.ledger_sale();

-- Lost: assignment-level status change.
create or replace function public.ledger_assignment_lost()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status::text = 'lost' and old.status::text is distinct from 'lost' then
    insert into public.lead_outcome_events(lead_id, assignment_id, contractor_id, outcome, occurred_at, actor_id, actor_kind)
    values (new.lead_id, new.id, new.contractor_id, 'lost', now(), auth.uid(), case when auth.uid() is null then 'system' else 'user' end);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_assignments_ledger_lost on public.lead_assignments;
create trigger trg_assignments_ledger_lost
  after update of status on public.lead_assignments
  for each row execute function public.ledger_assignment_lost();

-- ---------------------------------------------------------------------------
-- Conversion-event outbox
-- ---------------------------------------------------------------------------
create table if not exists public.meta_conversion_events (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads(id) on delete cascade,
  contractor_id     uuid references public.contractors(id) on delete set null,
  outcome_event_id  uuid references public.lead_outcome_events(id) on delete set null,
  -- Which HQN stage this is, and which Meta integration path carries it.
  stage             text not null check (stage in ('lead', 'qualified', 'appointment', 'won')),
  source_kind       text not null check (source_kind in ('website_pixel', 'instant_form_crm')),
  event_name        text not null,
  action_source     text not null check (action_source in ('website', 'system_generated')),
  dataset_id        text not null,
  -- Stable. Website: '<funnel session id>:<EventName>' (same scheme as the browser Pixel, so Meta de-duplicates).
  -- Instant Form: 'crm:<leadgen id>:<stage>'.
  event_id          text not null,
  event_time        timestamptz not null,        -- when it really happened; never rewritten
  value             numeric(12,2),
  currency          text,
  test_mode         boolean not null default false,
  status            text not null default 'pending' check (status in ('pending', 'processing', 'accepted', 'failed', 'skipped')),
  attempt_count     smallint not null default 0,
  max_attempts      smallint not null default 5,
  next_attempt_at   timestamptz not null default now(),
  locked_by         text,
  locked_until      timestamptz,
  last_http_status  integer,
  last_error_code   text,
  last_error_message text,                       -- redacted: never contains tokens or customer data
  permanent_failure boolean not null default false,
  fbtrace_id        text,
  events_received   integer,
  sent_at           timestamptz,
  skip_reason       text,
  -- 'accepted' means the Graph API returned 200 and events_received >= 1. Nothing more.
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint mce_skipped_has_reason check (status <> 'skipped' or skip_reason is not null)
);
-- Duplicate prevention: one row per (dataset, event id), separately for test and live.
create unique index if not exists uq_mce_event on public.meta_conversion_events(dataset_id, event_id, test_mode);
create index if not exists idx_mce_due on public.meta_conversion_events(next_attempt_at) where status in ('pending', 'processing');
create index if not exists idx_mce_lead on public.meta_conversion_events(lead_id);
create index if not exists idx_mce_status on public.meta_conversion_events(status, created_at desc);

drop trigger if exists trg_mce_updated_at on public.meta_conversion_events;
create trigger trg_mce_updated_at before update on public.meta_conversion_events
  for each row execute function public.set_updated_at();

-- FOR UPDATE SKIP LOCKED claim; also reclaims jobs whose lease expired (crashed worker). The stable
-- event_id makes a re-send of a reclaimed job safe.
create or replace function public.claim_meta_conversion_events(p_limit int, p_worker text, p_lease_seconds int default 120, p_only uuid default null)
returns setof public.meta_conversion_events
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from public.meta_conversion_events
    where (p_only is null or id = p_only)
      and ((status = 'pending' and next_attempt_at <= now())
        or (status = 'processing' and locked_until < now()))
    order by next_attempt_at
    limit greatest(p_limit, 0)
    for update skip locked)
  update public.meta_conversion_events e
     set status = 'processing', locked_by = p_worker, attempt_count = e.attempt_count + 1,
         locked_until = now() + make_interval(secs => p_lease_seconds)
    from due where e.id = due.id
  returning e.*;
end;
$$;
revoke all on function public.claim_meta_conversion_events(int, text, int, uuid) from public, anon, authenticated;
grant execute on function public.claim_meta_conversion_events(int, text, int, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['meta_settings', 'meta_ad_accounts', 'meta_campaigns', 'meta_adsets', 'meta_ads',
                           'meta_insights_daily', 'meta_sync_runs', 'lead_outcome_events', 'meta_conversion_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

drop policy if exists meta_settings_admin_select on public.meta_settings;
create policy meta_settings_admin_select on public.meta_settings for select using (public.is_admin());
drop policy if exists meta_sync_runs_admin_select on public.meta_sync_runs;
create policy meta_sync_runs_admin_select on public.meta_sync_runs for select using (public.is_admin());
drop policy if exists meta_conversion_events_admin_select on public.meta_conversion_events;
create policy meta_conversion_events_admin_select on public.meta_conversion_events for select using (public.is_admin());

drop policy if exists meta_ad_accounts_select on public.meta_ad_accounts;
create policy meta_ad_accounts_select on public.meta_ad_accounts for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));
drop policy if exists meta_campaigns_select on public.meta_campaigns;
create policy meta_campaigns_select on public.meta_campaigns for select using (public.meta_campaign_visible(account_id, id));
drop policy if exists meta_adsets_select on public.meta_adsets;
create policy meta_adsets_select on public.meta_adsets for select using (public.meta_campaign_visible(account_id, campaign_id));
drop policy if exists meta_ads_select on public.meta_ads;
create policy meta_ads_select on public.meta_ads for select using (public.meta_campaign_visible(account_id, campaign_id));
drop policy if exists meta_insights_select on public.meta_insights_daily;
create policy meta_insights_select on public.meta_insights_daily for select using (public.meta_spend_visible(account_id, campaign_id));

-- Outcomes: staff see everything; a contractor sees only its own contractor-scoped rows.
drop policy if exists outcome_events_select on public.lead_outcome_events;
create policy outcome_events_select on public.lead_outcome_events for select
  using (public.is_staff() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));

notify pgrst, 'reload schema';
