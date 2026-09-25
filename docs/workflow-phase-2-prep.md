# Workflow Phase 2 preparation

Status: implemented. This pre-build analysis is retained as a decision record; the delivered runtime is documented in `docs/workflow-automation-architecture.md` and implemented by migration `0024_workflow_runtime.sql` plus `lib/workflows/runtime.server.ts`.

## Executive summary

HomeQuote is a Next.js 15 application backed by Supabase/Postgres. The durable-execution building blocks already used elsewhere are a good fit for workflows: service-role-only queue writes, Postgres rows as durable state, SQL claim functions using `FOR UPDATE SKIP LOCKED`, short leases, and a secret-protected scheduled route. Phase 2 should extend that pattern rather than introduce a separate queue product.

The smallest reliable runtime is:

1. Canonical events are persisted through the Phase 1 event entry point.
2. A scheduled server route uses service-role RPCs to atomically claim event and run batches.
3. An event processor finds enabled, tenant-compatible workflows and creates immutable-snapshot runs.
4. A run processor executes one or more ordered steps until it completes, fails, stops, or stores a durable wake time.
5. Retries and waits are database state, never `setTimeout` or process memory.
6. Every externally visible effect receives the Phase 1 step idempotency key.

The Phase 2 implementation follows this design: canonical database emitters, leased event/run claims, immutable run snapshots, durable waits/retries, existing Gmail outbox reuse, structured safe logs, and a secret-protected scheduled route. Phase 3 messaging and unavailable domains remain out of scope.

## Current architecture map

### Application and runtime

- Next.js App Router with React server components, server actions, and route handlers (`app/`, `lib/actions/`).
- Supabase clients are split between an RLS-scoped session client (`lib/supabase/server.ts:createClient`) and a trusted service-role client (`lib/supabase/admin.ts:createAdminClient`).
- Interactive mutations live mostly in server actions. They combine authentication, `FormData` parsing, database writes, activity logging, and cache revalidation.
- Public/provider ingress is handled by route handlers under `app/api/` and by security-definer Postgres RPCs.
- Tests use Vitest in Node (`vitest.config.ts`, `tests/**/*.test.ts`). Database integration tests use `SUPABASE_DB_URL` when configured.
- Operational logging is currently a mixture of `console.error`/`console.warn`, `lead_activities`, `audit_logs`, provider delivery rows, and the in-progress Phase 1 `workflow_logs` contract.

### Core domain and tenancy

- A tenant is a contractor business (`contractors.id`); there is no organization table.
- `profiles.contractor_id` associates a contractor login with its business. `public.auth_contractor_id()`, `public.is_staff()`, and `public.is_admin()` are the central RLS helpers (`supabase/migrations/0001_initial_schema.sql`).
- A lead is a HomeQuote-level record in `leads`. Contractor ownership is many-to-many through `lead_assignments`; a contractor sees a lead only when assigned to it.
- The per-contractor funnel is `lead_assignments -> appointments / estimates / sales`. The overall HomeQuote pipeline is `leads.status`; the contractor-specific pipeline is `lead_assignments.status`.
- Staff generally see all lead data. Contractor access is enforced in Postgres RLS, including ownership helpers such as `lead_assigned_to_me()` and `owns_assignment()`.
- Some client-funnel activity uses `lead_activities.metadata.contractor_id` to prevent private funnel details leaking to another contractor (`supabase/migrations/0013_house_funnels_private_sharing.sql`).
- Trusted queue/runtime tables use RLS with read policies where needed and no authenticated write policy. Server-side service-role code performs queue writes.

### Existing domain write paths

