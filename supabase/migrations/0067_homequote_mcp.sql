-- HomeQuote as an MCP server for Claude: API keys an admin creates (each limited to chosen permissions) and an
-- audit log of every tool Claude calls. Only a SHA-256 hash of a key is stored; the key itself is shown once.
-- All writes go through the server with the service role; admins can read via RLS. Additive and safe to re-run.

create table if not exists public.mcp_api_keys (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  key_hash      text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  key_prefix    text not null check (char_length(key_prefix) between 4 and 20),
  -- read: look things up. write: notes, lead status, workflow drafts. text: text homeowners through the Mac bridge.
  scopes        text[] not null default '{read}' check (scopes <@ array['read', 'write', 'text']::text[] and 'read' = any (scopes)),
  -- The admin the key acts for (actions are attributed to them).
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists idx_mcp_api_keys_created on public.mcp_api_keys (created_at desc);

create table if not exists public.mcp_tool_calls (
  id          uuid primary key default gen_random_uuid(),
  key_id      uuid references public.mcp_api_keys(id) on delete set null,
  tool        text not null check (char_length(tool) <= 80),
  -- What was asked, without message bodies or other free text beyond 300 characters.
  summary     text not null default '' check (char_length(summary) <= 300),
  ok          boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mcp_tool_calls_created on public.mcp_tool_calls (created_at desc);

alter table public.mcp_api_keys enable row level security;
alter table public.mcp_tool_calls enable row level security;
drop policy if exists mcp_api_keys_admin_select on public.mcp_api_keys;
create policy mcp_api_keys_admin_select on public.mcp_api_keys for select using (public.is_admin());
drop policy if exists mcp_tool_calls_admin_select on public.mcp_tool_calls;
create policy mcp_tool_calls_admin_select on public.mcp_tool_calls for select using (public.is_admin());
-- No insert/update/delete policies: service role only.
