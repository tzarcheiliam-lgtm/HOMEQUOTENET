# HomeQuote lead funnels

Public experience: `/estimate/[slug]`. Admin reporting: `/app/funnels` (admin only).
The sample `/estimate/pool-remodeling-demo` is explicitly a demo. It stores progress
and submission timestamps (discarding contact PII) but never creates a homeowner lead, calls a CRM,
or confirms a real appointment. Do not send paid traffic to the demo.

## Live funnels

- `/estimate/pool-remodeling`: HomeQuote-owned ("house") pool funnel for LA &
  Ventura County ads. Config: `content/funnels/pool-remodeling.json`. Each
  submission creates an **unassigned lead in the HomeQuote Leads inbox**. Open the
  lead and assign it to one or more contractors (Distribution panel).

### House funnels and private sharing (migration 0013)

A funnel with no contractor is a house funnel. It reuses an existing active lead
with the same email/phone instead of creating inbox duplicates. The consent text
names "HomeQuote Network and the contractor partners it matches me with", so the
homeowner is told their request may be shared.

When a lead is assigned to several contractors, each contractor sees only their
own side: their assignment, appointments, estimates and sales (already
per-assignment), plus only their own company's notes and files. HomeQuote's
assignment/appointment/status entries are hidden from contractors; neutral staff
notes and system entries (e.g. "Website estimate request received") are shown.
Staff notes are visible to every assigned contractor, so don't mention other
contractors in notes. A non-exclusive assignment shows no badge.
Enforced by RLS (`activity_visible_to_contractor`, `upload_visible_to_contractor`);
covered by `tests/funnels-house-db.test.ts`.

Service areas can list exact `zipCodes` and/or 3-digit `zipPrefixes`. Outside the
area, the lead is still captured with `qualified = false` (unqualifiedAction
`review`).

## Architecture

- `lib/funnels/schema.ts`: Zod configuration/contact validation, conditional
  visibility, answer pruning, qualification and attribution. No niche logic in UI.
- `content/funnels/pool-demo.json`: the published demo configuration (with Full
  Remodel and Resurfacing branches).
- `content/funnels/templates/*.json`: starter configs for roofing, HVAC, fencing,
  kitchen, bathroom, general remodeling, ADU, landscaping, windows, solar and
  painting. Each has a niche service question, one branch, timeline, budget,
  homeowner and ZIP. Copy one, replace every `REPLACE_WITH_*` value, add the
  client's ZIPs, then validate and publish. Publishing refuses leftover placeholders
  or an empty ZIP list. A unit test keeps every template valid and completable.
- `components/funnels/funnel-experience.tsx`: one question per screen, answer cards,
  progress, Back, contact review, inline calendar, confirmation. Scoped CSS lives in
  `app/estimate/[slug]/funnel.css`; marketing and CRM themes remain separate.
- `app/api/funnels/[slug]/session`: session create/restore/progressive save/contact.
  Uses a 256-bit random token in an HttpOnly, SameSite cookie scoped to that funnel.
  Only its SHA-256 hash is stored. Sessions expire after 30 days. A copied session
  UUID does not authorize reads or writes. No contact PII is stored in localStorage.
- Every session snapshots the validated configuration; subsequent publishing
  changes do not change a visitor's questions midway through a session.
- The server validates allowed answers and steps and computes qualification.
  Conditional answers are removed when a changed earlier answer hides their branch.
  Optimistic versions and a database row lock prevent silent cross-tab overwrites.
- `save_funnel_session` atomically creates the lead, assignment, activity/intake
  records, contact/qualification events, and delivery job. It uses the existing
  HomeQuote tables and normalization function from migration 0005. This separate
  transactional entry point is necessary because the existing inbound intake
  function cannot atomically save a session and its contractor assignment.
- Existing contacts already assigned to the same contractor are reused. Their
  original attribution/history is preserved; a new activity records this request.
  Leads belonging only to another contractor are not reused, avoiding cross-client
  data disclosure. Email serialization and session locking protect retries.
- Assignments use an applicable existing pricing agreement, when configured.
  This funnel does not create billing events or alter existing sales/call history.
- CRM failures do not lose the captured HomeQuote lead: `funnel_deliveries` is a
  durable queue with leased claims, retries/backoff (up to eight attempts), and
  delivery state. Receivers must deduplicate `X-HomeQuote-Event-Id` because delivery
  is at least once. No provider response bodies/credentials are logged.

## Database and publishing

Migration: `supabase/migrations/0012_lead_funnels.sql` (additive).

New tables: `funnels`, `funnel_sessions`, `funnel_events`, `funnel_deliveries`,
`funnel_bookings`. These are configuration/measurement/transport records, not
duplicate client or lead systems. All have RLS. Only admins can inspect them;
public session access runs through token-checked server endpoints. Privileged
transaction/reporting functions are executable only by the service role.

Existing records reused: `contractors`, `verticals`, `integrations`, `leads`,
`lead_assignments`, `appointments`, `sales`, `lead_activities`, `lead_intake_events`.

