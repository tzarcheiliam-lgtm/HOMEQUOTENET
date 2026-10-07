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

Pause and resume: see **§2a** below (defined, tested semantics).

Testing: **dry run** (no sends, calls or writes; real leads only read) and **live test** (explicit test recipients required; no call is ever placed — the tester picks the result; status changes/assignments/notifications skipped; tasks/notes labelled `[Test]`).

## 2a. Pause and resume (defined behavior)
Pausing sets `graph_status='paused'`, `enabled=false`, `paused_at=now()`. Resuming sets `enabled=true`, `enroll_from=now()`, `paused_at=null`. Pausing or resuming twice is a no-op.

| Thing | While paused | On resume |
|---|---|---|
| **New events** | Not enrolled. Each ignored event is written to `workflow_logs` as `run.skipped_paused` and counted ("N new events were not enrolled") on the list card and the builder banner. | Events recorded during the pause **never enroll**, even if they are dispatched late (`enroll_from` is the cut-off; the skip reason is `paused_period`). |
| **Active runs** | A waiting/pending run is *parked* (`resume_at = infinity`, original wake time kept in `metadata._parked_resume_at`). A step already executing finishes, then the run parks. Nothing new starts. | Not-yet-due runs resume at their **original** wake time. |
| **Overdue work** (wake time passed during the pause, or its wait/call finished meanwhile) | Stays parked. | **Released gradually, one every 20 seconds** in due-time order (`metadata.resumed_overdue`, `resume_delay_seconds`) - nothing is discarded, and a long pause cannot cause a burst of calls or emails. |
| **Queued calls** (not yet dialed) | **Held**: `claim_ai_call_jobs` skips jobs of a paused workflow. Held jobs still obey `max_job_age_hours` (a call too stale expires instead of dialing; its run takes the *Call failed* path). | Released gradually, one every 20 seconds. |
| **Calls already with the provider** | Continue; the result is stored on the job. The run does not advance. | The run reads the stored result (released like any overdue run). |
| **Durable waits** | A *wait for event* that is satisfied meanwhile stays satisfied; a *call wait* that finishes meanwhile stays final. Timers freeze. | Satisfied waits are treated as overdue (gradual release). |
| **Exit events / manual cancel** | Still cancel parked runs, and clean up their waits and queued calls. | - |
| **Manual enrollment** | Refused (`paused`, logged). | - |

Tests: `tests/workflow-graph-runtime-db.test.ts` ("pause and resume", local database).

