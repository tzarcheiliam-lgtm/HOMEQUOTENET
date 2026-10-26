-- Gmail: one sender per team member plus one shared "automation" sender.
--
-- gmail_connections was a boolean-keyed singleton (id = true). It becomes a
-- normal table with a uuid key and a `kind`:
--   * 'automation' -- exactly one row; used by workflows, signing, lead and
--                     billing emails, and as the fallback for a user who has
--                     not connected their own account. The existing singleton
--                     row is kept as this one so sending keeps working; the
--                     admin reconnects it as info@ from the Emails page.
--   * 'user'       -- at most one row per team member (user_id), used when that
--                     person sends from Calls > Emails.
--
-- RLS is unchanged in spirit: admin-only select, no client writes. The server
-- reads a member's own status with the service role, so encrypted refresh
-- tokens never reach an ordinary authenticated client.
--
-- Deploy order: apply this migration BEFORE deploying the code that reads
-- `kind` / `user_id`.

alter table public.gmail_connections drop constraint if exists gmail_connections_pkey;
alter table public.gmail_connections drop constraint if exists gmail_connections_id_check;

alter table public.gmail_connections
  alter column id drop default,
  alter column id type uuid using gen_random_uuid(),
  alter column id set default gen_random_uuid();

alter table public.gmail_connections add primary key (id);

alter table public.gmail_connections
  add column if not exists kind text not null default 'automation',
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

alter table public.gmail_connections drop constraint if exists gmail_connections_kind_check;
alter table public.gmail_connections
  add constraint gmail_connections_kind_check check (kind in ('automation', 'user'));

alter table public.gmail_connections drop constraint if exists gmail_connections_kind_user_check;
alter table public.gmail_connections
  add constraint gmail_connections_kind_user_check check ((kind = 'user') = (user_id is not null));

create unique index if not exists gmail_connections_one_automation
  on public.gmail_connections (kind) where kind = 'automation';
create unique index if not exists gmail_connections_one_per_user
  on public.gmail_connections (user_id) where kind = 'user';

comment on table public.gmail_connections is
  'Gmail OAuth connections: one shared automation sender and at most one per team member. Refresh tokens are AES-256-GCM encrypted by the server before storage; writes are service-role only.';