Node 24 commands (server environment; never commit `.env.local`):

```powershell
# Validate in a rolled-back transaction, before first application
node --env-file=.env.local scripts/funnels.mjs check
node --env-file=.env.local scripts/funnels.mjs migrate
node --env-file=.env.local scripts/funnels.mjs demo

# Check a config offline (no database needed)
node scripts/funnels.mjs validate content/funnels/client.json

# Apply a migration (validate first with check)
node --env-file=.env.local scripts/funnels.mjs check supabase/migrations/0013_house_funnels_private_sharing.sql
node --env-file=.env.local scripts/funnels.mjs migrate supabase/migrations/0013_house_funnels_private_sharing.sql

# Publish a HomeQuote house funnel (leads go to the inbox, unassigned)
node --env-file=.env.local scripts/funnels.mjs publish content/funnels/pool-remodeling.json pool-remodeling house none

# Take a funnel offline (sessions/leads kept)
node --env-file=.env.local scripts/funnels.mjs unpublish pool-remodeling-demo

# Publish a real funnel using EXISTING contractor / integration / vertical UUIDs
node --env-file=.env.local scripts/funnels.mjs publish content/funnels/client.json client-slug CONTRACTOR_UUID INTEGRATION_UUID VERTICAL_UUID

# Change questions/branding/rules of an existing funnel (contractor/integration unchanged)
node --env-file=.env.local scripts/funnels.mjs update content/funnels/client.json client-slug
```

`integrationId` and `verticalId` are optional CLI arguments. Without an integration,
HomeQuote stores and assigns leads but no external delivery is attempted. A real
funnel requires a contractor. `publish` refuses to overwrite an existing slug; use `update` to change a live
funnel's config. In-progress sessions keep the config snapshot they started with.
`update` never changes the contractor/integration identity.

The config supports client name/logo, primary/secondary hex colors, industry,
explicit service-area ZIPs, questions/options, earlier-question `showWhen` rules,
qualification rules, qualified/review messages, `unqualifiedAction` (`review` or
`stop`), calendar URL/ID, thank-you copy, Meta pixel ID and optional factual trust
information. Do not add unverified testimonials, license numbers, ratings or claims.
Unknown JSON keys are stripped. Credentials and webhook URLs belong to the
server-only `integrations` record, never the public funnel configuration.
Brand colors must pass the schema's contrast check so text and buttons remain
readable; the default HomeQuote navy/blue palette passes.

Current operators: `equals`, `in`, `not_equals`; multiple conditions use AND.
Question types: single-choice cards and ZIP. One ZIP question is required. Branches
can reference only earlier questions, preventing cycles. More input types/operators
can be added to this versioned schema when the future builder needs them.

## GoHighLevel (direct API — recommended)

Submissions are sent straight to the GHL API v2 from the server (no Inbound
Webhook trigger needed). Code: `lib/funnels/ghl.ts`; settings (non-secret IDs):
`content/integrations/ghl-pool-masters.json`. For each submitted lead:

1. `POST /contacts/upsert` in the configured location: first/last name, email,
   E.164 phone, ZIP (standard postal code), source, mapped custom fields. GHL
   matches existing contacts by email/phone (the location has duplicate contacts
   disabled), so repeat submitters are updated, not duplicated.
2. `POST /contacts/{id}/tags` adds the configured tags (`pool-funnel`) without
   removing existing tags. Use a **Contact Tag added** workflow in GHL for follow-up.
3. Opportunity in the configured pipeline/stage: an existing open or won one is
   left alone, a lost/abandoned one is reopened into the stage, otherwise one is
   created. One opportunity per contact per pipeline.
4. `POST /contacts/{id}/notes`: every answer (incl. budget, which has no GHL field
   yet), qualification, UTMs, fbclid/gclid and landing page, plus the HomeQuote lead ID.

`onlyQualified: true` sends only qualified leads; others are marked `skipped` and
stay in the HomeQuote inbox. Custom field `map` translates funnel answers to exact
GHL picklist options; unmapped answers send the option label. Create more text
custom fields in GHL (e.g. Budget, UTM Campaign, fbclid), then add
`{ "id": "...", "from": "answers.budget" }` / `"attribution.utm_campaign"` / `"attribution.fbclid"`.

Credentials: a sub-account **Private Integration token** stored only in the
server env var named by `tokenEnv` (`GHL_POOL_MASTERS_TOKEN`), in `.env.local` and
Vercel. It is never in the database, repository or browser. Required scopes:
`contacts.write`, `contacts.readonly`, `opportunities.write`, `opportunities.readonly`,
plus `locations/customFields.readonly` for `ghl-check`.

Reliability: the lead is always saved in HomeQuote first. GHL delivery runs right
after submission through the durable `funnel_deliveries` queue; failures are
retried with backoff (up to 8 attempts, on the next submission or scheduled
`/api/funnels/deliver` call). Each step is idempotent, so retries don't duplicate
contacts or opportunities. `last_error` and the server log record only the failed
step and HTTP status (e.g. `GHL contact upsert failed (HTTP 401)`), never provider
bodies or PII. Successful rows store `external_contact_id`/`external_opportunity_id`.

