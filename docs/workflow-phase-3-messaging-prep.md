# Workflow Phase 3 — Messaging / SMS Preparation

> **Phase 3 messaging must plug into the canonical Phase 1/2 workflow contracts. Do not create a competing send_sms action, workflow trigger, event system, or provider-specific workflow path.**

| | |
|---|---|
| Status | Preparation only. No provider, no credentials, no migration, no sending. |
| Authoritative contracts | `docs/workflow-automation-architecture.md`, `lib/workflows/` (Phase 1), migration `0020_workflow_automation_foundation.sql` (renumbered from 0017) |
| Scaffolding added | `lib/messaging/` (pure types + helpers + mock provider), `parseUsPhone` in `lib/leads/normalize.ts` |
| Tests | `tests/messaging.test.ts` (pure; no DB, no network, no Phase 2 runtime) |

---

## 1. Current communication architecture (audit)

| Area | What exists | Reuse for messaging |
|---|---|---|
| Email | Gmail OAuth (`lib/emails/gmail.ts`, `gmail_connections`, encrypted refresh token), durable outbox `lead_email_deliveries` with `claim_lead_email_deliveries()`, sender injected as `LeadEmailSender` (`lib/leads/notify.ts`), cron via `POST /api/funnels/deliver` + `FUNNEL_CRON_SECRET`. | **Pattern** reused (outbox row → lease → provider → finalize; injectable transport). Email itself stays separate — messaging never sends email and email never goes through `MessagingService`. |
| SMS / phone messaging | **None.** No provider, no credentials, no tables, no webhooks. Marketing copy mentions SMS only. | Everything below is new. |
| Inbound messages | **None.** Phase 1 reserves `message.received` (`needs_domain`). | Phase 3 supplies the domain. |
| Lead phone storage | `leads.phone` (raw) + `leads.phone_e164` (trigger-maintained via SQL `to_e164`, indexed). Consent: `leads.consent_granted/consent_at/consent_source/consent_disclosure`. | Lookup key for inbound matching; consent gate for sends. |
| Phone normalization | SQL `public.to_e164` (0005) plus **three** JS copies: `lib/leads/normalize.ts#normalizePhone` (canonical mirror), `lib/calls/import.ts#toE164` (+ `isPlausibleUsPhone`), `lib/funnels/ghl.ts#toE164`. | `parseUsPhone` was added next to `normalizePhone` (not a fourth copy). Consolidating the other two copies is a separate cleanup. |
| Tenant | `contractor_id` (NULL = HomeQuote); RLS helpers `is_admin()`, `is_staff()`, `auth_contractor_id()`, `lead_assigned_to_me()`; contractor owner/staff roles (0017 portal permissions). | Same tenant column and helpers; no organizations table. |
| Webhooks | Meta: HMAC-SHA256 over raw body + `timingSafeEqual` (`lib/integrations/meta.ts`); generic intake: Bearer secret (`lib/integrations/auth.ts`); cron: `equalSecret` (hash + timing-safe). Raw payloads are stored admin-only (`lead_intake_events.raw_payload`). | Same raw-body verification discipline, plus timestamp replay window. |
| Provider integrations | GoHighLevel/LeadConnector API v2 (Private Integration token per sub-account, `tokenEnv` in integration config), Calendly, Google Places, Gmail. `integrations` table holds non-secret config + admin-only `secret`. | LeadConnector is a candidate *later* adapter (contractors whose numbers live in GHL). Secret handling pattern reused. |
| Env pattern | Server-only secrets, never `NEXT_PUBLIC_`; documented in `.env.example`; features degrade safely when unset. | Same for messaging env vars. |
| Logging | Ids/codes only; `lib/applications/redact.ts`; Phase 1 `workflow_logs` rejects PII keys. | Never log phone numbers or bodies. |

## 2. Provider abstraction

```
workflow send_sms handler (Phase 2)      manual send (future UI)
            │                                   │
            └──────────► MessagingService ◄─────┘      ← the ONLY entry point
                         │ parse phone, resolve sender + tenant, consent,
                         │ opt-out, mode/allowlist, quiet hours, persist, idempotency
                         ▼
                 MessagingProvider adapter (one per provider, server-only)
                         │ translate + transport only
                         ▼
                 Telnyx | Twilio | Sendblue | LeadConnector | Mock
```

