-- HomeQuote Network — manually reviewed prospect emails via Gmail.

alter table public.contractor_prospects
  add column if not exists decision_maker_email text;

create table if not exists public.prospect_email_logs (
  id                    uuid primary key default gen_random_uuid(),
  prospect_id           uuid not null references public.contractor_prospects(id) on delete cascade,
  company_name          text not null,
  sender_user_id        uuid references public.profiles(id) on delete set null,
  sender_name           text,
  sender_email          text not null,
  recipient_name        text,
  recipient_email       text not null,
  template_key          text not null,
  subject               text not null,
  message               text not null,
  status                text not null default 'pending'
                        check (status in ('pending', 'sent', 'failed')),
  provider_message_id   text,
  error_message         text,
  sent_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint prospect_email_sent_shape check (
    (status = 'sent' and sent_at is not null and provider_message_id is not null)
    or status <> 'sent'
  )
);

create index if not exists idx_prospect_email_logs_prospect
  on public.prospect_email_logs (prospect_id, created_at desc);

drop trigger if exists trg_prospect_email_logs_updated_at on public.prospect_email_logs;
create trigger trg_prospect_email_logs_updated_at
  before update on public.prospect_email_logs
  for each row execute function public.set_updated_at();

comment on table public.prospect_email_logs is
  'Outbound prospect email activity. Content is immutable to app users; trusted server code finalizes pending rows as sent or failed.';

alter table public.prospect_email_logs enable row level security;

drop policy if exists prospect_email_logs_select on public.prospect_email_logs;
create policy prospect_email_logs_select on public.prospect_email_logs for select
  using (public.is_admin() or (public.is_caller() and public.prospect_assigned_to_me(prospect_id)));

-- No insert/update/delete policy. The authenticated server action authorizes
-- the prospect first, then uses the service role to create and finalize logs.

create table if not exists public.gmail_connections (
  id                       boolean primary key default true check (id),
  email_address            text not null,
  encrypted_refresh_token  text not null,
  granted_scope            text not null,
  connected_by             uuid references public.profiles(id) on delete set null,
  connected_at             timestamptz not null default now(),
  last_used_at              timestamptz,
  last_error                text,
  updated_at                timestamptz not null default now()
);

drop trigger if exists trg_gmail_connections_updated_at on public.gmail_connections;
create trigger trg_gmail_connections_updated_at
  before update on public.gmail_connections
  for each row execute function public.set_updated_at();

comment on table public.gmail_connections is
  'Singleton Gmail OAuth connection. Refresh token is AES-256-GCM encrypted by the server before storage.';

alter table public.gmail_connections enable row level security;

drop policy if exists gmail_connections_admin_select on public.gmail_connections;
create policy gmail_connections_admin_select on public.gmail_connections for select
  using (public.is_admin());

-- Writes are service-role only so refresh tokens never pass through a browser
-- or an ordinary authenticated Supabase client.
