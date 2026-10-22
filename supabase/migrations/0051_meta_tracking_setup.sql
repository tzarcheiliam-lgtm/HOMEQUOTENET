-- Guided Meta tracking setup (used by the in-app assistant): per-user Meta authorization, the dataset (pixel) chosen for
-- each funnel, what has actually been verified, and an audit log of every change.
--
-- Isolation: a connection belongs to ONE contractor company (contractor_id) or, when contractor_id is null, to HomeQuote
-- itself (admins only). Tokens live in a separate table with RLS enabled and NO policies, so no client query can ever read
-- them; only the server (service role) decrypts them. Every write goes through the server after explicit checks.
-- Additive and safe to re-run.

create table if not exists public.meta_connections (
  id                uuid primary key default gen_random_uuid(),
  contractor_id     uuid references public.contractors(id) on delete cascade,
  connected_by      uuid references public.profiles(id) on delete set null,
  meta_user_id      text not null check (char_length(meta_user_id) <= 40),
  meta_user_name    text check (meta_user_name is null or char_length(meta_user_name) <= 200),
  scopes            text[] not null default '{}',
  token_expires_at  timestamptz,
  status            text not null default 'active' check (status in ('active', 'needs_reconnect', 'revoked')),
  last_error        text check (last_error is null or char_length(last_error) <= 300),
  connected_at      timestamptz not null default now(),
  last_used_at      timestamptz
);
create unique index if not exists uq_meta_connections_owner on public.meta_connections
  ((coalesce(contractor_id, '00000000-0000-0000-0000-000000000000'::uuid)), meta_user_id);
create index if not exists idx_meta_connections_contractor on public.meta_connections (contractor_id);

-- Encrypted (AES-256-GCM) long-lived user token. Never selectable by any client role.
create table if not exists public.meta_connection_secrets (
  connection_id  uuid primary key references public.meta_connections(id) on delete cascade,
  token_enc      text not null,
  updated_at     timestamptz not null default now()
);

create table if not exists public.meta_funnel_tracking (
  funnel_id           uuid primary key references public.funnels(id) on delete cascade,
  contractor_id       uuid references public.contractors(id) on delete set null,
  connection_id       uuid references public.meta_connections(id) on delete set null,
  business_id         text,
  business_name       text,
  ad_account_id       text not null check (ad_account_id ~ '^act_[0-9]{4,25}$'),
  ad_account_name     text,
  dataset_id          text not null check (dataset_id ~ '^[0-9]{5,30}$'),
  dataset_name        text,
  events              text[] not null default '{PageView,Lead,Schedule}',
  configured_by       uuid references public.profiles(id) on delete set null,
  configured_at       timestamptz not null default now(),
  -- What was actually observed, with timestamps: { checkedAt, pixelLastFiredAt, leadSeenAt, serverLeadAcceptedAt, ... }.
  verification        jsonb not null default '{}'::jsonb,
  verified_at         timestamptz
);
create index if not exists idx_meta_funnel_tracking_contractor on public.meta_funnel_tracking (contractor_id);

create table if not exists public.meta_setup_log (
  id             bigint generated always as identity primary key,
  actor_user_id  uuid references public.profiles(id) on delete set null,
  contractor_id  uuid references public.contractors(id) on delete set null,
  funnel_id      uuid references public.funnels(id) on delete set null,
  connection_id  uuid references public.meta_connections(id) on delete set null,
  action         text not null check (char_length(action) between 1 and 60),
  via            text not null default 'assistant' check (via in ('assistant', 'app')),
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default clock_timestamp()
);
create index if not exists idx_meta_setup_log_funnel on public.meta_setup_log (funnel_id, id);

create or replace function public.meta_setup_log_forbid_change() returns trigger language plpgsql as $$
begin
  raise exception 'meta_setup_log:immutable' using errcode = 'P0001';
end $$;
drop trigger if exists trg_meta_setup_log_immutable on public.meta_setup_log;
create trigger trg_meta_setup_log_immutable before update or delete on public.meta_setup_log
  for each row execute function public.meta_setup_log_forbid_change();

alter table public.meta_connections enable row level security;
alter table public.meta_connection_secrets enable row level security;
alter table public.meta_funnel_tracking enable row level security;
alter table public.meta_setup_log enable row level security;

-- Admins see everything; a contractor OWNER sees only their company's rows. Staff see none.
drop policy if exists meta_connections_select on public.meta_connections;
create policy meta_connections_select on public.meta_connections for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id() and public.is_contractor_owner()));
drop policy if exists meta_funnel_tracking_select on public.meta_funnel_tracking;
create policy meta_funnel_tracking_select on public.meta_funnel_tracking for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id() and public.is_contractor_owner()));
drop policy if exists meta_setup_log_select on public.meta_setup_log;
create policy meta_setup_log_select on public.meta_setup_log for select
  using (public.is_admin() or (contractor_id is not null and contractor_id = public.auth_contractor_id() and public.is_contractor_owner()));
-- meta_connection_secrets: no policies at all (service role only).

comment on table public.meta_connection_secrets is 'Encrypted Meta user tokens. RLS enabled with no policies: only the service role can read.';