Types live in `lib/messaging/types.ts`:

- `MessagingService.sendMessage(SendMessageInput): Promise<SendMessageResult>`
  - input: `contractorId, leadId, channel, to, body, senderId?, initiatedBy, idempotencyKey, workflow?: {runId, stepRunId}, purpose, metadata`
  - result: `accepted {messageId, status, provider: ProviderMetadata, sentAt, replayed, cost}` | `suppressed {reason}` | `deferred {notBefore}` | `failed {error: {code, message, kind, retryAfterSeconds}}`
  - Names follow repo conventions: `contractorId` (not organizationId), `leadId` (leads are the contact record), `initiatedBy` (profiles.id), Phase 1's `ProviderMetadata` and `WorkflowErrorKind` are reused, not redefined.
- `MessagingProvider`: `name`, `capabilities`, `send()`, `verifyWebhook()`, `normalizeWebhook()`. One normalizer returns `inbound | delivery | ignored` because providers post both kinds to one endpoint.
- `MessagingProviderCapabilities`: channels, reportsCost, supportsIdempotencyKey, deliveryReceipts, carrierOptOut, maxBodyLength.
- Adapters do **no** DB access, tenant decisions, opt-out logic, or workflow imports. The workflow engine never imports an adapter.

`toWorkflowActionResult()` (`lib/messaging/workflow-result.ts`) maps a send result onto Phase 1's `WorkflowActionResult`:

| Messaging result | Workflow result |
|---|---|
| accepted | `success` (+ `provider.providerMessageId`) |
| suppressed: opted_out / no_consent | `skipped: no_consent` |
| suppressed: invalid_phone | `skipped: missing_contact` |
| suppressed: no_sender / tenant mismatch / disabled / not allowlisted / channel | `skipped: unavailable_action` |
| deferred (quiet hours) | `temporary_failure` code `quiet_hours`, `retryAfterSeconds` = until window opens |
| failed, temporary | `temporary_failure` (+ retry-after) |
| failed, permanent | `permanent_failure` |

A later carrier "undelivered" does not fail the finished step — it updates the message row.

## 3. Initial provider recommendation: Telnyx

The repo has no messaging provider, credentials or preference. **Telnyx** is recommended first:

- Low per-message cost and carrier-direct network; good for per-contractor cost reporting.
- Messaging Profiles map cleanly onto `messaging_senders` (one profile per tenant/number pool); number purchase via API for future per-contractor numbers.
- Webhooks are signed with **Ed25519** (`telnyx-signature-ed25519` + `telnyx-timestamp`, signed payload `${timestamp}|${rawBody}`) — public-key verification means no shared webhook secret to leak.
- Webhooks report parts and cost; statuses (`queued, sending, sent, delivered, delivery_unconfirmed, delivery_failed, sending_failed`) map cleanly (`PROVIDER_STATUS_MAPS.telnyx`).
- Built-in STOP handling on the carrier side (we still enforce locally).

Verify every provider detail above against current Telnyx docs when the adapter is written. Switching stays cheap: only the adapter and `messaging_senders.provider` change.

**Prerequisite for any US provider:** A2P 10DLC brand + campaign registration (or toll-free verification) before live traffic. This is a business/compliance task, not code.

Env vars Phase 3 will need (server-only, never `NEXT_PUBLIC_`, none added now):

| Var | Purpose |
|---|---|
| `MESSAGING_MODE` | `disabled` (default) \| `mock` \| `allowlist` \| `live` |
| `MESSAGING_TEST_ALLOWLIST` | comma-separated numbers for `allowlist` mode |
| `TELNYX_API_KEY` | send API |
| `TELNYX_PUBLIC_KEY` | Ed25519 webhook verification |
| `TELNYX_MESSAGING_PROFILE_ID` | default HomeQuote profile (per-contractor profiles live in `messaging_senders`) |

Later candidates: **LeadConnector** (contractors already running their numbers in GHL; reuse the existing Private Integration token pattern), **Twilio** (broadest ecosystem), **Sendblue** (iMessage).

## 4. Proposed data model (draft — NOT a migration)

Deliberately documented instead of migrated: it references `workflow_runs` / `workflow_step_runs` and must land after Phase 2 settles its runtime schema and migration numbering.

