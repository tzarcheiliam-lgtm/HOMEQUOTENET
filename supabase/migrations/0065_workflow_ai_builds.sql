-- AI workflow builder usage log (admins only). One row per "Describe a workflow" / "Change with AI" request:
-- who, when, the (trimmed) description, model, token counts, outcome and the draft it created. The server
-- enforces the per-admin daily cap (30 builds per rolling 24 hours) by counting these rows.
-- Additive and idempotent. RLS on: admins can read; only the server (service role) writes.

create table if not exists public.workflow_ai_builds (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete set null,
  mode           text not null default 'create' check (mode in ('create', 'change')),
  prompt         text not null default '' check (char_length(prompt) <= 2000),
  model          text not null default '' check (char_length(model) <= 80),
  input_tokens   integer not null default 0 check (input_tokens >= 0),
  output_tokens  integer not null default 0 check (output_tokens >= 0),
  -- Estimated cost in millionths of a dollar (the app's price table, not the provider invoice).
  cost_micros    bigint not null default 0 check (cost_micros >= 0),
  attempts       smallint not null default 0 check (attempts between 0 and 10),
  outcome        text not null check (outcome in ('draft_created', 'change_proposed', 'needs_answers', 'invalid', 'error', 'limit')),
  error_code     text check (error_code is null or char_length(error_code) <= 80),
  workflow_id    uuid references public.workflows(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_workflow_ai_builds_user on public.workflow_ai_builds (user_id, created_at desc);
create index if not exists idx_workflow_ai_builds_created on public.workflow_ai_builds (created_at desc);

alter table public.workflow_ai_builds enable row level security;

drop policy if exists workflow_ai_builds_admin_select on public.workflow_ai_builds;
create policy workflow_ai_builds_admin_select on public.workflow_ai_builds for select using (public.is_admin());
-- No insert/update/delete policies: service role only.

comment on table public.workflow_ai_builds is
  'AI workflow builder requests (admins only). Written by the server with the service role; the 30-per-24h cap counts these rows (outcome <> ''limit'').';
