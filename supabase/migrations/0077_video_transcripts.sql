-- 0077: Video call transcripts + AI summaries (Phase 3 of HomeQuote video rooms, §48/§51).
--
-- After a HomeQuote video call, HomeQuote keeps a transcript and a short Claude
-- summary (summary, objections, price discussed, next step, a SUGGESTED sale
-- outcome that is never applied) and writes the summary to the prospect's
-- notes or the lead's timeline.
--
-- California is an all-party-consent state: nothing is captured unless every
-- participant agreed in the call UI first. The consent itself lives in LiveKit
-- (each participant sets their own attribute; the server re-reads the room
-- from LiveKit before every start), and the server writes what it observed
-- into video_recording_consents as the audit record.
--
-- Ships DORMANT: nothing writes to these tables unless VIDEO_TRANSCRIPTS_ENABLED=true
-- and the storage / speech-to-text keys are set (lib/video/transcripts/config.server.ts).
--
-- Access: admins read everything; the person who asked to record reads their
-- own recordings. Nobody else, and no app user can write: the service role does
-- all writes. Audio is deleted from storage once the transcript is saved.
-- Idempotent. Applies after 0076 (Phase 2, video_calls).

-- ---------------------------------------------------------------------------
-- One recording session per "Record & summarize" request in a room
-- ---------------------------------------------------------------------------
create table if not exists public.video_recordings (
  id                  uuid primary key default gen_random_uuid(),
  meeting_kind        text not null check (meeting_kind in ('appointment', 'sales_appointment', 'link')),
  meeting_id          uuid not null,
  room_name           text not null check (length(room_name) <= 80),
  prospect_id         uuid references public.contractor_prospects(id) on delete set null,
  lead_id             uuid references public.leads(id) on delete set null,
  requested_by        uuid references public.profiles(id) on delete set null,
  requested_by_name   text check (requested_by_name is null or length(requested_by_name) <= 80),
  -- Snapshot for the summary prompt / note: guest name, company or project, start time, zone.
  meeting_context     jsonb not null default '{}',
  -- asking -> starting -> recording <-> paused -> stopped -> processing -> done | failed;
  -- cancelled = stopped / declined before anything was captured.
  state               text not null default 'asking' check (state in (
                        'asking', 'starting', 'recording', 'paused', 'stopped', 'cancelled', 'processing', 'done', 'failed')),
  consent_version     text not null,
  stop_reason         text check (stop_reason is null or length(stop_reason) <= 80),
  capture_started_at  timestamptz,
  capture_ended_at    timestamptz,
  attempts            integer not null default 0,
  error               text check (error is null or length(error) <= 500),
  stt_provider        text,
  transcript_text     text,
  transcript_turns    jsonb,
  transcript_language text,
  audio_seconds       numeric(10,2),
  summary             jsonb,
  suggested_outcome   text check (suggested_outcome is null or suggested_outcome in ('sold', 'not_sold', 'undecided')),
  summary_model       text,
  summary_cost_micros integer,
  note_written_at     timestamptz,
  audio_deleted_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.video_recordings is
  'Consent-gated recordings of HomeQuote video calls (§51): state, transcript, Claude summary. Service-role writes only.';
comment on column public.video_recordings.suggested_outcome is
  'What the AI summary suggests (sold / not_sold / undecided). A suggestion only: prospect_sales_appointments.sale_outcome is never set from it.';

-- At most one live session per room: a second "Record" click, or two tabs racing, reuse it.
create unique index if not exists uq_video_recordings_live_room
  on public.video_recordings (room_name)
  where state in ('asking', 'starting', 'recording', 'paused');
create index if not exists idx_video_recordings_pending
  on public.video_recordings (state, updated_at)
  where state in ('stopped', 'failed');
create index if not exists idx_video_recordings_meeting on public.video_recordings (meeting_kind, meeting_id);
create index if not exists idx_video_recordings_requested_by on public.video_recordings (requested_by, created_at desc);

drop trigger if exists trg_video_recordings_updated_at on public.video_recordings;
create trigger trg_video_recordings_updated_at before update on public.video_recordings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- One audio file per uninterrupted stretch of capture (a pause ends a segment)
-- ---------------------------------------------------------------------------
create table if not exists public.video_recording_segments (
  id                uuid primary key default gen_random_uuid(),
  recording_id      uuid not null references public.video_recordings(id) on delete cascade,
  seq               integer not null check (seq >= 1),
  egress_id         text unique,
  storage_path      text not null check (length(storage_path) <= 300),
  status            text not null default 'starting' check (status in ('starting', 'active', 'complete', 'failed')),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  numeric(10,2),
  size_bytes        bigint,
  error             text check (error is null or length(error) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (recording_id, seq)
);

drop trigger if exists trg_video_recording_segments_updated_at on public.video_recording_segments;
create trigger trg_video_recording_segments_updated_at before update on public.video_recording_segments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- The consent the server saw in LiveKit just before it started capture
-- ---------------------------------------------------------------------------
create table if not exists public.video_recording_consents (
  id                    uuid primary key default gen_random_uuid(),
  recording_id          uuid not null references public.video_recordings(id) on delete cascade,
  participant_identity  text not null check (length(participant_identity) <= 120),
  participant_name      text check (participant_name is null or length(participant_name) <= 120),
  participant_role      text check (participant_role is null or length(participant_role) <= 20),
  consent_version       text not null,
  observed_at           timestamptz not null default now(),
  unique (recording_id, participant_identity)
);

-- ---------------------------------------------------------------------------
-- RLS: admins + the requester read; nobody but the service role writes
-- ---------------------------------------------------------------------------
alter table public.video_recordings         enable row level security;
alter table public.video_recording_segments enable row level security;
alter table public.video_recording_consents enable row level security;

drop policy if exists video_recordings_select on public.video_recordings;
create policy video_recordings_select on public.video_recordings for select
  using (public.is_admin() or requested_by = auth.uid());

drop policy if exists video_recording_segments_select on public.video_recording_segments;
create policy video_recording_segments_select on public.video_recording_segments for select
  using (exists (select 1 from public.video_recordings r
                 where r.id = recording_id and (public.is_admin() or r.requested_by = auth.uid())));

drop policy if exists video_recording_consents_select on public.video_recording_consents;
create policy video_recording_consents_select on public.video_recording_consents for select
  using (exists (select 1 from public.video_recordings r
                 where r.id = recording_id and (public.is_admin() or r.requested_by = auth.uid())));

-- No insert / update / delete policies: app users never write these tables.
revoke insert, update, delete on public.video_recordings, public.video_recording_segments, public.video_recording_consents from anon, authenticated;
grant select on public.video_recordings, public.video_recording_segments, public.video_recording_consents to authenticated;
grant all on public.video_recordings, public.video_recording_segments, public.video_recording_consents to service_role;

-- ---------------------------------------------------------------------------
-- Prepend the call summary to a prospect's notes in one statement (no lost update
-- if a caller edits the notes at the same moment). Service role only.
-- ---------------------------------------------------------------------------
create or replace function public.video_prepend_prospect_note(p_prospect_id uuid, p_note text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_note is null or length(trim(p_note)) = 0 then
    return false;
  end if;
  update public.contractor_prospects
     set notes = left(p_note, 6000) || case when coalesce(notes, '') = '' then '' else E'\n\n' || notes end
   where id = p_prospect_id;
  return found;
end;
$$;

revoke execute on function public.video_prepend_prospect_note(uuid, text) from public, anon, authenticated;
grant execute on function public.video_prepend_prospect_note(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Private bucket for the short-lived call audio (LiveKit Egress uploads through
-- Supabase Storage's S3 endpoint; HomeQuote deletes each file after transcription)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    -- No MIME allow-list: the Content-Type LiveKit Egress sends for .ogg is not documented, and a
    -- mismatch would silently drop the upload. Private bucket, 100 MB cap, service-role access only.
    values ('video-recordings', 'video-recordings', false, 104857600, null)
    on conflict (id) do update set public = false;
  end if;
end $$;