| Domain fact | Current write paths | Notes for Phase 2 |
| --- | --- | --- |
| Lead creation | `lib/actions/leads.ts:createLead`; `lib/integrations/intake.ts:ingestLead`; `public.save_funnel_session()` in migration 0016 | Multiple paths make a database-level insert emitter safer than adding calls to every caller. Intake duplicates should not become new-lead events. |
| Lead status | `changeLeadStatus`, `logContactAttempt`, `updateQualification`, `assignLead`, `updateAssignmentStatus`, `scheduleAppointment`, `updateAppointmentStatus` in `lib/actions/leads.ts`; `addEstimate`/`addSale` in `lib/actions/outcomes.ts`; funnel/distribution RPCs | Status is often a secondary write, so transitions must be deduplicated and transactionally captured. |
| Qualification | `lib/actions/leads.ts:updateQualification` and `updateLead` | The canonical review field is `leads.qualification_status`; the legacy boolean is maintained alongside it. |
| Assignment | `lib/actions/leads.ts:assignLead` and bulk assignment; `public.distribute_lead()`; `public.save_funnel_session()` | An assignment is the contractor-scoped funnel spine. |
| Assignment status | `updateAssignmentStatus`, `scheduleAppointment`, `addEstimate`, `addSale`; funnel booking RPCs | Several paths also mirror milestones to `leads.status`. |
| Appointment creation/status | `scheduleAppointment`, `updateAppointmentStatus`; `public.record_calendly_booking()`; `public.record_funnel_booking()`; `public.distribute_lead()` | A house-funnel booking can exist before a contractor assignment and therefore before an `appointments` row. |
| Estimate | `lib/actions/outcomes.ts:addEstimate` | Inserts an estimate, advances assignment and lead stages, and logs activity. |
| Deal won/lost | `addSale` and assignment status changes | Won is a `sales` row / `sale_status`; lost is currently an assignment-stage fact. |
| Tasks | No homeowner-workflow task table or service found | Phase 1 currently marks this domain unavailable. |
| Tags | No HomeQuote lead-tag table or service found | GHL contact tags are external integration behavior, not HomeQuote domain tags. |
| Inbound messages | No channel-neutral inbound message/conversation table found | Existing Gmail code sends mail; it is not an inbound-message domain. |
| Internal notifications | Internal new-lead and qualified-lead email queues exist | There is no generic in-app notification service/table. |

### Existing durable job patterns

- `funnel_deliveries` is claimed by `public.claim_funnel_deliveries()` with an atomic update over `FOR UPDATE SKIP LOCKED` and a five-minute lease (`supabase/migrations/0014_funnel_ghl_api.sql`).
- `lead_email_deliveries` uses the same approach in `public.claim_lead_email_deliveries()` (`supabase/migrations/0016_lead_review_distribution.sql`).
- `lib/funnels/delivery.ts:deliverPendingFunnels` and `lib/leads/notify.ts:processLeadEmails` process claimed jobs and persist retry times with exponential backoff.
- `app/api/funnels/deliver/route.ts` is a secret-protected scheduled POST endpoint. `FUNNEL_CRON_SECRET` is already documented in `.env.example`.
- Next.js `after()` is used only as a best-effort latency accelerator after a request. Durable rows remain for the scheduled retry path.
- No queue library, long-running worker, Supabase Edge Function, `pg_cron` installation, or committed Vercel cron configuration was found.

## Phase 1 artifacts observed, but not owned by Phase 2

Phase 1 is finalized under `lib/workflows/`, `tests/workflows-contract.test.ts`, and `supabase/migrations/0020_workflow_automation_foundation.sql` (renumbered from the early 0017 draft). They define canonical events, actions, conditions, definitions, waits, run state, idempotency, logging, and tables.

Phase 2 must import these modules after they are finalized. It must not redeclare their event names, action names, condition operators, row types, status machines, retry result shapes, or idempotency formats.

## Event integration points

The preferred emitter strategy is hybrid:

- Use Postgres triggers for durable table facts that can be written from many paths: inserts/updates on `leads`, `lead_assignments`, `appointments`, `estimates`, and `sales`. This captures server actions, RPCs, scripts, and future callers in the same transaction.
- Use an explicit call to the Phase 1 event RPC for virtual/provider facts that do not map one-to-one to a domain row, such as a funnel booking with no appointment, and eventually inbound-message webhooks.
- Do not emit from both the application and a database trigger for the same fact unless both intentionally share the exact Phase 1 idempotency key.

