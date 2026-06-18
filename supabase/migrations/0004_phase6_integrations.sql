-- ============================================================================
-- HomeQuote Network — Phase 6: Integration Framework & Lead Intake Engine
-- ============================================================================
-- Additive migration. Run AFTER 0001–0003 (already applied).
--
-- Provider-agnostic by design: `provider` is free TEXT (not an enum) and
-- connector behavior lives in code, so new sources (Google, GHL, Zapier, API,
-- …) plug in WITHOUT a schema change. Every source flows through the same
-- intake pipeline and lands in lead_intake_events; created leads carry the full
-- attribution captured below.
-- ============================================================================

-- ---- integrations: one row per configured connector -----------------------
create table if not exists public.integrations (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null,          -- meta | google | ghl | website | zapier | api | ...
  name             text not null,
  status           text not null default 'disconnected', -- connected | disconnected | error | disabled
  health           text not null default 'unknown',       -- healthy | degraded | error | unknown
  is_enabled       boolean not null default false,
  config           jsonb not null default '{}',  -- provider settings + field mappings (non-secret)
  secret           text,                          -- verify token / api key (admin-only via RLS)
  last_sync_at     timestamptz,
  last_activity_at timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (provider, name)
);

drop trigger if exists trg_integrations_updated_at on public.integrations;
create trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- ---- extended attribution on leads (additive) -----------------------------
alter table public.leads
  add column if not exists platform        text,
  add column if not exists campaign_id     text,
  add column if not exists ad_set_id       text,
  add column if not exists ad_id           text,
  add column if not exists form_name       text,
  add column if not exists form_id         text,
  add column if not exists external_lead_id text,
  add column if not exists integration_id  uuid references public.integrations(id) on delete set null;

-- Dedupe + lookup support.
create index if not exists idx_leads_email_lower on public.leads (lower(email));
create index if not exists idx_leads_phone on public.leads (phone);
create index if not exists idx_leads_external on public.leads (external_lead_id);

-- ---- lead intake events: the pipeline log ----------------------------------
create table if not exists public.lead_intake_events (
  id               uuid primary key default gen_random_uuid(),
  integration_id   uuid references public.integrations(id) on delete set null,
  provider         text not null,
  platform         text,            -- facebook | instagram | web | ...
  status           text not null default 'received', -- received | created | duplicate | error
  external_lead_id text,
  full_name        text,
  phone            text,
  email            text,
  campaign         text,
  campaign_id      text,
  ad_set           text,
  ad_set_id        text,
  ad               text,
  ad_id            text,
  form             text,
  form_id          text,
  normalized       jsonb not null default '{}',
  raw_payload      jsonb not null default '{}',
  lead_id          uuid references public.leads(id) on delete set null,
  duplicate_of     uuid references public.leads(id) on delete set null,
  error            text,
  received_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists idx_intake_received on public.lead_intake_events (received_at desc);
create index if not exists idx_intake_provider on public.lead_intake_events (provider);
create index if not exists idx_intake_status on public.lead_intake_events (status);

-- ============================================================================
-- RLS — both tables are admin-only. The webhook handler writes with the
-- service-role key (bypasses RLS), which is correct for unauthenticated
-- system ingestion.
-- ============================================================================
alter table public.integrations       enable row level security;
alter table public.lead_intake_events enable row level security;

drop policy if exists integrations_admin on public.integrations;
create policy integrations_admin on public.integrations for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists intake_admin_select on public.lead_intake_events;
create policy intake_admin_select on public.lead_intake_events for select
  using (public.is_admin());

-- ============================================================================
-- SEED — one connector row per supported provider so /integrations is
-- populated out of the box. Meta is the only fully implemented connector.
-- ============================================================================
insert into public.integrations (provider, name, status, health, is_enabled, config)
values
  ('meta',    'Meta Lead Ads',      'disconnected', 'unknown', false,
     '{"category":"ads","platforms":["facebook","instagram"]}'),
  ('google',  'Google Ads Lead Forms', 'disconnected', 'unknown', false, '{"category":"ads"}'),
  ('ghl',     'GoHighLevel',        'disconnected', 'unknown', false, '{"category":"crm"}'),
  ('website', 'Website Forms',      'disconnected', 'unknown', false, '{"category":"forms"}'),
  ('zapier',  'Zapier',             'disconnected', 'unknown', false, '{"category":"automation"}'),
  ('api',     'Public API',         'disconnected', 'unknown', false, '{"category":"api"}')
on conflict (provider, name) do nothing;
