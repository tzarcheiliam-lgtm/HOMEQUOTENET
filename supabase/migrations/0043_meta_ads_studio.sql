-- ============================================================================
-- 0043: Meta Ads "Studio" — assets, creative library, ad drafts, change proposals,
--       optimization rules, audits, activity log.
-- ============================================================================
-- DEPENDS ON 0042_meta_ads_analytics_outcomes.sql (meta_ad_accounts, meta_campaigns,
-- meta_settings, ...). Apply order: 0041_visual_workflow_builder -> 0042 -> 0043.
--
-- Additive and idempotent. Everything ships DORMANT:
--   * meta_studio_settings.live_writes_enabled = false  (no Meta write can execute)
--   * meta_studio_settings.automation_enabled  = false  (global automation stop is ON)
--   * every account starts with writes_enabled = false, automation_enabled = false
--   * every rule starts enabled = false and mode = 'recommend'
-- This migration creates no Meta objects, sends no events, and backfills nothing.
--
-- Security model: all tables are RLS-enabled with no write policies (service role only,
-- after a requireRole(['admin']) check in server code). Reads are admin-only except
-- meta_assets / meta_creatives, which a contractor can read ONLY when explicitly mapped.
-- Credentials are never stored here: the write token lives in the server environment.
-- ============================================================================

-- ---- global + per-account switches ------------------------------------------------
create table if not exists public.meta_studio_settings (
  id                   boolean primary key default true check (id),
  -- Master switch for ANY Meta write (create paused objects, apply proposals, rule actions).
  live_writes_enabled  boolean not null default false,
  -- Global automation stop. false = HQN automation is stopped (does NOT pause anything in Meta).
  automation_enabled   boolean not null default false,
  -- Lease so overlapping rule ticks cannot evaluate at the same time.
  rules_lock_until     timestamptz,
  -- Owner-defined audit thresholds. Missing = the related control is reported "not assessed".
  audit_thresholds     jsonb not null default '{}'::jsonb,
  updated_at           timestamptz not null default now(),
  updated_by           uuid references public.profiles(id) on delete set null
);
insert into public.meta_studio_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.meta_account_controls (
  account_id           text primary key references public.meta_ad_accounts(id) on delete cascade,
  writes_enabled       boolean not null default false,
  automation_enabled   boolean not null default false,
  -- Optional account spending limit HQN expects to exist in Meta (informational; Meta enforces it).
  note                 text,
  updated_at           timestamptz not null default now(),
  updated_by           uuid references public.profiles(id) on delete set null
);

-- ---- discovered assets: pages, Instagram identities, datasets, lead forms ---------------
create table if not exists public.meta_assets (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('page', 'instagram', 'dataset', 'lead_form')),
  meta_id         text not null,
  name            text,
  parent_meta_id  text,                     -- page for instagram/lead_form
  account_id      text references public.meta_ad_accounts(id) on delete set null,  -- dataset's ad account
  -- Explicit mapping. NULL = HomeQuote network-level (admin only).
  contractor_id   uuid references public.contractors(id) on delete set null,
  details         jsonb not null default '{}'::jsonb,   -- non-secret fields only
  last_seen_at    timestamptz not null default now(),
  last_error      text,                                  -- redacted
  created_at      timestamptz not null default now(),
  unique (kind, meta_id)
);
create index if not exists idx_meta_assets_contractor on public.meta_assets(contractor_id);

