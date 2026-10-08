# HomeQuote Network — Technical Context

> Shared source of truth for Liam, Nadav, Claude Code, Codex, and future
> contributors. Written from direct inspection of the codebase on 2026-09-27
> (latest commit at time of writing: `7e83887`). Where this contradicts an
> older root doc (README.md, PROJECT_STATUS.md, CODEX_HANDOFF.md, FUNNELS.md,
> etc.), **this file and the actual code are correct** — those docs are kept
> for history but have drifted. Specific contradictions are called out in
> §13/§15.

---

## 1. Product Overview

HomeQuote Network is a contractor lead-generation operating system for home
services (pools, HVAC, roofing, fencing, general contractors, etc.):

- **Public marketing site** (`app/(marketing)/`) attracts contractors to a
  pay-per-qualified-lead offer, and separately runs **homeowner-facing lead
  funnels** (`/estimate/[slug]`) that capture and qualify project leads.
- **Internal CRM** (`app/app/*`) is where HomeQuote staff distribute leads to
  contractors, track the funnel (appointment → estimate → sale → billing),
  manage pricing agreements, and run a **cold-calling workspace** where
  partners (callers/setters) prospect contractor businesses by phone.
- A **workflow automation engine** (trigger → conditions → ordered steps) lets
  admins (and, per-step, contractors) automate lead/appointment/deal-driven
  actions: emails, tags, pipeline changes, webhooks, SMS (contract only, not
  wired to a live provider).
- A **Growth Tools** upsell system lets contractors request paid services
  (website, CRM setup, ad creative, etc.); admins price the request and the
  contractor pays via **Stripe Checkout**.
- The company's own cold-calling/sales-prospecting workflow (calling pool
  contractors to sign them up as HomeQuote partners) is a *separate* system
  from the homeowner lead pipeline — see §7 for why this matters.

## 2. Tech Stack

- **Next.js** `15.6.0-canary.59` (App Router, Turbopack dev), **React** 19.1.0
- **TypeScript** 5.8, strict-ish; **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **shadcn/ui**-style components (`components.json`, Radix UI primitives via
  `radix-ui` package, `lucide-react` icons)
- **Supabase**: Postgres + Auth + Row Level Security (`@supabase/ssr`,
  `@supabase/supabase-js`)
- **Stripe** (`stripe` npm package v22) for Growth Tools billing (Checkout
  Sessions + webhook), not for the core lead business
- **Zod** for all input/schema validation (funnels, workflows, billing forms,
  applications)
- **Vitest** for unit/integration tests (some hit a *real* Supabase DB inside
  rolled-back transactions — see §13), **Playwright** installed as a dev dep
