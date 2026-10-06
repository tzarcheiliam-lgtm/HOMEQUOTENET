-- ============================================================================
-- Fish Audio AI calling: webhook event ledger
-- ============================================================================
-- One row per accepted Fish webhook delivery. `dedupe_key` makes at-least-once
-- delivery idempotent (Fish retries up to 3x):
--   call.ended / phone_call.dial_finished -> "<event>:<session.id>"
--   call.analyzed -> "call.analyzed:<session.id>:<analysis.finished_at>"
-- Service-role only (like stripe_events): RLS on, no policies, API roles revoked.
-- Transcripts are never in Fish payloads; the payload here can still hold phone
-- numbers and caller-supplied metadata, so it is not exposed to any app role.
-- ============================================================================
create table if not exists public.ai_call_events (
  id          uuid primary key default gen_random_uuid(),
  dedupe_key  text not null unique,
  event       text not null,
  session_id  text not null,
  agent_id    text,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_ai_call_events_session on public.ai_call_events (session_id);

alter table public.ai_call_events enable row level security;
revoke all on public.ai_call_events from anon, authenticated;
