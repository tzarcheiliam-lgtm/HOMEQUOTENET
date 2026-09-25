# Workflow Phase 5 — Integration & Production Hardening Prep

> **Phase 5 must harden and integrate the existing workflow platform. It must not create competing workflow, messaging, funnel, event, or analytics systems.**

| | |
|---|---|
| Status | Phase 5 started 2026-09-25: H1, H2 (+ run-side H2b) and M1 fixed; workflow migrations renumbered to `0024_workflow_runtime.sql` / `0025_workflow_management.sql`; Automations RLS made admin-only (setters excluded). Production apply + scheduler still pending explicit approval. |
| Audited at | 2026-09-25, `main` @ `92f181e` plus the uncommitted Phase 2/4 working tree |
| Authoritative | Phase 1 contract (`docs/workflow-automation-architecture.md`, `lib/workflows/{domain,conditions,wait,events,actions,idempotency,runs,logging,definition,templates}.ts`, migration `0020`) |
| Provisional (uncommitted, audited read-only) | Phase 2: `0021_workflow_runtime.sql`, `lib/workflows/{runtime.server,actions.server,planner,evaluator,merge}.ts`, `app/api/workflows/tick`. Phase 4: `0022_workflow_management.sql`, `lib/actions/workflows.ts`, `lib/data/workflows.ts`, `app/app/workflows/**`, `components/workflows/**`, `lib/workflows/ui.ts` |
| Scaffolding added | `tests/fixtures/workflow-events.ts`, `tests/workflow-phase5-fixtures.test.ts`, `scripts/workflow-health.mjs` |

---

## Phase 5 progress log