Likely hook locations after Phase 1 is final:

| Future event family | Primary fact/emitter | Relevant application paths |
| --- | --- | --- |
| Lead created | `AFTER INSERT ON leads` | `createLead`, `ingestLead`, `save_funnel_session` |
| Lead status changed | `AFTER UPDATE OF status ON leads` with `OLD IS DISTINCT FROM NEW` | `lib/actions/leads.ts`, `lib/actions/outcomes.ts` |
| Qualification changed | `AFTER UPDATE OF qualification_status ON leads` | `updateQualification`, `updateLead` |
| Lead assigned | `AFTER INSERT ON lead_assignments` | manual/bulk assignment, `distribute_lead`, client funnel |
| Assignment status changed | `AFTER UPDATE OF status ON lead_assignments` | action paths plus booking/outcome RPCs |
| Appointment booked | `AFTER INSERT ON appointments`; explicit emission for unassigned `funnel_bookings` | `scheduleAppointment`, booking RPCs, distribution RPC |
| Appointment status changed | `AFTER UPDATE OF status ON appointments` | `updateAppointmentStatus` and future integration sync |
| Estimate sent | insert/update transition on `estimates.status` | `addEstimate` |
| Deal won | insert or status transition on `sales` | `addSale` |
| Deal lost | assignment transition to the final Phase 1-defined lost state | `updateAssignmentStatus` and any future loss service |
| Task completed | Blocked: no task domain | None |
| Message received | Blocked: no inbound-message domain | None |

Emitter implementation must use Phase 1 payload parsers in tests even when emission happens in SQL. Payload construction should be covered by database integration tests so SQL keys and TypeScript schemas cannot drift.

## Proposed engine layers

Names below are implementation roles, not new domain contracts. File names can be adjusted to the established `lib/workflows/` layout after Phase 1 lands.

### `WorkflowEventProcessor`

- Claims canonical event rows in bounded batches.
- Parses each row through the Phase 1 event parser.
- Calls the matcher and run service.
- Marks the event dispatched only after every eligible workflow has either produced a run or a durable dedupe result.
- On a transient failure, releases it with backoff; on a permanent contract violation, records a safe error and stops retrying according to the final Phase 1 policy.

### `WorkflowMatcher`

- Queries enabled, non-archived, non-template workflows by the canonical event type.
- Applies the Phase 1 tenant rule before conditions: a contractor workflow sees only its contractor-scoped events; the HomeQuote/network behavior must match the finalized Phase 1 contract.
- Parses the stored definition and trigger config through Phase 1 validators.
- Evaluates trigger config and entry conditions against a loaded execution context.
- Returns match explanations for logs and dry run without mutating data.

### `WorkflowContextLoader`

- Loads the minimum authoritative rows required by referenced condition fields and action inputs.
- Always scopes contractor-specific loads by both entity/assignment id and `contractor_id` even though the worker uses service role.
- Produces a read-only value resolver; it must not create a second event or condition schema.
- Loads current values for guards at execution time while preserving the immutable workflow-definition snapshot on the run.

### `ConditionEvaluator`

- Consumes only the finalized Phase 1 condition AST and operator registry.
- Pure API: `(conditionGroup, resolveField) -> explanation tree`.
- Short-circuits `all`/`any` in production but can retain per-node results for dry run.
- Distinguishes missing from `null`; delegates coercion/comparison rules to Phase 1 semantics.
- Never performs database I/O and never accepts arbitrary property paths. Field access is through a Phase 1 registry-backed resolver.

### `WorkflowRunService`

- Creates a run and definition snapshot atomically from a matched workflow/event.
- Relies on Phase 1 unique constraints for event/run and re-entry dedupe.
- Treats unique conflicts as expected duplicate outcomes, not worker failures.
- Cancels matching active runs for finalized exit events in the same transaction where practical.
- Exposes explicit complete, fail, wait, resume, and cancel transitions validated by the Phase 1 state machine.

