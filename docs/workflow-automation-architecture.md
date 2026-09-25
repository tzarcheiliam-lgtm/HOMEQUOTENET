# HomeQuote Workflow Automation — Architecture & Contracts

> **Future workflow phases must use these contracts. Do not create competing workflow schemas, event names, action names, or shared types. If a required capability is missing, extend this contract deliberately rather than creating a parallel implementation.**

| | |
|---|---|
| Status | Phase 4 management UI complete on the Phase 1/2 runtime. Phase 3 SMS remains preparation-only in this checkout, so SMS workflows stay disabled. |
| Database | `supabase/migrations/0020_workflow_automation_foundation.sql`, `0024_workflow_runtime.sql`, `0025_workflow_management.sql` |
| TypeScript contract | `lib/workflows/` (import from `@/lib/workflows`) |
| Tests | `tests/workflows-contract.test.ts`, `tests/workflow-runtime.test.ts` (pure); `tests/workflows-db.test.ts`, `tests/workflow-runtime-db.test.ts` (real DB, rolled back) |

---

## 1. Shape

```
 existing fact (lead saved, appointment no-show, Calendly webhook, ...)
        │  emit_workflow_event()  ← one entry point, idempotent
        ▼
 workflow_events  (ledger + dispatch queue)
        │  dispatcher: enabled workflows with trigger_type = event.type
        │  that can see the event's tenant, trigger_config filter, entry conditions,
        │  reentry policy
        ▼
 workflow_runs  (one per workflow per event; definition snapshot)
        │  executor: steps in order
        ▼
 workflow_step_runs  (one per step; retry + wait state; effect idempotency key)
        │  action handler → existing system (Gmail outbox, leads.status, appointments…)
        ▼
 workflow_logs  (append-only, ids and codes only)
```

**TRIGGER → optional CONDITIONS → one or more ACTIONS.** A trigger *is* an event type; there is one vocabulary for both.

### Phase 2 runtime

- `supabase/migrations/0024_workflow_runtime.sql` installs canonical table emitters, event leases, atomic `FOR UPDATE SKIP LOCKED` claim functions, workflow action RPCs, and the workflow-email extension to the existing Gmail outbox.
- `lib/workflows/runtime.server.ts` matches events, snapshots definitions, enforces tenant/reentry/causation rules, executes ordered steps, resumes durable waits and retries, handles exit events, and exposes side-effect-free dry runs.
- `lib/workflows/evaluator.ts` and `planner.ts` implement the Phase 1 condition and matching contracts. `actions.server.ts` handles only ready actions and returns `unavailable_action` for Phase 3/domain-blocked actions.
- `POST /api/workflows/tick` is the bounded scheduled worker endpoint, protected by `WORKFLOW_CRON_SECRET`. It processes both undispatched events and due runs.
- Pausing/disabling a workflow affects future matching only. Existing runs execute their immutable `definition_snapshot`.
- Branch definitions remain enable-time blocked. SMS, inbound messaging, tasks, tags, and lead-owner assignment remain explicitly unavailable rather than gaining parallel placeholder domains.

### Phase 4 management UI

- `/app/workflows` is the RLS-scoped dashboard for workflow status, trigger/account filters, run totals, recent outcome, and lightweight success metrics.
- `/app/workflows/new` creates a disabled blank definition or clones one of `WORKFLOW_TEMPLATES`. No template behavior is hardcoded into the UI.
- `/app/workflows/[id]` is a step builder derived from `WORKFLOW_TRIGGERS`, `CONDITION_FIELDS`, `CONDITION_OPERATORS`, and `WORKFLOW_ACTIONS`. It supports flat AND conditions, ready-action config editors, canonical merge fields, all Phase 2 wait modes, safe up/down reordering, and explicit unavailable states.
- Dry runs call `dryRunWorkflowEvent()` with a real saved event. The frontend never synthesizes results and the action path is never invoked.
- Run and step history live at `/app/workflows/[id]/runs` and `/app/workflows/runs/[runId]`, using canonical run/step states and sanitized `workflow_logs`.
- Migration `0025_workflow_management.sql` supplies admin-only, transactional definition writes. Saves use optimistic version checks; duplication creates new ids and starts disabled; archive disables the workflow without deleting runs or logs. Existing runs retain their immutable definition snapshots.
- Existing RLS remains authoritative: admins can read all workflow data (Appointment setters have no Automations access at any layer); contractors see only rows with their own `contractor_id`; only admins receive management controls and every server action rechecks the role.
- The mobile builder uses Overview / Trigger / Conditions / Steps jump sections, full-width primary actions, stacked step cards, and the dashboard shell now exposes navigation on small screens.