```sql
-- Sending identities: which number/profile a tenant sends from.
create table public.messaging_senders (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractors(id) on delete cascade,  -- NULL = HomeQuote
  provider text not null,                        -- 'telnyx' | 'mock' | ...
  channel text not null check (channel in ('sms','mms','whatsapp','imessage','rcs')),
  address text not null,                         -- E.164 for phone channels
  provider_profile_id text,                      -- never a secret
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider, channel, address)            -- inbound "to" resolves exactly one tenant
);
create unique index on public.messaging_senders (coalesce(contractor_id,'00000000-0000-0000-0000-000000000000'::uuid), channel)
  where is_default and is_active;

-- One thread per (sender identity, contact address, channel).
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractors(id) on delete cascade,  -- copied from sender by trigger
  sender_id uuid not null references public.messaging_senders(id),
  channel text not null,
  contact_address text not null,                 -- homeowner E.164
  lead_id uuid references public.leads(id) on delete set null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sender_id, channel, contact_address)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contractor_id uuid references public.contractors(id) on delete cascade,  -- copied from conversation by trigger
  lead_id uuid references public.leads(id) on delete set null,
  direction text not null check (direction in ('outbound','inbound')),
  channel text not null,
  from_address text not null, to_address text not null,
  body text not null,
  media_count integer not null default 0,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('queued','sent','delivered','undelivered','failed','suppressed','received')),
  suppression_reason text,
  error jsonb,                                   -- {code, message, kind}; no provider bodies
  segments integer, cost_amount numeric(10,5), cost_currency text, carrier_fee numeric(10,5),
  cost_source text check (cost_source in ('provider','estimated')),
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  workflow_step_run_id uuid references public.workflow_step_runs(id) on delete set null,
  initiated_by uuid references public.profiles(id) on delete set null,
  idempotency_key text,                          -- outbound only
  sent_at timestamptz, delivered_at timestamptz, failed_at timestamptz, received_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (idempotency_key),
  unique (provider, provider_message_id),
  check ((direction = 'outbound') = (idempotency_key is not null))
);

-- Append-only delivery receipts (duplicates collapse on the unique key).
create table public.message_delivery_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  provider text not null,
  provider_event_key text not null,              -- provider event id, else sha256(msg id|status|occurred_at)
  provider_status text not null,
  status text not null,
  occurred_at timestamptz not null,
  error jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_key)
);

-- Opt-out / re-opt-in state per (tenant, channel, number). Append-only history
-- lives in message rows; this is the current state the send path checks.
create table public.messaging_contact_states (
  contractor_id uuid references public.contractors(id) on delete cascade,
  channel text not null,
  address text not null,
  state text not null check (state in ('opted_out','subscribed')),
  source_message_id uuid references public.messages(id) on delete set null,
  changed_at timestamptz not null default now(),
  unique nulls not distinct (contractor_id, channel, address)
);
```

Notes:
- `channel` is text + CHECK so MMS/WhatsApp/iMessage/RCS need no rewrite; only SMS is enabled (`ENABLED_MESSAGING_CHANNELS`).
- Bodies are stored (needed for the future inbox and AI receptionist) but never copied into logs, events or `workflow_logs`.
- RLS (mirrors Phase 1): staff read all; contractor reads rows where `contractor_id = auth_contractor_id()` (never NULL/HomeQuote rows); **no** authenticated write policies — the service role writes, like every outbox. Senders are admin-managed.
- Tenant columns are copied by trigger from sender → conversation → message, never trusted from callers (same approach as `trg_workflow_runs_guard`).
- Contractor sends additionally require the lead to be assigned to that contractor (`lead_assignments`), exactly like Phase 1's run guard.

## 5. Tenant behavior

- Tenant = `contractor_id`; `NULL` = HomeQuote. No `organizationId`.
- **Outbound:** the sender must belong to the send's tenant (`sender_tenant_mismatch` otherwise). HomeQuote workflows send from HomeQuote senders; contractor workflows from that contractor's senders.
- **Inbound:** the `to` number resolves exactly one `messaging_senders` row → tenant. The lead match is scoped: a contractor sender only matches leads assigned to that contractor; a HomeQuote sender matches any active lead. So a reply to Contractor A's number can never attach to Contractor B's side of a shared lead.
- Opt-out is scoped per tenant + channel + number, matching how carriers apply STOP to a sender/recipient pair.

## 6. Phone normalization