| Item | Resolution |
|---|---|
| H1 lead.created null-stripping | `0024` keeps nullable keys; `funnelSlug` only when present. Guarded by `tests/workflow-phase5-hardening-db.test.ts` (every emitter's rows parse via `eventFromRow`; mutation-checked). |
| H2 poison events | event load moved inside the dispatch `try`; failures back off 1m→1h by attempt; `claim_workflow_events` stops at 10 attempts (dead-letter, visible in `workflow-health.mjs`). Unit + DB tests, mutation-checked. |
| H2b poison runs | `claimAndExecuteWorkflowRuns` isolates each run; runtime errors back off (`waiting`), fail permanently after `MAX_RUN_RUNTIME_ERRORS` (5); tick reports them (HTTP 207). |
| M1 save bypass | fixed by Phase 4 (saving an enabled workflow re-runs `validateWorkflowForEnable`). |
| Migration collision | renumbered to 0024/0025 (after applied 0023). |
| Setter access | product decision: no Automations for setters — nav, page guards and `0020` RLS (`is_admin()`) all aligned; `0020` was never applied, so edited in place. |
| Message rendering | `merge.ts` (the one renderer): `lead.first_name` → "there", `contractor.name` → "our team"; no gaps before punctuation; `appointment.scheduled_at` as "Friday, September 25 at 2:30 PM" in `DEFAULT_WORKFLOW_TIMEZONE`; `estimate.amount` as currency; a line using an unconfigured `homequote.*` value (e.g. `HOMEQUOTE_PHONE` unset) is omitted. |
| Variable validation | `validateWorkflowForEnable` flags `variable_unavailable` ("Cannot enable workflow: {{appointment.scheduled_at}} is not available for the New lead trigger.") using `mergeRootsForTrigger`, which mirrors what the runtime loads per trigger; also covers waits anchored to an appointment time. |
| Webhook SSRF | `lib/workflows/webhook-safety.server.ts`: HTTPS only, no credentials, internal hostnames refused, and a connection-time DNS `lookup` that refuses any resolved private/loopback/link-local/metadata/CGNAT/reserved address (incl. IPv4-mapped/NAT64 IPv6); no redirects. **Hookup into `actions.server.ts` pending** (file is being edited by the email-templates work). |
| Retention | `0027_workflow_retention.sql` `prune_workflow_history()`: logs 90 days (finished/no run only), cleanly dispatched unreferenced events 180 days; runs/step runs never pruned (email delivery history cascades from step runs). Runs in ≤1000-row batches on every tick. |

## 0. Production reality (read first)

- **Production has no workflow tables.** `workflows`, `workflow_events`, runs, logs, `emit_workflow_event` — none exist in the production database. Migration `0020` (Phase 1) has never been applied. Nothing is emitted, dispatched or sent today.
- **Migration numbering collides.** On disk: `0021_growth_tools_upsells.sql` (committed, applied) **and** `0021_workflow_runtime.sql` (uncommitted); `0022_restore_contractor_activity_visibility.sql` (committed) **and** `0022_workflow_management.sql` (uncommitted); plus `0023_fix_funnel_status_insert_trigger.sql`. The workflow runtime/management migrations must be renumbered after the latest applied file (≥ `0024`) before anything is applied. Apply order: `0020` → runtime → management → (Phase 3 messaging).
- **No scheduler exists.** There is no `vercel.json` cron. Both `/api/funnels/deliver` (`FUNNEL_CRON_SECRET`) and `/api/workflows/tick` (`WORKFLOW_CRON_SECRET`) are POST routes that nothing calls on a schedule. Waits, retries and dispatch will not progress in production until a scheduler is configured.
- **Parallel agents have deleted untracked files** in this repo mid-session (`lib/messaging/` was removed once and restored). Commit prep work promptly.

## 1. System integration map

```
HOMEOWNER FUNNEL (/estimate/[slug])            ADS / INTAKE (Meta, GHL, Zapier, API)       STAFF UI (/app/leads)
  save_funnel_session() [SQL]                    lib/integrations/intake.ts ingestLead        lib/actions/leads.ts createLead
        │ insert leads / lead_assignments              │ insert leads                                │ insert leads
        ▼                                              ▼                                             ▼
 ┌──────────────────────────── public.leads ───────────────────────────────┐   lead_intake_events → trg_lead_intake_alert
 │  trg_leads_workflow_events (0021, AFTER INSERT / status / qualification) │        → lead_email_deliveries (team alert, Gmail)
 └──────────────┬───────────────────────────────────────────────────────────┘
                │ emit_workflow_event()  ← the only entry point (0020/0021)
 lead_assignments ─ trg_assignments_workflow_events ──┤  (lead.assigned, assignment.status_changed, deal.lost)
 appointments ───── trg_appointments_workflow_events ─┤  (appointment.booked/cancelled/completed/no_show)
 funnel_bookings ── trg_funnel_bookings_workflow_event┤  (appointment.booked for unassigned house bookings)
 estimates ──────── trg_estimates_workflow_event ─────┤  (estimate.sent)
 sales ──────────── trg_sales_workflow_event ─────────┤  (deal.won)
 messages (Phase 3, not built) ───────────────────────┘  (message.received)
                ▼
        workflow_events ── claim_workflow_events() ── POST /api/workflows/tick (WORKFLOW_CRON_SECRET) ── [NO SCHEDULER]
                ▼  processWorkflowEvent: exit-event cancels → match enabled workflows → planWorkflow (trigger_config, tenant, conditions)
        workflow_runs ── claim_workflow_runs() ── executeClaimedWorkflowRun
                ▼
        workflow_step_runs ── executeWorkflowAction (actions.server.ts)
                ├─ send_email / notify_team → lead_email_deliveries(kind=workflow_email) → processLeadEmails → Gmail
                ├─ change_pipeline_stage → workflow_change_pipeline_stage() [sets app.workflow_actor_type='workflow' + causation]
                ├─ create_calendar_event → workflow_create_appointment()
                ├─ send_webhook → fetch (HTTPS, private-IP literal block, HMAC)
                └─ send_sms / assign_user / tasks / tags → skipped: unavailable_action   (Phase 3 plugs MessagingService in here)
                ▼
        workflow_logs  ──  /app/workflows (Phase 4 UI; runs RLS-scoped; logs staff-only)
```

Canonical entry points: **events** only via `emit_workflow_event()` (DB triggers call it); **definitions** only via `create_workflow_definition` / `save_workflow_definition` / `set_workflow_enabled` / `archive_workflow` (0022, admin-checked); **email** only via `lead_email_deliveries` + Gmail; **messaging** only via `MessagingService` (Phase 3, not yet implemented).

Bypasses / duplicates found: none that write `workflow_events` directly (both inserts are inside `emit_workflow_event`). The funnel builder (0019) correctly relies on the leads trigger. Phone normalization has three JS copies + SQL (see Phase 3 doc §6).

## 2. Event coverage audit

| Event | Emitter (0021, uncommitted) | Status | Issues |
|---|---|---|---|
| lead.created | leads AFTER INSERT | wired | **H1: `jsonb_strip_nulls` drops required nullable keys → every funnel lead fails parsing** (§ 9) |
| lead.status_changed | leads status change | wired | always NULL tenant → contractor workflows can never use it (by design; document in UI) |
| lead.qualification_changed | leads qualification change | wired | — |
| lead.assigned | lead_assignments INSERT | wired | — |
| assignment.status_changed | lead_assignments status change | wired | — |
| deal.lost | lead_assignments status → lost | wired | emitted alongside assignment.status_changed (two event types, one fact — expected) |
| appointment.booked | appointments INSERT + unassigned funnel_bookings INSERT | wired | reuses booking key when distribution promotes a client-funnel booking (good); house bookings emit once for HomeQuote (NULL) and once for the contractor on promotion (intended — two tenants) |
| appointment.cancelled / completed / no_show | appointments status change | wired | `rescheduled` emits nothing (no canonical event; fine) |
| estimate.sent | estimates INSERT/UPDATE to sent | wired | `addEstimate` defaults status to `sent`, so it fires |
| deal.won | sales INSERT/UPDATE to won | wired | — |
| message.received | — | **missing (Phase 3)** | needs messages tables + webhook route |
| task.completed | — | not applicable | no tasks domain |

Phase 5 checklist:
- [ ] Fix H1 (keep nullable keys: `jsonb_build_object` without strip, or strip only optional keys).
- [ ] Conformance test: for each trigger, insert/update the source row in a rolled-back DB test and parse the emitted row with `eventFromRow` (use `tests/fixtures/workflow-events.ts` as the expected shape).
- [ ] Emit `message.received` from the Phase 3 inbound path.
- [x] "No Answer" wiring (§ 7): **correction** — `logContactAttempt` already advances `new → contact_attempted` (conditional update, since the initial commit); an earlier version of this doc wrongly said it didn't. Verified end to end in `tests/workflow-readiness-db.test.ts`.

## 3. Funnel → workflow

`save_funnel_session` (0019) inserts the lead; the leads trigger emits `lead.created|lead:<id>` once. Repeat/duplicate submissions reuse the existing lead (no insert → no event) ✔. Replayed submits return early ✔. Tenant: derived from `consent_source = 'funnel:<slug>'` → `funnels.contractor_id` ✔ (house funnel → NULL). The client-funnel lead assignment is created in the same transaction after the lead, and dispatch is asynchronous, so the tenant guard (lead must be assigned to the contractor) passes ✔.
**Blocker:** H1 — funnel leads have no `city`/`vertical_id`/`sub_service_id`, so their `lead.created` payload is invalid after stripping.

## 4. Workflow → messaging

- `send_sms` today: `executeWorkflowAction` returns `skipped: unavailable_action` (availability `contract_only`). No provider import anywhere in `lib/workflows/**`, `components/workflows/**`, or `app/api/workflows/**` ✔.
- Phase 4 already anticipates Phase 3: `senderIssue()` in `lib/actions/workflows.ts` checks `messaging_senders` (the Phase 3 draft table) once `send_sms` becomes `ready` ✔ — keep that table name.
- Integration seam: replace the `send_sms` case with `MessagingService.sendMessage({… idempotencyKey: stepRun.idempotencyKey, workflow: {runId, stepRunId} …})` → `toWorkflowActionResult()` (`lib/messaging/workflow-result.ts`). Consent is checked by the runtime before the handler (✔ `requiresConsent`) and again by the service (opt-out).
- Idempotency/persistence/delivery/opt-out: designed in Phase 3 doc §§ 7–11; not implementable until messages tables exist.

## 5. Inbound replies

Not built (Phase 3). Tests to write once it is (DB, rolled back, mock provider): signature rejected (401); duplicate webhook ×3 → 1 message, 1 `message.received`; unknown `to` number → 200, nothing persisted; reply to contractor A's number never attaches to contractor B's side of a shared lead; STOP → opted_out → next workflow `send_sms` skipped `no_consent`; START re-subscribes; ambiguous phone (two leads) → most recent active lead in tenant scope, logged; `message.received` envelope parses with `workflowEventSchema`; auto-reply loop prevented by causation.

## 6. Appointments / calendar

Write paths: `scheduleAppointment`, `updateAppointmentStatus` (app), `record_calendly_booking`, `record_funnel_booking`, `distribute_lead` (SQL), `workflow_create_appointment` (workflow). All funnel through `appointments` / `funnel_bookings` triggers — one appointment system ✔. Calendly/GHL bookings on house leads create `funnel_bookings` rows with no appointment until distribution ✔.
Risks: `appointment.completed` maps from `held` only; reschedules (status `rescheduled` or a changed `scheduled_at`) emit nothing, so reminder waits anchored on `appointment.scheduled_at` keep the old time → Phase 5 must re-read the anchor when the wait resumes (step guards on `appointment.status = scheduled` already in the template) and should consider a deliberate `appointment.rescheduled` contract extension.

## 7. Pipeline / deal

- Network pipeline `leads.status`: `changeLeadStatus`, `updateQualification`, `assignLead`, `distribute_lead`, and mirrored milestones from assignment/outcome actions.
- Contractor pipeline `lead_assignments.status`: `updateAssignmentStatus`, `scheduleAppointment`, `addEstimate`, `addSale`, booking RPCs.
- One UI action can emit several **different** facts: `addEstimate` → `estimate.sent` + `assignment.status_changed` + `lead.status_changed`; `addSale` → `deal.won` + two status changes. These are not duplicates (distinct types, distinct keys) — but a tenant with workflows on each would message three times. Phase 5 guidance: templates and the UI should steer each journey to the single most specific trigger; the dry run already shows every matching workflow for an event.
- Workflow-caused changes carry `actor_type='workflow'` + causation via `workflow_change_pipeline_stage` ✔ — Phase 5 must still enforce the loop rule (refuse a run whose causation chain contains the same workflow); not implemented in the runtime today.
- **No Answer (corrected):** `logContactAttempt` records the activity and, for staff, advances `new → contact_attempted` with a conditional update (`… where status = 'new'`), so `lead.status_changed` fires exactly once per real transition and repeat attempts emit nothing. Contractors cannot change the HomeQuote status (leads RLS is staff-only, by design); their attempt moves their own assignment to `no_answer`/`contacted` → `assignment.status_changed`, which is the trigger a contractor no-answer workflow should use (the shipped No Answer template is a HomeQuote workflow on `lead.status_changed`).

## 8. Phase 4 contract (what Phase 5 needs)

Observed Phase 4 surface (provisional): server actions `createWorkflowAction`, `saveWorkflowAction`, `toggleWorkflowAction`, `duplicateWorkflowAction`, `archiveWorkflowAction`, `dryRunWorkflowAction`; data `listWorkflows`, `getWorkflow`, `listWorkflowEvents`, `listWorkflowRuns`, `getWorkflowRun` (RLS client ✔); pages `/app/workflows`, `/[id]`, `/new` (admin), `/runs/[runId]`.

Needed / mismatches found:
1. **M1 — save bypasses enable validation.** `saveWorkflowAction` → `save_workflow_definition` can change an **enabled** workflow without re-running `validateWorkflowForEnable` (e.g. add a network-only action to a contractor workflow). Fix in the canonical path: saving an enabled workflow must validate (or auto-disable) — and the runtime should re-check `network_only_action` rules, which it currently doesn't.
2. Run history exists; **step-level history + logs** are staff-only by RLS, so contractors see runs but not why — needs a contractor-safe summary (§ 17).
3. Availability state: `actionAvailabilityLabel` in `lib/workflows/ui.ts` ✔; must flip automatically when Phase 3 sets `send_sms` to `ready`.
4. Template creation: `createWorkflowAction` clones `WORKFLOW_TEMPLATES` in code ✔ (template DB rows never seeded — fine, keep code as source).
5. `workflow_replace_steps` inserts in array order with a non-deferrable parent FK → a child listed before its branch parent fails. Irrelevant until branching; note for branching work.
6. Dry run: planning only, never executes actions ✔ — but it parses events with the same schema, so it also fails on H1-shaped `lead.created` rows.
7. Contractors can open `/app/workflows` (RLS-scoped) but all writes are admin-only ✔; decide whether contractor owners get enable/disable (would need RLS + `network_only_action` enforcement first).

## 9. Production validation (extend `validateWorkflowForEnable`, don't fork it)

Already enforced: trigger/action/field availability, branching blocked, assignment-scoped actions, contractor network-only actions, Zod config validation, unknown merge fields, wait bounds, step keys/parents/positions, sender existence for SMS (Phase 4).

Gaps to add (in `lib/workflows/definition.ts` `validateWorkflowForEnable`, reused by save + toggle):
- **merge fields vs trigger**: `{{appointment.*}}` in a `lead.created` workflow renders empty; `{{estimate.amount}}` needs an estimate trigger; `{{contractor.name}}` on a HomeQuote workflow triggered by a network event is empty.
- **relative waits vs trigger**: `relative_to_field: appointment.scheduled_at` requires an appointment-scoped trigger.
- **exit events tenant**: a contractor workflow exiting on `lead.status_changed` can never observe it (NULL tenant).
- **provider config**: `notify_team lead_alert_team` needs Gmail connected; `send_webhook` with `signingIntegrationId` must reference an enabled integration; `{{homequote.phone}}` needs `HOMEQUOTE_PHONE` (not documented in `.env.example`).
- **consent**: lead-facing messaging workflows should carry a `lead.consent_granted = true` entry condition (templates do) — warn when missing.
- **quiet hours / SMS length**: warn when a `send_sms` body exceeds 1 segment (`countSmsSegments`).

## 10. Variables / template safety

- One renderer: `lib/workflows/merge.ts#renderWorkflowTemplate` (Phase 2). Allowed fields are Phase 1 `MERGE_FIELDS`; unknown fields are rejected at save ✔. The brief's `{{lead.service_type}}` / `{{appointment.date}}` do not exist — do not add ad-hoc aliases in the renderer; extend `MERGE_FIELDS` deliberately.
- Missing values render `''` → "Hi ," — add a fallback syntax to the Phase 1 contract (e.g. `{{lead.first_name|there}}`) and implement it only in `merge.ts`.
- `{{appointment.scheduled_at}}` renders the raw UTC ISO string — format in the renderer with the workflow timezone (`DEFAULT_WORKFLOW_TIMEZONE`).
- HTML email: values are escaped (`escapeHtml` in `actions.server.ts`) ✔. SMS is plain text ✔. Webhook payloads are JSON ✔.
- Preview (Phase 4) must call the same `renderWorkflowTemplate` with the dry-run evaluation context.

## 11. Failure & recovery (expected behavior)

| Failure | Expected state | Today |
|---|---|---|
| SMS provider outage | step `retry_scheduled` (temporary) → `failed` after budget; message row `failed`; never resend an ambiguous send | Phase 3 |
| Gmail failure | `temporary_failure email_delivery_failed`; outbox row retried by `processLeadEmails`; unique (step run, recipient) prevents double send | ✔ in handler |
| Webhook (outbound) failure | 429/5xx temporary, 4xx permanent | ✔; **SSRF**: only literal private IPs blocked — hostnames resolving to private/loopback/IPv6 (`[::1]`) are not |
| Invalid phone / opted out | `skipped` (`missing_contact` / `no_consent`); run continues | Phase 3 mapping ready |
| Deleted lead | runs keep history (`lead_id` set null); next step must `skip` `missing_contact` | verify in runtime |
| Disabled/archived workflow | new events don't match; **in-flight runs continue on their snapshot** — decide: cancel on archive? | undecided |
| Appointment changed during wait | step guard re-evaluates `appointment.status`; anchor re-read on resume | § 6 |
| Worker crash | lease expires → reclaimed; step idempotency prevents double effects | ✔ design |
| Duplicate cron | `for update skip locked` claims ✔ | ✔ |
| DB timeout | event marked failed + retried in 60s | ✔ except H2 |
| **Poison event (H2)** | should be `failed` with capped attempts | ✗ `loadEvent()` throws **before** the `try` in `processWorkflowEvent`, so a parse failure never marks the event failed; it stays `dispatching`, is reclaimed every 120s forever (no attempt cap in `claim_workflow_events`), and — ordered by unchanged `available_at` — can starve newer events |

## 12. Dead-letter / stuck runs

`scripts/workflow-health.mjs` (read-only transaction, ids/codes only; exit 1 on critical) checks: poison events (attempts ≥ 5), event backlog (> 15 min), runs stuck `running` with expired lease, pending/waiting past `resume_at` (scheduler down), overdue retries, orphaned non-terminal step runs of finished runs, failed runs/steps by error code (24h), enabled workflows with no runs (7 days), run status summary, workflow email outbox failures. Verified against the real schema in a rolled-back transaction. Run it from the scheduler or by hand; a UI can reuse the same queries later.

## 13. Cron / worker

- Route: `POST /api/workflows/tick`, Bearer `WORKFLOW_CRON_SECRET`, timing-safe compare, 401 when unset ✔; returns 207 on partial failure.
- Claims: events and runs via `for update skip locked` + lease ✔; runs reclaimable after lease ✔.
- **Missing:** a schedule (add `vercel.json` crons or an external scheduler; Vercel Cron sends GET with `CRON_SECRET` — the route is POST with its own secret, so pick one deliberately); attempt cap on events (H2); `maxDuration = 60` with sequential processing of 20 events × N workflows × actions (Gmail sends inline) — keep batch small or split dispatch from execution.
- Production test procedure: (1) apply migrations in staging/rolled-back check; (2) call tick with no secret → 401; (3) enable one HomeQuote workflow with only `notify_team` to an internal recipient; (4) create a test lead; (5) tick twice concurrently → one run, one email; (6) `node scripts/workflow-health.mjs` → no criticals; (7) kill a tick mid-run (short lease in staging) → reclaimed, no duplicate email.

## 14. Tenant isolation audit

| Contractor A must not… | Guard | Verified |
|---|---|---|
| see B's workflows / steps / runs / step runs | RLS `contractor_id = auth_contractor_id()` | Phase 1 DB test ✔ |
| see events / logs | staff-only RLS | Phase 1 DB test ✔ |
| trigger B's workflow | contractor workflows see only events with their `contractor_id` (planner + `trg_workflow_runs_guard`) | ✔ |
| run on a lead not assigned to them | run guard requires `lead_assignments` | ✔ |
| emit scoped events | `emit_workflow_event` service-role only | ✔ |
| write definitions | 0022 functions `is_admin()` | ✔ (code review) |
| see messages/conversations | Phase 3 draft RLS mirrors workflows | not built |
| see funnels/submissions they don't own | funnels RLS admin-only (0012) + portal rules (0017) | out of workflow scope; re-test in Phase 5 |

NULL-tenant rule stays intentional: HomeQuote workflows see every event; contractors never see NULL rows.

## 15. RLS conflicts

- The lead-activity conflict (0017 `visibility` gate vs 0013 private-sharing rule) was fixed by `0022_restore_contractor_activity_visibility.sql` (committed `92f181e`). Workflow code does not write `lead_activities` today; if Phase 5 adds workflow timeline entries they must set `metadata.contractor_id` for contractor-scoped runs and rely on 0013's classification (no `visibility='internal'` defaults).
- Production still has schema not present in the repo history before 0017 (`profiles.contractor_role`) — now explained by 0017; confirm `tests/calls-rls.test.ts` setup was updated (it failed earlier on `profiles_contractor_role_check`).
- No conflicts found in workflow tables (0020 policies are self-contained). `workflow_replace_steps` is revoked from `authenticated` and only reachable through admin-checked definer functions ✔.

## 16. Analytics (existing data only)

Runs (0020): `select w.id, w.name, count(*) runs, count(*) filter (where r.status='completed') completed, count(*) filter (where r.status='failed') failed, count(*) filter (where r.status='waiting') waiting from workflow_runs r join workflows w on w.id=r.workflow_id where r.created_at > now()-interval '30 days' group by 1,2`.
Success rate = completed / (completed + failed). Step outcomes: `workflow_step_runs` by `action_type, status`.
Email: `lead_email_deliveries where workflow_step_run_id is not null` by status. SMS sent/delivered/failed/response rate: Phase 3 `messages` (response = inbound message on the same conversation within N days of an outbound workflow message).
Appointments from workflows: `appointments` created by `workflow_create_appointment` (add `created_by` null + causation in activity) or `appointment.booked` events whose `causation_id` chain leads to a run. Lead progression: `lead.status_changed` events after a run's `started_at` for the same lead.
Indexes already cover these (runs by workflow/contractor/lead + created_at).

## 17. Contractor-facing minimum

Per workflow: name + plain-language summary (trigger → steps), enabled state, last run time, runs in 30 days, success rate, waiting count ("12 homeowners in follow-up"), messages sent/delivered (Phase 3), replies received, appointments recovered (no-show workflow → later `appointment.booked` for the same lead). Per run: current step and next resume time, outcome codes translated to plain words (`no_consent` → "Homeowner hasn't agreed to texts"). Requires a contractor-safe projection of step runs/log codes (RLS today hides logs).

## 18. Admin operations checklist

Daily: run `scripts/workflow-health.mjs`; review failed runs by error code; poison events; workflow email outbox failures; enabled workflows with no activity. On change: dry-run against a recent event before enabling; confirm senders/Gmail connected; confirm consent condition on lead-facing workflows. Incidents: disable workflow (stops new runs), cancel waiting runs if content is wrong, fix, re-enable.

## 19. End-to-end test matrix (production-like, rolled-back DB + mock provider)

Fixtures: `tests/fixtures/workflow-events.ts` (`buildWorkflowEvent`, `fixtureIds`, `emitArgs`, `EMIT_SQL`).

| Scenario | Steps | Assertions |
|---|---|---|
| A New lead | funnel `save_funnel_session` → tick | exactly one `lead.created`; envelope parses; HomeQuote intake workflow run created; (Phase 3) SMS persisted via mock; run `completed`; contractor sees run only for client-funnel lead |
| B No answer | status → `contact_attempted` → tick → advance clock | `lead.status_changed`; first SMS; run `waiting` with `resume_at` next day 10:00 LA; after resume second SMS; guard skips if status changed |
| C Reply | mock inbound webhook | one message; one `message.received`; workflow with `exit_events: [message.received]` cancels the follow-up run |
| D Appointment | `scheduleAppointment` → tick | `appointment.booked`; confirmation sent; reminder wait at `scheduled_at − 24h`; cancelled appointment → exit |
| E Failure | mock scripted temporary then permanent | `retry_scheduled` with backoff; then `failed`; provider called once per attempt; no duplicate message rows |
| F Tenant | contractor A workflow; contractor B lead event | no run for A; A's login sees no B runs/workflows; run insert across tenants rejected by guard |

## 20. Duplicate / load tests

Same event emitted twice (one row); webhook ×3 (one message/event); two ticks claiming concurrently (disjoint claims; one run per workflow/event); browser double-submit of the funnel (one lead, one event); two funnel sessions for the same homeowner (dedupe → one lead.created); provider retry of the same DLR (one delivery event); overlapping crons (skip-locked). Goal: zero duplicate side effects — assert on outbox/message counts, not just runs.

## 21. Rollout

1. Fix H1, H2, M1; renumber and commit Phase 2/4 migrations.
2. Apply `0020` → runtime → management to production (dry-run each with `scripts/verify-migration-rollback.mjs`). Events start recording; **no workflow enabled**.
3. Configure the scheduler; watch `workflow-health` for a day (events should dispatch to `event.no_match`).
4. Dry-run templates against real events in the UI.
5. Enable one HomeQuote workflow with internal-only `notify_team`.
6. Enable one lead-facing email workflow for HomeQuote leads.
7. Phase 3: `MESSAGING_MODE=allowlist` with staff phones; one test contractor; one SMS workflow.
8. `MESSAGING_MODE=live` in production; expand contractor by contractor; review health daily.
Rollback: disable workflows (`set_workflow_enabled false`) — stops new runs; cancel waiting runs by SQL if needed; `MESSAGING_MODE=disabled` stops all SMS instantly; unset the scheduler to freeze processing. Emitter triggers are harmless without enabled workflows; drop them only if they cause write-path errors.

## 22. Observability

| Question | Answerable today? |
|---|---|
| Why did this workflow run? | ✔ run → `trigger_event_id` → event payload/source |
| Why didn't it run? | partly: `run.conditions_not_met` / `event.no_match` logs, but `skippedWorkflows` reasons (tenant/trigger_config/disabled) are not logged — log them with the reason code |
| What step is it on / when will it resume? | ✔ `current_step_key`, `resume_at` |
| Did the SMS send / did they reply? | Phase 3 (`messages`, `message_delivery_events`) |
| Why did it fail / will it retry? | ✔ `last_error.code`, `failure_kind`, `next_retry_at` |
| Poison/stuck? | ✔ `workflow-health.mjs`; ✗ poison events carry no `last_error` today (H2) |

## 23. Performance flags

- `lib/data/workflows.ts#listWorkflows` loads **all** runs for all workflows (no limit) to compute list stats — aggregate in SQL.
- `processWorkflowEvent` loads the evaluation context once **per matching workflow** — load once per event per tenant.
- `claim_workflow_runs` reclaim clause (`status='running' and locked_until<now()`) isn't covered by `idx_workflow_runs_due` (running rows have `resume_at` null) — add a partial index on `locked_until where status='running'` if volume grows.
- `workflow_logs`, `workflow_events`, `funnel_events` have no retention — add a scheduled prune (e.g. logs 90 days, dispatched events 180 days) before volume grows.
- Inbound phone lookup uses `leads.phone_e164` (indexed) ✔.

## 24–25. Scaffolding added (safe, independent of Phase 2/4)

- `tests/fixtures/workflow-events.ts` — canonical valid envelopes for all 14 event types (full nullable payloads, canonical refs, tenant scoping), shared-id scenarios, `emit_workflow_event` argument helpers.
- `tests/workflow-phase5-fixtures.test.ts` — fixtures validate against Phase 1; pins emitter rules (no null stripping, fact-based keys, tenant visibility).
- `scripts/workflow-health.mjs` — read-only operational health check (§ 12).

## 26. Blockers (until Phase 2/4 land)

- H1, H2 live in uncommitted Phase 2 files; M1 in uncommitted Phase 4 files — owners should fix before commit.
- Migration renumbering and first production apply.
- Scheduler configuration.
- Phase 3 messaging implementation (tables, service, adapter, webhook) → `send_sms` / `message.received`.
- DB-level E2E tests need the final runtime entry points (`processWorkflowTick`, handler registration) to be committed.