## 2. Findings about the existing app that shaped this design

| Finding | Consequence |
|---|---|
| The tenant is the **contractor business** (`contractors.id`). There is no organizations table. `NULL` contractor already means "HomeQuote itself" (house funnels, activity scope metadata). | `contractor_id` is the tenant column everywhere; `NULL` = HomeQuote network workflow/event. The brief's `organizationId` maps to `contractorId`. |
| One lead can be shared with several contractors; each contractor sees only its side (0013). | Contractor workflows only see events scoped to them, and the DB refuses a contractor run on a lead not assigned to that contractor. |
| Two pipelines exist: `leads.status` (network) and `lead_assignments.status` (per contractor). | `change_pipeline_stage` takes `pipeline: 'lead' \| 'assignment'`; contractor workflows may only use `assignment`. |
| "Deal" = a `lead_assignments` row; won = a `sales` row with `sale_status='won'`; lost = assignment status `lost`. Appointment "completed" is status `held`. | Event names follow the brief, payloads use the app's real values (`toStatus: 'held'` is not renamed). |
| **No generic event bus exists.** Existing logs are purpose-built: `lead_intake_events` (intake audit), `funnel_events` (analytics), `lead_activities` (timeline), `audit_logs` (admin). | `workflow_events` is new but is *not* a second copy of those: it is the one domain-event ledger for automation. Emitters derive events from those existing facts; they are not replaced. |
| Durable outbox pattern already exists: `status / attempts / available_at` + `claim_*()` with `for update skip locked`, service-role only, cron via `/api/funnels/deliver` (`FUNNEL_CRON_SECRET`). | Events and runs use the same lease pattern. Phase 2 reuses the cron-secret route pattern. |
| The only messaging transport is **Gmail** (`lib/emails/gmail.ts`), used through `lead_email_deliveries`. No SMS, no inbound messages. | `send_email` / `notify_team` must go through the existing Gmail sender. `send_sms` is contract-only. `message.received` is reserved. |
| A team alert is already queued for every intake (`trg_lead_intake_alert`, 0016). Lead distribution to contractors is deliberately manual (`distribute_lead`, "Send lead"). | The New Lead Intake template does not alert the team (would double-alert). There is no "auto-distribute to contractor" action. |
| **No tasks table, no tags, no lead owner/assignee user column.** | `task.completed`, `create_task`, `add_tag`, `remove_tag`, `assign_user`, `lead.tags`, `lead.assigned_user_id` are defined but marked `needs_domain`; they cannot be enabled until those tables exist. |
| Statuses in this schema are `text + CHECK` for new tables (funnels, 0016), enums for legacy ones. | Workflow value lists are `text + CHECK`; a unit test fails if SQL and TypeScript lists drift. |
| RLS helpers: `is_admin()`, `is_staff()` (admin+setter), `auth_contractor_id()`. | Reused as-is; no new predicates. |

## 3. Database tables (migration 0020)

All additive. No existing table, function, policy or row is touched.

### `workflows`
Definition + ownership. Key columns: `contractor_id` (NULL = HomeQuote), `name`, `description`, `is_template`, `template_key`, `source_template_id`, `trigger_type`, `trigger_config`, `conditions` (condition group), `exit_events text[]`, `reentry_policy`, `enabled` (default **false**), `version`, `created_by`, `updated_by`, `archived_at`, timestamps.
Constraints: templates are global (`contractor_id` NULL), never enabled, and keyed; archived workflows are disabled; `template_key` unique among templates.

