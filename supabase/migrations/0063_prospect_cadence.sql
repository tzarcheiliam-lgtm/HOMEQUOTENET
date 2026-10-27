-- =============================================================================
-- 0063 — Prospect call cadence: space out retries, park after too many misses
--
--   contractor_prospects
--     .no_connect_streak   no-answer / voicemail / gatekeeper calls in a row
--                          since someone was last reached (or since it came
--                          back from being parked)
--     .next_attempt_at     don't dial before this (null = dial any time)
--     .parked_at           set when the streak hit the limit; with a null
--                          next_attempt_at it means parked for good
--     .park_count          how many times it has been parked
--     .resting_until       (generated) when the cadence lets it be dialled
--                          again; 'infinity' when parked for good
--     .dial_after          (generated) the later of resting_until and a
--                          promised callback: the single "not before" the
--                          queue filters on
--
-- The rules live in lib/calls/cadence.ts; the app writes the four plain
-- columns. Callers already own their prospects' calling fields, and these are
-- calling fields, so guard_prospect_caller_update() is unchanged.
-- Existing streaks are backfilled from the call log; nothing is rested or
-- parked by this migration. Idempotent; safe to re-run.
-- =============================================================================

alter table public.contractor_prospects
  add column if not exists no_connect_streak integer not null default 0,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists parked_at timestamptz,
  add column if not exists park_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prospects_cadence_nonneg') then
    alter table public.contractor_prospects add constraint prospects_cadence_nonneg
      check (no_connect_streak >= 0 and park_count >= 0);
  end if;
end $$;

alter table public.contractor_prospects
  add column if not exists resting_until timestamptz generated always as (
    case when parked_at is not null and next_attempt_at is null then 'infinity'::timestamptz
         else next_attempt_at end
  ) stored;

alter table public.contractor_prospects
  add column if not exists dial_after timestamptz generated always as (
    greatest(
      next_callback_at,
      case when parked_at is not null and next_attempt_at is null then 'infinity'::timestamptz
           else next_attempt_at end
    )
  ) stored;

create index if not exists idx_prospects_dial_after
  on public.contractor_prospects (assigned_to, dial_after);

-- Backfill: no-connect calls since the last call with any other result.
-- ('calling' is not a result and is ignored, as in lib/calls/cadence.ts.)
with last_other as (
  select prospect_id, max(created_at) as at
    from public.prospect_call_attempts
   where outcome not in ('no_answer', 'left_voicemail', 'gatekeeper', 'calling')
   group by prospect_id
), streaks as (
  select a.prospect_id, count(*)::int as n
    from public.prospect_call_attempts a
    left join last_other l on l.prospect_id = a.prospect_id
   where a.outcome in ('no_answer', 'left_voicemail', 'gatekeeper')
     and (l.at is null or a.created_at > l.at)
   group by a.prospect_id
)
update public.contractor_prospects p
   set no_connect_streak = s.n
  from streaks s
 where p.id = s.prospect_id
   and p.no_connect_streak = 0
   and p.next_attempt_at is null
   and p.parked_at is null;
