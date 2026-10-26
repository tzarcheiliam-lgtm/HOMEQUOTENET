-- Automatic texting of new form leads from the owner's Mac (iMessage via a local bridge) with an AI agent that
-- qualifies over text. The bridge and the web app only ever talk through these tables via service-role API routes.
-- Ships OFF: nothing is texted until an admin turns it on at /app/texting and SMS_BRIDGE_TOKEN is configured.
-- Additive and safe to re-run.

create table if not exists public.sms_settings (
  id                        boolean primary key default true check (id),
  enabled                   boolean not null default false,
  contractor_funnels_enabled boolean not null default false,
  window_start_hour         integer not null default 8  check (window_start_hour between 0 and 23),
  window_end_hour           integer not null default 21 check (window_end_hour between 1 and 24),
  daily_cap                 integer not null default 200 check (daily_cap between 1 and 5000),
  stopped_at                timestamptz,
  bridge_last_seen_at       timestamptz,
  updated_by                uuid references public.profiles(id) on delete set null,
  updated_at                timestamptz not null default now()
);
insert into public.sms_settings (id) values (true) on conflict (id) do nothing;

-- Numbers that replied STOP (or were added by an admin). Never text these again.
create table if not exists public.sms_opt_outs (
  phone_e164 text primary key,
  source     text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sms_conversations (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null unique references public.leads(id) on delete cascade,
  contractor_id        uuid references public.contractors(id) on delete set null,
  sender_name          text not null check (char_length(sender_name) <= 80),
  phone_e164           text not null,
  status               text not null default 'active' check (status in ('active', 'handoff', 'opted_out', 'closed', 'paused')),
  mode                 text check (mode in ('call', 'text')),
  qualification        text not null default 'unknown' check (qualification in ('unknown', 'qualified', 'unqualified')),
  call_time_preference text check (call_time_preference is null or char_length(call_time_preference) <= 200),
  summary              text check (summary is null or char_length(summary) <= 1000),
  ai_turns             integer not null default 0 check (ai_turns >= 0),
  last_inbound_at      timestamptz,
  last_outbound_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_sms_conversations_phone on public.sms_conversations (phone_e164, created_at desc);
create index if not exists idx_sms_conversations_status on public.sms_conversations (status, updated_at desc);

create table if not exists public.sms_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.sms_conversations(id) on delete cascade,
  lead_id          uuid not null references public.leads(id) on delete cascade,
  direction        text not null check (direction in ('in', 'out')),
  body             text not null check (char_length(body) <= 2000),
  status           text not null check (status in ('queued', 'sending', 'sent', 'failed', 'received')),
  ai               boolean not null default false,
  send_after       timestamptz not null default now(),
  claimed_at       timestamptz,
  sent_at          timestamptz,
  error            text check (error is null or char_length(error) <= 300),
  external_guid    text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_sms_messages_conv on public.sms_messages (conversation_id, created_at);
create index if not exists idx_sms_messages_queue on public.sms_messages (send_after) where status = 'queued';
-- An inbound message the bridge reports twice is stored once.
create unique index if not exists uq_sms_messages_guid on public.sms_messages (external_guid) where external_guid is not null;

alter table public.sms_settings enable row level security;
alter table public.sms_opt_outs enable row level security;
alter table public.sms_conversations enable row level security;
alter table public.sms_messages enable row level security;

-- Admins read; every write goes through the server (service role).
drop policy if exists sms_settings_select on public.sms_settings;
create policy sms_settings_select on public.sms_settings for select using (public.is_admin());
drop policy if exists sms_opt_outs_select on public.sms_opt_outs;
create policy sms_opt_outs_select on public.sms_opt_outs for select using (public.is_admin());
drop policy if exists sms_conversations_select on public.sms_conversations;
create policy sms_conversations_select on public.sms_conversations for select using (public.is_admin());
drop policy if exists sms_messages_select on public.sms_messages;
create policy sms_messages_select on public.sms_messages for select using (public.is_admin());

-- Hand queued messages to the Mac bridge. Atomic (skip locked), so two polls never get the same message.
-- A message stuck "sending" for 10+ minutes is marked failed rather than resent (a duplicate text is worse than a miss).
create or replace function public.claim_sms_outbound(p_limit integer default 5)
returns table (id uuid, phone_e164 text, body text)
language plpgsql set search_path = public as $$
begin
  update public.sms_messages m set status = 'failed', error = 'Bridge did not confirm within 10 minutes'
   where m.status = 'sending' and m.claimed_at < now() - interval '10 minutes';
  return query
  with picked as (
    select m.id from public.sms_messages m
     where m.status = 'queued' and m.direction = 'out' and m.send_after <= now()
     order by m.send_after
     limit greatest(1, least(coalesce(p_limit, 5), 20))
     for update skip locked
  )
  update public.sms_messages m set status = 'sending', claimed_at = now()
    from picked, public.sms_conversations c
   where m.id = picked.id and c.id = m.conversation_id
  returning m.id, c.phone_e164, m.body;
end $$;
revoke all on function public.claim_sms_outbound(integer) from public, anon, authenticated;
grant execute on function public.claim_sms_outbound(integer) to service_role;

comment on table public.sms_messages is 'Texts to and from new leads, sent through the owner''s Mac iMessage bridge. Service role writes; admins read.';