### `workflow_steps`
Flat rows forming an ordered tree. `key` (stable, unique per workflow — runs reference steps by key), `position`, `parent_step_id` + `branch ('then'|'else')` (NULL for root steps), `step_type ('action'|'branch')`, `action_type`, `config`, `conditions` (optional guard for actions, required for branches).
Constraints: composite FK keeps a child's parent inside the same workflow; `(workflow_id, parent, branch, position)` is unique (`NULLS NOT DISTINCT`, **deferrable** so the app can reorder in one transaction).

### `workflow_events`
The canonical event ledger and dispatch queue. Envelope columns (§6) + `dispatch_status ('pending'|'dispatching'|'dispatched'|'failed'|'ignored')`, `dispatch_attempts`, `available_at`, `dispatched_at`, `last_error`. `idempotency_key` is UNIQUE.

### `workflow_runs`
`workflow_id`, `workflow_version`, `definition_snapshot` (the definition at start — edits never change live runs), `contractor_id` (forced from the workflow), `trigger_event_id`, `lead_id`, `entity_type/entity_id`, `status`, `current_step_key`, `dedupe_key`, `concurrency_key`, `resume_at`, `locked_by/locked_until` (lease), `context`, `metadata`, `last_error`, `cancel_reason`, `started_at/completed_at/failed_at/cancelled_at`.
Constraints: shape checks per status (completed ⇒ `completed_at`; failed ⇒ `failed_at` + `last_error`; cancelled ⇒ `cancelled_at`; **waiting ⇒ `resume_at`**, so nothing waits forever).

### `workflow_step_runs`
`run_id`, `contractor_id` (forced from the run), `step_key`, `iteration` (0 today; reserved for loops), `step_type`, `action_type`, `status`, `idempotency_key` (UNIQUE), `attempt_count`, `max_attempts`, `next_retry_at`, `resume_at`, `failure_kind ('temporary'|'permanent')`, `input`, `output`, `last_error`, `provider`, `skip_reason`, lease columns, timestamps.
Constraints: `(run_id, step_key, iteration)` unique; `retry_scheduled` ⇒ `next_retry_at` + temporary; `failed` ⇒ `last_error` + `failure_kind`; `attempt_count ≤ max_attempts`.

### `workflow_logs`
Append-only. `workflow_id`, `run_id`, `step_run_id`, `event_id`, `contractor_id` (all lineage filled by trigger from the most specific reference), `level`, `code` (canonical list), `message`, `data`.

### Relationships

```
contractors 1─* workflows 1─* workflow_steps (self-ref parent, same workflow)
                    │
                    1─* workflow_runs *─1 workflow_events *─1 leads
                            │                  └─ causation_id → workflow_events
                            1─* workflow_step_runs
workflow_logs → workflow / run / step run / event
```

Delete behavior: deleting a contractor cascades its workflows, runs and step runs (events it scoped become `contractor_id NULL`, admin-only). Deleting a lead sets `lead_id NULL` on events and runs (history kept, deletion never blocked). A workflow with runs cannot be deleted directly — archive it (`archived_at`, `enabled=false`).

### Tenant guards (triggers)

`trg_workflow_runs_guard` — on insert: templates cannot run; event type must equal the workflow's trigger; `contractor_id` is **copied from the workflow** (caller's value ignored); a contractor workflow requires the event to be scoped to the same contractor **and** the lead to be assigned to that contractor. On update: identity columns (workflow, tenant, event, entity, snapshot) are immutable; terminal statuses are final.
`trg_workflow_step_runs_guard` — tenant copied from the run; identity immutable; terminal statuses final.
`trg_workflow_logs_guard` — lineage and tenant filled from the run / event / workflow.

## 4. Triggers (event types)

Registry: `WORKFLOW_TRIGGERS` in `lib/workflows/events.ts`; payload schemas: `WORKFLOW_EVENT_PAYLOAD_SCHEMAS`; per-workflow filters: `WORKFLOW_TRIGGER_CONFIG_SCHEMAS`.