## 3. Fish Audio coordination
- Execution status (`ai_call_jobs.status`) and outcome are separate. Outcome comes only from the post-call analysis fields (`call_outcome`, `appointment_booked`, `qualified`, `callback_requested`, `callback_time`, `wrong_number`, `do_not_call`/`opt_out` - configure them in the Fish agent). A completed call with no explicit signal -> **needs human review**.
- **"Booked" is a claim until an appointment confirms it.** The agent's `appointment_booked` / `call_outcome=booked` only makes the run *look for* an appointment. The run takes the **Booked** path only when an `appointments` row exists for the **same lead and same contractor** (via `lead_assignments`), with status `scheduled`/`held`/`rescheduled` (not cancelled/no-show), **created after the call started** (`conversation_started_at`, else the job's creation time). If none exists yet the run keeps waiting (re-checked about every 5 minutes) for the call node's *analysis grace* period (default 30 min, measured from the call's end); after that it takes **Needs human review** with reason `booking_unconfirmed`. The confirmed appointment id is stored on the step. The UI label for the path is "Booked (appointment confirmed)". *Live tests are exempt:* the tester chooses the result and nothing is placed or booked.
- **Which existing call may a workflow reuse ("adopt")?** Only the call the automatic form-to-call feature (`trigger_source='auto_form'`) created for **this** enrollment: same lead, same contractor, same phone number the lead has now, a `lead.assigned`/`lead.created` trigger, and the job created within 5 minutes of the triggering event. A manual call, another workflow's call, an older call, or a call for any other lead/contractor is **never** reused and can never complete a new run; the workflow then queues its own job and the queue's own guards (24 h duplicate window, opt-out, calling window) decide whether it may be placed. As a second line of defense the run re-checks, every time it reads a call, that the job's lead and contractor are the run's own; otherwise the call takes the *Call failed* path (`call_association_mismatch`).
- Timeouts: result timeout (default 6 h) and analysis grace (30 min) → `timed_out` / human review paths. Blocked/failed/expired/cancelled → failed/opted-out paths.
- New contractor mode **workflow_only** (calls only from published workflows). `manual_only` blocks workflow calls. All existing layers still apply (env switch, admin stop, contractor settings, consent wording that mentions calls, opt-out/DNC, calling window/time zone, 24 h duplicate window). A node can only *narrow* the window.
- Form-to-call coordination: if the automatic feature already created (or an in-flight job exists for) the same lead + contractor, the workflow **adopts** that job and places no second call. The production trigger and `auto_form` jobs are not modified.
- **Opt-out policy (one rule everywhere).**
  - *Key:* the E.164 phone number, **network-wide** (one list, `ai_call_opt_outs`, plus the prospect do-not-call list). It is not per contractor: a person who told any HomeQuote AI call "don't call me" is not AI-called for any contractor.
  - *AI calls (automatic, manual and workflow):* checked by the queue at dial time with identical logic (`evaluateEligibility`: `opted_out`, `do_not_call`), and recording an opt-out cancels every still-queued call to that number, whichever contractor or trigger created it. A workflow waiting on such a cancelled call takes the **Opted out** path.
  - *Workflows:* an opt-out (heard on the call, recorded for the number, or on the do-not-call list) ends **automated contact** for that run - call and email steps are skipped (`contact_suppressed`) - and for every other run on that number. Tasks, notes and other internal steps still run. Weakening this (for example "opt-out of calls still allows email") is a deliberate product/legal decision and is **not** offered as a setting.
  - *Text messages:* no SMS provider is connected and the builder blocks publishing a text step, so SMS opt-out (per tenant + channel in `lib/messaging`) is **not exercised end to end**. When SMS is connected its opt-outs must feed the same workflow suppression; until then this is a documented gap.
  - *Cross-contractor privacy:* `ai_call_opt_outs` and `ai_call_jobs` are admin-read-only (RLS); a contractor never sees another contractor's calls, summaries or the opt-out list. Their run history only shows the neutral outcome (e.g. "Opted out") and reason code. A contractor *can* learn that their own lead's number is on the network opt-out list (`number_opted_out`), but not who, when or for whom.
- Homeowner free text is never sent to the agent; only approved fields (project type, city, appointment time, estimate amount), sanitized.
- Webhook notes on the lead ("AI call completed", "AI call summary") are written once per event even if Fish delivers the event twice.

## 4. Configuration / permissions
- Admins: everything. Contractor **owners**: their own company only, after an admin enables it at *Automations → Contractor access* (`workflow_builder_access`). Staff: view + complete tasks. Setters/callers: none. Enforced in SQL (`workflow_can_manage`, RLS), not only in the UI.
- Env: unchanged (`WORKFLOW_CRON_SECRET`, AI calling vars). No new env vars. No arbitrary code; no webhook action is exposed (the classic SSRF-safe `send_webhook` remains classic-only).

## 5. Production migration and rollback
**Apply (order-safe):** 0041 is additive (new tables/columns, widened CHECKs, replaced functions `guard_workflow_run`, `guard_workflow_step_run`, `emit_appointment_workflow_events`, `emit_estimate_workflow_event`, trigger on `appointments`, and `claim_ai_call_jobs` - same signature, now skips calls of a paused workflow). Prerequisites already in production: 0020, 0024, 0037, 0038. 0041 has not been applied anywhere. Code tolerates the migration being absent (falls back to classic-only), so either order is safe; recommended: migration, then deploy.
0. Dry run (rolled back, changes nothing): `node scripts/apply-migrations.mjs --dry-run supabase/migrations/0041_visual_workflow_builder.sql`. Do this on **staging first**, then production.
1. Back up (or note) row counts of `workflows`, `workflow_runs`, `workflow_events`, `ai_call_jobs`.
2. Apply 0041. Verify: `select engine, count(*) from workflows group by 1` (all `linear`); classic runs still complete; `select count(*) from workflow_events where type like 'ai_call.%'` begins to grow (informational events; nothing listens).
3. Deploy. Enable the builder for one contractor, create a draft from a template, dry-run, live-test, publish.
Nothing is enabled, migrated or contacted by the deploy; templates are code and only create drafts.

**Rollback (soft, scripted, tested locally):** `supabase/rollback/0041_visual_workflow_builder_soft_rollback.sql`. Run it **before** reverting the code:
```
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/rollback/0041_visual_workflow_builder_soft_rollback.sql
```
In one transaction it: (1) disables and pauses every graph workflow; (2) cancels in-flight graph runs (`cancel_reason='rollback'`), their open waits and their *queued* calls; (3) marks the new event types `ignored` so old code never retries them; (4) moves contractors from `workflow_only` to `manual_only`. It deletes nothing (drafts, versions and run history stay) and is safe to run twice. Calls already with the provider cannot be recalled. Then revert the deploy; the additive schema can stay. Full schema removal is not scripted and not recommended.


