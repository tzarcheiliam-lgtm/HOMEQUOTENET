-- In-app Claude assistant: conversations, messages, confirmable actions and usage/cost log.
--
-- Isolation model: every row belongs to one user (user_id), and users can only SELECT their own
-- rows. There are NO client write policies: the assistant API route writes with the service role
-- after resolving the user from the authenticated session, so a user (or the model) can never
-- insert/alter rows for someone else, tamper with an action payload, or edit usage records.
-- Additive and safe to re-run.

create table if not exists public.assistant_conversations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  contractor_id       uuid references public.contractors(id) on delete set null,
  title               text not null default 'New conversation' check (char_length(title) <= 120),
  summary             text check (summary is null or char_length(summary) <= 4000),
  summarized_through  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_assistant_conversations_user on public.assistant_conversations (user_id, updated_at desc);

create table if not exists public.assistant_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null check (char_length(content) <= 20000),
  status           text not null default 'complete' check (status in ('complete', 'cancelled', 'error')),
  -- Route / selected record the user was looking at (labels only; never trusted for authorization).
  context          jsonb not null default '{}',
  -- Client-generated id so a retried request never stores the same user message twice.
  client_id        text check (client_id is null or char_length(client_id) <= 80),
  created_at       timestamptz not null default now()
);
create index if not exists idx_assistant_messages_conv on public.assistant_messages (conversation_id, created_at);
create unique index if not exists uq_assistant_messages_client on public.assistant_messages (conversation_id, client_id) where client_id is not null;

-- A change the assistant PROPOSED. Nothing is written to the CRM until the user confirms.
create table if not exists public.assistant_actions (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.assistant_conversations(id) on delete cascade,
  message_id       uuid references public.assistant_messages(id) on delete set null,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  contractor_id    uuid references public.contractors(id) on delete set null,
  kind             text not null check (kind in ('add_note', 'update_status', 'create_document', 'update_document', 'request_signature', 'configure_meta_tracking', 'create_meta_dataset')),
  lead_id          uuid references public.leads(id) on delete set null,
  payload          jsonb not null,
  preview          jsonb not null default '{}',
  status           text not null default 'proposed' check (status in ('proposed', 'executing', 'executed', 'failed', 'cancelled')),
  idempotency_key  text not null check (char_length(idempotency_key) <= 128),
  result           jsonb,
  error            text check (error is null or char_length(error) <= 500),
  created_at       timestamptz not null default now(),
  decided_at       timestamptz
);
create index if not exists idx_assistant_actions_conv on public.assistant_actions (conversation_id, created_at);
-- The same proposal (same conversation, kind, lead and content) is only ever live once: a retried
-- request returns the existing row, and an executed one can never be executed a second time.
create unique index if not exists uq_assistant_actions_live on public.assistant_actions (user_id, idempotency_key)
  where status in ('proposed', 'executing', 'executed');

-- One row per model call: tokens and estimated cost by user, contractor and feature.
create table if not exists public.assistant_usage (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles(id) on delete set null,
  contractor_id       uuid references public.contractors(id) on delete set null,
  conversation_id     uuid references public.assistant_conversations(id) on delete set null,
  feature             text not null check (feature in ('chat', 'summary')),
  model               text not null,
  input_tokens        integer not null default 0 check (input_tokens >= 0),
  output_tokens       integer not null default 0 check (output_tokens >= 0),
  cache_read_tokens   integer not null default 0 check (cache_read_tokens >= 0),
  cache_write_tokens  integer not null default 0 check (cache_write_tokens >= 0),
  -- Estimated cost in millionths of a dollar (from the app's price table, not the provider invoice).
  cost_micros         bigint not null default 0 check (cost_micros >= 0),
  status              text not null default 'ok' check (status in ('ok', 'cancelled', 'error')),
  error_code          text check (error_code is null or char_length(error_code) <= 80),
  created_at          timestamptz not null default now()
);
create index if not exists idx_assistant_usage_user on public.assistant_usage (user_id, created_at desc);
create index if not exists idx_assistant_usage_contractor on public.assistant_usage (contractor_id, created_at desc);
create index if not exists idx_assistant_usage_created on public.assistant_usage (created_at desc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_actions enable row level security;
alter table public.assistant_usage enable row level security;

drop policy if exists assistant_conversations_select on public.assistant_conversations;
create policy assistant_conversations_select on public.assistant_conversations for select using (user_id = auth.uid());
drop policy if exists assistant_messages_select on public.assistant_messages;
create policy assistant_messages_select on public.assistant_messages for select using (user_id = auth.uid());
drop policy if exists assistant_actions_select on public.assistant_actions;
create policy assistant_actions_select on public.assistant_actions for select using (user_id = auth.uid());
drop policy if exists assistant_usage_select on public.assistant_usage;
create policy assistant_usage_select on public.assistant_usage for select using (public.is_admin() or user_id = auth.uid());
-- No insert/update/delete policies: service role only.

-- Spend since a point in time, optionally for one user and/or contractor (budget guard). Service role only.
create or replace function public.assistant_spend_micros(p_since timestamptz, p_user uuid default null, p_contractor uuid default null)
returns bigint language sql stable set search_path = public as $$
  select coalesce(sum(cost_micros), 0)::bigint from public.assistant_usage
   where created_at >= p_since
     and (p_user is null or user_id = p_user)
     and (p_contractor is null or contractor_id = p_contractor)
$$;
revoke all on function public.assistant_spend_micros(timestamptz, uuid, uuid) from public, anon, authenticated;
grant execute on function public.assistant_spend_micros(timestamptz, uuid, uuid) to service_role;

comment on table public.assistant_actions is
  'Changes proposed by the in-app assistant. Executed only after the owning user confirms; written by the server (service role).';
