-- ============================================================================
-- Workflow retention (Phase 5 production readiness). Additive; re-runnable.
-- ============================================================================
-- Prunes only high-volume, low-audit-value rows. Called in small batches by
-- the existing scheduler (POST /api/workflows/tick) — no new cron.
--
--   DELETED
--     workflow_logs    older than p_log_days (default 90) whose run is finished
--                      (completed / failed / cancelled) or that belong to no run.
--     workflow_events  older than p_event_days (default 180) that dispatched
--                      cleanly ('dispatched' or 'ignored') and that no run
--                      references.
--   RETAINED (never deleted here)
--     workflow_runs and workflow_step_runs — the audit record of what ran.
--       (lead_email_deliveries.workflow_step_run_id cascades on delete, so
--       deleting step runs would erase email delivery history.)
--     logs of active runs (pending / running / waiting), of any age.
--     events still pending / dispatching / failed — including dead-lettered
--       events awaiting review — and any event a run points at.
--     workflows and workflow_steps.
-- ============================================================================

create index if not exists idx_workflow_events_retention
  on public.workflow_events (recorded_at) where dispatch_status in ('dispatched', 'ignored');

create or replace function public.prune_workflow_history(
  p_log_days integer default 90,
  p_event_days integer default 180,
  p_limit integer default 1000
) returns jsonb language plpgsql security definer set search_path = public as $$
declare logs_deleted integer; events_deleted integer;
begin
  -- Floors so a bad argument can never wipe recent history.
  if p_log_days < 30 or p_event_days < 30 then
    raise exception 'retention windows must be at least 30 days' using errcode = '22023';
  end if;

  with doomed as (
    select l.id from workflow_logs l
    left join workflow_runs r on r.id = l.run_id
    where l.created_at < now() - make_interval(days => p_log_days)
      and (l.run_id is null or r.status in ('completed', 'failed', 'cancelled'))
    order by l.created_at
    limit greatest(1, least(p_limit, 10000))
  )
  delete from workflow_logs l using doomed d where l.id = d.id;
  get diagnostics logs_deleted = row_count;

  with doomed as (
    select e.id from workflow_events e
    where e.recorded_at < now() - make_interval(days => p_event_days)
      and e.dispatch_status in ('dispatched', 'ignored')
      and not exists (select 1 from workflow_runs r where r.trigger_event_id = e.id)
      and not exists (select 1 from workflow_events c where c.causation_id = e.id and c.recorded_at >= now() - make_interval(days => p_event_days))
    order by e.recorded_at
    limit greatest(1, least(p_limit, 10000))
  )
  delete from workflow_events e using doomed d where e.id = d.id;
  get diagnostics events_deleted = row_count;

  return jsonb_build_object('logs_deleted', logs_deleted, 'events_deleted', events_deleted);
end;
$$;

revoke all on function public.prune_workflow_history(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.prune_workflow_history(integer, integer, integer) to service_role;