| Event | Entity | Tenant scope | Availability | Emitted from (Phase 2) |
|---|---|---|---|---|
| `lead.created` | lead | optional | ready | insert on `leads` (repeat submissions that matched an existing lead do **not** emit) |
| `lead.status_changed` | lead | optional | ready | `leads.status` change |
| `lead.qualification_changed` | lead | optional | ready | `leads.qualification_status` change (0016 review flow) |
| `lead.assigned` | lead_assignment | **required** | ready | insert on `lead_assignments` |
| `assignment.status_changed` | lead_assignment | **required** | ready | `lead_assignments.status` change |
| `appointment.booked` | appointment / lead | optional | ready | insert on `appointments`; funnel booking with no appointment yet |
| `appointment.cancelled` | appointment | **required** | ready | `appointments.status → cancelled` |
| `appointment.completed` | appointment | **required** | ready | `appointments.status → held` |
| `appointment.no_show` | appointment | **required** | ready | `appointments.status → no_show` |
| `estimate.sent` | estimate | **required** | ready | `estimates.status → sent` |
| `deal.won` | sale | **required** | ready | `sales` row with `sale_status = won` |
| `deal.lost` | lead_assignment | **required** | ready | `lead_assignments.status → lost` |
| `task.completed` | task | optional | needs_domain | — (no tasks table) |
| `message.received` | message | optional | needs_domain | — (no inbound messaging) |

`lead.qualification_changed` and `assignment.status_changed` are additions to the brief's list: HomeQuote's review-first qualification (0016) and per-contractor pipeline are first-class facts that the brief's names do not cover.

**Tenant scope.** *required*: the event is about one contractor's side of a lead; `contractorId` must be set and equal `payload.contractorId`. *optional*: lead-level; `contractorId` is set only when the fact is private to one contractor (e.g. a client-funnel submission, matching the `metadata.contractor_id` convention of `lead_activities`), otherwise NULL.

**Payloads** are strict (unknown keys rejected) and contain ids and statuses, not contact details. Required/optional fields per event are defined by the Zod schema; e.g. `appointment.no_show` requires `leadId, assignmentId, contractorId, appointmentId, scheduledAt|null, fromStatus|null, toStatus`.

**Trigger config** narrows the event itself: `{ fromStatuses?, toStatuses? }` for the three status-change events, `{ channels? }` for `message.received`, `{}` otherwise. Anything richer is a condition.

## 5. Actions

Registry: `WORKFLOW_ACTIONS` in `lib/workflows/actions.ts`; config schemas: `WORKFLOW_ACTION_CONFIG_SCHEMAS`.

| Action | Category | Availability | Consent | Backed by (must reuse) |
|---|---|---|---|---|
| `send_sms` | messaging | **contract_only** | yes | Nothing yet. Future provider adapter behind the handler. |
| `send_email` | messaging | ready | yes | Existing Gmail sender (`sendGmailMessage`) through a durable outbox, as `lead_email_deliveries` does. |
| `assign_user` | crm | needs_domain | – | No lead owner column. |
| `change_pipeline_stage` | crm | ready | – | `leads.status` (pipeline `lead`) or `lead_assignments.status` (pipeline `assignment`). |
| `create_task` | crm | needs_domain | – | No tasks table. |
| `add_tag` / `remove_tag` | crm | needs_domain | – | No tags table. |
| `wait` | control | ready | – | Engine: `resume_at` + scheduled worker. |
| `send_webhook` | integration | ready | – | HTTPS POST; signing secret referenced by `integrations.id` (never inline). |
| `notify_team` | messaging | ready | – | Existing Gmail + `LEAD_ALERT_EMAILS` / `lead_recipients`. |
| `create_calendar_event` | crm | ready | – | Inserts `appointments` on the run's assignment (no external calendar sync). |
| `stop_workflow` | control | ready | – | Engine: completes the run. |

`wait` and `stop_workflow` are **control actions** (`control: true`): the engine handles them; there is one registry of step behaviors, not a separate "wait step" concept.

**Merge fields.** Message text may use `{{lead.first_name}}`, `{{lead.last_name}}`, `{{lead.city}}`, `{{lead.zip}}`, `{{contractor.name}}`, `{{appointment.scheduled_at}}`, `{{appointment.location}}`, `{{estimate.amount}}`, `{{homequote.phone}}`, `{{homequote.site_url}}`. Unknown fields fail validation, so templates cannot reach arbitrary data.