### `WorkflowStepExecutor`

- Claims a run, determines the next step from its immutable definition snapshot, and creates/loads the corresponding step-run record.
- Evaluates step guards, then calls `ActionDispatcher`.
- Persists the result before advancing. A worker may execute a small bounded sequence in one invocation, but it must renew/release its lease and never depend on process lifetime.
- Branch traversal must use the final Phase 1 tree/ordering helpers rather than inventing cursor semantics.

### `ActionDispatcher`

- Maps the finalized Phase 1 action discriminant to a handler implementing the Phase 1 handler interface.
- Rejects unavailable actions before execution and fails closed on unknown action types.
- Gives every handler a scoped database adapter, canonical context, actor/correlation data, and the Phase 1 step idempotency key.
- Provider-specific messaging remains behind later adapters; no provider appears in the dispatcher contract.

### `WaitScheduler` and `WorkflowResumeProcessor`

- `WaitScheduler` uses the finalized Phase 1 wait utility to compute an absolute instant and persists waiting state plus wake time atomically.
- `WorkflowResumeProcessor` is not a timer. The scheduled worker claims due waiting/retry rows and advances them through the normal executor.
- Resume is safe under duplicate scheduler calls because claim and state transitions are conditional and leased.

### `WorkflowLogger`

- Writes the finalized Phase 1 structured log rows.
- Records ids, codes, counts, durations, and safe failure classifications only.
- Does not log contact details, message content, provider tokens, raw webhook bodies, or secrets.

## Condition evaluation preparation

Phase 1 currently owns the condition AST, field registry, operators, validation rules, and operator semantics. Phase 2 should add evaluation, not another schema.

Recommended evaluation shape after the contract is final:

```ts
type ResolvedField = { found: boolean; value: unknown };
type FieldResolver = (field: FinalPhase1ConditionField) => ResolvedField;

type ConditionExplanation = {
  matched: boolean;
  node: FinalPhase1ConditionNode;
  actual?: unknown;
  children?: ConditionExplanation[];
};
```

The illustrative names above are not contracts. Actual types must be imported from Phase 1. Tests should be table-driven for every finalized operator, value type, missing/null behavior, case and whitespace behavior, nested groups, depth/leaf limits, event payload fields, and unavailable fields.

## Action dispatch and internal action audit

### Reusable now

- `lib/supabase/admin.ts:createAdminClient`: correct trusted client for runtime work, provided every query adds explicit tenant constraints.
- `lib/outcomes/pricing.ts:selectActiveAgreement` and `lib/outcomes/commission.ts:computeCommission`: pure business rules reusable by extracted services.
- `lib/emails/gmail.ts:sendGmailMessage`: existing email provider adapter. A workflow email handler still needs a durable effect/outbox boundary before calling it.
- `lib/leads/lead-emails.ts`: useful examples of pure, tested content builders, but these templates are specific to current lead alerts.
- `lib/leads/notify.ts:processLeadEmails`: proven claim/retry design and Gmail bookkeeping pattern; do not call it as a generic workflow email handler because its row shape and semantics are lead-distribution-specific.
- `public.distribute_lead()` and its caller in `lib/actions/lead-distribution.ts`: reusable for the specific qualified-lead distribution use case, not a generic assign-user action.
- `lead_activities` and `audit_logs`: existing user/domain audit surfaces. Workflow execution itself should use `workflow_logs`; domain actions may additionally create a normal lead activity when that matches current app behavior.

### Must be extracted before reuse

The following behavior exists, but only inside UI-oriented server actions or multi-purpose SQL RPCs:

- Assignment: `lib/actions/leads.ts:assignLead` and bulk assignment.
- Network stage change: `changeLeadStatus`.
- Contractor stage change: `updateAssignmentStatus`.
- Appointment creation/status: `scheduleAppointment`, `updateAppointmentStatus`.
- Estimate creation/stage propagation: `lib/actions/outcomes.ts:addEstimate`.
- Deal won, commission, and billing: `lib/actions/outcomes.ts:addSale` plus private `upsertBilling`.
- Activity recording: duplicated private helpers in `lib/actions/leads.ts` and `lib/actions/outcomes.ts`.
- Pricing-agreement resolution: `lib/data/contractors.ts:resolvePricingAgreementId` is tied to the cookie/RLS client and should gain a client-injected or pure repository variant for service-role workers.

Create transaction-safe domain services/repositories first, then make both server actions and workflow handlers call them. Do not invoke server actions from the worker: they require an interactive session, parse `FormData`, redirect/revalidate UI, and do not provide a single transactional/idempotent boundary.

### Not currently backed by a HomeQuote domain service

- Assign user (there is contractor assignment, but no lead owner/assignee column).
- Create task / complete task.
- Add/remove HomeQuote lead tag.
- Generic internal notification.
- Inbound message/conversation.
- SMS or another external messaging provider.

Handlers for these actions must remain unavailable until their domains exist and Phase 1 marks them available.

## Wait and resume recommendation

Use Postgres-backed due times and the existing secret-protected scheduled-route pattern.

- Persist every pause/retry as a workflow run/step-run state with an absolute due timestamp from the finalized Phase 1 contract.
- Add Phase 2 service-role SQL claim functions in a new migration only after Phase 1 lands. Follow `claim_funnel_deliveries`: select due rows ordered by due time, lock with `FOR UPDATE SKIP LOCKED`, atomically set a worker id/lease expiration and running state, then return the claimed rows.
- Add one scheduled workflow tick route, or extend the existing delivery tick only if its failure and duration isolation remain acceptable. A separate `/api/workflows/tick` is easier to observe and prevents provider delivery latency from starving workflow resumes.
- Protect the route with a distinct server-only bearer secret and a constant-time comparison. Keep each invocation bounded by batch size and wall-clock budget.
- Optionally call the processor from `after()` immediately after event creation for low latency, but treat this only as an accelerator. The durable scheduled tick is authoritative.
- Do not add Redis, a large queue framework, or in-memory timers unless measured load or scheduling precision later requires it.

This survives deploys/restarts and works across multiple stateless workers. The only operational dependency is configuring an external scheduler (for example the deployment platform scheduler) to call the tick frequently enough for the product's delay precision. No committed scheduler configuration currently proves that `/api/funnels/deliver` is actually being invoked, so deployment configuration must be verified before enabling workflows.

## Claiming and concurrency strategy

Use leases plus compare-and-set transitions; never read a due row and update it in separate unguarded calls.

1. Claim in Postgres inside one statement/RPC using `FOR UPDATE SKIP LOCKED`.
2. Eligible rows are pending/due, retry-due, waiting/due, or running with an expired lease, according to finalized Phase 1 state rules.
3. The claim sets `locked_by`, `locked_until`, increments the appropriate attempt counter, and transitions to running only if the prior status and lease predicate still match.
4. Completion/wait/failure updates include `WHERE id = ? AND locked_by = ? AND locked_until > now()` so a stale worker cannot finalize a lease reclaimed by another worker.
5. Long effects renew the lease before expiry or use a lease comfortably longer than the provider timeout. Keep effects bounded with request timeouts.
6. Release the lease when entering waiting, retry-scheduled, completed, failed, or cancelled states.
7. Enforce one step-run per run/step/iteration and one run per workflow/event with Phase 1 unique constraints.
8. Pass the step idempotency key through the final effect boundary. A lease prevents concurrent normal execution; the effect key handles the crash after an external provider accepts the effect but before HomeQuote records success.

Cancellation uses a conditional update of active runs. An executor must check cancellation before each action and again when writing the result. Terminal states stay terminal. Exit-event cancellation and manual cancellation should record a reason and structured log entry.

## Idempotency risks and handling