```powershell
# After adding GHL_POOL_MASTERS_TOKEN to .env.local:
node --env-file=.env.local scripts/funnels.mjs ghl-check content/integrations/ghl-pool-masters.json
node --env-file=.env.local scripts/funnels.mjs ghl-connect content/integrations/ghl-pool-masters.json pool-remodeling
```

## GoHighLevel inbound webhook (legacy alternative)

Integrations whose config has `funnelWebhookUrl` (and no `api`) still receive the
signed JSON webhook: HMAC-SHA256 `X-HomeQuote-Signature`, stable
`X-HomeQuote-Event-Id`, allowlisted hosts via `FUNNEL_WEBHOOK_HOSTS`. GHL's
Inbound Webhook trigger requires a paid upgrade.

## GoHighLevel calendar booking callback

Single-contractor funnels with `calendarUrl`/`calendarId` can confirm bookings:
in a GHL appointment-booked workflow, POST to
`https://YOUR-HOMEQUOTE-DOMAIN/api/funnels/CLIENT-SLUG/booking` with
`Authorization: Bearer INTEGRATION_SECRET` and JSON `{ sessionId, appointmentId,
calendarId, scheduledAt }`. House funnels have no assignment, so no calendar.

## Environment variables

Existing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. Publishing/tests also use server-only `SUPABASE_DB_URL`.

New optional server-only variables:

- `FUNNEL_WEBHOOK_HOSTS`: comma-separated exact trusted HTTPS hostnames, default
  `services.leadconnectorhq.com`. Only administrator-controlled webhook destinations
  should be allowed. URL credentials/non-443 ports and redirects are refused.
- `FUNNEL_CRON_SECRET`: random shared secret for scheduled POST requests to
  `/api/funnels/deliver`, sent as `Authorization: Bearer ...`.
- `NEXT_DIST_DIR`: optional build-output location for isolated local QA, e.g.
  `.qa-screenshots/funnel-next`. Leave unset for normal `.next` builds/deployments.

Successful contact submissions attempt delivery after the response. Configure an
external scheduler to POST every few minutes so failed/abandoned deliveries retry
even when no new submissions arrive. No cron service was provisioned automatically.
After eight failures, fix configuration and reset the specific job's attempts,
status and available_at through admin SQL; do not recreate the lead.

## Analytics and tracking

`/app/funnels` shows a 30-day session cohort, distinct session stage counts,
stage-to-stage and landing-to-stage conversion, question views/completions/dropoff,
and failed/pending delivery counts. SQL aggregation avoids the Supabase default
row limit truncating reporting. Conditional question completion uses sessions that
actually saw that question. Active sessions can appear as dropoff until completed.
Use stable question IDs when editing configurations; historical renamed/removed
questions remain in events but currently require SQL to inspect separately.

First-party events: landing_view, session_started, step_viewed, step_completed,
contact_submitted, qualified, calendar_viewed, appointment_booked. One event per
session/name/question prevents reloading/back navigation inflating counts. Held
appointments and won sales are read from the existing HomeQuote outcome records.
Ad-click totals are intentionally unavailable until connected ad reporting exists;
a landing session is not reported as an ad click. Multiple request sessions for the
same assignment can share a later sale; session-level sales attribution is not a
unique-sale revenue report.

Attribution is captured once at session creation. UTM fields, fbclid, gclid, landing
origin/path, referrer origin/path and device category persist server-side. Unrelated
URL parameters and raw IP addresses are not stored. A daily IP hash supports a
basic 30-new-sessions/hour abuse limit; put production paid traffic behind the
hosting provider's WAF/rate limiting as well. Expired anonymous session/contact
data should be pruned under the operator's retention policy; no cleanup scheduler
is currently provisioned. Never remove linked leads to clean up session analytics.

Optional Meta browser mapping (only after advertising-measurement opt-in):
ViewContent on session, Lead after saved contact, Schedule only after verified
booking. Stable event IDs and local deduplication support later CAPI integration.
No PII is included in pixel/custom-event payloads. The code emits `hqn:funnel`
CustomEvents for an existing tracking host to observe; no existing global tracking
implementation was found in this repository. No pixel ID is configured for the demo.

## Verification

```powershell
node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/funnels.test.ts tests/funnel-ghl.test.ts tests/funnel-delivery.test.ts tests/funnels-db.test.ts tests/funnels-house-db.test.ts
npx tsc --noEmit
npm run lint
npm run build
# With a local dev server and the published demo:
node scripts/test-funnel-browser.mjs
# Controlled real contact API, calendar callback and admin report (synthetic fixtures):
node --env-file=.env.local scripts/test-funnel-integration.mjs
```

Database tests create synthetic contractors/leads within one transaction and
always roll back. Browser tests submit only synthetic contact details to the demo.
Screenshots go to ignored `.qa-screenshots/`. No real CRM sends or real calendar
appointments should be made until a client integration and controlled test are set up.