-- ---- live object state (budget ownership, bidding, learning) + Ads Manager reconciliation ---
-- Complements the 0042 mirror (which has names/status only). Budgets are stored in Meta's MINOR
-- currency units exactly as the API returns them; conversion happens in code with the account currency.
create table if not exists public.meta_object_state (
  object_id            text primary key,
  object_type          text not null check (object_type in ('campaign', 'adset')),
  account_id           text not null references public.meta_ad_accounts(id) on delete cascade,
  campaign_id          text,
  name                 text,
  status               text,
  effective_status     text,
  daily_budget_minor   bigint,
  lifetime_budget_minor bigint,
  bid_strategy         text,
  spend_cap_minor      bigint,                    -- campaign-level Meta spend cap, if set
  learning_stage       text,                      -- adsets: LEARNING / SUCCESS / FAIL (learning_stage_info.status)
  stop_time            timestamptz,
  meta_updated_time    timestamptz,
  -- Fields HQN itself last wrote, so a later difference means someone changed it in Ads Manager.
  hqn_expected         jsonb not null default '{}'::jsonb,
  external_change_at   timestamptz,
  external_change      jsonb,
  synced_at            timestamptz not null default now()
);
create index if not exists idx_meta_object_state_account on public.meta_object_state(account_id, object_type);

-- ---- creative library -------------------------------------------------------------------
create table if not exists public.meta_creatives (
  id                  uuid primary key default gen_random_uuid(),
  contractor_id       uuid references public.contractors(id) on delete set null,
  campaign_label      text,                              -- free-text grouping the team uses
  name                text not null check (char_length(name) between 1 and 120),
  tags                text[] not null default '{}',
  kind                text not null check (kind in ('image', 'video')),
  mime_type           text not null,
  bytes               bigint not null check (bytes > 0),
  width               integer,
  height              integer,
  duration_seconds    numeric(10,2),
  storage_path        text not null,                     -- ORIGINAL, never modified
  thumbnail_path      text,
  sha256              text,                              -- of the original, to flag exact duplicates
  status              text not null default 'uploaded'
                        check (status in ('uploaded', 'processing', 'ready', 'rejected')),
  validation          jsonb not null default '{"errors":[],"warnings":[]}'::jsonb,
  -- Set only after the file is uploaded to a specific ad account in Meta (Stage B live path).
  meta_account_id     text,
  meta_image_hash     text,
  meta_video_id       text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint creative_video_has_duration check (kind <> 'video' or status = 'rejected' or duration_seconds is not null)
);
create index if not exists idx_meta_creatives_contractor on public.meta_creatives(contractor_id, created_at desc);
create unique index if not exists uq_meta_creatives_sha on public.meta_creatives(coalesce(contractor_id, '00000000-0000-0000-0000-000000000000'::uuid), sha256) where sha256 is not null;

-- ---- ad drafts / paused creation ----------------------------------------------------------
create table if not exists public.meta_ad_drafts (
  id                  uuid primary key default gen_random_uuid(),
  contractor_id       uuid references public.contractors(id) on delete set null,
  account_id          text not null references public.meta_ad_accounts(id) on delete restrict,
  creative_id         uuid references public.meta_creatives(id) on delete restrict,
  name                text not null check (char_length(name) between 1 and 120),
  config              jsonb not null,                    -- validated DraftConfig (lib/meta/studio/draft.ts)
  status              text not null default 'draft'
                        check (status in ('draft', 'ready', 'creating', 'created_paused', 'partial', 'failed', 'cancelled')),
  -- Stable per draft. Meta objects are named with it, so a retry after a timeout can find (not duplicate) them.
  idempotency_key     text not null unique,
  -- Ids of objects already created in Meta: {image_hash, campaign_id, adset_id, creative_id, ad_id}.
  created_objects     jsonb not null default '{}'::jsonb,
  attempt_count       integer not null default 0,
  last_error_class    text,
  last_error_message  text,                              -- redacted
  -- Explicit confirmation: exactly what the human saw before approving creation.
  confirmed_by        uuid references public.profiles(id) on delete set null,
  confirmed_at        timestamptz,
  confirmed_summary   jsonb,
  -- What Meta says now (never inferred): effective_status + review feedback, refreshed by status checks.
  meta_effective_status text,
  meta_review_feedback  jsonb,
  meta_status_checked_at timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint draft_creating_needs_confirmation check (status not in ('creating', 'created_paused', 'partial') or confirmed_at is not null)
);
create index if not exists idx_meta_drafts_status on public.meta_ad_drafts(status, updated_at desc);