- Canonical module: `lib/leads/normalize.ts`.
  - `normalizePhone` — best-effort, mirrors SQL `to_e164`, used for **matching** (`leads.phone_e164`).
  - `parseUsPhone` — **new**, strict NANP validation for numbers we may **send** to. Result is `{ok, e164}` or `{ok:false, reason: empty|not_us|invalid_length|invalid_area_code|invalid_exchange|fictional}`. A valid result always equals `normalizePhone(input)`, so send targets and stored lookups agree.
- Accepts `(310) 555-1212`, `310-555-1212`, `+1 310 555 1212`, `13105551212`. Rejects non-US, wrong length, N11/0/1 area codes, 0/1 exchanges, the 555-01xx fictional block.
- US-only for now. International support would switch `parseUsPhone` to a library (e.g. libphonenumber) behind the same function.
- `lib/messaging` re-exports these; it does not implement its own.

## 7. Outbound flow (future)

```
send_sms handler (Phase 2) ── builds SendMessageInput from the Phase 1 action context:
  contractorId = run tenant, leadId = run lead, body = rendered send_sms.body,
  idempotencyKey = step run idempotency key, workflow = {runId, stepRunId}
        │
MessagingService.sendMessage
  1. messages row exists for idempotencyKey?  → return it (replayed: true). Never resend.
  2. parseUsPhone(to)                          → suppressed: invalid_phone
  3. resolve sender for tenant/channel         → suppressed: no_sender / sender_tenant_mismatch
  4. leads.consent_granted                     → suppressed: no_consent
  5. messaging_contact_states = opted_out      → suppressed: opted_out
  6. resolveMessagingMode / allowlist          → suppressed: messaging_disabled / not_allowlisted
  7. quiet hours (respectQuietHours)           → deferred: notBefore
  8. INSERT messages (status queued, idempotency_key)  ← claims the send; unique key blocks a racing retry
  9. provider.send(...)
 10. UPDATE message: provider_message_id, status, sent_at, segments/cost | error
        │
toWorkflowActionResult(result) → Phase 1 WorkflowActionResult → Phase 2 records it
```

Suppressed sends are also persisted (status `suppressed`) so the audit trail shows why nothing went out.

## 8. Inbound flow (future)

```
POST /api/messaging/[provider]/webhook   (route handler, service role)
  1. read RAW body; provider.verifyWebhook  → 401 on failure (log reason only)
  2. provider.normalizeWebhook              → inbound | delivery | ignored
  3. inbound:
     a. resolve messaging_senders by (provider, channel, to)  → unknown: 200 + log 'unknown_sender', persist nothing
     b. tenant = sender.contractor_id
     c. lead = leads.phone_e164 = from, scoped to tenant (§5); may be null
     d. upsert conversation (sender, channel, from)
     e. INSERT messages ... ON CONFLICT (provider, provider_message_id) DO NOTHING  → duplicate: stop here, 200
     f. classifyInboundKeyword → update messaging_contact_states (opt-out/opt-in); HELP → info reply
     g. emit_workflow_event('message.received', ...)   ← Phase 1 entry point, same transaction as (e)
  4. respond 200 fast (providers retry non-2xx)
```

`message.received` uses the Phase 1 contract exactly:
- idempotency key `message.received|message:<messages.id>` (Phase 1 canonical ref `message:<messageId>`);
- `entity_type = 'message'`, `entity_id = messages.id`, `lead_id`, `contractor_id` = sender tenant, `actor_type = 'contact'`, `source = 'messaging:<provider>'`;
- payload `{ messageId, channel: 'sms', leadId, conversationId, hasBody }` — no body, no phone number.
- Opt-out/opt-in replies still emit `message.received` (workflows may exit on them); sending logic, not the event, enforces the opt-out.

Phase 1 contract changes Phase 3 will need (deliberate, per Phase 1 §17.7):
1. Flip `message.received` from `needs_domain` to `ready` once the tables exist.
2. `message.received` payload `channel` is `'sms' | 'email'`; add `mms`/`whatsapp`/`imessage`/`rcs` only when those channels ship.
3. `send_sms` availability `contract_only` → `ready` once a provider adapter + `live` mode exist.

## 9. Delivery status strategy