| Duplicate source | Required protection |
| --- | --- |
| Provider webhook retry | Use the provider's stable fact/event id in the finalized Phase 1 event key; never request time or a random id. |
| Browser/form retry | Database fact emitter plus row/transition identity; existing funnel RPCs already serialize/dedupe submissions. |
| API/server-action retry | Same canonical event key and event uniqueness. |
| Multiple emitters for one fact | Prefer one authoritative emitter. If unavoidable, they must generate the identical finalized Phase 1 key. |
| Event worker retry | Unique workflow/event run constraint and deterministic re-entry keys. |
| Two schedulers/workers | Atomic lease claim with `SKIP LOCKED` and owner-checked finalization. |
| Run resume retry | Claim waiting run conditionally; terminal step-run uniqueness prevents replay. |
| Action retry | Step-run/effect idempotency key, stored provider id, and handler-specific outbox or unique effect record. |
| Crash after provider acceptance | Reconcile by the same provider idempotency key where supported; otherwise persist an outbox/send-attempt before the call and classify ambiguous outcomes for manual review rather than blindly resending. |
| Workflow-caused event loop | Preserve correlation/causation ids, enforce re-entry policy, and apply an explicit maximum chain depth/run budget once defined by Phase 1. |

Phase 2 must consume Phase 1's key builders and re-entry helpers directly. It must not define another key format.

## Dry-run/test-mode design

Dry run is a read-only orchestration path using the same parser, matcher, context loader, condition evaluator, and ordered-step traversal as production.

Input:

- A finalized canonical event envelope or an existing event id.
- Optional workflow id to inspect one workflow.
- An explicit `asOf` instant for deterministic wait calculations.

Output:

- Parsed event identity and tenant scope (no contact PII).
- Candidate workflows and tenant/trigger-config decisions.
- Entry-condition explanation tree.
- Immutable definition version that would be used.
- Ordered steps, guard results, resolved control decisions, and actions that would run.
- Computed wait instants and unavailable-action warnings.
- No provider payloads, secrets, writes, run rows, step rows, logs, or domain mutations.

Handlers must not be called in dry run. If an action needs validation beyond its Phase 1 config parser, expose a pure `plan`/`validate` function separate from `execute`. Production and dry run should share a `WorkflowPlan` built from Phase 1 types, not duplicate traversal logic.

## Phase 2 test matrix

### Pure unit tests

- Matching by event type, enabled/disabled/archive/template state, trigger config, and tenant.
- Every finalized condition operator and value type, missing/null values, nested all/any groups, event payload fields, and deterministic explanations.
- Ordered root steps and branch traversal from an immutable definition snapshot.
- Wait calculation and `asOf` determinism, including missing/past anchors and time-zone/DST boundaries.
- Dispatcher routing, unknown/unavailable action rejection, retry classification, stop behavior, and dry-run planning.
- No-PII structured logging.

### Repository/database integration tests

- Every emitter creates a valid Phase 1 event payload and emits only on a real transition.
- Duplicate webhook, browser, API, and emitter delivery produces one event.
- One run per workflow/event; all finalized re-entry policies.
- Contractor workflow cannot match or load another contractor's event/lead/assignment, even under service role.
- Database tenant guards reject mismatched run/step/log rows.
- Two concurrent claimers receive disjoint event/run/step sets.
- Expired leases are reclaimed; stale workers cannot finalize reclaimed work.
- Wait persists, is not claimed early, resumes when due, and resumes once under concurrent ticks.
- Retry persists its next due time and exhausts according to final policy.
- Exit event and manual cancellation stop future steps; terminal states cannot reopen.
- Workflow edit after run creation does not change historical execution.
- Step/effect idempotency survives a simulated crash between effect acceptance and result persistence.

### Orchestration tests with fakes