## 6. Known limitations
- No SMS provider; no outbound-webhook node in the builder. SMS opt-out is not exercised end to end.
- Live test never dials, so it does **not** verify real phone calling (see §7).
- Booking is confirmed only against `appointments` rows. Nothing in this repo lets the Fish agent write an appointment itself, so unless a human or another flow records the appointment, "booked" claims end in *Needs human review* after the grace period. That is intentional (no false "Booked").
- A call already with the provider cannot be hung up (no end-call API).
- No loops (use bounded retry / sequential nodes); one agent + number per contractor.
- Runs cannot be migrated to a newer version (by design).
- Overdue-run release rate after a resume is fixed at one per 20 seconds per workflow (not configurable).
- "Events not enrolled while paused" counts events of the workflow's trigger type that arrived while it was paused; it does not evaluate trigger filters or entry conditions for them.
- UI verified with build, typecheck, SSR smoke tests and screenshots in headless Chromium against fixtures - **not** against a live Supabase project or real authenticated sessions. The Windows brand folder is not reachable from the build environment; the in-repo HomeQuote tokens/logo were used.

## 7. Verification matrix - what was actually tested
Four different kinds of evidence; they are not interchangeable.
- **Simulated** = in-memory ports / fakes, no database (pure engine, dry run, UI components).
- **Local DB** = an in-process Postgres (PGlite) running the **real migration files** and the **real server code**, with Gmail, push notifications and the Fish API faked. Not Supabase, not PostgREST, not real JWTs.
- **Staging** = a real non-production Supabase project and deployment. **Not performed** (no staging project or credentials exist in the build environment). Runbook: `docs/workflow-builder-staging-runbook.md`.
- **Provider** = real Fish Audio / a real phone. **Not performed.** Needs your designated test number and explicit authorization first.

| Check | Simulated | Local DB | Staging | Provider |
|---|---|---|---|---|
| Linear (classic) workflows still work after 0041 | - | yes: migration applied over existing classic data (row counts identical, still `linear`/enabled); classic run completes beside a graph run | **not done** | n/a |
| Admin / contractor / staff permissions | - | yes at SQL level: RLS and function privileges with role switching (builder access, drafts, versions, opt-out/call tables hidden from contractors) | **not done** - needs real authenticated requests with test accounts | n/a |
| Drafts, publish, version pinning, enrollment rules | yes (engine) | yes: publish creates immutable versions, runs pinned, no back-fill, re-entry and duplicate rules | **not done** | n/a |
| Durable waits resume via the scheduler | yes | yes: `processWorkflowTick` (event claim + sweep + run claim) resumes waits from the database; no in-memory timers | **not done** - the real 5-minute GitHub Actions -> Vercel cron was not run | n/a |
| Verified Fish webhook resumes the right run exactly once | - | yes: *simulated* signed deliveries through the real route handler (bad/absent/tampered signatures -> 401, duplicates and out-of-order deliveries -> one resume, one note each) | **not done** | **not done** - no real Fish delivery |
| Duplicate events / retries do not duplicate external actions | yes | yes: one call job, one email, one note per step (Gmail and Fish faked) | **not done** | **not done** |
| Cancellation and global calling controls | - | yes: cancel run cancels queued call and reports in-progress one; paused workflow's calls are not claimable; env switch / admin stop / contractor mode / opt-out / window tested in the AI-calling suites | **not done** | **not done** |
| Booking confirmation, call association, pause/resume, opt-out scope | yes | yes (new tests in this PR) | **not done** | **not done** |
| Migration + documented rollback | - | yes: applies twice; scripted soft rollback does what §5 says and deletes nothing | **not done** - dry-run command: `node scripts/apply-migrations.mjs --dry-run supabase/migrations/0041_visual_workflow_builder.sql` | n/a |
| **Real phone call placed** | - | - | - | **not done** (live test is by design "never dials") |

Read-only staging checks and the staging guard (which refuses production-looking environments, `AI_CALLING_GLOBAL_ENABLED=true`, or a present `FISH_API_KEY`) are in `scripts/staging/`; the same check code is exercised by `tests/workflow-builder-release.test.ts` on the local database.