- Canonical statuses: `queued, sent, delivered, undelivered, failed` (+ `suppressed` for local blocks, `received` for inbound).
- Each adapter maps its vocabulary (`PROVIDER_STATUS_MAPS`); unknown statuses return `null` → logged and ignored, never guessed.
- `nextMessageStatus()` only moves forward; the first final status wins. Out-of-order or late callbacks never regress a message.
- Every callback is inserted into `message_delivery_events` (unique `(provider, provider_event_key)`), then the message is updated with `nextMessageStatus`. Duplicate callbacks are no-ops.
- A callback for an unknown `provider_message_id` (e.g. arrived before step 10 committed) is stored with `message_id` null and re-linked by a sweep.

## 10. Idempotency (builds on Phase 1, no new system)

| Risk | Guard |
|---|---|
| Workflow step retried | `messages.idempotency_key` UNIQUE = Phase 1 `workflow_step_runs.idempotency_key` (`<run>:<step>:<iteration>`). Retry finds the row → `replayed`, no provider call. |
| Crash between provider call and DB update | Row was inserted (`queued`) *before* the call. A retry sees a row without `provider_message_id`: **do not resend** (SMS favors at-most-once; a double text is worse than a missed one). Mark `failed` code `ambiguous_send` for human review, or reconcile via the provider's client-reference lookup when the adapter supports it. |
| Manual double-click | `manual:<uuid>` key generated once per click. |
| Duplicate inbound webhook | `messages (provider, provider_message_id)` UNIQUE; event key `message:<messages.id>` → one `message.received`. |
| Duplicate delivery callback | `message_delivery_events (provider, provider_event_key)` UNIQUE + forward-only status. |
| Duplicate workflow event | Phase 1 `emit_workflow_event` insert-or-return. |

## 11. Opt-out handling (technical guardrail only)

- `classifyInboundKeyword()` (`lib/messaging/opt-out.ts`):
  - exact keywords → opt-out: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, REVOKE (case/punctuation-insensitive);
  - natural-language revocations → opt-out ("stop texting me", "remove me", "don't text me") — the FCC's 2024 rule requires honoring "any reasonable means";
  - START / UNSTOP / YES → opt-in; HELP / INFO → help.
- `optStateAfterInbound()`: opt-in only re-subscribes someone **currently opted out** on that scope; `YES` never creates first-time consent (`leads.consent_granted` is the consent record).
- Scope: (tenant, channel, number). Checked in the send path **before** any provider call; `send_sms` → `skipped: no_consent`.
- Opted-out numbers receive one confirmation reply only if the provider doesn't already send it (Telnyx/Twilio do by default on registered campaigns — configure once, don't double-reply).
- **Not compliance by itself:** 10DLC registration, consent capture wording, quiet hours, record retention and legal review are still required.

## 12. Dev / safe test mode

`resolveMessagingMode(process.env)` (`lib/messaging/mode.ts`):

| Mode | Behavior |
|---|---|
| `disabled` (**default when unset**) | every send suppressed `messaging_disabled` |
| `mock` | `MockMessagingProvider` — in-memory, never touches the network; implements send/verify/normalize for end-to-end tests |
| `allowlist` | real provider, only to `MESSAGING_TEST_ALLOWLIST`; empty allowlist → disabled |
| `live` | real sends; **only honored when `VERCEL_ENV=production`** — elsewhere it downgrades to allowlist (or disabled) |

So a laptop, a preview deploy, or a copied `.env.local` can never text a homeowner.

## 13. Webhook security

- Verify signatures on the **raw body** before parsing (Telnyx Ed25519 public key; Twilio HMAC-SHA1; mock HMAC-SHA256). `safeEqual` for comparisons.
- Replay window: `isFreshTimestamp` (±300s) on the signed timestamp; beyond that, uniqueness on provider ids makes replays no-ops.
- Secrets server-only (`TELNYX_*`, never `NEXT_PUBLIC_`), read inside the adapter; never in `integrations.config`, never in logs.
- Respond 401 on bad signatures, 200 on everything verified (including duplicates and unknown senders) to stop provider retry storms.
- Tenant comes from the verified `to` number, never from a query param or body field the caller controls.
- Logs: codes + ids (`message_id`, `sender_id`, `provider_message_id`) only — no numbers, no bodies.
- Rate-limit the route per provider; verification failures are counted and alerted.

## 14. Cost / segment tracking