- Deploys to **Vercel**; a durable workflow scheduler runs via **GitHub
  Actions** cron (`/api/workflows/tick` every 5 minutes), not Vercel Cron
  (chosen so it works on the Hobby plan and can't fail a deploy)
- Package name: `homequote-network`, version `0.1.0`, private

## 3. Repository Structure

```
app/
  (marketing)/        Public site: home, industry pages, /apply, /privacy, /terms
  api/                 Route handlers (see §4)
  app/                 The authenticated CRM (App Router, requires a profile)
  auth/, sign-in/, sign-up/, set-password/, forgot-password/, pending/
  estimate/[slug]/     Public homeowner lead funnel runtime
lib/
  actions/             'use server' Server Actions — one file per domain area
  auth.ts              getProfile/requireProfile/requireRole/requireCallWorkspace
  permissions.ts       Small pure RBAC predicates (see §5)
  nav.ts               NAV_ITEMS (single source for sidebar + role gating)
  types.ts             Hand-maintained TS types mirroring the DB schema
  supabase/            client.ts (browser), server.ts (SSR), admin.ts (service
                       role), middleware.ts (session refresh, used by middleware.ts)
  workflows/           The automation engine — domain, definitions, conditions,
                       evaluator, planner, runtime, actions, webhook safety (§10)
  emails/               Gmail send + two rendering paths: lib/emails/template.ts
                       (prospect follow-up, hand-built) and
                       lib/emails/template-library.ts (DB-backed template
                       library used by workflows + Calls > Emails)
  billing/              Stripe client, pricing/quote logic, webhook handler,
                       price-ready email (§12)
  funnels/               Funnel schema/validation, builder, delivery, GHL +
                       Calendly integrations, tracking (§9)
  calls/, leads/, prospecting/, growth/, integrations/, messaging/,
  applications/, outcomes/, validation/, data/   Domain-specific helpers,
                       largely paired 1:1 with an actions/ file and a
                       supabase table
components/            UI grouped by domain (billing, calls, contractors,
                       dashboard, emails, funnels, growth, integrations,
                       leads, marketing, team, workflows) + components/ui
                       (shared primitives: PageHeader, KpiCard, EmptyState,
                       StatusBadge, ConfirmAction, Table, Card, etc.)
supabase/migrations/    sequential SQL files (latest 0041, see §6, §19 and §21)
content/                Marketing copy/data (per-niche site content)
scripts/                Seeders, migration helpers, prospecting import, QA (§ below)
tests/                  Vitest suites: pure logic + live-DB suites (see §13)
docs/                   workflow-automation-architecture.md and similar design docs
middleware.ts           Delegates to lib/supabase/middleware.ts (session refresh)
```

## 4. Routes

### Marketing (public, `app/(marketing)/`)
`/` (home), `/pool-contractors`, `/hvac`, `/roofing`, `/fencing`,
`/general-contractors`, `/lead-standards`, `/apply` (contractor application
form), `/privacy`, `/terms`. Dark theme scoped to a `.hq` wrapper so it never
touches the CRM's light shadcn tokens. Copy lives in `content/` so a new
vertical/niche is a content file, not a rewrite (see MARKETING_SITE.md, still
broadly accurate).

### Public homeowner funnel
`/estimate/[slug]` — the visual funnel runtime (multi-step qualification form →
contact capture → calendar booking). Config-driven per funnel; see §9.

### Auth
`/sign-in`, `/sign-up`, `/forgot-password`, `/set-password`, `/pending`
(account exists but not yet activated by an admin), `/auth/callback` (Supabase
auth callback route handler).

### Internal CRM (`app/app/*`, all behind `requireProfile()`/`requireRole()`)
- `/app` — role-aware dashboard
- `/app/leads`, `/app/leads/new`, `/app/leads/[id]`, `/app/leads/[id]/edit`
- `/app/contractors`, `/app/contractors/new`, `/app/contractors/[id]`
- `/app/lead-recipients` — who qualified leads can be sent to (admin)
- `/app/calls`, `/app/calls/[id]`, `/app/calls/new`, `/app/calls/logs`,
  `/app/calls/appointments`, `/app/calls/emails` — the partner cold-calling
  workspace (admin/caller/setter only)
- `/app/appointments`, `/app/service-requests`
- `/app/growth`, `/app/growth/[service]` — Growth Tools catalog (contractor)
- `/app/sales`, `/app/billing`, `/app/analytics` (admin)
- `/app/pay/[id]` — the pay page a priced Growth Tools request links to (§12)
- `/app/funnels`, `/app/funnels/new`, `/app/funnels/[id]`,
  `/app/funnels/[id]/builder`, `/app/funnels/[id]/analytics` — no-code funnel
  builder (admin)
- `/app/workflows`, `/app/workflows/new`, `/app/workflows/[id]`,
  `/app/workflows/[id]/runs`, `/app/workflows/runs`,
  `/app/workflows/runs/[runId]` — automation builder + run history
- `/app/email-templates`, `/app/email-templates/new`,
  `/app/email-templates/[id]` — the reusable template library
- `/app/team`, `/app/team/new`, `/app/team/[id]` (admin)
- `/app/integrations`, `/app/integrations/meta` (admin)
- `/app/lead-intake`, `/app/audit` (admin)

### API (`app/api/**`, route handlers, not Server Actions)
- `POST /api/calls/refresh` — triggers a Refresh Prospects run (Google Places)
- `GET/POST /api/funnels/[slug]/session`, `POST /api/funnels/[slug]/booking` —
  funnel session state + booking confirmation callback
- `POST /api/funnels/deliver` — cron-style delivery worker for funnel-captured
  leads (Bearer `FUNNEL_CRON_SECRET`)
- `POST /api/integrations/[provider]/intake` — generic lead intake endpoint
  for connectors
- `POST /api/integrations/meta/webhook` — Meta (Facebook/Instagram) lead ads
  webhook, HMAC-verified
- `GET /api/integrations/gmail/oauth/start`, `GET
  /api/integrations/gmail/oauth/callback` — Gmail OAuth for the Calls > Emails
  sender identity
- `POST /api/stripe/webhook` — Stripe webhook (Checkout + subscription events)
- `POST /api/ai-calling/webhook` — Fish Audio post-call webhooks, signature-verified (§18)
- `POST /api/ai-calling/tick` — AI-calling scheduler gate (Bearer `AI_CALLING_CRON_SECRET`); does not dial yet (§18)
- `POST /api/workflows/tick` — the workflow scheduler tick (Bearer
  `WORKFLOW_CRON_SECRET`), called every 5 min by the GitHub Actions workflow
  `.github/workflows/workflow-tick.yml`

### middleware.ts
Tiny wrapper: every request except static assets goes through
`updateSession()` in `lib/supabase/middleware.ts`, which refreshes the
Supabase auth session cookie. It does **not** do role-based route gating —
that happens in `requireProfile`/`requireRole` inside layouts/pages/actions.

## 5. Roles & Permissions

Four roles in `public.user_role` (originally `admin`/`setter`/`contractor` in
`0001_initial_schema.sql`; `caller` added by
`0007_contractor_prospecting.sql` via `alter type ... add value`):

| Role | Purpose | Notes |
|---|---|---|
| `admin` | HomeQuote staff, full access | `isHqnAdministrator()` also checks `is_active` |
| `setter` | Appointment setter — five working sections (leads, contractors, calls, appointments, calling workspace) | No Automations/workflow access (explicit product decision, 2026-09-25 — nav, page guards and RLS all move together, see §15/memory) |
| `contractor` | Signed contractor; scoped to their own `contractor_id` | Has `contractor_role`: `owner` or `staff` (0017) — owners can manage their own team and export data if `can_export_company_data` |
| `caller` | Cold-calling partner, contractor-prospecting only | Never sees homeowner CRM; home path is `/app/calls` (`homePathFor()`) |

Enforcement is layered (see setter/RBAC memory note — "the four layers that
must move together"):
1. **`lib/nav.ts`** — `NAV_ITEMS[].roles` decides what's in the sidebar
2. **`lib/auth.ts`** — `requireRole([...])` / `requireCallWorkspace()` guard
   pages and layouts server-side (redirect to `/app` or `/sign-in`)
3. **`lib/permissions.ts`** — pure predicates used inside pages/actions:
   `isHqnAdministrator`, `isContractorOwner`, `isContractorStaff`,
   `canManageCompanyTeam`, `canManageRecipients`, `canManageDistribution`,
   `canPermanentlyDeleteLeads`, `canViewInternalNotes`,
   `canExportCompanyData`, `belongsToCompany`
4. **Postgres RLS** — the real boundary; every table has explicit `select`
   policies keyed off helper functions `public.is_admin()`,
   `public.is_staff()`, `public.is_call_agent()` (added 0011: `role in
   ('caller','setter')`), and `public.auth_contractor_id()`

`caller`/`setter` reads of `email_templates` were widened in
`0027_email_templates_call_workspace.sql` specifically so Calls > Emails could
use the shared template library — writes stayed admin-only.

## 6. Database & Supabase

Postgres via Supabase, RLS on every table, service-role bypass used only from
trusted server code (`lib/supabase/admin.ts`). 28 sequential migrations,
`0001` → `0028`, applied in order. **Naming collision to be aware of**: there
are two files both named `0027_*` — `0027_email_templates_call_workspace.sql`
and `0027_workflow_retention.sql`. Both are applied; the duplicate number is a
historical filename mistake, not evidence one didn't run. Before adding a new
migration, check the actual highest number present (currently 28) rather than
trusting any single number in prose.

Key schema areas, by migration:
- **0001** — core schema: `profiles`, `contractors`, `pricing_agreements`,
  `leads`, `lead_assignments`, `appointments`, `estimates`, `sales`,
  `billing_events`, roles `admin`/`setter`/`contractor`. Leads are many-to-many
  with contractors via `lead_assignments`; the sales funnel lives on the
  *assignment*, not the lead.
- **0002–0005** — outcomes/commission, team management, integration
  framework, hardening
- **0006** — `contractor_applications` (marketing site `/apply` form)
- **0007** — contractor prospecting: adds `caller` role,
  `contractor_prospects`, `prospect_call_attempts` (append-only),
  `prospect_sales_appointments` — the *cold-calling* system, deliberately
  distinct from homeowner `leads`/`appointments`
- **0008–0010** — prospect refresh (Google Places sourcing), prospect email
  logs, Gmail connection storage, HTML email bodies
- **0011** — setter call-workspace access + `is_call_agent()`
- **0012–0019** — lead funnels (schema, private/house sharing, GHL API
  delivery, Calendly bookings), lead review/distribution
  (`qualification_status`, `lead_recipients`), contractor portal permissions
  (`contractor_role`), contractor service requests, no-code funnel builder
- **0020** — workflow automation foundation (see §10)
- **0021** — Growth Tools upsells (`service_requests` service catalog)
- **0022–0023** — RLS fix (contractor activity visibility on shared leads),
  funnel status trigger fix
- **0024–0025** — workflow runtime + management UI support tables
- **0026** — `email_templates` + `email_template_sends` (reusable template
  library)
- **0027** (both files) — widen template-library read access to callers/setters;
  workflow run/event retention/pruning
- **0028** — Stripe billing columns on `service_requests`
  (`price_cents`/`price_interval`/`setup_fee_cents`/`payment_status`/
  `stripe_checkout_session_id`/`stripe_subscription_id`/`paid_at`), a
  `stripe_customer_id` on `contractors`, and a service-role-only
  `stripe_events` table for webhook idempotency

RLS conventions worth internalizing:
- Runtime/queue tables (`workflow_events`, `workflow_runs`,
  `workflow_step_runs`, `funnel_deliveries`, `lead_email_deliveries`,
  `stripe_events`) generally have **no write policies at all** — only the
  service role writes them, mirroring an outbox/queue pattern.
- `contractor_id IS NULL` is the recurring convention for "HomeQuote network
  level" (house funnels, network workflows, unassigned events) — visible only
  to staff, never to a contractor login.
- Several tables use Postgres triggers as a second guard beyond RLS/app
  checks (e.g. `guard_workflow_run()` enforces tenant/entity/event
  consistency at the DB layer, not just in TypeScript).

## 7. Prospecting / Calling System

This is **not** the homeowner lead funnel — it is HomeQuote's own outbound
sales motion for signing up contractor partners (mostly pool remodelers today).
Lives at `/app/calls` (admin/caller/setter).

- `contractor_prospects` — company_name, phone/website/email, location,
  primary_services, rating, `disposition` (new → calling → …→
  appointment_booked / not_interested / do_not_call), assignment
  (`assigned_to`/`assigned_at`/`assigned_by`), sourcing metadata
  (`niche`, `external_source`/`external_id` from Google Places, `maps_url`).
- `prospect_call_attempts` — append-only call log, tracks disposition
  transitions, callback/appointment times.
- `prospect_sales_appointments` — a sales call *with* a contractor prospect
  (status: scheduled/confirmed/rescheduled/completed/no_show/cancelled) —
  distinct from homeowner `appointments`.
- `prospect_email_logs` — one row per manually reviewed outbound email
  (Calls > Emails), finalized `sent` only after a Gmail provider message id
  comes back, or `failed` with the provider error; never marked sent on a
  failed request.
- `lib/prospecting/` — `catalog.ts` (niche/category catalog), `google-places.ts`
  (Places API v1 client), `run.ts` (Refresh Prospects run: dedupe, batching,
  assignment to active admin/caller profiles).
- `lib/calls/` — `rules.ts` (disposition/outcome rules, required fields per
  outcome, do-not-call enforcement), `metrics.ts` (caller metrics defined
  once), `import.ts` (CSV import via `scripts/import-prospects.ts`),
  `redirect.ts` (validated `?next=` handling for sign-in).
- Views in the UI are just filters over one table: My list / Liam's / Nadav's
  / All / New / Callbacks due / Interested / Booked / Do not call.
- `caller`/`admin` are the only assignable roles for prospects
  (`CALL_ASSIGNEE_ROLES`, shared by refresh, tabs, and manual assignment —
  history: this used to disagree between `lib/prospecting/run.ts` and
  `lib/data/prospects.ts` and caused a real assignment bug, fixed and covered
  by `tests/calls-callers.test.ts`).
- Manual email sending (`/app/calls/emails`) now uses the shared
  `lib/emails/template-library.ts` (as of `7e83887`), not a bespoke template;
  Gmail OAuth (`lib/emails/gmail.ts`, `gmail-message.ts`, `token-crypto.ts`
  for AES-256-GCM refresh-token encryption) is the only send transport.

## 8. Lead & Appointment Flow

Homeowner lead lifecycle (`Lead.status` in `lib/types.ts`): `new` →
`contact_attempted` → `qualified` → `assigned` → `appointment_set` →
`appointment_completed` → `estimate_sent` → `sold` / `lost` / `cancelled`.

- A lead is **never owned by one contractor** — it's distributed through
  `lead_assignments` (many-to-many); each assignment tracks its own
  `AssignmentStatus` funnel (assigned → accepted → contacted → qualified/
  not_qualified → appointment_set → appointment_held → estimate_given → sold
  / lost / returned).
- Qualification is two-layered: an automatic funnel check
  (`qualify()` in `lib/funnels/schema.ts`, based on service area + branching
  qualification rules) sets `qualified`/`qualified_at`, but
  `qualification_status` (`needs_qualification`/`qualified`/`not_qualified`,
  added 0016) is a **separate human-review gate** the automatic check never
  sets — a lead can pass the funnel's logic and still wait for staff review
  before distribution.
- Attribution is captured extensively: UTM params, platform/campaign/ad_set/
  ad ids, `external_lead_id`, `integration_id`, referrer, landing page.
- TCPA consent fields (`consent_granted`, `consent_at`, `consent_source`,
  `consent_disclosure`) are stored per lead.
- Distribution: `lead_recipients` (team_member or contractor) with
  `automatic_distribution_enabled`; `lead_email_deliveries` tracks
  new_lead_alert / qualified_lead / workflow_email sends with attempts/status.
- Monetization: `pricing_agreements` (contractor × vertical × model: per_lead
  / per_appointment / revenue_share / hybrid / subscription) drive
  `billing_events` (this is HomeQuote's outbound billing *to contractors* for
  leads/appointments — separate system from the inbound Stripe billing in
  §12, which is contractors paying HomeQuote for Growth Tools).
- Outcomes: `appointments` → `estimates` → `sales`, with commission
  calculation in `lib/outcomes/commission.ts`.
- Manual sales: admins can add sales by hand from `/app/sales` ("Add sale",
  `addManualSale` in `lib/actions/outcomes.ts`). These rows have
  `sales.is_manual = true`, no `assignment_id`, and carry their own
  `contractor_id` / `customer_name` / `source_label` / `vertical_label`
  (migration `0030_manual_sales.sql`). The dashboard breakdowns fall back to
  those labels; manual sales are listed (and deletable) on the Sales page.

## 9. Funnel / Form Builder

`lib/funnels/schema.ts` defines a Zod-validated `FunnelConfig`: branded
config (client name/logo/colors), industry, service-area (ZIP codes or ZIP
prefixes), an ordered list of branching `questions` (choice or zip type, with
`showWhen` conditions referencing earlier questions), `qualificationRules`,
qualified/review messaging, calendar integration (`ghl` embedded calendar or
`calendly` inline embed), thank-you page, optional SEO overrides, Meta pixel
id, and a `trust` block (rating, license, financing, warranty, years in
business, testimonial, photo — governed by the "no invented proof" compliance
stance, see §13/PROJECT_STATUS.md).

- **Question types** (`questionSchema.type` in `lib/funnels/schema.ts`): `choice` (multiple choice, the original), `zip` (exactly one per funnel), and typed-answer kinds `short_text`, `long_text`, `address`, `number`, `email`, `phone`. Typed questions take optional `placeholder` and `required` (unset = required, so old configs are unchanged). All answer validation goes through `validateAnswer()`, shared by the public form, the session PATCH route and the builder preview. Skipped optional questions are stored as `''` (use `isAnswered`, not truthiness). Answers stay in `funnel_sessions.answers` like every other answer; an `address` answer is also copied to `leads.address` on new-lead creation (migration `0029_funnel_address_question.sql`, `save_funnel_session`).
- **No-code builder** at `/app/funnels/[id]/builder` (admin) — `lib/funnels/
  builder.ts`, `components/funnels/builder/*`.
- **Runtime** at `/estimate/[slug]` — session state persisted server-side
  (`app/api/funnels/[slug]/session`), booking confirmed via
  `app/api/funnels/[slug]/booking`.
- **Delivery**: `lib/funnels/delivery.ts` + `POST /api/funnels/deliver`
  (cron-style, `FUNNEL_CRON_SECRET`) — turns captured leads into `leads` rows
  and/or forwards to GoHighLevel (`lib/funnels/ghl.ts`,
  `GHL_POOL_MASTERS_TOKEN`) per-funnel, plus Calendly booking verification
  (`lib/funnels/calendly.ts`, `CALENDLY_API_TOKEN`).
- **House vs. private funnels**: a "house" (HomeQuote-owned) funnel can share
  a lead with multiple partner contractors (0013); a contractor-specific
  funnel does not.
- Webhook targets for outbound CRM delivery are restricted to an explicit
  hostname allowlist (`FUNNEL_WEBHOOK_HOSTS`), separate from — and older/
  simpler than — the workflow engine's SSRF-hardened `postWebhook()` (§10).
- Analytics: `lib/funnels/analytics.ts` + `/app/funnels/[id]/analytics`.
- Live example funnels referenced in commit history: Pool Masters LA (GHL +
  Calendly), the HomeQuote house pool funnel (private multi-contractor
  sharing).
- **Calendar is not a stage in an array** — there is no funnel-stage list to
  add/remove entries from. Its presence is entirely computed from
  `config.calendarUrl` being set (`calendarProvider`/`calendarId`/
  `calendarHeadline` ride along). The builder (`components/funnels/builder/
  funnel-builder.tsx`) previously only rendered the "Calendar" sidebar button
  when `config.calendarUrl` was already truthy, so once removed there was no
  way back into the panel to re-add it short of creating a new funnel — that
  bug is fixed (2026-09-28): the sidebar entry now always renders (labeled
  "+ Add calendar step" when unset) and opens the same settings panel either
  way. No migration was needed since nothing about storage changed.

### 9b. Pool Masters: hard California service-area gate + Meta ad attribution (2026-10-01, migration 0034)

- **Service area**: `serviceArea.strictStates` (new optional field on `FunnelConfig.serviceArea`, default `[]`, currently only `'CA'` is a valid value) is a hard, state-level gate independent of and broader than the existing radius-style `zipCodes`/`zipPrefixes`. ZIP → state resolution is `lib/location/us-zip.ts` `usZipState()`, USPS ZIP3-prefix based (900–961 = California), not a "starts with 9" check. `lib/funnels/schema.ts` `serviceAreaValid(config, zip)` is the predicate; `qualify()` now ANDs it in, so an out-of-state ZIP automatically makes `qualified = false` — which automatically blocks Calendly (`record_calendly_booking` already required `qualified = true`) and keeps the existing `unqualifiedAction: 'review'` default so the lead is still saved (not a hard stop) for wasted-traffic analysis. `leads.service_area_valid` (nullable boolean, null = funnel has no gate) and `qualification_status = 'out_of_service_area'` (new enum value, set only on a real gate failure) are the storage/labeling layer, independent of `qualified`, computed server-side in `app/api/funnels/[slug]/session/route.ts` and passed into `save_funnel_session` as `p_service_area_valid`. Only Pool Masters (`content/funnels/clients/pool-masters-la.json`) sets `strictStates: ['CA']` today; every other funnel is unaffected (field defaults empty).
- **Meta ad attribution**: `captureAttribution()` now also parses `campaign_id`/`campaign_name`/`adset_id`/`adset_name`/`ad_id`/`ad_name`/`placement`/`site_source_name` from the landing URL (Meta's dynamic URL parameter macros, configured in Ads Manager's per-ad "URL parameters" field — not a new Pixel). `save_funnel_session` now populates the website-funnel-created lead's existing `campaign`/`campaign_id`/`ad_set`/`ad_set_id`/`ad_name`/`ad_id` columns from this (previously only the native Meta Lead Ads intake path, `lib/integrations/intake.ts`, populated them) plus two new columns, `leads.placement` and `leads.fbclid`.
- **Meta Conversions API**: `lib/meta/capi.ts` (server-only), gated on `META_CONVERSIONS_API_TOKEN` (new env var, server-only, silent no-op if unset). Fires `Lead` (session route, `body.contact` branch, gated on `areaValid !== false`, never on full `qualified` — i.e. it still fires for an in-area lead that fails an unrelated qualification rule like "not the homeowner") and `Schedule` (session route, `calendlyBooking` branch, after `record_calendly_booking` succeeds — the same "booking confirmed" bar the rest of the app uses). Both reuse the exact client-side event_id formula from `lib/funnels/tracking.ts` (`${sessionId}:${event}`) for Meta-side deduplication against the existing browser Pixel event — no new ID scheme. `_fbc` is read from the `_fbc` cookie when present, else constructed server-side from a real `fbclid` per Meta's documented format (never invented when neither exists).
- **Known discrepancy found, not fixed**: the three active Pool Masters ads' own Meta Pixel/dataset setting in Ads Manager is `2057270381542607` ("Your Meta Pixel is not active" warning, no events in 7 days), while the funnel config's `trackingPixels.metaPixelId` (used by both the browser Pixel and this CAPI integration) is `933962709362966`. These may need reconciling — not changed here since the task's explicit restriction was "do not change... conversion event."
- **Migration status confirmed (2026-10-02)**: `tests/funnel-matching-db.test.ts` (0036's conservative-matching assertions) and the new `tests/funnel-meta-attribution-db.test.ts` both pass against the configured `SUPABASE_DB_URL`, which confirms migrations 0034/0035/0036 are applied there — `docs/meta-lead-ads-setup.md`'s "not deployed" banner predates this and should be read as stale for that environment; app-code deployment to Vercel itself is still unverified from this session.
- **Lead detail page** (`app/app/leads/[id]/page.tsx`, Attribution card, staff-only): now also shows `Campaign ID`/`Ad set ID`/`Ad ID`/`Facebook click ID (fbclid)` alongside the existing readable names, so a lead can be matched to the exact ad in Ads Manager. Every field in that card falls back to the literal string "Unknown" (via `displayValue`) instead of a blank dash, so missing attribution is never ambiguous with "not provided."
- **End-to-end attribution test**: `tests/funnel-meta-attribution-db.test.ts` (DB test, skipped without `SUPABASE_DB_URL`) builds a real landing URL with Meta's dynamic macros already substituted, runs it through `captureAttribution()`, submits a quote through `save_funnel_session`, and reloads the resulting `leads` row to assert every campaign/ad set/ad field round-trips; also asserts a direct (non-ad) visit leaves those fields `null` (never guessed), and that a later, separate inquiry from the same person gets its own attribution without touching the original lead's.
- **Exact Meta "URL Parameters" string** (paste once per ad, not per campaign/ad set — Ads Manager → Ads tab → select the ad → Edit → **Tracking** section → **URL Parameters** field, *not* the Website URL field):
  `utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&campaign_id={{campaign.id}}&campaign_name={{campaign.name}}&adset_id={{adset.id}}&adset_name={{adset.name}}&ad_id={{ad.id}}&ad_name={{ad.name}}&placement={{placement}}&site_source_name={{site_source_name}}`
  `fbclid` is appended by Meta automatically and needs no manual macro. These exact key names match `ATTRIBUTION_PARAMS` in `lib/funnels/schema.ts` — renaming a key on either side silently breaks capture.

### 9a. Pool Masters LA homeowner acknowledgment email (2026-09-28)

The Pool Masters LA funnel (`/estimate/pool-masters-la`, contractor-routed,
not house) automatically emails the homeowner a "request received"
acknowledgment right after a successful submission — explicitly **not** an
appointment confirmation (that copy is reserved for when the CRM has a real
confirmed booking). Built entirely on existing infrastructure, no new email
system and no migration:
- **Template**: `email_templates` row `pool_masters_homeowner_request_received`
  (`lib/emails/template-library.ts`), admin-only (`contractor_visible:
  false`), category `Homeowner Follow-Up`. Kept as its own distinct key
  rather than folded into the general `homeowner_new_lead_confirmation`
  template, since `email_templates` has no per-client scoping column.
- **Trigger**: a `lead.created` workflow (`lib/workflows/`) scoped two ways
  for isolation from every other funnel — `contractor_id` = Pool Masters'
  own contractor row (tenancy already restricts a contractor-owned workflow
  to its own events), and a belt-and-suspenders condition on
  `event.payload.funnelSlug equals 'pool-masters-la'` (the event payload
  already carries `funnelSlug`, set by `emit_lead_workflow_events()` in
  `0024_workflow_runtime.sql` from `leads.consent_source = 'funnel:<slug>'`).
  One `send_email` step, `to: { kind: 'lead' }`, referencing the template
  above by id.
- **Dedup / no double-send**: entirely existing machinery — `emit_workflow_event`
  idempotency key `lead.created|lead:<id>` (one event per lead row, not per
  submission attempt), `workflow_runs` unique `(workflow_id, trigger_event_id)`
  with `reentry_policy = once_per_event`, and `lead_email_deliveries`' unique
  index on `(workflow_step_run_id, recipient_email)`. A retried/duplicate
  contact POST never reaches the lead-creation path a second time either —
  `app/api/funnels/[slug]/session/route.ts` short-circuits once
  `contact_submitted_at` is already set.
- **Failure isolation**: `send_email` failures never block lead creation —
  they only fail the workflow step (retried, visible in
  `/app/workflows/[id]/runs`), which runs after the lead row already exists.
- **First-name fallback**: `lib/emails/variables.ts` `renderEmailTemplate` was
  fixed (2026-09-28) to close whitespace/punctuation gaps left by an empty
  merge field ("Hi ," -> "Hi,"), mirroring the cleanup `lib/workflows/merge.ts`
  already did for workflow message rendering. This applies to every
  template, not just this one.
- **Setup script**: `scripts/seed-pool-masters-ack-workflow.mjs` creates and
  enables the workflow (idempotent; run after `scripts/seed-email-templates.ts`).
  It writes directly to `workflows`/`workflow_steps` (like
  `scripts/funnels.mjs publish`) because `create_workflow_definition()` is a
  SECURITY DEFINER RPC gated on an authenticated admin session
  (`is_admin()` via `auth.uid()`), which a service-role script never has —
  **run by a person with `SUPABASE_DB_URL`, not automation. Not yet run
  against production as of this writing**; until it is, Part 1 above ships
  in code but the workflow row does not exist live.

## 10. Workflow Automations

A general trigger → conditions → ordered-steps automation engine, built in
Phases 1–5 (see §15 for the commit trail) and hardened for production in
`a2bb664`. Source of truth doc: `docs/workflow-automation-architecture.md`.

**Shape**: `workflow_events` (canonical idempotent domain-event ledger + fan-
out queue) → `workflows` (trigger + conditions + policies, versioned) →
`workflow_steps` (ordered, tree-capable: action or branch) → `workflow_runs`
(one execution of one workflow for one event, with a `definition_snapshot` so
live runs are unaffected by later edits) → `workflow_step_runs` (per-step
execution/retry state) → `workflow_logs` (append-only, ids/codes only, no PII
or secrets by design).

- **Triggers** (`trigger_type`): `lead.created`, `lead.status_changed`,
  `lead.qualification_changed`, `lead.assigned`, `assignment.status_changed`,
  `appointment.booked/cancelled/completed/no_show`, `estimate.sent`,
  `deal.won`, `deal.lost`, `task.completed`, `message.received`.
- **Actions** (`action_type`): `send_sms`, `send_email`, `assign_user`,
  `change_pipeline_stage`, `create_task`, `add_tag`, `remove_tag`, `wait`,
  `send_webhook`, `notify_team`, `create_calendar_event`, `stop_workflow`.
- **Availability contract** (`lib/workflows/domain.ts`): every trigger/action/
  field is tagged `ready` (fully wired), `contract_only` (shape final, no
  live provider — this is where `send_sms` sits: `lib/messaging/` has a
  contract, mock provider, opt-out/segment logic, but no live SMS provider is
  connected), or `needs_domain` (no backing table yet — tasks, tags, lead
  owner, inbound messages). The engine refuses to **enable** a workflow using
  anything not `ready`.
- **Tenancy**: `contractor_id = NULL` means a HomeQuote/network-level
  workflow (sees every event, staff-only); a contractor's own workflow only
  sees its own events. Enforced in the DB by trigger
  (`guard_workflow_run()`), not just in application code — a contractor
  workflow literally cannot attach to another contractor's event.
- **Idempotency has three layers**: `workflow_events.idempotency_key`
  (unique — same webhook/retry/refresh maps to the same event row),
  `workflow_runs` unique `(workflow_id, trigger_event_id)` plus a
  `dedupe_key`/`concurrency_key` for `reentry_policy` (`once_per_event` /
  `once_per_entity` / `one_active_per_entity`), and
  `workflow_step_runs.idempotency_key` (`<run>:<step>:<iteration>`) passed to
  every side-effecting handler so a retried step never double-sends.
- **Scheduler**: `processWorkflowTick()` in `lib/workflows/runtime.server.ts`,
  invoked by `POST /api/workflows/tick` (Bearer `WORKFLOW_CRON_SECRET`),
  called every 5 minutes by GitHub Actions (`.github/workflows/
  workflow-tick.yml`) — chosen over Vercel Cron because Vercel Hobby only
  allows daily crons and a scheduler failure must never fail a deploy. Due
  runs are found via `resume_at`/lease (`locked_by`/`locked_until`) so no
  in-process `setTimeout` is used — restart-safe.
- **Retention/pruning**: `pruneWorkflowHistory()` runs on every tick
  alongside `processWorkflowTick()` (added in `0027_workflow_retention.sql` +
  `a2bb664`) — this closes out what the project memory called "still open."
- **SSRF protection on `send_webhook`** (`lib/workflows/webhook-safety.server.ts`)
  is fully implemented: HTTPS-only, credential-in-URL rejected, blocks
  loopback/private/link-local/CGNAT/metadata/multicast/reserved ranges (IPv4
  and IPv6, including IPv4-mapped/NAT64 embedded addresses), a custom DNS
  `lookup` re-validates every resolved address **at connection time** (not
  just pre-check) to defeat DNS rebinding, and redirects are never followed.
  This closes out the other "still open" item from the project memory note —
  **the webhook SSRF hookup is done**, not open.
- **Email rendering**: workflow `send_email` steps can reference a saved
  `email_templates` row by id (`workflow_steps.action_config->>'templateId'`)
  instead of inline subject/body — this is the "second email renderer" that
  the memory note flagged as open; it now exists as
  `lib/emails/template-library.ts` (29KB, built in `f3b50e1`) and is also used
  directly from Calls > Emails (`7e83887`). Delivery still goes through the
  single existing Gmail connection (`lib/emails/gmail.ts`) — there is no
  second send transport, only a second template/rendering source.
- **UI**: `/app/workflows` (list + create), `/app/workflows/[id]` (builder,
  `components/workflows/workflow-builder.tsx`, `create-workflow-form.tsx`,
  `dry-run-panel.tsx` for testing a workflow against a simulated event),
  `/app/workflows/[id]/runs` and `/app/workflows/runs/[runId]` (history/debug).
- **Health check script**: `scripts/workflow-health.mjs`.
- **Visual-builder run history** (graph-engine runs only): `/app/workflows/runs` (all runs),
  `/app/workflows/[id]/runs` and `/app/workflows/runs/[runId]` render `components/workflows/runs/*`
  (`RunList`, `RunDetailView`) when `getGraphWorkflow` / `getGraphRun` return data, else fall back to the
  legacy pages. Detail shows the pinned graph with a `buildRunOverlay` path, a step timeline, Related
  and (admin-only) Activity log. Cancel / Retry buttons show only when `caps.edit(run.contractorId)`;
  AI-call record links are admin-only. Tests: `tests/workflow-run-views.test.tsx`.

## 11. Integrations

- **Meta (Facebook/Instagram) Lead Ads** — `lib/integrations/meta.ts`,
  webhook at `app/api/integrations/meta/webhook`, HMAC-signature verified
  (`tests/meta-signature.test.ts`). Settings UI at `/app/integrations/meta`.
  Hardened (migration 0035, NOT yet applied to production as of this edit): the webhook
  returns 5xx when Graph retrieval fails so Meta redelivers (never acknowledges a lead it
  couldn't fetch); the token travels in the Authorization header; secrets resolve from env
  (`META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`,
  `META_GRAPH_VERSION`) before the admin-only `integrations` row; only the configured Page's
  leads are imported; `ingestLead` is idempotent on `(integration_id, external_lead_id)`
  (unique index `uq_leads_meta_external`); contact matching is conservative (both email+phone,
  or one + compatible name; otherwise a new lead flagged "possible duplicate"); custom answers
  land in `leads.answers` and map to `timeline`/`budget_range`/`project_description`.
  Tests: `meta-leadgen`, `meta-webhook-route`, `meta-intake-matching`.
  Website leads: `leads.fbp`/`fbc` are stored write-once at contact submit (`lib/meta/lead-ids.ts`,
  migration 0035) and reused by the server Schedule event; `META_TEST_EVENT_CODE` (temporary!) ALSO shows
  server events in Meta's Test Events - but Meta documents that test-coded events still feed the dataset (not a sandbox). Setup + test checklist: `docs/meta-lead-ads-setup.md`;
  duplicate-id pre-check: `supabase/scripts/meta-duplicate-leads.sql`.
  Migration 0036 (NOT applied yet): `funnel_sessions.measurement_allowed` persists the visitor's advertising-measurement choice;
  the session route gates every server Meta event and fbp/fbc storage on it (default per `consentMode` when never recorded; fails
  safe if the write fails). `save_funnel_session` contact matching is now conservative: reuse only on same email+phone (or one + same
  first name), open lead, <30 days, identical answers; otherwise a new lead flagged "possible duplicate" (never merged/modified).
  Tests: `funnel-session-meta` (runs), `funnel-matching-db` (needs SUPABASE_DB_URL on a disposable DB; not run yet).
  **QualifiedLead (2026-10-06)**: `lib/meta/qualified.ts`, fired from `updateQualification` only on a real transition INTO
  `qualification_status='qualified'` by a person (not funnel rules, not AI calls). Gates: website funnel lead, non-demo, pixel set,
  Meta signal on lead (fbc/fbp/fbclid/ad_id), stored measurement choice, qualified_at <7 days old and after lead creation.
  event_id `${sessionId}:QualifiedLead`, event_time = qualified_at, no IP/UA (not stored). No local sent-marker (no migration):
  re-qualifying within 7 days resends the same event_id. It optimizes nothing until a custom conversion is built on it in Events
  Manager. `sendMetaEvent` now logs `events_received`/`fbtrace_id` or the Meta error; Graph version = `META_GRAPH_VERSION` (default v26.0).
  Existing Lead/Schedule CAPI events (`lib/meta/capi.ts`) are WEB conversion events
  (`action_source: website`) — they are NOT Meta's CRM "Qualified Leads" events.
- **Generic lead intake** — `app/api/integrations/[provider]/intake`,
  `lib/integrations/intake.ts`, authenticated per-integration
  (`tests/intake-auth.test.ts`), logs every attempt to `lead_intake_events`
  (received/created/duplicate/error) before creating a `Lead`.
- **Google Places API (New)** — prospect sourcing (`GOOGLE_PLACES_API_KEY`);
  degrades gracefully (explains what's missing, invents nothing) if unset.
- **Gmail (OAuth)** — the single outbound email transport for both the Calls
  workspace and (indirectly, for now) the email template library; refresh
  tokens are AES-256-GCM encrypted at rest (`GMAIL_TOKEN_ENCRYPTION_KEY`).
- **GoHighLevel (GHL)** — per-funnel Private Integration token
  (`GHL_POOL_MASTERS_TOKEN`) for lead delivery to a contractor's own CRM.
- **Calendly** — booking verification/appointment time capture for funnels
  configured with `calendarProvider: 'calendly'` (`CALENDLY_API_TOKEN`).
- **Stripe** — see §12. Distinct integration surface from the above; it is
  inbound (contractor → HomeQuote), not lead delivery.
- **SMS/messaging** — `lib/messaging/` has a full contract (types, mock
  provider, opt-out handling, segment logic, webhook-result shape) but is
  `contract_only`: no live SMS provider is connected.
  `MESSAGING_MODE`/`MESSAGING_TEST_ALLOWLIST` env-gate it, and `mode='live'`
  is refused outside `VERCEL_ENV=production` so a copied `.env` can't
  accidentally text a real homeowner.

## 12. Billing

Two **separate** billing systems in this codebase — do not conflate them:

1. **HomeQuote → contractor** (outbound, non-Stripe): `pricing_agreements` +
   `billing_events` (per_lead/per_appointment/revenue_share/hybrid/
   subscription) — how HomeQuote charges contractors for leads/appointments.
   This predates Stripe integration and has no payment processor attached in
   the code (manual/invoiced, per `BillingStatus`: pending/invoiced/paid/
   void/overdue/waived).
2. **Contractor → HomeQuote, Growth Tools** (inbound, Stripe): built very
   recently (`60e6422` → `7e83887`). Flow:
   - Contractor requests a Growth Tools service (`/app/growth`) →
     `service_requests` row (`status: new`).
   - Admin sets a price (`setServiceRequestPrice` in `lib/actions/billing.ts`,
     `/app/service-requests`) — one-time or monthly, optional setup fee
     (setup fee only valid with monthly). Writing a price is blocked once the
     request is already paid/in-progress (`PRICE_LOCKED_STATUSES`). Setting a
     new price expires any unfinished Stripe Checkout Session for the old one.
   - Optionally emails the contractor a "price ready" email
     (`lib/billing/price-email.ts`) linking to `payPageUrl(requestId)` =
     `/app/pay/[id]`.
   - Contractor opens `/app/pay/[id]` (any signed-in contractor of that
     company can pay — `components/billing/pay-view.tsx`,
     `pay-buttons.tsx`) and pays via a **Stripe Checkout Session**
     (`lib/billing/pricing.ts` `checkoutLineItems()` builds line items
     server-side from the DB row — amounts are never trusted from the
     browser). Managed Payments was explicitly turned **off** on this
     Checkout flow (`b6c2e75`).
   - `POST /api/stripe/webhook` verifies `Stripe-Signature` against
     `STRIPE_WEBHOOK_SECRET`, claims the event id in `stripe_events` (insert,
     unique-violation = duplicate = no-op — real idempotency, not just a
     signature check), then `handleStripeEvent()`
     (`lib/billing/webhook.ts`) updates `service_requests.payment_status`
     from `checkout.session.completed/async_payment_succeeded/
     async_payment_failed/expired` and `customer.subscription.
     created/updated/deleted`. Out-of-order events are handled explicitly
     (a late "still processing" event never overwrites an already-confirmed
     `paid`/`active` status). On handler failure the event is released so
     Stripe retries (returns 500), never silently swallowed.
   - `payment_status` state machine: `none` → `awaiting_payment` →
     (`processing` | `paid` | `active` | `past_due` | `canceled` | `failed`).
     Payment moves an untouched request (`new`/`contacted`) straight to
     `in_progress`.
   - Stripe customer id cached per contractor (`contractors.stripe_customer_id`,
     unique, admin-write-only column via existing RLS on `contractors`).
   - **Gap**: `.env.example` does **not** list `STRIPE_SECRET_KEY` or
     `STRIPE_WEBHOOK_SECRET` even though `lib/billing/stripe.ts` and
     `app/api/stripe/webhook/route.ts` require them — this should be added to
     `.env.example` (names only) in a follow-up; not fixed as part of this
     inspection since changing files beyond this doc was out of scope.

## 13. Current Known Issues

- **`.env.example` is missing Stripe variables** (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`) despite the billing feature depending on them —
  see §12.
- **Duplicate migration number**: two files are both named `0027_*`
  (`0027_email_templates_call_workspace.sql`,
  `0027_workflow_retention.sql`). Both are applied and safe, but the naming
  is a footgun for anyone assuming filenames are unique — check actual file
  contents/highest number, not just the prefix, before adding `0029`.
- **`supabase_migrations.schema_migrations` is out of sync with the live schema**
  (found 2026-09-28): `0020`, `0024`, `0025`, `0026`, `0027` (both), and `0029`
  are **not** recorded as applied, even though their tables/functions/columns
  demonstrably exist and work in production (verified directly: `pg_proc`
  shows `create_workflow_definition`, `save_workflow_definition`,
  `set_workflow_enabled`, `workflow_replace_steps`, `emit_workflow_event`,
  `claim_workflow_events`, `claim_workflow_runs` all present with correct
  grants). Only `0001–0019, 0021–0023, 0028` are tracked. Likely cause: these
  were applied by running the `.sql` file directly rather than through
  `scripts/funnels.mjs migrate` / `scripts/apply-migrations.mjs`, which are
  what insert the tracking row. Not yet reconciled — anyone trusting that
  table to answer "is X applied?" will get a wrong answer for these six.
- **Workflow edit/toggle/duplicate/archive actions crashed to a generic
  "Action not allowed" page on any unexpected error** (fixed 2026-09-28,
  `lib/actions/workflows.ts` + `app/app/workflows/[id]/page.tsx`).
  `toggleWorkflowAction`, `duplicateWorkflowAction`, and
  `archiveWorkflowAction` had no `try/catch` at all (unlike
  `saveWorkflowAction`, which already handled this correctly) — any thrown
  error (including `getWorkflow()`'s own `throw new Error('Workflow steps are
  unavailable')` on a genuine query failure) propagated uncaught to
  `app/app/error.tsx`, whose static "Action not allowed" heading and Next's
  production error-message redaction together produced the exact
  digest-only crash screen. Same root shape existed on the page's own
  `getWorkflow`/`listWorkflowEvents`/`listEmailTemplates` load. Both now catch,
  rethrow Next's internal `redirect()`/`notFound()` control-flow errors via
  `unstable_rethrow` (so real redirects still work), and turn genuine failures
  into either a friendly `enable_error` message on the workflow page or, for a
  load failure, an inline "We couldn't load this workflow" card instead of a
  full-page crash. `archiveWorkflowAction` additionally used to ignore its
  RPC's `{error}` entirely (a silent-failure bug in the other direction) —
  now checked. Could not reproduce the *specific* incident live (no browser
  auth access in this environment), so this is a verified structural fix for
  every unhandled-error path in that file, not a confirmed single root cause.
- **Root docs are stale relative to the code.** Notably:
  - `PROJECT_STATUS.md` still lists only migrations `0001`–`0005` as "applied
    to the live database" and describes the `caller` role/Phase 8 calling
    workspace as new/pending bootstrap — the repo has 28 migrations and the
    calling workspace, workflow engine, funnel builder, Growth Tools, and
    Stripe billing have all since shipped. Treat `PROJECT_STATUS.md`'s phase
    checklist as historical, not current.
  - `README.md`'s "Three roles" line predates the `caller` role (0007) and
    the workflow/Growth Tools/Stripe systems entirely.
  - Prior project memory calling "webhook SSRF hookup" and "second email
    renderer" open items — both are implemented (see §10). Update any
    external tracking that still lists them as open.
- **Root has stray debug artifacts** not part of the app: `.next-qa-debug/`,
  `jsQR.js`, `qr-decode.html`, `qr-enhanced.png` are untracked files sitting at
  repo root per `git status` — likely scratch work from an unrelated
  debugging session; worth cleaning up or `.gitignore`-ing so they don't get
  committed by accident.
- **Some tests require a live database.** Files named `*-db.test.ts` (e.g.
  `tests/calls-rls.test.ts`, `tests/workflow-runtime-db.test.ts`,
  `tests/billing-db.test.ts`) run real RLS policies against the configured
  Supabase project inside a rolled-back transaction (`SUPABASE_DB_URL`).
  Without that env var these suites are effectively untestable locally by a
  new contributor — flag this expectation up front rather than assuming
  `npm run test` alone is a full check.
- **Two email-rendering code paths coexist** (`lib/emails/template.ts` for
  the original hand-built prospect follow-up, `lib/emails/template-library.ts`
  for the new DB-backed library). This is intentional per commit history
  (workflow send_email + Calls > Emails both moved to the library; the
  original template.ts is still used at minimum for tests/legacy paths) but
  is a two-system situation a new contributor should understand before
  "fixing" what looks like duplication.
- **HQN production data drift**: per project memory, production
  `profiles.contractor_role` has drift relative to migrations — verify
  against the live Supabase project (not just migration files) before
  assuming schema parity in production.

## 14. Current Development Priorities

Based on the most recent commits and the explicit "Next" markers in
PROJECT_STATUS.md / commit messages (treat as directional, not exhaustive —
this file does not track a live backlog):

- Reporting depth and revenue reconciliation across the two billing systems
  (§12) — PROJECT_STATUS.md's "Next" line, still plausible given the recent
  Stripe work only covers Growth Tools, not the core lead-fee billing.
- Broader Stripe billing hardening: `.env.example` gap (§13), and likely a
  Stripe customer/billing portal or refund path is not yet built (only
  Checkout + webhook were inspected — no portal/refund code was found).
- Workflow engine: promoting more `contract_only` capabilities (notably
  `send_sms`) to `ready` would require connecting a live SMS provider — the
  contract, mock provider, and opt-out/consent logic already exist and are
  tested (`lib/messaging/`).
  `task`/`message` entity types and `needs_domain` fields (tasks, tags, lead
  owner, inbound messages) have no backing tables yet — building those is a
  prerequisite for workflow actions like `create_task`/`add_tag` to leave
  `needs_domain` status.
- Root-doc cleanup: PROJECT_STATUS.md, README.md, and CODEX_HANDOFF.md should
  be refreshed or superseded by this file so future sessions don't anchor on
  stale phase checklists.

## 15. Recent Important Changes

(Selected from `git log`, most recent first; full history in `git log
--oneline`.)

- `7e83887` (2026-09-26/27) — Calls > Emails now sends through the shared
  email template library instead of its own template.
- `bc50726` — Growth Tools price emails link to a `/app/pay/[id]` page.
- `b6c2e75` — Managed Payments turned off on the Growth Tools Stripe Checkout.
- `c27700f` (merge) / `60e6422` — Stripe billing lands: admins set a price on
  a service request, contractors pay via Stripe Checkout
  (`0028_stripe_service_billing.sql`).
- `836f35c` — idempotent seed script for the default email template library
  (`scripts/seed-email-templates.ts`).
- `dda5a88` (merge) / `cd64185` — Growth Tools cards show pricing.
- `f3b50e1` — reusable email template library (`0026_email_templates.sql`),
  with workflow `send_email` + manual-send support.
- `f956f93` — Terms of Service / Privacy Policy copy finalized (legal).
- `a2bb664` — **workflow production-readiness pass**: rendering fixes,
  variable validation, webhook SSRF protection, retention/pruning
  (`0027_workflow_retention.sql`). This is the commit that resolves the
  "webhook SSRF hookup ... still open" item from prior project memory.
- `762cee6` — funnels dashboard redesigned for scale.
- `50b8c69` — SEO fix: search-result branding, deindexed auth pages.
- `a4e42cb` — premium lead list/detail UX + JSON-safe data normalization.
- `0eb38be` — workflow DB test suites run against the *applied production
  schema* (not just a local assumption of it).
- `646551a` — GitHub Actions scheduler wired up for `/api/workflows/tick`
  (`.github/workflows/workflow-tick.yml`) + a migration-apply script
  (`scripts/apply-migrations.mjs`).
- `03d4922` — workflows Phase 2 runtime + Phase 4 management UI + Phase 5
  hardening (large combined commit).
- `92f181e` — RLS fix: restored per-contractor activity visibility on shared
  (house) leads — an example of a real regression caught and fixed at the DB
  policy layer (`0022_restore_contractor_activity_visibility.sql`).
- `f74b4bc` — messaging Phase 3: SMS contracts/mock provider (still
  `contract_only`, no live provider — see §10/§11).
- `31f8852` — migration renumbered `0017` → `0020` to resolve a collision
  (note: a second, un-renumbered `0027` collision still exists today, §13).
- `4fab589` / `0596df3` / `fe12534` — contractor portal: owner/staff
  permissions, Growth Tools request flow, team-notification emails on new
  service requests.
- `4340f07` / `d9f362c` and surrounding — funnels send leads to GoHighLevel
  via API v2; Pool Masters LA funnel with Calendly.
- `312cb81` — Appointment Setters given their five working sections (the RBAC
  decision referenced throughout §5/§10).

Across `2026-09-01` → `2026-09-27` there are 58 commits — the workflow engine,
funnel builder, Growth Tools portal, email template library, and Stripe
billing were **all** built inside this one-month window. Assume the codebase
moves fast and re-verify assumptions against current code rather than
last week's summary.

## 16. Rules for Future AI/Developers

1. Read this file before making significant changes.
2. Inspect the current implementation before assuming how a feature works.
3. Do not remove or rewrite working functionality unnecessarily.
4. Preserve existing authentication and RLS protections.
5. Do not expose secrets or credentials.
6. Before creating a new migration, inspect existing migration numbers/naming.
7. Test role-specific behavior after auth/RLS changes.
8. Test desktop and mobile after major UI changes.
9. Clearly distinguish implemented vs planned features.
10. Update this file whenever a meaningful architectural, feature,
    integration, route, role, database, or workflow change is made.

## 17. Handoff for Nadav

- This file (`HOMEQUOTE_CONTEXT.md`) is the intended starting point for
  understanding the current system — read it before the older root docs
  (README.md, PROJECT_STATUS.md, CODEX_HANDOFF.md, FUNNELS.md,
  MARKETING_SITE.md, LEAD_DISTRIBUTION.md). Those are kept for history and
  contain useful detail (especially FUNNELS.md and MARKETING_SITE.md, which
  were broadly still accurate at inspection time) but have drifted on
  phase/migration status — see §13 for the specific contradictions found.
- The **two billing systems** (§12) are the easiest thing to get confused
  about in this codebase: `pricing_agreements`/`billing_events` is HomeQuote
  billing contractors for leads (no Stripe involved); the new Stripe Checkout
  flow is contractors paying HomeQuote for Growth Tools services. They share
  no code path other than both touching the `contractors` table.
- The **calling/prospecting system** (§7, `/app/calls`) is HomeQuote's own
  outbound sales motion (recruiting contractor partners) — it is a
  completely separate data model from the homeowner `leads` pipeline (§8)
  even though both involve "calling people" conceptually. Don't assume a
  `Lead` and a `ContractorProspect` are related.
- The workflow automation engine (§10) is the newest, most architecturally
  dense part of the codebase (idempotency at three layers, DB-enforced
  tenancy, SSRF-hardened webhooks). If you're asked to add a new trigger,
  action, or entity type, start by reading
  `docs/workflow-automation-architecture.md` and `lib/workflows/domain.ts` —
  the `Availability` contract (`ready`/`contract_only`/`needs_domain`) exists
  specifically to stop half-built capabilities from being enabled in
  production.
- Before starting any work: confirm the current highest migration number in
  `supabase/migrations/` by listing files (not by trusting this document or
  any other doc's stated number), and confirm what's actually applied to the
  live Supabase project versus just present as a file — PROJECT_STATUS.md
  shows this can silently drift.
- Test suite has two tiers: pure-logic vitest files run anywhere; `*-db.test.ts`
  files need `SUPABASE_DB_URL` (and generally `.env.local`) pointed at the
  real project and run inside rolled-back transactions. Ask Liam for DB
  access if you need to run the full suite.

---

## Mobile UI layer (added 2026-09-29)

The CRM has a phone/tablet layout below the `lg` breakpoint (1024px); at `lg`
and up the original sidebar + table desktop layout is unchanged.

- **Chrome:** `components/mobile/mobile-shell.tsx` (`MobileChrome`) renders the
  compact top bar, fixed bottom nav, "More" sheet and `<main>`. Nav lists come
  from `mobileNavForRole()` in `lib/nav.ts`, derived from `NAV_ITEMS` (+ the
  calling-workspace sub-pages), so role visibility is still decided in one place.
  Focused record routes (`/app/calls/<uuid>`, `/app/leads/<id>`) hide the bottom
  nav and pin an action bar instead (`isFocusedRoute`).
- **Primitives:** `components/ui/bottom-sheet.tsx`; `Dialog` is a bottom sheet
  below `sm`; `Button/Input/Select` are 44px tall below `lg`; `Card` is denser;
  `Table stack` + `TableCell label` = ResponsiveTable (CSS in globals.css).
- **Shared mobile parts:** `mobile-card.tsx`, `mobile-action-bar.tsx`
  (`ActionBarItem`), `mobile-filters.tsx` + `filter-chips.ts` (search + filter
  sheet + chips; plain GET forms, URL stays the source of truth).
- **Phone-specific views** (rendered next to the desktop table, `lg:hidden`):
  `calls/prospect-cards`, `leads/lead-cards`, `appointments/appointment-cards`
  (Today/Upcoming/Past tabs via `?tab=`), billing cards, sales-appointment and
  call-log cards. Call detail uses `calls/call-workspace.tsx` (tabs + action bar).
- **Gotchas:** `<main>` only has `overflow-y-auto` from `lg` (a scroll container
  there breaks `position: sticky`). `viewport-fit=cover` is set in
  `app/app/layout.tsx` only. Don't import non-component values (class strings)
  from `'use client'` files into server components; use `mobile-card.tsx`.
- Homeowner appointments have no `confirmed` status in the schema; "Confirm" is
  therefore not offered there (sales appointments have it).

## Push notifications + PWA (added 2026-09-29, migration 0031)

Web Push (standard VAPID, `web-push` npm, no Firebase) + an in-app notification center.
- **PWA**: `app/manifest.ts` (start_url `/app`, standalone, scope `/`), `public/sw.js` (push/click/badge/subscription-change only — NO fetch handler, no caching), headers for `/sw.js` in `next.config.ts`. iOS meta via `metadata.appleWebApp` in `app/app/layout.tsx`.
- **Tables** (0031): `push_subscriptions` (unique endpoint, multi-device), `notification_preferences` (one bool per type), `notifications` (in-app; users can only flip `read_at`), `push_notification_logs` (admin read), `notification_events` (service-role outbox, all API roles revoked).
- **Pipeline**: DB triggers → `notification_events` (from `workflow_events` for lead.created/assigned, appointment.booked/cancelled; own triggers for appointment time change and prospect sales appointments; `enqueue_due_callbacks()` from the tick; Stripe webhook and company-user reassignment enqueue from app code) → `lib/notifications/outbox.ts` `processNotificationEvents` (called via `flushNotificationsSoon()` after requests, plus the 5-min `/api/workflows/tick` as backstop) → `routing.ts` (who + lock-screen-safe text + role-aware URL) → `service.ts` `sendPushNotification` (prefs, in-app row, push, prune 404/410, log; never throws).
- **Adding a type**: boolean column on `notification_preferences` + `notification_events.type` check + entry in `lib/notifications/types.ts` + a case in `routing.ts`.
- **Security**: push endpoint host allowlist (`lib/notifications/endpoint.ts`, SSRF), URLs forced to `/app…` (`url.ts`, also in sw.js), subscribe route uses session user only, text never contains name/phone/address/money.
- **Env**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (build-time), `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, optional `PUSH_ENDPOINT_HOSTS`.
- **UI**: bell (`components/notifications/notification-bell.tsx`) in desktop header + phone top bar; `/app/settings/notifications`; iOS install helper; sign-out detaches the device.
- Not yet: workflow *action* type for alerts (`raiseWorkflowAlert()` helper exists), appointment-changed for Calendly reschedules.

### Mobile/PWA layer additions (2026-09-29, migrations 0032–0033)
- **Auth persistence**: one explicit 400-day cookie policy (`lib/supabase/cookie-options.ts`) for browser/server/middleware clients; middleware redirects carry refreshed cookies; transient Supabase errors show a retry page (`getProfile()` throws → `app/app/error.tsx`) instead of bouncing to `/sign-in`; `/sign-in?returnTo=` (legacy `next`) validated by `safeNextPath`.
- **Notification routing is fail-closed**: `lib/notifications/routing.ts` resolves audiences per admin rule (`notification_routing_rules`, UI at `/app/settings/notification-routing`), then `authorize()` re-verifies each user (contractor users only via assigned_contractor + matching company + real assignment). Never role-broadcast.
- **Workflow action `send_push`** (0033): plain-text title/body (no merge fields), audience enum; contractor-owned workflows may only target `assigned_contractor`. Queued as `workflow_alert` outbox events.
- **Phone UX**: action-center home (`components/dashboard/mobile-home.tsx`, data `lib/data/mobile-home.ts`, RLS-scoped) shown below lg above the untouched desktop dashboards; bottom nav = 3 role tabs + Alerts (unread badge, `/app/notifications`) + More; toaster (`components/ui/toaster.tsx`), `lib/haptics.ts`, `app/app/loading.tsx` skeleton; `public/offline.html` served by the SW only when a navigation has no network (no app data is ever cached).

## 18. AI calling via Fish Audio (migrations 0037-0038; shipped DORMANT, activation steps below)

Fish Audio is itself the phone/voice-agent service (Fish Agents): it dials from a Fish-managed number bound to an agent, so no separate telephony vendor is needed. Contract verified against the official docs and a real end-to-end webhook delivery (2026-10-06):
- **Place a call**: `POST https://api.fish.audio/v1/agent/phone-calls`, `Authorization: Bearer <FISH_API_KEY>`, `Idempotency-Key` header (same key + body = same call, 24h), body `agent_id`, `phone_number_id`, `to_number` (E.164), optional `dynamic_variables`/`metadata`/`overrides`. Returns `{session_id, status:"queued"}`. https://docs.fish.audio/api-reference/endpoint/agent/create-phone-call
- **Webhooks**: registered on the agent (`webhooks.post_call`, one `{url, secret}` per endpoint; the secret is one WE choose; takes effect after the agent is published). Events `phone_call.dial_finished` (answered/busy/no_answer/failed), `call.ended`, `call.analyzed`. Header `X-Fish-Webhook-Signature: t=<unix>,v1=HMAC_SHA256(secret, "<t>." + raw body)`, 5-minute tolerance, at-least-once (3 attempts, 10s timeout). https://docs.fish.audio/agents/monitor/webhooks
- Not documented/verified: a "ringing" event (so ringing cannot be distinguished from queued/answered), an API to end an in-progress call, the transcript/recording response shape, and the phone-number management endpoints.

**Layers: ALL must allow a call.** (1) env `AI_CALLING_GLOBAL_ENABLED=true`; (2) DB `ai_calling_settings.enabled` (admin switch / emergency stop, defaults OFF); (3) `ai_calling_contractor_settings.mode` (`off` | `manual_only` | `automatic`, defaults OFF, requires agent id + phone number id); (4) per-job rules in `lib/ai-calling/eligibility.ts`.

**Flow.** A new row in `lead_assignments` (the funnel RPC inserts one for contractor-routed funnels, e.g. Pool Masters LA; `distribute_lead` inserts them too) fires trigger `trg_enqueue_ai_call` -> one `ai_call_jobs` row per lead (`dedupe_key = lead:<id>`), only if that contractor is `automatic`. The trigger swallows its own errors, so lead capture can never fail or slow because of calling. Nothing is backfilled. A worker (`runAiCallQueue`, called by `POST /api/ai-calling/tick` every 5 min via `.github/workflows/ai-calling-tick.yml`, and nudged via `after()` from the funnel session route) claims jobs with `claim_ai_call_jobs()` (FOR UPDATE SKIP LOCKED, lease reclaim), re-evaluates eligibility, then calls Fish. A job is `accepted` only after Fish returns a `session_id`. Webhooks (`/api/ai-calling/webhook`, signature-verified; the `ai_call_events` ledger row is kept even if applying fails, and a Fish retry re-applies it idempotently) advance job status via `applyFishEvent` (never backwards), store duration/summary/criteria, add lead timeline notes scoped to the contractor, and schedule bounded redials.
- **Eligibility** (all re-checked at dispatch, for automatic and manual): job not expired (48h default; scheduled calls are judged from their scheduled time); lead not archived; lead not `not_qualified`/`out_of_service_area`; contractor mode; agent + number configured; valid US/Canada E.164 number; not in `ai_call_opt_outs`; not a `contractor_prospects` do-not-call number; recorded consent (automatic: `leads.consent_granted` + `consent_at` + a `consent_disclosure` that mentions calling; manual new contact: basis + reference + date); no other call to the same number+contractor within 24h (manual 30 min); timezone known (lead `state`, else a California ZIP) - unknown is BLOCKED `unknown_timezone`, never guessed; calling window in the contact's local time (default 8am-9pm, admin-editable; states spanning zones use the strictest zone). Outside the window the job is deferred to the next eligible minute.
- **Retries**: max 3 sends/job (admin-editable). Transport/5xx/429/409 errors retry with the SAME idempotency key (cannot double-dial); permanent 4xx fail; `no_answer`/`busy`/`failed` dials redial after 60 min with a NEW key (`key_seq`) while attempts remain. Admin "Retry" re-queues failed/no-answer/busy/blocked/expired (expired = explicit approval to release).
- **Opt-outs**: admin list, plus automatic when Fish's post-call analysis data contains `do_not_call` or `opt_out` = true (configure those fields in the Fish agent's analysis). That cancels queued calls to the number and, for prospect calls, sets the prospect to do-not-call. Automation never lifts a do-not-call.
- **Prospects**: a job with `prospect_id` writes `prospect_call_attempts` + disposition (`no_answer`, or `follow_up_required` for a completed call, summary in notes; AI never books appointments). Nothing creates prospect jobs automatically yet.
- **Admin UI** (`/app/ai-calls`, admin only, nav "AI Agent Calls"): global status + emergency stop, per-contractor mode/Fish ids, filtered history, detail view (summary, qualification results, collected details, provider events), cancel/retry, calling rules, opt-outs, and `/app/ai-calls/new` (existing lead or new contact with stored consent, now or scheduled, review step). Server actions (`lib/actions/ai-calling.ts`) re-check `requireRole(['admin'])`, write via service role, and audit to `audit_logs`; all new tables are admin-read RLS, service-role-write.
- **Emergency stop** sets `enabled=false`; the worker re-reads it before every call, so no new call dispatches. Already-connected calls are NOT ended (no end-call API verified).
- **Supported entry paths**: contractor-routed funnels (Pool Masters LA) and any lead assigned to an automatic contractor with qualifying consent. **Not auto-called**: Meta Lead Ads / generic intake leads (they are created unassigned; consent text is the form name, which does not mention calls) unless an admin distributes the lead to an automatic contractor AND the consent wording passes. House-funnel leads only enqueue when distributed to an automatic contractor.
- **Env**: `AI_CALLING_GLOBAL_ENABLED`, `AI_CALLING_CRON_SECRET`, `FISH_API_KEY`, `FISH_WEBHOOK_SECRET` (+ GitHub secrets `AI_CALLING_CRON_SECRET`, `AI_CALLING_TICK_URL`). Per-contractor Fish ids live in the DB.
- **Known limits**: no state-specific calling-hour/holiday/Sunday rules beyond the configurable window; ZIP-only timezone resolution works for California only (other leads need `state`); North American numbers only; transcripts/recordings are not fetched in-app; the agent's prompt must treat `{{call_context}}` as untrusted data; UI verified by build + typecheck + unit/SQL tests, not in a live browser session.
- **Tests**: `ai-calling*.test.ts` (logic, queue, webhook status, actions/permissions) plus `ai-calling-sql.test.ts` (migrations in PGlite).
- **DEPLOY ORDER**: apply migration 0038 BEFORE deploying this code. The webhook now reads/writes the new tables; until 0038 exists, deliveries return 500 (the raw events stay in `ai_call_events` and can be re-applied).
- **Activation / stop**: see the activation checklist in the 2026-10-07 handoff: apply 0038; set `AI_CALLING_CRON_SECRET` in Vercel + GitHub; configure Pool Masters (agent id, phone id, mode) in the UI; set `AI_CALLING_GLOBAL_ENABLED=true` and redeploy; click Enable calling. To stop: Emergency stop in the UI (instant), or set the env var to false and redeploy.

## 19. Documents & Signing (electronic signature) — migration 0039, NOT yet applied/deployed

Full write-up: `docs/document-signing.md`. Summary:
- **Routes**: `/app/documents` (list), `/app/documents/new` (upload), `/app/documents/[versionId]` (draft editor or sent-request detail); public `/sign` (token in URL **fragment** `#t=` signing / `#d=` completed-document download); `POST /api/signing/session` and `/api/signing/download` (signer APIs, token in body, no-store). Nav item "Documents & Signing" for admin + contractor; panels on lead page (admin/contractor) and contractor page (admin). Setters/callers: no access (`canManageSigning` in `lib/permissions.ts`).
- **Tables** (0039): `signing_documents` (owner contractor or NULL=HQN, optional `lead_id`), `signing_versions` (draft->sent/locked; status draft/awaiting_signature/partially_signed/completed/declined/voided/expired; original + final + certificate paths and SHA-256), `signing_recipients` (token hashes only), `signing_fields` (fractions of the displayed page), `signing_field_values` (insert-only, separate from sender `prefill_value`), `signing_events` (append-only, hash chained). Private bucket `signing-documents`. All writes via service role; state changes are SECURITY DEFINER SQL functions (`signing_send/submit/decline/void/new_version/save_draft/...`) — change behavior there, with tests in `tests/signing-sql.test.ts`.
- **Code**: engine `lib/signing/` (`pdf-validate`, `detect` + `layout` + `extract` + `ocr`, `geometry`, `stamp`, `certificate`, `finalize`), service `service.ts` (sender) / `signer.ts` (public), actions `lib/actions/signing.ts`, UI `components/signing/*`. Emails go through the existing Gmail sender (`sendGmailMessage`, new optional `replyTo`). `/api/workflows/tick` also runs `signingMaintenance()` (expire + finalize retry). Middleware skips session refresh for `/sign` and `/api/signing/`.
- **Rules to keep**: a sent version is immutable (new version = copy + void old); never store/log token plaintext; signer identity is "emailed link only" and signatures are NOT cryptographic digital signatures — keep the UI/certificate wording honest; detection is heuristic and always reviewed; OCR is local (tesseract.js + bundled model), no external AI/OCR provider.
- **Deploy order**: apply 0039 before deploying this code. No new env vars. Legal review required before real contracts (see doc).
- **Not built**: templates, scheduled auto-reminders, SMS/ID verification, PAdES, retention purge.

**Part 2 (migration 0040, 2026-10-07):** reusable templates (`/app/documents/templates`, tables `signing_templates`/`_roles`/`_fields`, `lib/signing/templates.ts`, PDF copied per template and per document, hash-verified), automatic reminders (`signing_versions.auto_remind_*`, `signing_claim_auto_reminders`, run from `signingMaintenance()` via `/api/workflows/tick`; skips signers who opened the link in the last hour), optional per-request access codes (6-digit, salted hash, 5-try lockout, session secret per verified link, DB trigger blocks signing without verification; codes shown once to the sender, never emailed), and a lead picker on the upload screen (company documents may only attach leads assigned to that company). Signer API gains action `verify` and a `session` field; `sendForSignature` returns `{results, codes}`. Details and limits: `docs/document-signing.md`. **Deploy order: apply 0040 before deploying.** Gmail OAuth shared with the rest of the app: an expired connection breaks all signing emails (reconnect at `/app/calls/emails`).

## 20. Leads CSV export for Facebook (2026-10-07, no migration)
- **UI**: "Export for Facebook" button on `/app/leads` (admins; contractor users with `can_export_company_data`) opens `/app/leads/export?<current filters>`, a preview showing leads matching / in the file / no email or phone / repeat people / left out for ad-measurement opt-out, plus upload steps for Meta Ads Manager (Audiences > Custom audience > Customer list). The button on that page downloads `GET /api/leads/export/facebook?<same filters>`.
- **Format** (`lib/leads/facebook-export.ts`, pure): columns `email,phone,fn,ln,zip,ct,st,country`, normalised per Meta's customer-file guidance (lowercase, no punctuation, phone = country code + digits, 5-digit ZIP, 2-letter lowercase state, country always `us`; US/Canada phones only). Raw (unhashed) values: the Ads Manager uploader hashes in the browser. Formatting follows Meta's published customer-list rules as understood at build time; check the uploader's column-mapping step.
- **Rules**: same filters as the Leads page (`lib/leads/filters.ts`, shared parser); read in pages of 500 up to 20,000 leads (the bare list query stops at the database row cap); leads with neither email nor usable phone skipped; same email OR phone = one person; leads whose funnel session recorded `measurement_allowed = false` (website leads, matched by `external_lead_id` = session id) are left out; older leads with no recorded choice cannot be checked. Cells that could start a spreadsheet formula are defused.
- **Security**: permission via `canExportCompanyData`; rows limited by the caller's RLS; cross-site requests refused (`Sec-Fetch-Site`); every export is written to `audit_logs` as `leads.export_facebook` with counts and filters, never the data; responses are `no-store`.
- **Tests**: `tests/leads-facebook-export.test.ts`.


## 21. Visual workflow builder (graph engine) — migration 0041, NOT yet applied/deployed (2026-10-07)

A React Flow (`@xyflow/react`) canvas + durable graph executor beside the classic engine. Full design, semantics, rollback: `docs/visual-workflow-builder.md`.
- **Data**: `workflows.engine` (`linear` default | `graph`), `workflow_graph_drafts`, immutable `workflow_versions`, `workflow_waits`, `workflow_tasks`, `workflow_builder_access`; `ai_call_jobs.trigger_source='workflow'` (+ `workflow_run_id`, per-node retry/window), contractor mode `workflow_only`. New events: `appointment.rescheduled`, `estimate.accepted`, `ai_call.completed|failed`, `task.completed`, `workflow.manual_enrollment`.
- **Code**: pure model/validator/interpreter in `lib/workflows/graph/` (`model`, `validate`, `engine`, `dry-run`, `templates`, `call-outcomes`); server runtime `executor.server.ts`, `calls.server.ts`, `actions.server.ts`; actions `lib/actions/workflow-graph.ts`; reads `lib/data/workflow-graph.ts`; UI `components/workflows/builder|runs/`, pages under `app/app/workflows/` (list, new, [id] builder, runs, tasks, access).
- **Rules**: graph = one trigger, named single-use output handles, no cycles; publish validates settings + integration readiness and creates an immutable version; runs are pinned; enrollment only for events recorded after publish/resume.
- **Booking**: a call's `booked` result is only a claim; the Booked path needs an `appointments` row for the same lead + contractor created after the call started (else wait for the analysis grace, then *Needs human review*, reason `booking_unconfirmed`). `call-outcomes.ts` `confirmBooking`, `calls.server.ts` `callBookingEvidence`.
- **Call reuse**: a workflow adopts only the `auto_form` job created for its own enrollment (same lead/contractor/phone, `lead.assigned|lead.created`, within 5 min of the event); runs also reject a job whose lead/contractor is not their own (`call_association_mismatch`).
- **Pause/resume**: `wfg_set_paused` parks runs, `claim_ai_call_jobs` skips queued calls of paused workflows, ignored events are logged `run.skipped_paused` (count shown on list + builder), resume releases overdue runs/calls one per 20 s. `workflows.paused_at` added. See `docs/visual-workflow-builder.md` §2a.
- **Opt-out**: number-level and network-wide (`ai_call_opt_outs` + prospect DNC) for auto/manual/workflow calls; workflow runs also skip email steps; cancelled-for-opt-out calls read as Opted out; SMS opt-out not wired (no SMS provider). Fish webhook lead notes are written once per event (`metadata.event_key`).
- **Release tooling**: `supabase/rollback/0041_visual_workflow_builder_soft_rollback.sql` (soft rollback), `scripts/staging/{guard,checks,verify-0041}.mjs` (staging-only, refuses production), `docs/workflow-builder-staging-runbook.md`. Staging/provider verification is NOT done; see the matrix in the builder doc §7.
- **Tests**: `workflow-graph-model|engine|sql|runtime-db`, `workflow-builder-release`, `workflow-config-panel`, `workflow-run-views` (PGlite, real migrations; Gmail/Fish faked).
- **Deploy**: dry-run then apply 0041, run `scripts/staging/verify-0041.mjs` on staging first, then deploy (code falls back to classic-only if the migration is missing). Rollback: run the soft-rollback script BEFORE reverting code.

## Brand shell & design tokens (added 2026-10-07, not yet deployed)
- Brand assets: `public/assets/brand/hq-logo-horizontal.png` (sidebar, 204px) and `hq-mark.png` (phone header). Transparent derivatives of the supplied HQN logos (originals untouched); light backgrounds only. Rendered by `components/brand-logo.tsx`.
- Tokens live in the second `:root` block of `app/globals.css`: navy `#011D44` (`--primary`), brand gray `#656A74`, `--app-bg` canvas. Status colors stay semantic and are always paired with an icon/label.
- Sidebar is 248px, grouped Operations / Growth / Administration via `group` on `NavItem` (`lib/nav.ts`, `groupNavItems`). Role visibility is unchanged. The phone "More" sheet uses the same grouping.
- Reusable: `ui/filter-panel.tsx` (collapsible-on-phone GET filter with active count + Reset), `ui/summary-strip.tsx`, Button variant `destructive-outline`, Badge variants `danger`/`info`.
- Workflows page body is `components/workflows/workflows-view.tsx` (presentational); `app/app/workflows/page.tsx` only fetches.
- Round 2 (2026-10-07, code-only, not browser-verified): `KpiCard` and the contractor dashboard tile are compact; desktop lead filters have visible labels, a "More filters" group, active count and Reset; lead note/contact forms are controlled with labels and success/error text; `LeadForm` labels are tied to inputs, submits via `lib/forms/keep-values.ts` (`keepValuesOnError`, also used by auth, password, contractor, user, prospect, recipient, send-lead, qualification, service-request, create-funnel forms) so a failed save no longer wipes typed values; desktop lead Delete now confirms; success text uses `emerald-700` for AA contrast.

## 22. Meta Ads analytics + outcome feedback (2026-10-07, migration 0042 - NOT applied/deployed; delivery ships OFF)

Full guide (database procedure, mappings, delivery-vs-optimization checks, credentials, rollout, staging checklist): `docs/meta-ads-setup.md`. Summary:
- **Branch/migrations**: this branch already contains `origin/main` (workflow builder PR #6 = migration 0041). Meta Ads = **0042**; apply order 0040 -> 0041 -> 0042; fresh database = all 43 files. `scripts/staging/migration-plan.mjs` (read-only planner, tested) reports what a database is missing. Never renumber an applied migration.
- **Routes**: `/app/meta-ads` (admin + contractor *owners*; RLS-scoped), `/app/meta-ads/setup`, `/app/meta-ads/events` (admin), `POST /api/meta/tick` (Bearer `META_TICK_SECRET`; `.github/workflows/meta-tick.yml`). One Meta area: extend it, don't add another dashboard/queue/auth.
- **Tables**: `meta_settings` (delivery_mode off|test|live default off; `test_dataset_id`; `legacy_direct_qualified` default true; ledger cursor), `meta_ad_accounts` (explicit contractor mapping, `show_spend_to_contractor`), `meta_campaigns`, `meta_adsets` (+`promoted_object`), `meta_ads` (+`tracking_pixel_ids`), `meta_insights_daily`, `meta_sync_runs`, `lead_outcome_events` (append-only ledger), `meta_conversion_events` (outbox; unique `(dataset_id,event_id,test_mode)` over NON-failed rows; `origin` queue|legacy_direct; `retry_of`). New `leads.qualification_reason/_source/_evidence`, `appointments.booked_via`, `sales.currency`.
- **Event source rule**: `action_source` = where the action actually happened (website only for a visitor's on-site action; phone_call/email/chat/physical_store from the recorder's stated channel, the qualification reason, or AI-call-booked evidence via the workflow builder's `resolveCallOutcome`; else `other`), never from who wrote the row. AI "booked" is only a claim; a person records the appointment.
- **Test events are NOT sandboxed** (Meta: they "flow into Events Manager and are used for targeting and ads measurement"). Test mode therefore needs a separate test dataset and refuses a production one; `META_TEST_EVENT_CODE` gives no protection and must not stay set in production.
- **Handoff**: direct QualifiedLead sender stays on until Live; direct sends reserve a `processing` row first (mutual exclusion with the queue), failed rows never block retries, stale reservations are swept; proven in `tests/meta-handoff.test.ts`.
- **Code**: `lib/meta/{marketing-api,sync,metrics,hqn-metrics,conversions,provenance,queue,queue.server,audit.server,settings,datasets,qualified,capi}.ts`, `lib/data/meta-ads*.ts`, `lib/actions/meta-ads.ts`, `components/meta/*`, `components/leads/outcome-history.tsx`.
- **Access check**: `lib/meta/access-check.ts` (read-only, dependency-free) + `scripts/meta-access-check.mjs` + Setup button tell whether a token reaches the ad account/datasets and where access lives (personal vs HQN portfolio vs both). Ethan's Business owns the Pool Masters ad account; Advanced `ads_read` is needed for production because it is another business's account.
- **Open**: dataset mismatch `933962709362966` vs `2057270381542607` unverified (Setup -> Dataset check after the first sync); custom-event optimization eligibility for non-website sources unverified; nothing verified against real Meta/Supabase.
