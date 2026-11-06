-- 0075: Meeting links — ad-hoc HomeQuote video rooms (§48/§50).
--
-- Owner: "have a section on the website for me to be able to make meeting
-- links to send to prospects and make it as frictionless as possible".
-- A meeting link is a video room that is NOT tied to a booked appointment:
-- the rep types a name (optional), picks "now" or a time, and gets a link to
-- text or email. The guest link is signed (lib/video/links.ts, kind 'link'),
-- never stored; this table only says who hosts it, when it is open and
-- whether it was cancelled.
--
-- Access: admins see and manage every link; callers / setters (is_call_agent)
-- only their own. Contractors and homeowners never see this table. Guests are
-- served by the service role after the signed-link check.
-- Idempotent. Applies after 0074.

create table if not exists public.meeting_links (
  id              uuid primary key default gen_random_uuid(),
  host_id         uuid not null references public.profiles(id) on delete cascade,
  guest_name      text check (guest_name is null or length(guest_name) <= 80),
  guest_contact   text check (guest_contact is null or length(guest_contact) <= 200),
  prospect_id     uuid references public.contractor_prospects(id) on delete set null,
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz not null,
  time_zone       text not null default 'America/Los_Angeles',
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint meeting_links_window check (ends_at > starts_at)
);

comment on table public.meeting_links is
  'Ad-hoc HomeQuote video rooms (no appointment behind them). Guest link = signed token of the id; room hq-link-<id>.';

create index if not exists idx_meeting_links_host_starts on public.meeting_links (host_id, starts_at desc);
create index if not exists idx_meeting_links_prospect on public.meeting_links (prospect_id) where prospect_id is not null;

drop trigger if exists trg_meeting_links_updated_at on public.meeting_links;
create trigger trg_meeting_links_updated_at before update on public.meeting_links
  for each row execute function public.set_updated_at();

alter table public.meeting_links enable row level security;

drop policy if exists meeting_links_select on public.meeting_links;
create policy meeting_links_select on public.meeting_links for select
  using (public.is_admin() or (public.is_call_agent() and host_id = auth.uid()));

drop policy if exists meeting_links_insert on public.meeting_links;
create policy meeting_links_insert on public.meeting_links for insert
  with check (host_id = auth.uid() and (public.is_admin() or public.is_call_agent()));

drop policy if exists meeting_links_update on public.meeting_links;
create policy meeting_links_update on public.meeting_links for update
  using      (public.is_admin() or (public.is_call_agent() and host_id = auth.uid()))
  with check (public.is_admin() or (public.is_call_agent() and host_id = auth.uid()));

-- No delete policy: a link is cancelled (cancelled_at), never deleted by app users.

grant select, insert, update on public.meeting_links to authenticated;
grant all on public.meeting_links to service_role;