- `countSmsSegments()` (GSM-7 160/153, UCS-2 70/67, extension chars count double) estimates segments before sending — useful for template length warnings (curly quotes silently switch to UCS-2).
- `MessageCost {segments, amount, currency, carrierFee, source: provider|estimated}` is stored on `messages` (`segments, cost_amount, cost_currency, carrier_fee, cost_source`). Provider-reported cost overwrites estimates when the delivery callback arrives.
- Reporting later: `sum(cost_amount) group by contractor_id, date_trunc('month', created_at)`. No billing UI now; tie into `billing_events` only as a deliberate later decision.

## 15. Future provider & channel strategy

- New provider = one adapter implementing `MessagingProvider` + its `PROVIDER_STATUS_MAPS` entry + a `messaging_senders.provider` value. Nothing in workflows, events, templates or the service changes.
- New channel (MMS/WhatsApp/iMessage/RCS) = add it to `ENABLED_MESSAGING_CHANNELS`, the adapter's `capabilities.channels`, and (deliberately) the Phase 1 `message.received` payload channel list.
- Email is out of scope for `MessagingService`: one email sender (Gmail) remains.

## 16. What Phase 3 needs from Phase 2 (dependencies — no signatures guessed)

1. **The action-dispatch hook** where a `send_sms` handler is registered/invoked, and its final input shape.
2. From that context: workflow run id, step run id, the **step idempotency key**, run tenant (`contractor_id`), `lead_id`, triggering event, attempt number, `now`.
3. The **rendered** `send_sms.body` (merge fields resolved by the engine) or the agreed renderer to call.
4. Confirmation that Phase 1's `WorkflowActionResult` (success / skipped / temporary_failure + retryAfterSeconds / permanent_failure + ProviderMetadata) is recorded unchanged, and how `retryAfterSeconds` interacts with the attempt budget (quiet-hours deferrals should not exhaust retries — may need `max_attempts` headroom or a non-counting deferral).
5. **Dry-run semantics:** Phase 2 has a `dryRunWorkflowEvent`; a dry run must never reach `MessagingService.sendMessage` (or must pass a flag that forces suppression).
6. How the engine refuses to enable workflows containing `contract_only` actions, and the switch that will flip `send_sms` to `ready`.
7. Final migration numbering (there are currently two `0020_*` files) so the messaging migration can be numbered after it.
8. The engine's stance on events caused by workflow actions (`causationId`) so an auto-reply that triggers `message.received` cannot loop.

## 17. Blocked until Phase 2 lands (do NOT implement yet)

- The `send_sms` action handler and any registration with the engine.
- The messaging migration (FKs to `workflow_runs` / `workflow_step_runs`, numbering).
- `MessagingService` implementation (needs the tables).
- The Telnyx adapter's live `send()` and the webhook route (`/api/messaging/[provider]/webhook`).
- Emitting `message.received`; flipping `send_sms` / `message.received` availability.
- Any inbox UI, AI receptionist, or template/merge rendering for SMS.

## 18. Test plan

Done now (`tests/messaging.test.ts`, pure): phone normalization (valid/invalid, equals stored form), status precedence + provider mapping, opt-out/opt-in/help keywords incl. natural language, re-opt-in rules, segment counting, safe mode resolution (default disabled, live refused outside production, allowlist parsing), workflow result mapping to Phase 1 outcomes/skip reasons, mock provider send + idempotency + scripted failures, webhook signature/replay/missing/misconfigured, inbound + delivery normalization.

For implementation (after Phase 2), as DB tests in a rolled-back transaction like `tests/workflows-db.test.ts`:
- outbound persistence: suppressed rows, queued → provider id → sent; duplicate send protection (same idempotency key → one message, one provider call);
- workflow `send_sms` integration through the Phase 2 hook with the mock provider (success, skipped no_consent, invalid phone, missing contact, quiet-hours deferral, temporary vs permanent failure);
- inbound webhook: signature rejected, duplicate webhook → one message + one `message.received`, event envelope validates with `workflowEventSchema`;
- delivery updates: out-of-order, duplicate callbacks, unknown provider message id;
- STOP → opted_out → next send suppressed; START → re-subscribed; YES without prior opt-out → no change;
- tenant isolation: contractor A cannot read B's conversations/messages; reply to A's number never attaches to B's lead side; wrong contractor/sending number rejected;
- dry-run never calls the provider; `MESSAGING_MODE` unset → nothing sent.
