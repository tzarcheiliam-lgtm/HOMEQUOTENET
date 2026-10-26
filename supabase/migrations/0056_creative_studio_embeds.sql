-- Creative Studio: embed codes an admin pastes on /app/creative-studio ("Add embed").
--
-- Each row is one https iframe src (never raw HTML) with a label. Written by the server with the service role after
-- an admin check; admins can read them via RLS. is_agent rows (assistant embeds) show in the panel at the top.
-- Additive and safe to re-run.

create table if not exists public.creative_studio_embeds (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 80),
  kind        text not null default 'Video' check (char_length(kind) between 1 and 40),
  description text check (description is null or char_length(description) <= 600),
  src         text not null check (src ~ '^https://[^[:space:]]+$' and char_length(src) <= 500),
  is_agent    boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_creative_studio_embeds_created on public.creative_studio_embeds (created_at);

alter table public.creative_studio_embeds enable row level security;
drop policy if exists creative_studio_embeds_admin_select on public.creative_studio_embeds;
create policy creative_studio_embeds_admin_select on public.creative_studio_embeds for select using (public.is_admin());
-- No client write policies: only the service role (server actions) writes.

comment on table public.creative_studio_embeds is
  'Admin-added embeds for /app/creative-studio. Written by the server; admin read-only via RLS.';