- Event -> match -> conditions -> run -> ordered successful steps -> completion.
- No match and failed conditions create the exact finalized audit/log outcome without actions.
- Temporary versus permanent failure and backoff.
- Wait -> scheduled resume -> continuation at the next step.
- Stop-workflow action completes/stops according to final Phase 1 semantics.
- Dry run and production planning choose identical workflows/steps while dry run performs zero writes/effects.
- Bounded batches and processing deadlines leave remaining rows safely claimable later.

### Operational tests

- Scheduled endpoint rejects missing/incorrect secret and never exposes errors containing secrets or PII.
- A process restart between every important state transition resumes safely.
- Multiple simultaneous route invocations do not duplicate execution.
- Typecheck, lint, unit tests, and database tests pass with the finalized Phase 1 migration applied.

## DO NOT IMPLEMENT UNTIL PHASE 1 CONTRACTS LAND

- Do not add event emitters or production calls to the event RPC.
- Do not add claim/resume SQL functions, worker routes, cron configuration, or runtime environment variables.
- Do not create action handlers or a dispatcher keyed by in-progress action strings.
- Do not create an evaluator against in-progress condition operators/field names.
- Do not add workflow tables, columns, enum/check values, indexes, RLS policies, or migrations that overlap Phase 1.
- Do not decide run cursor, branch traversal, stop, cancellation, retry, or exit-event semantics outside the final Phase 1 definition/state machines.
- Do not extract domain services in a way that changes existing user-facing behavior until action contracts and required transaction/idempotency boundaries are final.
- Do not enable task, tag, assign-user, inbound-message, generic notification, webhook, calendar, SMS, or other provider actions that lack a complete domain/provider implementation.
- Do not treat Next.js `after()` as durable execution.
- Do not log event payloads, action configs, message bodies, lead contact data, tokens, or provider responses verbatim.

## Exact Phase 1 artifacts required before implementation

Phase 2 can begin only after all of the following are committed, reviewed together, and declared stable:

1. Final migration(s) defining workflow definitions, steps, canonical events, runs, step runs, logs, constraints, indexes, triggers/guards, RLS, grants, and the sole event entry RPC.
2. Final canonical TypeScript exports for event envelope/payloads, trigger registry/configs, action registry/configs/results/handler context, definition/step tree, conditions/operators/fields, waits, errors/retry policy, run/step state machines, logs, and idempotency/re-entry helpers.
3. Final row-to-domain mapping and definition snapshot serialization format.
4. Final tenant matching rules for network (`contractor_id IS NULL`) versus contractor workflows, including house/client funnel edge cases.
5. Final rules for workflow enablement and availability gating.
6. Final event idempotency guidance for database transitions and provider events, including how transition identity is made stable without relying on low-precision timestamps.
7. Final ordered-step/branch cursor semantics, wait completion semantics, stop-workflow semantics, exit-event cancellation rules, and terminal-state behavior.
8. Final retry/attempt and failure classification policy, including ambiguous external effects.
9. Final structured log codes and PII/secrets policy.
10. Passing Phase 1 contract/schema/RLS tests plus confirmation that migration numbering will not change.
11. A list of actions/triggers/fields explicitly marked ready versus contract-only/unavailable.
12. Decision on whether Phase 1's current architecture document is the source of truth and where it lives.

## Suggested implementation order after Phase 1

1. Freeze/import Phase 1 contracts and add compile-time boundary tests.
2. Add pure condition evaluation and dry-run planning.
3. Add SQL claim RPCs and repository tests for events/runs.
4. Build event matcher/run creation without action execution.
5. Extract domain services for the first small set of ready internal actions.
6. Build dispatcher and step executor with fake handlers.
7. Add wait/resume, cancellation, retry, and lease-expiry recovery.
8. Add database emitters one domain fact at a time with integration tests.
9. Add the authenticated scheduled tick and deployment scheduler configuration.
10. Enable one low-risk internal workflow behind an operational flag; expand only after observing logs, duplicates, and recovery behavior.

## Preparation changes

This preparation phase intentionally adds only this document. It adds no runtime modules, migrations, UI, providers, event emitters, scheduler, or production execution path.
