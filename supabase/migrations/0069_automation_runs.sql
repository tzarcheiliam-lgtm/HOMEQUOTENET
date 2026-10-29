-- Scheduler heartbeat for the Automations map (/app/automations).
-- Each scheduled endpoint (the GitHub Actions ticks: workflow, meta, meta studio, AI calling) writes one row per run,
-- so the page can show "last ran 2 min ago" and flag a stalled scheduler. Rows older than 30 days are pruned by the
-- workflow tick. Additive and safe to re-run. Written by the server with the service role; admins can read.

create table if not exists public.automation_runs (
  id           uuid primary key default gen_random_uuid(),
  job          text not null check (job in ('workflow_tick', 'meta_tick', 'meta_studio_tick', 'ai_calling_tick')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz not null default now(),
  ok           boolean not null default true,
  summary      jsonb not null default '{}'::jsonb
);
create index if not exists idx_automation_runs_job on public.automation_runs (job, started_at desc);

alter table public.automation_runs enable row level security;
drop policy if exists automation_runs_admin_select on public.automation_runs;
create policy automation_runs_admin_select on public.automation_runs for select using (public.is_admin());