### Enable-time rules (`validateWorkflowForEnable`)
A definition may be saved as a draft while these fail, but cannot be enabled:
- trigger, action or condition field not `ready` (`trigger_unavailable`, `action_unavailable`, `field_unavailable`);
- any `branch` step (`branching_not_supported`) until the engine implements branching;
- contractor-side actions (`create_calendar_event`, `change_pipeline_stage` on `assignment`) without a contractor-scoped trigger (`assignment_required`);
- a contractor workflow changing the network pipeline or alerting the HomeQuote team (`network_only_action`).

## 6. Event envelope

```ts
interface WorkflowEvent<T extends WorkflowEventType> {
  id: string;                 // uuid (workflow_events.id)
  type: T;                    // canonical event name
  schemaVersion: 1;
  idempotencyKey: string;     // `${type}|${ref}` — see §9
  occurredAt: string;         // when the fact happened (ISO)
  recordedAt?: string;        // when HomeQuote stored it
  contractorId: string|null;  // tenant; NULL = HomeQuote network side
  actorType: 'user'|'system'|'integration'|'contact'|'workflow';
  actorId: string|null;       // profiles.id, required when actorType = 'user'
  entityType: 'lead'|'lead_assignment'|'appointment'|'estimate'|'sale'|'task'|'message';
  entityId: string;
  leadId: string|null;
  source: string;             // 'db:leads', 'funnel:calendly', 'app:lead_actions', ...
  correlationId: string|null; // groups a chain of events
  causationId: string|null;   // the event that directly caused this one
  payload: WorkflowEventPayloadMap[T];
  metadata: Record<string, unknown>;
}
```
- **Typed**: `workflowEventSchema` validates the envelope and the payload for its type.
- **Tenant-safe**: required-scope events must carry `contractorId`; envelope `contractorId`/`leadId` must equal the payload's.
- **Traceable/auditable**: `source`, `actorType/actorId`, `correlationId/causationId`, `recordedAt`; rows are never updated except dispatch bookkeeping.
- **Loop safety**: an event produced by a workflow action is emitted with `actorType: 'workflow'` and `causationId` = the triggering event. Phase 2 must refuse to start a run whose causation chain already contains the same workflow.
- **Entry point**: `public.emit_workflow_event(...)` (service role only). It inserts or, on a repeated `idempotency_key`, returns the existing id and changes nothing. `eventFromRow()` maps a row back to an envelope.

## 7. Conditions

```ts
type WorkflowCondition = { field: string; operator: Operator; value?: Scalar | Scalar[] };
type WorkflowConditionGroup = { match: 'all' | 'any'; conditions: (WorkflowCondition | WorkflowConditionGroup)[] };
```
Max depth 3, max 50 leaves. Used for workflow entry conditions (evaluated once, when the event is dispatched), per-step guards (evaluated just before the step runs, against **fresh** data — so a wait followed by a guarded step sees the current state), and future branch steps.

**Fields** (`CONDITION_FIELDS`, existing column names): `contractor.id`, `lead.vertical_id`, `lead.sub_service_id` (service type), `lead.source`, `lead.platform`, `lead.city`, `lead.state`, `lead.zip`, `lead.status`, `lead.qualification_status`, `lead.consent_granted`, `lead.urgency`, `lead.estimated_job_value`, `lead.created_at`, `assignment.status`, `appointment.status`, `appointment.scheduled_at`; `lead.assigned_user_id` and `lead.tags` are `needs_domain`. Any `event.payload.<path>` is also allowed.

**Operators** (`OPERATOR_SEMANTICS` is normative):

| Operator | Value | Semantics |
|---|---|---|
| `equals` / `not_equals` | scalar | strict; strings trimmed + case-insensitive; missing field is `not_equals` anything |
| `contains` / `not_contains` | string | substring (string field) or membership (array field) |
| `in` / `not_in` | non-empty array | equals any / none |
| `exists` / `not_exists` | none | present and not null / "" / [] |
| `greater_than` / `less_than` | number or ISO date-time | numeric or chronological; missing field → false |

Enum-typed fields (`lead.status`, `assignment.status`, `appointment.status`, `lead.qualification_status`) only accept real values from `lib/leads/constants` — the workflow contract never re-declares pipeline values.

