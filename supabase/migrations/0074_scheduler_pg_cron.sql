-- 0074: reliable scheduler (Supabase Cron + pg_net), 2026-11-04.
--
-- Why: GitHub Actions runs `*/5 * * * *` best-effort, and for this repo it has fired every ~3-8 hours instead
-- (210 "Workflow tick" runs between 2026-09-25 and 2026-11-04, where ~11,500 were scheduled). Reminder texts,
-- follow-ups, no-show recovery, booking notices, push backstops and the texting-down alert all ride on that tick,
-- so they ran hours late. pg_cron fires on the minute and calls the same Bearer-protected endpoints via pg_net.
--
-- The GitHub workflows stay as a backup. Overlapping ticks are safe: every job claims its work atomically
-- (FOR UPDATE SKIP LOCKED leases, or a unique claim row in sms_reminders / booking reminder claims), see the
-- comment in .github/workflows/workflow-tick.yml.
--
-- Secrets live in Supabase Vault, never in this file. Until a job's secret exists in Vault the job is a no-op
-- (same as the GitHub job without secrets). One-time setup, in the Supabase SQL editor, with the SAME values
-- that are set in Vercel (Production):
--   select vault.create_secret('<WORKFLOW_CRON_SECRET>',   'scheduler_workflow_tick_secret');
--   select vault.create_secret('<META_TICK_SECRET>',       'scheduler_meta_tick_secret');        -- optional
--   select vault.create_secret('<AI_CALLING_CRON_SECRET>', 'scheduler_ai_calling_tick_secret');  -- optional
-- The Meta Ads Studio tick uses META_TICK_SECRET, like its GitHub workflow.
-- Optional: vault secret 'scheduler_base_url' overrides the default https://homequotenet.com.
--
-- Check it:  select * from public.scheduler_status;   (last pg_net responses per job)
-- Stop it:   select cron.unschedule('hq-workflow-tick');   (and the other hq-* jobs)

create extension if not exists pg_net;                       -- creates schema "net"
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- One row per call (no secrets), so responses in net._http_response can be matched to a job.
create table if not exists public.scheduler_requests (
  id bigint generated always as identity primary key,
  job text not null,
  request_id bigint not null,
  requested_at timestamptz not null default now()
);
create index if not exists idx_scheduler_requests_job on public.scheduler_requests (job, requested_at desc);
alter table public.scheduler_requests enable row level security; -- no policies: service role / SQL editor only
revoke all on public.scheduler_requests from public, anon, authenticated;

create or replace function public.scheduler_tick(p_job text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_secret_name text;
  v_timeout_ms int;
  v_base text;
  v_secret text;
  v_request bigint;
begin
  case p_job
    when 'workflow_tick'    then v_path := '/api/workflows/tick';   v_secret_name := 'scheduler_workflow_tick_secret';   v_timeout_ms := 90000;
    when 'meta_tick'        then v_path := '/api/meta/tick';        v_secret_name := 'scheduler_meta_tick_secret';       v_timeout_ms := 150000;
    when 'meta_studio_tick' then v_path := '/api/meta/studio-tick'; v_secret_name := 'scheduler_meta_tick_secret';       v_timeout_ms := 150000;
    when 'ai_calling_tick'  then v_path := '/api/ai-calling/tick';  v_secret_name := 'scheduler_ai_calling_tick_secret'; v_timeout_ms := 90000;
    else raise exception 'unknown scheduler job %', p_job;
  end case;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = v_secret_name limit 1;
  if v_secret is null or length(v_secret) = 0 then
    return null; -- not configured yet: skip quietly
  end if;
  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'scheduler_base_url' limit 1;
  v_base := rtrim(coalesce(nullif(v_base, ''), 'https://homequotenet.com'), '/');

  v_request := net.http_post(
    url := v_base || v_path,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := v_timeout_ms
  );
  insert into public.scheduler_requests (job, request_id) values (p_job, v_request);
  return v_request;
end $$;

-- Functions in public are callable over the API by default; this one must only run from pg_cron.
revoke all on function public.scheduler_tick(text) from public, anon, authenticated;

-- Staggered by a minute so the 5-minute jobs don't all hit Vercel at once.
select cron.schedule('hq-workflow-tick',    '*/5 * * * *',   $$select public.scheduler_tick('workflow_tick')$$);
select cron.schedule('hq-meta-tick',        '1-59/5 * * * *', $$select public.scheduler_tick('meta_tick')$$);
select cron.schedule('hq-ai-calling-tick',  '2-59/5 * * * *', $$select public.scheduler_tick('ai_calling_tick')$$);
select cron.schedule('hq-meta-studio-tick', '17 * * * *',    $$select public.scheduler_tick('meta_studio_tick')$$);
-- cron.job_run_details is never cleaned up by itself (~1,200 rows/day here): keep a week.
select cron.schedule('hq-cron-history-cleanup', '43 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days';
    delete from public.scheduler_requests where requested_at < now() - interval '7 days'$$);

-- Last calls per job joined to their pg_net responses (pg_net keeps responses ~6 hours, then status shows null).
-- SQL-editor / service-role use only.
create or replace view public.scheduler_status with (security_invoker = true) as
select
  s.job,
  s.requested_at,
  r.created as responded_at,
  r.status_code,
  r.timed_out,
  r.error_msg,
  left(r.content, 300) as body
from public.scheduler_requests s
left join net._http_response r on r.id = s.request_id
order by s.requested_at desc;
revoke all on public.scheduler_status from public, anon, authenticated;
