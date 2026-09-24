# HomeQuote lead funnels

Public experience: `/estimate/[slug]`. Admin reporting: `/app/funnels` (admin only).
The sample `/estimate/pool-remodeling-demo` is explicitly a demo. It stores progress
and submission timestamps (discarding contact PII) but never creates a homeowner lead, calls a CRM,
or confirms a real appointment. Do not send paid traffic to the demo.

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

## GoHighLevel / webhook setup

1. Create a dedicated existing-style `integrations` row for the client (`provider`
   = `ghl`, `is_enabled` = true). Set `config.funnelWebhookUrl` to the client's GHL
   **Inbound Webhook** workflow URL. Put a random integration secret in `secret`.
   It remains in the server/admin-only integration record. Do not store secrets
   in a config JSON file committed to the repository.
2. Publish the funnel referencing that integration UUID. Set `calendarUrl` to the
   calendar's HTTPS embed URL and `calendarId` to its exact calendar identifier.
   The browser appends `hqn_session_id` to the embed URL, but do not assume GHL
   automatically saves arbitrary query parameters: explicitly map the session ID
   received in step 3 into a GHL contact custom field and verify that mapping.
3. The outgoing JSON contains `eventId`, `sessionId`, `clientId`, `funnel`, `leadId`,
   `contact`, `answers`, `attribution`, `qualified`, and `timestamp`. Map the contact
   fields to a Create/Update Contact action and preserve session ID and all
   qualification/attribution fields. Signature: `X-HomeQuote-Signature` is HMAC-SHA256
   over the exact JSON body using the integration secret. Event IDs remain stable
   across retries. Configure provider-side deduplication by eventId.
4. In a GHL appointment-booked workflow, add a **Custom Webhook** POST to
   `https://YOUR-HOMEQUOTE-DOMAIN/api/funnels/CLIENT-SLUG/booking`.
   Set `Authorization: Bearer YOUR_INTEGRATION_SECRET` and Content-Type JSON.
   Map actual GHL workflow fields to this body (values below are descriptive,
   not literal GHL merge-field syntax):

   ```json
   {
     "sessionId": "SAVED_HOMEQUOTE_SESSION_UUID",
     "appointmentId": "ACTUAL_GHL_APPOINTMENT_ID",
     "calendarId": "CONFIGURED_CALENDAR_ID",
     "scheduledAt": "2026-10-01T14:00:00-07:00"
   }
   ```

5. Test a real booking and callback in the client subaccount. The server checks
   the secret, integration, funnel, session, qualification, assignment, and calendar
   before creating an existing-model HomeQuote appointment. Provider appointment
   IDs deduplicate retries. The page polls for verified confirmation. It deliberately
   does not trust browser `postMessage` events or an iframe load as a booking.

Official references: [HighLevel custom webhook](https://help.gohighlevel.com/support/solutions/articles/155000003305/)
and [outbound appointment webhook context](https://help.gohighlevel.com/support/solutions/articles/155000003299).
Provider-specific reschedule/cancel sync is a future extension; current callback
is for initial booking only. Reusing a contact custom field across simultaneous
requests requires care: preserve the session for the actual appointment, not just
the latest contact value. This must be verified in the client's GHL workflow.

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
node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/funnels.test.ts tests/funnels-db.test.ts
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
