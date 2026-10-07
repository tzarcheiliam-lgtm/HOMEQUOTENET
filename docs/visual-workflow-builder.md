# Visual workflow builder (graph engine)

Migration: `supabase/migrations/0041_visual_workflow_builder.sql`. Code: `lib/workflows/graph/`, `components/workflows/builder/`, `lib/actions/workflow-graph.ts`, `lib/data/workflow-graph.ts`.

## 1. Architecture and migration approach

The classic ("linear") engine is untouched. A new **graph engine** runs beside it on the same tables:

| Concern | How |
|---|---|
| Definition | `workflows.engine = 'graph'`; mutable draft in `workflow_graph_drafts` (autosaved, optimistic `revision`); **immutable** versions in `workflow_versions` (update/delete blocked by trigger) |
| Runs | `workflow_runs` with `definition_snapshot = {kind:'graph', graph, version}` and `workflow_version_id`: a run is pinned to the version it started on. No migration of live runs exists; publishing never changes a run in flight |
| Steps | `workflow_step_runs` (one per node, key = node id). The engine replays recorded handles, so a crash/duplicate wake never repeats a finished node |
| Waits | `workflow_runs.resume_at` (timers) + `workflow_waits` (call result / event, always with a timeout = the run's wake time). No in-memory timers |
| Scheduler | the existing 5-minute `/api/workflows/tick`; it also calls `workflow_sweep_waits()` (safety net) |
| Fish calls | node creates ONE `ai_call_jobs` row (`trigger_source='workflow'`, dedupe `wf:<stepRunId>`); the existing queue dials it after its own guards; a DB trigger on `ai_call_jobs` wakes exactly the waiting run when status/analysis changes |
| Dispatch | `processWorkflowEvent` still handles classic workflows (`engine='linear'`, with a fallback before the column exists), then `dispatchGraphEvent` |

Execution is a pure interpreter (`engine.ts`) behind ports: real runs, live tests and dry runs use the same code, so a dry run shows what the engine would decide.

## 2. What is supported

Triggers: lead created, lead assigned, lead stage changed, appointment booked / rescheduled / cancelled / completed / no-show, estimate sent / accepted, AI call completed / failed-or-unanswered, task completed, manual enrollment. (New events: `appointment.rescheduled`, `estimate.accepted`, `ai_call.completed`, `ai_call.failed`, `task.completed` (workflow tasks), `workflow.manual_enrollment`.)

Steps: send email (saved template or custom, existing Gmail outbox), **Call homeowner** (Fish), staff task, lead note, update status (allowed list; contractors: own pipeline only), assign to contractor team member, internal notification, wait (duration / before appointment), wait until business hours (homeowner time zone), wait for event (with timeout), if/else (explicit named branches), end. **Send text message is listed "Requires setup" and blocks publishing** (no SMS provider is connected).

Enrollment: only events recorded after publish/resume (`workflows.enroll_from`); re-entry = once per lead / one active / every event; duplicate events collapse on unique keys; exit events cancel runs and clean up waits and queued calls; entry conditions; optional manual enrollment (obeys the same rules).

Pause: stops new enrollments immediately (events during the pause never enroll, even after resume); waiting runs are parked and resume at their original wake time; a step in progress finishes first; a call already placed continues at the provider and its result is recorded, but the run does not advance until resume.

Testing: **dry run** (no sends, calls or writes; real leads only read) and **live test** (explicit test recipients required; no call is ever placed — the tester picks the result; status changes/assignments/notifications skipped; tasks/notes labelled `[Test]`).

## 3. Fish Audio coordination
- Execution status (`ai_call_jobs.status`) and outcome are separate. Outcome comes only from the post-call analysis fields (`call_outcome`, `appointment_booked`, `qualified`, `callback_requested`, `callback_time`, `wrong_number`, `do_not_call`/`opt_out` — configure them in the Fish agent). A completed call with no explicit signal → **needs human review**.
- Timeouts: result timeout (default 6 h) and analysis grace (30 min) → `timed_out` / human review paths. Blocked/failed/expired/cancelled → failed/opted-out paths.
- New contractor mode **workflow_only** (calls only from published workflows). `manual_only` blocks workflow calls. All existing layers still apply (env switch, admin stop, contractor settings, consent wording that mentions calls, opt-out/DNC, calling window/time zone, 24 h duplicate window). A node can only *narrow* the window.
- Form-to-call coordination: if the automatic feature already created (or an in-flight job exists for) the same lead + contractor, the workflow **adopts** that job and places no second call. The production trigger and `auto_form` jobs are not modified.
- Opt-out: ends contact for the run (call/email nodes are skipped) and, via `ai_call_opt_outs`, for every other run on that number. Homeowner free text is never sent to the agent; only approved fields (project type, city, appointment time, estimate amount), sanitized.

## 4. Configuration / permissions
- Admins: everything. Contractor **owners**: their own company only, after an admin enables it at *Automations → Contractor access* (`workflow_builder_access`). Staff: view + complete tasks. Setters/callers: none. Enforced in SQL (`workflow_can_manage`, RLS), not only in the UI.
- Env: unchanged (`WORKFLOW_CRON_SECRET`, AI calling vars). No new env vars. No arbitrary code; no webhook action is exposed (the classic SSRF-safe `send_webhook` remains classic-only).

## 5. Production migration and rollback
**Apply (order-safe):** 0041 is additive (new tables/columns, widened CHECKs, replaced functions `guard_workflow_run`, `guard_workflow_step_run`, `emit_appointment_workflow_events`, `emit_estimate_workflow_event`, trigger on `appointments`). Code tolerates the migration being absent (falls back to classic-only), so either order is safe; recommended: migration, then deploy.
1. Back up (or note) row counts of `workflows`, `workflow_runs`, `workflow_events`, `ai_call_jobs`.
2. Apply 0041. Verify: `select engine, count(*) from workflows group by 1` (all `linear`); classic runs still complete; `select count(*) from workflow_events where type like 'ai_call.%'` begins to grow (informational events; nothing listens).
3. Deploy. Enable the builder for one contractor, create a draft from a template, dry-run, live-test, publish.
Nothing is enabled, migrated or contacted by the deploy; templates are code and only create drafts.

**Rollback:**
1. Stop graph enrollment first: `update workflows set enabled=false where engine='graph';` (required BEFORE reverting code — old code would try to load graph workflows as classic ones and fail event dispatch).
2. Optionally cancel graph runs: `update workflow_runs set status='cancelled', cancelled_at=now(), cancel_reason='rollback' where definition_snapshot->>'kind'='graph' and status in ('pending','running','waiting');`
3. Mark new-type events ignored so old code does not retry them: `update workflow_events set dispatch_status='ignored', dispatched_at=now() where type in ('appointment.rescheduled','estimate.accepted','ai_call.completed','ai_call.failed','workflow.manual_enrollment','task.completed') and dispatch_status in ('pending','failed');`
4. Revert the deploy. The schema can stay (additive). Contractors set to `workflow_only` should be moved to `off`/`automatic` before reverting if old code cannot read that mode (`update ai_calling_contractor_settings set mode='manual_only' where mode='workflow_only';`).
5. Full schema removal is not recommended; if required, drop the new tables/columns in reverse order after the steps above.

## 6. Known limitations
- No SMS provider; no outbound-webhook node in the builder.
- Live test never dials; booking claims come from the agent's analysis and are not cross-checked against an appointment record.
- A call already with the provider cannot be hung up (no end-call API).
- No loops (use bounded retry / sequential nodes); one agent + number per contractor.
- Runs cannot be migrated to a newer version (by design).
- UI verified with build, typecheck, SSR smoke tests and screenshots in headless Chromium against fixtures — not against a live Supabase project. The Windows brand folder (`C:\Users\tzarc\Desktop\HQN`) is not reachable from this environment; the existing in-repo HomeQuote navy tokens/logo were used.