## 8. Run and step states

**Run** (`WORKFLOW_RUN_STATUSES`): `pending → running → (waiting ↔ running) → completed | failed | cancelled`.

| From | Allowed to |
|---|---|
| pending | running, cancelled, failed |
| running | running (lease re-claim), waiting, completed, failed, cancelled |
| waiting | running, cancelled |
| completed / failed / cancelled | — (terminal; enforced by the DB) |

There is no separate `paused` state: pausing a *workflow* is `enabled = false`; a run is `waiting` (with `resume_at`) or it is cancelled.

**Step run** (`WORKFLOW_STEP_RUN_STATUSES`): `pending, running, waiting, retry_scheduled, succeeded, failed, skipped, cancelled`; terminal: `succeeded, failed, skipped, cancelled`.

## 9. Idempotency strategy

Every layer is a UNIQUE constraint in Postgres, so duplicates are impossible even across concurrent workers, retries, deploys and crashes.

1. **Event** — `workflow_events.idempotency_key` UNIQUE; `emit_workflow_event` is insert-or-return. The key is `${type}|${ref}` built with `eventIdempotencyKey()`. The ref identifies the **fact** — never the emitter, never the delivery attempt — and each event type has exactly **one** canonical ref format (`WORKFLOW_TRIGGERS[type].idempotencyRef`):

   | Event | Canonical ref |
   |---|---|
   | lead.created | `lead:<leadId>` |
   | lead.status_changed | `lead:<leadId>:status:<toStatus>:<updatedAtMicros>` |
   | lead.qualification_changed | `lead:<leadId>:qualification:<toStatus>:<updatedAtMicros>` |
   | lead.assigned | `assignment:<assignmentId>` |
   | assignment.status_changed | `assignment:<assignmentId>:status:<toStatus>:<updatedAtMicros>` |
   | appointment.booked | `appointment:<appointmentId>`, or `booking:<provider>:<externalBookingId>` when no appointment row exists yet (an appointment later created *from* that booking must not emit again) |
   | appointment.cancelled / completed / no_show | `appointment:<appointmentId>:status:<cancelled\|held\|no_show>:<updatedAtMicros>` |
   | estimate.sent | `estimate:<estimateId>:sent` |
   | deal.won | `sale:<saleId>:won` |
   | deal.lost | `assignment:<assignmentId>:status:lost:<updatedAtMicros>` |
   | task.completed | `task:<taskId>:completed:<completedAtMicros>` |
   | message.received | `message:<messageId>` |

   `<updatedAtMicros>` is the source row's `updated_at` in epoch microseconds, so a lead that legitimately goes A→B, B→A, A→B produces three events. Never use `now()`/random values. Because the emitter is *not* part of the key, the same fact reported twice — a duplicate webhook, a retried request, a refresh, a replayed funnel submit, or two different emitters (a funnel function and a table trigger) — collapses into one event. `source` is still recorded on the row for tracing.
2. **Run** — `(workflow_id, trigger_event_id)` UNIQUE: one event starts a given workflow at most once. Reentry policy adds:
   - `once_per_event` (default) — nothing more;
   - `once_per_entity` — `dedupe_key = '<entity_type>:<entity_id>'`, unique forever;
   - `one_active_per_entity` — `concurrency_key`, unique only while `pending|running|waiting`.
   The dispatcher inserts with `on conflict do nothing` and logs `run.duplicate`.
3. **Step** — `(run_id, step_key, iteration)` UNIQUE: a step executes once per run.
4. **Side effect** — `workflow_step_runs.idempotency_key = '<run_id>:<step_key>:<iteration>'` (`stepRunIdempotencyKey()`), UNIQUE, passed to every handler. Handlers use it as the outbox unique key / provider idempotency header, so retrying a step after a timeout never sends twice.
5. **Leases** — workers claim runs/events with `for update skip locked` and a `locked_until` lease (same as `claim_funnel_deliveries`); an expired lease is safe to re-claim because layers 3–4 make re-execution a no-op.

## 10. Retry / failure contract

Handlers return `WorkflowActionResult`:

```ts
| { outcome: 'success'; output?; provider? }
| { outcome: 'skipped'; reason: WorkflowSkipReason; provider? }       // e.g. 'no_consent'
| { outcome: 'temporary_failure'; error: WorkflowError; retryAfterSeconds?; provider? }
| { outcome: 'permanent_failure'; error: WorkflowError; provider? }
```
`WorkflowError = { code, message, kind: 'temporary'|'permanent', retryable, details? }` (kind and retryable must agree). `ProviderMetadata = { provider, providerMessageId?, statusCode?, detail? }` — an opaque label; the engine never branches on it.

`stepRunUpdateForResult()` maps a result to the step-run update: success → `succeeded`; skipped → `skipped`; temporary → `retry_scheduled` with `next_retry_at` (`nextRetryAt()`: exponential `base·2^(n-1)`, capped, provider retry-after honored; default 5 attempts, 60s base, 1h cap) until the budget is spent → `failed` (`failure_kind='temporary'`, `details.retries_exhausted`); permanent → `failed`. Columns: `attempt_count`, `max_attempts`, `next_retry_at`, `last_error`, `failure_kind`, `provider`.

## 11. Wait / delay model

```ts
{ mode: 'duration', amount: 5, unit: 'minutes' | 'hours' | 'days' }            // ≤ 90 days
{ mode: 'until_time_of_day', time: '10:00', dayOffset: 1, timezone: 'America/Los_Angeles' }
{ mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -1440, ifPast: 'skip' }
```
`computeWaitUntil(config, now, anchors)` returns an absolute instant (DST-correct), `continue` (already due) or `skip`. The engine stores it in `workflow_runs.resume_at` with `status='waiting'`, and a cron-driven worker resumes due runs (`idx_workflow_runs_due`). **No `setTimeout` / in-memory timers**, so waits survive deploys, restarts and crashes. Every waiting run has a `resume_at` (DB check), so a run can never wait forever; future "wait for reply" steps must also carry a timeout.

## 12. Templates

`WORKFLOW_TEMPLATES` (`lib/workflows/templates.ts`) are pure data validated by the same schema: **New Lead Intake**, **No Answer Follow-Up**, **Appointment Confirmation**, **No-Show Recovery**, **Estimate Follow-Up**. No template behavior is coded into the app.
- Stored as `workflows` rows with `is_template = true`, `template_key` (global, never enabled, never run — enforced by check + guard trigger).
- `cloneTemplate()` produces a disabled workflow row with `template_key` + `source_template_id` lineage, owned by HomeQuote or a contractor; insert it with `stepRowsFor()` in one transaction.
- Templates using `send_sms` can be cloned and edited but not enabled until an SMS provider exists — intentional.
- Seeding the template rows into the database is a Phase 2 task (idempotent upsert by `template_key`); the TS definitions are the source.

## 13. Provider abstraction philosophy

- The engine knows **action types**, never providers. It calls `WorkflowActionHandler.execute(ctx)` and records the `WorkflowActionResult`.
- Handlers build on existing systems (Gmail outbox, `leads`, `appointments`, `integrations`). There is exactly one email path (Gmail) and it must be reused — no second messaging abstraction.
- SMS: when a provider is chosen, add **one** adapter behind the `send_sms` handler, selected by server configuration. Action configs never name a provider (`send_sms` config rejects `provider` / `from` keys). Swapping Twilio ↔ Telnyx ↔ Sendblue must not touch workflows, events, runs or templates.
- Provider responses are summarized into `ProviderMetadata`; raw bodies, tokens and secrets are never stored.
- Lead-facing messages require `leads.consent_granted` (handlers return `skipped: no_consent`); SMS defaults to quiet hours (`respectQuietHours: true`, 8am–9pm lead-local).

## 14. RLS / security

| Table | Select | Insert / Update / Delete |
|---|---|---|
| workflows | admin; contractor: own rows only (never NULL/HomeQuote rows, never other contractors) | admin |
| workflow_steps | admin; contractor: steps of own workflows | admin |
| workflow_events | admin | service role only |
| workflow_runs | admin; contractor: own rows | service role only |
| workflow_step_runs | admin; contractor: own rows | service role only |
| workflow_logs | admin | service role only |

