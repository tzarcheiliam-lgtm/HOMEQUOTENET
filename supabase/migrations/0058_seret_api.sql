-- Seret API: lets Claude (or any MCP client) use Seret with an API key an admin creates.
--
-- seret_api_keys     one row per key. Only a SHA-256 hash of the key is stored; the key itself is shown once.
-- seret_generations  every image/video started through the API, its kie.ai task, status and the stored result.
-- seret-media        private bucket for finished files (kie.ai only keeps results for a limited time).
--
-- All writes go through the server with the service role; admins can read via RLS. Additive and safe to re-run.

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('seret-media', 'seret-media', false, 104857600, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'])
    on conflict (id) do update set public = false;
  end if;
end $$;

create table if not exists public.seret_api_keys (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  key_hash      text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  key_prefix    text not null check (char_length(key_prefix) between 4 and 20),
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists idx_seret_api_keys_created on public.seret_api_keys (created_at desc);

create table if not exists public.seret_generations (
  id            uuid primary key default gen_random_uuid(),
  api_key_id    uuid references public.seret_api_keys(id) on delete set null,
  kind          text not null check (kind in ('image', 'video')),
  model         text not null check (char_length(model) between 1 and 120),
  prompt        text not null check (char_length(prompt) between 1 and 4000),
  settings      jsonb not null default '{}'::jsonb,
  kie_task_id   text check (kie_task_id is null or char_length(kie_task_id) <= 200),
  status        text not null default 'running' check (status in ('running', 'success', 'failed')),
  error         text check (error is null or char_length(error) <= 1000),
  storage_path  text check (storage_path is null or char_length(storage_path) <= 300),
  source_url    text check (source_url is null or char_length(source_url) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_seret_generations_created on public.seret_generations (created_at desc);
create index if not exists idx_seret_generations_running on public.seret_generations (status) where status = 'running';

alter table public.seret_api_keys enable row level security;
alter table public.seret_generations enable row level security;
drop policy if exists seret_api_keys_admin_select on public.seret_api_keys;
create policy seret_api_keys_admin_select on public.seret_api_keys for select using (public.is_admin());
drop policy if exists seret_generations_admin_select on public.seret_generations;
create policy seret_generations_admin_select on public.seret_generations for select using (public.is_admin());
-- No client write policies: only the service role (server code, after an admin or API-key check) writes.

comment on table public.seret_api_keys is 'Seret API keys (hash only). Created/revoked by admins on /app/seret-api; used by /api/seret/mcp.';
comment on table public.seret_generations is 'Images/videos started through the Seret API (MCP). Results copied to the private seret-media bucket.';