-- ---- change proposals (Stage D) -----------------------------------------------------------
create table if not exists public.meta_change_proposals (
  id               uuid primary key default gen_random_uuid(),
  account_id       text not null references public.meta_ad_accounts(id) on delete cascade,
  target_type      text not null check (target_type in ('campaign', 'adset', 'ad')),
  target_id        text not null,
  change_type      text not null check (change_type in ('pause', 'resume', 'budget', 'schedule', 'targeting', 'notify')),
  current_value    jsonb not null,                       -- what HQN saw when proposing
  proposed_value   jsonb not null,
  evidence         jsonb not null default '{}'::jsonb,
  rationale        text not null,
  budget_impact    jsonb,                                -- {daily_delta, currency, ...} when applicable
  learning_note    text,
  source_kind      text not null check (source_kind in ('audit', 'rule', 'user')),
  source_id        uuid,
  source_version   text,                                 -- audit/rule version that produced it
  status           text not null default 'proposed'
                     check (status in ('proposed', 'approved', 'rejected', 'applying', 'applied', 'failed', 'stale', 'reverted', 'expired')),
  idempotency_key  text not null unique,
  proposed_by      uuid references public.profiles(id) on delete set null,
  proposed_kind    text not null default 'system' check (proposed_kind in ('user', 'system', 'rule')),
  approved_by      uuid references public.profiles(id) on delete set null,
  approved_at      timestamptz,
  auto_approved_by_rule uuid,                            -- rule id when an enabled automatic rule covered it
  applied_at       timestamptz,
  previous_state   jsonb,                                -- re-read from Meta right before applying
  provider_result  jsonb,                                -- actual API response summary (redacted)
  error_message    text,
  expires_at       timestamptz not null default (now() + interval '7 days'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_meta_proposals_status on public.meta_change_proposals(status, created_at desc);
create index if not exists idx_meta_proposals_target on public.meta_change_proposals(target_type, target_id);
-- One OPEN proposal per target+type: prevents two sources queuing the same live change.
create unique index if not exists uq_meta_proposals_open on public.meta_change_proposals(target_type, target_id, change_type)
  where status in ('proposed', 'approved', 'applying');

-- ---- optimization rules (Stage E) ---------------------------------------------------------
create table if not exists public.meta_rules (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (char_length(name) between 1 and 120),
  owner_id              uuid not null references public.profiles(id) on delete restrict,
  version               integer not null default 1,
  enabled               boolean not null default false,
  mode                  text not null default 'recommend' check (mode in ('recommend', 'approval', 'auto')),
  account_id            text not null references public.meta_ad_accounts(id) on delete cascade,
  scope_type            text not null check (scope_type in ('account', 'campaign', 'adset')),
  scope_id              text,                            -- null only for scope_type = 'account'
  action_type           text not null check (action_type in ('notify', 'pause', 'budget_decrease', 'budget_increase')),
  -- {metric, op, threshold}. Thresholds are owner-defined; there are no built-in "winner" numbers.
  condition             jsonb not null,
  eval_window_days      smallint not null check (eval_window_days between 1 and 30),
  -- Minimum evidence before the rule may act: {min_spend, min_impressions, min_results}
  min_evidence          jsonb not null,
  max_data_age_hours    smallint not null default 12 check (max_data_age_hours between 1 and 72),
  conversion_lag_days   smallint not null default 2 check (conversion_lag_days between 0 and 28),
  cooldown_hours        smallint not null default 72 check (cooldown_hours between 1 and 720),
  max_adjust_pct        smallint check (max_adjust_pct between 1 and 50),
  max_changes_per_day   smallint not null default 1 check (max_changes_per_day between 1 and 10),
  budget_floor          numeric(12,2),                   -- account currency, major units
  budget_ceiling        numeric(12,2),
  review_at             timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint rule_scope_id check ((scope_type = 'account') = (scope_id is null)),
  constraint rule_budget_needs_pct check (action_type not in ('budget_decrease', 'budget_increase') or max_adjust_pct is not null),
  constraint rule_auto_needs_expiry check (mode <> 'auto' or expires_at is not null),
  constraint rule_auto_no_increase_without_ceiling check (action_type <> 'budget_increase' or budget_ceiling is not null)
);
create index if not exists idx_meta_rules_account on public.meta_rules(account_id, enabled);

create table if not exists public.meta_rule_evaluations (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid not null references public.meta_rules(id) on delete cascade,
  rule_version  integer not null,
  evaluated_at  timestamptz not null default now(),
  outcome       text not null check (outcome in ('triggered', 'no_action', 'suspended', 'insufficient_evidence', 'cooldown', 'limit_reached', 'conflict', 'expired', 'error')),
  reasons       jsonb not null default '[]'::jsonb,
  metrics       jsonb not null default '{}'::jsonb,
  proposal_id   uuid references public.meta_change_proposals(id) on delete set null
);
create index if not exists idx_meta_rule_eval_rule on public.meta_rule_evaluations(rule_id, evaluated_at desc);

-- ---- audits ----------------------------------------------------------------------------
create table if not exists public.meta_audits (
  id             uuid primary key default gen_random_uuid(),
  audit_version  text not null,
  account_id     text references public.meta_ad_accounts(id) on delete cascade,
  range_start    date not null,
  range_end      date not null,
  summary        jsonb not null default '{}'::jsonb,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create table if not exists public.meta_audit_findings (
  id               uuid primary key default gen_random_uuid(),
  audit_id         uuid not null references public.meta_audits(id) on delete cascade,
  control_id       text not null,
  status           text not null check (status in ('pass', 'attention', 'fail', 'info', 'not_assessed', 'not_applicable')),
  severity         text not null check (severity in ('high', 'medium', 'low', 'info')),
  kind             text not null check (kind in ('fact', 'hypothesis')),
  title            text not null,
  observation      text not null,
  data             jsonb not null default '{}'::jsonb,
  why_it_matters   text,
  proposed_action  text,
  confidence       text check (confidence in ('high', 'medium', 'low')),
  limitations      text,
  evaluation       text,                                  -- how to judge whether the action worked
  rank             integer not null default 0
);
create index if not exists idx_meta_findings_audit on public.meta_audit_findings(audit_id, rank);

-- ---- activity log (append-only) ----------------------------------------------------------
create table if not exists public.meta_activity_log (
  id            uuid primary key default gen_random_uuid(),
  at            timestamptz not null default now(),
  actor_id      uuid references public.profiles(id) on delete set null,
  actor_kind    text not null default 'user' check (actor_kind in ('user', 'system', 'rule')),
  action        text not null,                            -- e.g. draft.confirmed, proposal.applied, automation.stopped
  target_type   text,
  target_id     text,
  account_id    text,
  before_state  jsonb,
  after_state   jsonb,
  version_ref   text,                                     -- audit / rule version involved
  provider_result jsonb,                                  -- redacted summary; never tokens or customer PII
  detail        jsonb not null default '{}'::jsonb
);
create index if not exists idx_meta_activity_at on public.meta_activity_log(at desc);
create index if not exists idx_meta_activity_target on public.meta_activity_log(target_type, target_id);

create or replace function public.guard_meta_activity()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'meta_activity_log is append-only';
end;
$$;
drop trigger if exists trg_meta_activity_append_only on public.meta_activity_log;
create trigger trg_meta_activity_append_only before update or delete on public.meta_activity_log
  for each row execute function public.guard_meta_activity();

-- Rules are versioned: any change to the acting parameters bumps version (evaluations record which one ran).
create or replace function public.bump_meta_rule_version()
returns trigger language plpgsql as $$
begin
  if (new.condition, new.min_evidence, new.action_type, new.mode, new.scope_type, new.scope_id, new.eval_window_days,
      new.max_adjust_pct, new.cooldown_hours, new.max_changes_per_day, new.budget_floor, new.budget_ceiling, new.conversion_lag_days, new.max_data_age_hours)
     is distinct from
     (old.condition, old.min_evidence, old.action_type, old.mode, old.scope_type, old.scope_id, old.eval_window_days,
      old.max_adjust_pct, old.cooldown_hours, old.max_changes_per_day, old.budget_floor, old.budget_ceiling, old.conversion_lag_days, old.max_data_age_hours) then
    new.version := old.version + 1;
    -- Changing what a rule does always disables it: a human must re-enable the new definition.
    new.enabled := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists trg_meta_rules_version on public.meta_rules;
create trigger trg_meta_rules_version before update on public.meta_rules
  for each row execute function public.bump_meta_rule_version();

drop trigger if exists trg_meta_creatives_updated_at on public.meta_creatives;
create trigger trg_meta_creatives_updated_at before update on public.meta_creatives
  for each row execute function public.set_updated_at();
drop trigger if exists trg_meta_drafts_updated_at on public.meta_ad_drafts;
create trigger trg_meta_drafts_updated_at before update on public.meta_ad_drafts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_meta_proposals_updated_at on public.meta_change_proposals;
create trigger trg_meta_proposals_updated_at before update on public.meta_change_proposals
  for each row execute function public.set_updated_at();

-- ---- atomic claims (duplicate-submission protection) -----------------------------------
-- Moves a draft into 'creating' only from a creatable state, exactly once per concurrent caller.
create or replace function public.claim_meta_draft(p_id uuid)
returns setof public.meta_ad_drafts
language sql security definer set search_path = public as $$
  update public.meta_ad_drafts
     set status = 'creating', attempt_count = attempt_count + 1
   where id = p_id and status in ('ready', 'partial', 'failed') and confirmed_at is not null
  returning *;
$$;
revoke all on function public.claim_meta_draft(uuid) from public, anon, authenticated;
grant execute on function public.claim_meta_draft(uuid) to service_role;

create or replace function public.claim_meta_proposal(p_id uuid)
returns setof public.meta_change_proposals
language sql security definer set search_path = public as $$
  update public.meta_change_proposals
     set status = 'applying'
   where id = p_id and status = 'approved' and expires_at > now()
  returning *;
$$;
revoke all on function public.claim_meta_proposal(uuid) from public, anon, authenticated;
grant execute on function public.claim_meta_proposal(uuid) to service_role;

-- ---- RLS -----------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['meta_studio_settings', 'meta_account_controls', 'meta_object_state', 'meta_assets', 'meta_creatives', 'meta_ad_drafts',
                           'meta_change_proposals', 'meta_rules', 'meta_rule_evaluations', 'meta_audits', 'meta_audit_findings',
                           'meta_activity_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['meta_studio_settings', 'meta_account_controls', 'meta_object_state', 'meta_ad_drafts', 'meta_change_proposals', 'meta_rules',
                           'meta_rule_evaluations', 'meta_audits', 'meta_audit_findings', 'meta_activity_log'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_select', t);
    execute format('create policy %I on public.%I for select using (public.is_admin())', t || '_admin_select', t);
  end loop;
end $$;

drop policy if exists meta_assets_select on public.meta_assets;
create policy meta_assets_select on public.meta_assets for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));
drop policy if exists meta_creatives_select on public.meta_creatives;
create policy meta_creatives_select on public.meta_creatives for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id()));

-- ---- private storage bucket for creative originals + thumbnails -------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('meta-creatives', 'meta-creatives', false)
    on conflict (id) do nothing;
  end if;
end $$;
-- No storage.objects policies: only the service role (signed upload/download URLs minted by admin-checked
-- server actions) touches this bucket.

notify pgrst, 'reload schema';