- `emit_workflow_event` is `security definer`, revoked from `public/anon/authenticated`, granted to `service_role` only (same as `distribute_lead`, `claim_*`).
- Tenant of runs, step runs and logs is **derived by trigger**, never trusted from the caller.
- Events and logs are admin-only because they describe network-level facts about shared leads.
- Logs carry ids and codes only; `workflowLogEntrySchema` rejects keys that look like contact data, message bodies or secrets (`email`, `phone*`, `*token*`, `body`, `name`, …).
- Contractors cannot author workflows yet (admin-only writes). Opening self-serve authoring later is a deliberate RLS change plus the `network_only_action` rules above.
- Nothing weakens existing policies; no existing object is altered.

## 15. Logging format

`WorkflowLogEntry = { level, code, message, workflowId?, runId?, stepRunId?, eventId?, contractorId?, data? }` → one `workflow_logs` row via `toWorkflowLogRow()`. Levels: `debug | info | warn | error`. Codes (`WORKFLOW_LOG_CODES`): `event.recorded, event.duplicate, event.no_match, event.dispatch_failed, run.created, run.duplicate, run.conditions_not_met, run.started, run.waiting, run.resumed, run.completed, run.failed, run.cancelled, run.exit_event, run.lease_expired, step.started, step.succeeded, step.skipped, step.retry_scheduled, step.failed, step.waiting, action.provider_response`. Add codes to the list; do not log free-form codes.

## 16. What Phase 1 intentionally does not implement

- No event **emitters** (no triggers on `leads`, `appointments`, etc.; no webhook changes). Nothing writes to the new tables in production yet.
- No dispatcher, executor, scheduler, cron route or claim functions.
- No condition evaluator or merge-field renderer (semantics are specified above).
- No action handlers; no SMS provider; no outbound webhooks.
- No UI, no server actions.
- No tasks, tags, lead-owner or inbound-message tables.
- No branching execution (representable, blocked at enable time).
- No template seeding into the database.
- No data retention job for `workflow_logs` / `workflow_events` (add one before volume grows).

## 17. What Phase 2 must know

1. **Apply 0020 first** (`node scripts/verify-migration-rollback.mjs supabase/migrations/0020_workflow_automation_foundation.sql` dry-runs it). `tests/workflows-db.test.ts` passes before and after applying.
2. **Emit through `emit_workflow_event` only** (never a raw `insert into workflow_events` — a raw insert turns a replay into a unique-violation that aborts the caller's transaction instead of a no-op), with the canonical refs in §9. Prefer AFTER triggers on the source tables so every writer (including `save_funnel_session`, `distribute_lead`, `record_*_booking`) emits atomically; set `contractor_id` per the tenant-scope rules in §4. Do not emit `lead.created` for duplicate intakes.
3. **Dispatcher**: claim `workflow_events` (`dispatch_status in pending/failed`, `available_at <= now()`, `for update skip locked`), match enabled, non-archived workflows by `trigger_type` and `workflowCanSeeEvent()`, apply `trigger_config`, entry conditions and `runKeys()`, insert runs with `on conflict do nothing`, snapshot the definition and version. Cancel active runs whose workflow lists the event type in `exit_events` for the same lead.
4. **Executor**: claim due runs (`resume_at <= now()`, lease), walk root steps by position, create step runs with `stepRunIdempotencyKey()`, evaluate step guards against fresh data, compute waits with `computeWaitUntil()`, apply results with `stepRunUpdateForResult()`, respect `canTransitionRun()` / `canTransitionStepRun()`.
5. **Handlers** implement `WorkflowActionHandler`; `send_email` and `notify_team` reuse the Gmail sender through an outbox (extend `lead_email_deliveries.kind` or add a workflow outbox keyed by the step idempotency key — decide deliberately, don't fork the sender). Refuse to enable anything `validateWorkflowForEnable()` flags.
6. **Scheduling** reuses the `/api/funnels/deliver` cron-secret pattern (a new route guarded by the same kind of secret). No in-memory timers.
7. **Extending the contract**: add the value to the TS registry *and* a new migration that replaces the CHECK constraint; the drift test in `tests/workflows-contract.test.ts` will fail until both agree. Update this document in the same change.
