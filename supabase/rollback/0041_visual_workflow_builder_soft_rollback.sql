-- ============================================================================
-- SOFT ROLLBACK for 0041_visual_workflow_builder.sql
-- ============================================================================
-- Run this BEFORE reverting the application code. It stops every visual (graph)
-- workflow, cancels its in-flight runs, waits and not-yet-dialed calls, tells the
-- old code to ignore the new event types, and returns contractors to modes the old
-- code understands. It deletes NOTHING: drafts, versions, run history and the
-- additive schema stay, so a later roll-forward loses no data.
-- (Dropping the schema itself is deliberately not scripted; see docs.)
-- Calls already with the provider cannot be recalled; their results are still stored.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollback/0041_visual_workflow_builder_soft_rollback.sql
-- ============================================================================
begin;

-- 1. Stop enrollment (old code would try to load graph workflows as classic ones).
update public.workflows set enabled = false, graph_status = case when graph_status = 'draft' then 'draft' else 'paused' end
 where engine = 'graph';

-- 2. Cancel in-flight graph runs and clean up what they left open.
update public.workflow_runs
   set status = 'cancelled', cancelled_at = now(), cancel_reason = 'rollback', locked_by = null, locked_until = null
 where definition_snapshot ->> 'kind' = 'graph' and status in ('pending', 'running', 'waiting');
update public.workflow_waits set status = 'cancelled', resolved_at = now() where status = 'open';
update public.ai_call_jobs set status = 'cancelled', block_reason = 'workflow_rollback', locked_by = null, locked_until = null
 where trigger_source = 'workflow' and status = 'queued';

-- 3. The old code does not know the new event types: mark them handled so it never retries them.
update public.workflow_events set dispatch_status = 'ignored', dispatched_at = now()
 where type in ('appointment.rescheduled', 'estimate.accepted', 'ai_call.completed', 'ai_call.failed', 'workflow.manual_enrollment', 'task.completed')
   and dispatch_status in ('pending', 'failed');

-- 4. Contractors in the new 'workflow_only' mode go back to a mode the old code reads.
update public.ai_calling_contractor_settings set mode = 'manual_only' where mode = 'workflow_only';

commit;
