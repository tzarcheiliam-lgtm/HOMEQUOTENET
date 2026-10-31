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
supabase/migrations/    sequential SQL files (latest 0051; see §6, §19, §21 and §27)
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
form), `/privacy`, `/terms`, `/adu-estimator` (homeowner ADU price estimator, see
`docs/adu-estimator.md`: pricing in `lib/adu/pricing-config.ts`,
in the sitemap, lead capture OFF until a destination is approved),
`/estimator/[slug]` (instant pool estimator, `noindex` while prices are examples, see §33). Dark theme scoped to a `.hq` wrapper so it never
touches the CRM's light shadcn tokens. Copy lives in `content/` so a new
vertical/niche is a content file, not a rewrite (see MARKETING_SITE.md, still
broadly accurate).

### ADU quiz (paid-traffic landing page)
`/adu-quiz` (+ `/adu-quiz/booked`, `POST /api/adu-quiz/lead`, `POST /api/adu-quiz/booked`): standalone
visual ADU builder (live SVG preview, `ADU_LAYERS`) followed by a screening quiz; qualified homeowners book on a GoHighLevel calendar, and the price range is revealed server-side only after the contact step (`PRICING`, all unset). Config in
`lib/adu-quiz/config.ts`, leads in `adu_quiz_leads` (migration 0054, applied by the owner),
forwarded to a webhook with retries from `/api/workflows/tick`. See `docs/adu-quiz.md` for the placeholder checklist.

### Instant pool estimator (embed)
`/embed/estimator/[slug]` (bare iframe version of `/estimator/[slug]`, route group `app/(estimator-embed)/`, `noindex`),
`POST /api/estimator/[slug]/lead`. Slugs: `pool-masters` (pool), `bathroom-remodel` (HomeQuote Network's own
bathroom funnel), `kitchen-remodel` (HomeQuote Network's kitchen funnel, funnel only) and `adu` (HomeQuote Network's ADU funnel, funnel only; short link `/adu` redirects to `/estimator/adu`). See §33.

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
  `/app/calls/appointments`, `/app/calls/emails`, `/app/calls/stats`,
  `/app/calls/dial` (power hour → first due prospect) — the partner cold-calling
  workspace (admin/caller/setter only), all under the daily goal HUD (§34)
- `/app/leads/next` (admin/setter) — redirects to the next homeowner lead to call (§34)
- `/app/calls/payouts` (admin) — setter payouts by month; CSV at `/api/calls/payouts?month=YYYY-MM` (§36)
- `/app` for setters — the money-first setter dashboard (§36)
- `/app/appointments`, `/app/service-requests`
- `/app/availability` (contractor owner/staff, admin; setters via `?contractor=` from a contractor page) — availability + calendar connections (§24)
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
- `GET /api/integrations/google-calendar/oauth/{start,callback}` — contractor Google Calendar connect (§24); `GET /api/calendar/feed/[token]` (public, token = credential) and `GET /api/calendar/appointment/[id]` (.ics) (§24); `GET /api/calls/appointments/[id]/ics` — one sales appointment as .ics for "Add to Apple Calendar" (call-workspace roles, RLS) (§41)
- `POST /api/workflows/tick` — the workflow scheduler tick (Bearer
  `WORKFLOW_CRON_SECRET`), called every 5 min by the GitHub Actions workflow
  `.github/workflows/workflow-tick.yml`

### middleware.ts
Tiny wrapper: every request except static assets goes through
`updateSession()` in `lib/supabase/middleware.ts`, which refreshes the
Supabase auth session cookie. It does **not** do role-based route gating —
that happens in `requireProfile`/`requireRole` inside layouts/pages/actions.
Public fast paths that skip the refresh include `/estimate/`, `/estimator/`,
`/api/funnels/`, `/api/estimator/`, `/api/calendar/feed/`, the signing routes
and (2026-10-29) the homeowner booking routes `/api/booking/`, `/booking/` and
`/book/manage/` (§45).

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
- **Daily goal / gamification layer** (100 calls/day HUD, one-tap outcomes,
  power hour, stats page, leaderboard) sits on top of these logs — see §34.
- **Call script panel** (beside every call on `/app/calls/[id]`, the "Script" tab on
  phones): the owner's cold-call script plus a prospect Q&A, word for word, in
  `lib/calls/script.ts` (`CALL_SCRIPT`), rendered by `components/calls/call-script.tsx`
  as collapsible sections. `fillScript` fills `[Name]`, `[Owner Name]`, `[Company]`,
  `[Your Name]`, `[trade]` from the prospect, the caller and the niche
  (`tradeFromNiche`); any other `[bracket]` is a detail the owner hasn't decided and is
  highlighted, never filled with a guess. No fixed price anywhere (the old pool-only
  "$125 per appointment" framework was replaced 2026-10-28). Test: `tests/call-script.test.tsx`.
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
  **Senders (migration 0046):** `gmail_connections` holds one shared
  `automation` sender (workflows, signing, lead/billing emails, and the
  fallback) plus at most one `user` sender per team member. Gmail sends as
  whichever Google account approved access regardless of the From header, so
  the OAuth start route forces the account chooser (`prompt=select_account
  consent`) and adds `openid email` scopes; the callback reads the granting
  account from the userinfo endpoint and stores *that* address. Any
  admin/caller/setter connects their own sender (`/api/integrations/gmail/oauth/start?kind=user`);
  only admins connect the automation sender (`?kind=automation`, hint
  `GMAIL_AUTOMATION_EMAIL`, default `info@homequotenet.com`). Changing a sender
  is just "Change account" on `/app/calls/emails`; no env edit. Manual sends
  pass `senderUserId` to `sendGmailMessage` (own connection, else automation);
  every other caller omits it and uses the automation sender.
  `GMAIL_FROM_EMAIL` is no longer required (only feeds the `supportEmail`
  template variable). **Deploy order: apply 0046 before deploying.** The
  pre-existing singleton row becomes the automation sender with its old token;
  reconnect it as info@ after deploy.

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
- Appointments (0070): `appointments.lead_id` is the anchor and
  `assignment_id` is **nullable** — a HomeQuote team-calendar call can exist
  before any contractor is matched (it joins the assignment when the lead is
  assigned to that calendar's contractor). Readers should fall back to
  `appointments.lead_id`, then `contact_name/phone`, when there is no
  assignment (`lib/data/appointments.ts`, `lib/calendar/appointment-event.server.ts`
  do). `booked_via` also allows `'website'`. Homeowner bookings go through
  HomeQuote's own calendar (§45), not Calendly.
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
qualified/review messaging, calendar integration (`calendarProvider`:
`homequote` = HomeQuote's own calendar, the default for new funnels and every
shipped config since 2026-10-29, see §45; `ghl` embedded calendar and
`calendly` inline embed remain as fallbacks; schema default stays `ghl` so
stored configs without the key are unchanged), thank-you page, optional SEO overrides, Meta pixel
id, and a `trust` block (rating, license, financing, warranty, years in
business, testimonial, photo — governed by the "no invented proof" compliance
stance, see §13/PROJECT_STATUS.md).

- **Question types** (`questionSchema.type` in `lib/funnels/schema.ts`): `choice` (multiple choice, the original), `zip` (exactly one per funnel), and typed-answer kinds `short_text`, `long_text`, `address`, `number`, `email`, `phone`. Typed questions take optional `placeholder` and `required` (unset = required, so old configs are unchanged). All answer validation goes through `validateAnswer()`, shared by the public form, the session PATCH route and the builder preview. Skipped optional questions are stored as `''` (use `isAnswered`, not truthiness). Answers stay in `funnel_sessions.answers` like every other answer; an `address` answer is also copied to `leads.address` on new-lead creation (migration `0029_funnel_address_question.sql`, `save_funnel_session`).
- **Save-to-contacts button** (2026-10-18): optional `FunnelConfig.contactCard` (`phone`, optional `email`/`website`). When a valid US phone is set, the thank-you screen shows a "Save <client> to my contacts" button that downloads a vCard 3.0 built client-side by `lib/funnels/vcard.ts` (so the homeowner recognises the call). Edited in the builder's Thank-you panel; unset = no button, so existing funnels are unchanged. No migration (config is JSON). Tests: `tests/funnel-vcard.test.ts`.
- **Service area is optional** (2026-10-19): if `serviceArea.zipCodes` and `zipPrefixes` are both empty, `inServiceArea()` returns true (no ZIP gate; ad targeting does the filtering) — previously empty meant nobody qualified. Funnels that list ZIPs/prefixes behave exactly as before; `strictStates` is unchanged. The ZIP *question* is still required (exactly one) so the ZIP is still captured. The builder card is titled "Service area (optional)"; `scripts/funnels.mjs` no longer rejects an empty list. Test: `tests/funnel-open-service-area.test.ts`.
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

**Re-adding a deleted user (2026-10-19):** team "delete" is a soft delete (`profiles.deleted_at`; the `auth.users` login stays), so re-creating the same email used to fail with "already registered". `createUser`/`inviteUser` in `lib/actions/team.ts` now detect a soft-deleted profile by email and restore it (new password for Create; a set-password email for Invite) with the newly chosen role/contractor, clearing `deleted_at`. A live account with that email returns a clear "already exists" error instead.

### 9c. Demo contractor data (2026-10-18)

Admins see a **Load demo data** button on `/app/contractors/[id]` for any contractor whose name contains "test" or "demo" (`loadDemoData` in `lib/actions/demo.ts`, enforced server-side too). It runs `seedDemoContractor()` (`lib/demo/seed-contractor.ts`) with the service-role client: 24 placeholder leads at every pipeline stage plus appointments, estimates, won sales, lead-fee billing events and activity, so the CRM looks lived-in for contractor walkthroughs. Idempotent: rows are tagged (`leads.consent_source = 'demo-seed'`, billing/sales notes start `demo-seed`) and only those are replaced on re-run. Fake data only (example.com emails, 555-01xx phones); the `workflow_events` the insert triggers enqueue are deleted right after so no workflow email/SMS/push fires. (Replaced an earlier `scripts/seed-demo-contractor.mjs` that needed a local DB URL.) Not yet exercised against a live database.

### 9d. Qualified bathroom & kitchen funnels (2026-10-21, no migration)

House funnels (`contractor_id` null, "HomeQuote Network" consent text) defined in `content/funnels/bathroom-remodel.json`, `kitchen-remodel.json` and `adu.json` (since 2026-10-30: services detached / attached / garage / jadu / unsure, qualified = detached, attached, garage or jadu + homeowner; same five-question shape), listed in `lib/funnels/presets.ts` (`FUNNEL_PRESETS`, `presetConfig`, `installPresetFunnels`). Admins see **Add house funnels (bathroom, kitchen, ADU)** on `/app/funnels` (`installQualifiedFunnelsAction`); it inserts them as **drafts** (never overwrites an existing slug), then publish from the dashboard/builder. URLs: `/estimate/bathroom-remodel`, `/estimate/kitchen-remodel`, `/estimate/adu`. All use Meta dataset/pixel `29178560738497902` (same ad set), `consentMode: opt_out` (mirrors Pool Masters; `opt_in` would suppress most events), no `calendarUrl` (no calendar step), empty service area (any ZIP; ZIP question kept), `unqualifiedAction: 'review'`.

Qualification (ALL must match; editable in the builder): project type in-scope (excludes repair/other), homeowner = yes (renters skip the rest), sole/joint decision maker, timeline ASAP or 1–3 months, budget (bathroom ≥ $10k, kitchen ≥ $25k), payment cash/financing ready/needs financing. Lead event fires for every valid submission (qualified or not); `QualifiedLead` fires only when staff mark qualified. Tests: `tests/funnel-qualified-presets.test.ts`, `tests/funnel-qualified-events.test.ts` (real PATCH route, browser/server event_id pairing).

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
  Webhook hardening (2026-10-26): a disabled/missing Meta integration answers 503 (not 200) so Meta redelivers; a failed Graph retrieval also writes a `lead_intake_events` error row; the raw payload stored is the webhook value merged with the Graph lead (includes `field_data`). `scripts/meta-subscribe-page.mjs` subscribes the app to the Page's `leadgen` field. Auto-text: see the SMS section (SMS_META_LEADS). Still missing: backfill via `GET /{form-id}/leads`, no-leads alert.
  **Multiple Pages (2026-10-26):** `integrations.config.pages` is a list of `{page_id, label, contractor_id, sender_name}` (the legacy single `config.page_id` still works and is merged in; `resolveMetaPages`). With no Pages configured any Page is accepted (as before); otherwise a lead from an unlisted Page is skipped with a 2xx and a `lead_intake_events` row (`status='skipped'`) so it is visible. Each Page's leads are fetched with its own token from the Vercel env var `META_PAGE_ACCESS_TOKEN_<page id>` (`resolveMetaPageToken`), falling back to the shared `META_PAGE_ACCESS_TOKEN`/`config.page_access_token`; a missing or rejected token is a 500 plus an `error` intake row (Meta redelivers). A Page with a `contractor_id` is passed to `ingestLead` as `ctx.contractorId`/`ctx.senderName`: the lead gets a `lead_assignments` row with that contractor's active pricing agreement (same as `save_funnel_session` for contractor funnels; emails nobody), its intake activity is scoped with `contractor_id`, and duplicate matching only merges into leads already assigned to that contractor. Admins manage Pages on `/app/integrations/meta` (`saveMetaPages` action, `components/integrations/meta-pages-form.tsx`); tokens are never shown or stored there, only whether the env var is set. Tests: `tests/meta-webhook-route.test.ts`, `tests/meta-intake-matching.test.ts`.
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
- **Google Places API (New)** — prospect sourcing and the Pool Masters funnel's address autocomplete (§33; `GOOGLE_PLACES_API_KEY`);
  degrades gracefully (explains what's missing, invents nothing) if unset.
- **Gmail (OAuth)** — the single outbound email transport for both the Calls
  workspace and (indirectly, for now) the email template library; refresh
  tokens are AES-256-GCM encrypted at rest (`GMAIL_TOKEN_ENCRYPTION_KEY`).
- **GoHighLevel (GHL)** — per-funnel Private Integration token
  (`GHL_POOL_MASTERS_TOKEN`) for lead delivery to a contractor's own CRM.
- **Calendly** — RETIRED for shipped funnels (2026-10-29, §45: HomeQuote's
  own calendars). Kept only as a fallback: booking verification / time capture
  for a funnel still set to `calendarProvider: 'calendly'` (`CALENDLY_API_TOKEN`).
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

## 22. Meta Ads analytics + outcome feedback (2026-10-07, migration `0042_meta_ads_analytics_outcomes.sql` - applied to production by the owner 2026-10-08, confirm with the planner; delivery ships OFF)

Full guide (database procedure, mappings, delivery-vs-optimization checks, credentials, rollout, staging checklist): `docs/meta-ads-setup.md`. Summary:
- **Migrations**: main has 0041 (workflow builder) and `0042_contracts_templates.sql` (§20). Meta Ads is a SECOND file numbered 0042 (like the two 0027 files): unrelated tables, either order works, both applied; never renumber an applied file. `scripts/staging/migration-plan.mjs` (read-only) reports what a database is missing; a fresh database = all 44 files in filename order.
- **Routes**: `/app/meta-ads` (admin + contractor *owners*; RLS-scoped), `/app/meta-ads/setup`, `/app/meta-ads/events` (admin), `POST /api/meta/tick` (Bearer `META_TICK_SECRET`; `.github/workflows/meta-tick.yml`). One Meta area: extend it, don't add another dashboard/queue/auth.
- **Tables**: `meta_settings` (delivery_mode off|test|live default off; `test_dataset_id`; `legacy_direct_qualified` default true; ledger cursor), `meta_ad_accounts` (explicit contractor mapping, `show_spend_to_contractor`), `meta_campaigns`, `meta_adsets` (+`promoted_object`), `meta_ads` (+`tracking_pixel_ids`), `meta_insights_daily`, `meta_sync_runs`, `lead_outcome_events` (append-only ledger), `meta_conversion_events` (outbox; unique `(dataset_id,event_id,test_mode)` over NON-failed rows; `origin` queue|legacy_direct; `retry_of`). New `leads.qualification_reason/_source/_evidence`, `appointments.booked_via`, `sales.currency`.
- **Event source rule**: `action_source` = where the action actually happened (website only for a visitor's on-site action; phone_call/email/chat/physical_store from the recorder's stated channel, the qualification reason, or AI-call-booked evidence via the workflow builder's `resolveCallOutcome`; else `other`), never from who wrote the row. AI "booked" is only a claim; a person records the appointment.
- **Test events are NOT sandboxed** (Meta: they "flow into Events Manager and are used for targeting and ads measurement"). Test mode therefore needs a separate test dataset and refuses a production one; `META_TEST_EVENT_CODE` gives no protection and must not stay set in production.
- **Handoff**: direct QualifiedLead sender stays on until Live; direct sends reserve a `processing` row first (mutual exclusion with the queue), failed rows never block retries, stale reservations are swept; proven in `tests/meta-handoff.test.ts`.
- **Code**: `lib/meta/{marketing-api,sync,metrics,hqn-metrics,conversions,provenance,queue,queue.server,audit.server,settings,datasets,qualified,capi}.ts`, `lib/data/meta-ads*.ts`, `lib/actions/meta-ads.ts`, `components/meta/*`, `components/leads/outcome-history.tsx`.
- **Access check**: `lib/meta/access-check.ts` (read-only, dependency-free) + `scripts/meta-access-check.mjs` + Setup button tell whether a token reaches the ad account/datasets and where access lives (personal vs HQN portfolio vs both). Ethan's Business owns the Pool Masters ad account; Advanced `ads_read` is needed for production because it is another business's account.
- **Open**: dataset mismatch `933962709362966` vs `2057270381542607` unverified (Setup -> Dataset check after the first sync); custom-event optimization eligibility for non-website sources unverified; nothing verified against real Meta/Supabase.

## 20. Contracts & Templates (migration 0042, added 2026-10-08, NOT yet applied/deployed)
Full write-up: `docs/contracts.md`. Admin-only template library + 6-step wizard; contracts render to PDF and go through the existing signing engine (section 19). Routes: `/app/contracts`, `/new`, `/[id]`, `/[id]/edit`, `/templates`, `/templates/[id]`; contractor users get a read-only `/app/contracts` of SENT agreements for their own company (RLS + `loadContract`). Tables: `contract_templates`, `contract_template_versions` (immutable), `contracts` (frozen once the signing request leaves draft), `contract_events`, `contract_attachments`, `contract_seed_log`; `contractors.logo_path`; private bucket `contract-assets`. Code: `lib/contracts/*` (types, variables, render-model, pdf, logo, library/starters, templates, contracts), `lib/actions/contracts.ts`, `components/contracts/*` (TipTap editor). Workflow vocabulary gained 7 `contract.*` events + entity type `contract` (SQL constraints in 0042, TS in `lib/workflows/events.ts`; drift test reads 0042). Permissions: `canManageContracts` (admin), `canViewOwnContracts`. Tests: `tests/contracts-{service,pdf,workflows}.test.ts`. **Deploy order: apply 0042 before deploying code.**

## 23. Meta Ads Studio — creatives, paused ad creation, audits, proposals, rules (2026-10-07, migration 0043 — NOT applied/deployed; everything ships DORMANT)

Full guide: `docs/meta-ads-studio-setup.md` (requirements, env vars, merge order, activation and rollback). Same "Meta Ads" area/nav as §22; layout + tabs in `app/app/meta-ads/layout.tsx`.

- **Migration order**: 0041 workflow builder → **two files share 0042** (`0042_contracts_templates`, `0042_meta_ads_analytics_outcomes`; both apply, in filename order, no shared objects) → **0043 `meta_ads_studio`**. The `meta-ads` branch contains both Meta pieces; merge it instead of the analytics branch.
- **Tables (0043)**: `meta_studio_settings` (live_writes_enabled=false, automation_enabled=false, audit_thresholds, rules lease), `meta_account_controls` (per-account writes/automation, default off), `meta_object_state` (live budgets/learning + Ads Manager drift), `meta_assets` (Pages/Instagram/datasets/forms, explicit `contractor_id`), `meta_creatives` (+ private bucket `meta-creatives`), `meta_ad_drafts`, `meta_change_proposals`, `meta_rules`, `meta_rule_evaluations`, `meta_audits`, `meta_audit_findings`, `meta_activity_log` (append-only). RLS: admin-only except contractors read only assets/creatives mapped to them; all writes service-role.
- **Code**: `lib/meta/studio/` — `gate.ts` (write/automation gates), `write-api.ts` (the only state-changing Graph client; POSTs never auto-retried), `draft.ts` (config schema, validation, exact payloads), `create-ad.ts` (resumable paused creation, find-before-create), `proposals.ts` (re-read live state, stale on drift), `rules-engine.ts` + `rules.server.ts` (pure engine + tick), `audit.ts` + `audits.server.ts` (versioned `hqn-meta-audit/1.0.0`), `creative-specs.ts`, `media-probe.ts` (reads real file headers), `url-params.ts`, `health.ts`, `server.ts`. Actions: `lib/actions/meta-studio.ts` (every export starts with `requireRole(['admin'])`; a test enforces it). Scheduler: `POST /api/meta/studio-tick` (`META_TICK_SECRET`), `.github/workflows/meta-studio-tick.yml` (hourly, secret `META_STUDIO_TICK_URL`).
- **Credentials**: `META_MARKETING_ACCESS_TOKEN` (read) and new `META_ADS_WRITE_TOKEN` (write) live only in server env. No OAuth flow exists; accounts are connected via System User tokens. Managing other businesses' accounts needs Meta App Review (not implied anywhere).
- **Behavior to know**: ads are only ever created PAUSED; budget increases always need a human; automatic rules can only pause/decrease, need an expiry, and are suspended on stale data / failing credentials / unverified tracking; stopping HQN automation never pauses running Meta ads; no historical backfill.
- **Tests**: simulated (fakes/fixtures) `tests/meta-studio-{create,rules,misc,auth,render,money,contract,security}.test.ts`; local DB (in-process Postgres, real RLS) `meta-studio-sql.test.ts` + `meta-ads-sql.test.ts`; **real-browser end-to-end** `scripts/e2e/meta-studio/run.mjs` (real Next app + Supabase stand-in with every real migration + a strict fake Meta; see its README). **Nothing is verified against live Meta.**
- **Money**: `lib/meta/studio/money.ts` holds Meta's documented currency-offset table (11 offset-1 currencies; others 100; unlisted currencies refused), exact decimal conversion (never rounds), and the per-account **budget-unit check**: Meta documents the offset for bids only, so budgets stay BLOCKED until a person confirms against a paused probe ad in Ads Manager (`meta_account_controls.budget_unit_*`). - **Execution-time controls**: proposals re-read Meta, prove the object belongs to the account, then re-evaluate the gate right before the write (blocked => released back to approved); unattended execution is hard-limited to pause / lower daily budget; rule scope re-checked (`proposalWithinRule`); account-wide rules can only notify. - **Ad-creation contract** follows Meta's lead-ads guide (link `https://fb.me/`, six allowed CTAs, video CTA shape, video cover via image_hash); manual placements disabled (values unverified). - **Still unverified against live Meta** (setup doc §3b): budget unit semantics, CTA-per-objective rules for website ads, `promoted_object` shape, video cover requirement/status values, file-size limits, lead-form listing by a System User, Instagram identity use.

## 27. In-app assistant, customer documents, guided Meta tracking (migrations 0049-0051, 2026-10-19/20, NOT yet applied/deployed)
Full guide (deploy order, budget behaviour and its limits, provider-side spend controls, security model, what is/isn't tested): `docs/assistant.md`.
- **Assistant**: floating button + panel mounted in `app/app/layout.tsx` (`components/assistant/*`) for admin/setter/contractor. Chat API `POST /api/assistant/chat` (NDJSON stream), `/api/assistant/{status,context,conversations,actions/[id]}`. Engine `lib/assistant/{chat,registry,tools,doc-tools,meta-tools,execute,limits,pricing,prompt,access,session,untrusted,errors,config}.ts`. Default model `claude-sonnet-5-5` (`ANTHROPIC_MODEL`). Tools read through the user's RLS client with an explicit contractor pin; the model only *proposes* (`assistant_actions`), the user confirms, the server re-authorizes, claims atomically and verifies by read-back. Tables: `assistant_conversations/messages/actions/usage` (select-own RLS, server-only writes), function `assistant_spend_micros` (service role).
- **Customer documents**: `contract_templates` gained `doc_type`, `jurisdictions`, `assistant_approved_version` (admin approval per published version; panel `components/contracts/template-doc-panel.tsx`, `setCustomerDocSettings`). New `customer_documents` (+ immutable `_versions`, `_events`; frozen once sent). Code `lib/documents/{service,preview}.ts`; starters `CUSTOMER_STARTER_TEMPLATES`; merge fields `customer_*`, `project_*`, `total_price`... in `lib/contracts/variables.ts`. Sending = e-signature request via the existing signing engine, bound to the approved version hash, separate Confirm.
- **Meta tracking setup**: `lib/meta/setup/*` (OAuth `app/api/integrations/meta/connect/{start,callback}`, encrypted tokens, asset listing, configure/create/verify, guidance). Tables `meta_connections`, `meta_connection_secrets` (no policies), `meta_funnel_tracking`, `meta_setup_log` (append-only). Allowed: admins + contractor owners. Reuses `trackingPixels.metaPixelId`, the browser pixel and CAPI; "verified" only from Meta-reported events. Dormant until `META_APP_ID`/`META_APP_SECRET`/`META_TOKEN_ENCRYPTION_KEY` are set. Cannot publish ads, change budgets or edit active campaigns.
- **Tests**: `tests/assistant-{sql,core,documents,meta,ui}.test.ts` (+ `tests/helpers/tenant-db.ts`). Not exercised against live Anthropic/Meta/email.
- **Deploy order**: apply 0049, 0050, 0051 before deploying; `tests/migration-plan.test.ts` was updated for them.

## 28. Automatic texting from the owner's Mac (migration 0052, 2026-10-21, ships OFF)

New real funnel leads are texted as **HomeQuote** (house funnels; contractor-branded funnels only if "text as the contractor" is enabled in settings) from the owner's Mac via iMessage, and an AI agent asks call-or-text and qualifies over text. Nothing sends until: migration `0052_sms_texting.sql` applied, `SMS_BRIDGE_TOKEN` (24+ chars) set in Vercel, `ANTHROPIC_API_KEY` set, the Mac bridge running, and an admin turns it on at **`/app/texting`** (nav "Texting", admin only; "Stop all texting" cancels queued messages).

- **Flow:** `app/api/funnels/[slug]/session/route.ts` PATCH, after a real (non-demo) contact submit and only if `smsConfigured()`, calls `startSmsForLead` (`lib/sms/service.ts`): checks settings/opt-out/phone/daily cap, creates one `sms_conversations` row per lead (unique `lead_id`, idempotent), queues a deterministic opening text (casual "Hey {name}, it's HomeQuote…", asks call vs text; no AI disclosure or "reply STOP" line since consent/STOP wording is on the form, but STOP replies are always honored; the AI admits being automated only if sincerely asked) with `send_after` = next time inside the lead's local texting window (default 8am–9pm; zone from lead state/ZIP via `lib/ai-calling/timezone.ts`, fallback ET+PT strictest).
- **Bridge:** `scripts/mac-sms-bridge/bridge.mjs` (no deps; README + launchd plist alongside) polls `POST /api/sms/bridge/pull` (atomic `claim_sms_outbound`; also the heartbeat shown on `/app/texting`), sends through Messages with `osascript` (args, never string-spliced; optional SMS fallback), acks via `/ack`, and reads new incoming texts from `~/Library/Messages/chat.db` (read-only `sqlite3`, needs Full Disk Access) and posts them to `/inbound` (guid de-duplicated). All three routes require `Authorization: Bearer $SMS_BRIDGE_TOKEN`. Messages stuck "sending" 10+ min become failed, never resent.
- **Agent:** `lib/sms/agent.ts` — forced `send_reply` tool call (message, mode call/text, qualification unknown/qualified/unqualified, call_time, handoff, close, summary), model `SMS_MODEL` (default `claude-haiku-5-5`), lead text and form answers passed as untrusted data, no tools/data access, links stripped, 320-char cap, max 14 AI turns then human handoff. Replies are queued a few seconds out. On handoff/close/provider failure the conversation moves to `handoff`/`closed`, a `lead_activities` system note with `needs_attention` is written, and the AI goes silent. It does **not** set `leads.qualified` (that fires the QualifiedLead Meta event/workflows); staff do.
- **Goal = book the visit (2026-10-22):** the agent's one goal is a day and rough time for the free in-home estimate visit with a local contractor. After the opening call-or-text question it steers to the visit, asks day then morning/afternoon/evening, makes sure decision-makers can be there and that they own the home, and skips budget/payment questions unless raised. It sets `appointment_time` (their words); `replyWithAgent` then forces `handoff`, writes a `needs_attention` note ("Requested visit time: … (not confirmed yet)") and sends a "A lead wants a visit" push + email (replaces the generic call alert). The time is a REQUEST: the bot never confirms an exact time; a person confirms it and creates the appointment (`scheduleAppointment`). Not built yet: offering real slots from `lib/availability` and auto-creating the appointment.
- **Books real times (2026-10-29, no migration; supersedes the request-only flow above when times load).**
  - **The problem:** in a real conversation (Amber, Pool Masters) the bot took five back-and-forths (weekday/weekend → morning/afternoon → which day → spouse → "want me to pass that along?") and still booked nothing.
  - **Now:** each turn, `loadBookingOptions` (`lib/sms/scheduling.server.ts`) gives the agent real open times as a trusted `<open_times>` block in the system prompt (`openTimesBlock` in `lib/sms/agent.ts`). Lead text stays in `<tool_data>`. The agent offers exactly 3 in one text and sets `book_slot` (an id like `v2` / `c1`) once the homeowner accepts one. Owner decision: **visit if they want text, call if they want a call.**
    - **visit** (`v…`): the contractor's on-site availability (§24 rules, else the default hours; 60-minute visits on the hour), on the lead's open assignment. Booked by `bookVisit`: an `appointments` row with `booked_via 'chat'`, assignment + lead → `appointment_set`, after re-checking availability and a direct overlap check.
    - **call** (`c…`): the lead's HomeQuote calendar (§45: the contractor's, created on first use, else the team calendar). Booked by `bookCall` → `bookAppointment` (source `ai`, actor homeowner), then `notifyBookingSoon` for emails and host alerts.
    - **Which times:** `pickOpenTimes` (`lib/sms/scheduling.ts`) gives the first 6 open days, up to a morning, midday and afternoon time each, with 3 h minimum notice.
    - **No visit without a contractor:** a network lead with no contractor gets only the call. A lead with a live (scheduled/rescheduled) upcoming appointment gets `already_booked` and nothing new.
  - **After booking** (`bookPicked` in `lib/sms/service.ts`):
    - The server sends the confirmation with the exact time (`visitBookedText` / `callBookedText`, "…Need a different time? Just reply R."); the agent's own line is dropped.
    - That text is filed as the appointment's `booked` reminder (`sms_messages.reminder_*` + an `sms_reminders` row), so `runTextReminders` never sends a second one and YES / R replies work at once.
    - The conversation goes to `handoff`, which also makes the booking system's own confirmation text skip (`person_took_over`); its emails still go.
    - Timeline note "Booked a free estimate visit by text: …", plus a push "A lead booked a visit / call".
  - **When it doesn't book:**
    - A time taken in the meantime gets three fresh ones (`takenText`, conversation stays active).
    - Any other booking failure hands off with a needs-attention note.
    - A made-up id is ignored.
    - No times at all → the old request-and-hand-off flow (`appointment_time`).
  - **Tests:** `tests/sms-booking.test.ts`, which also caught two bugs before shipping: `lead_assignments` has `assigned_at`, not `created_at`; appointments have no `confirmed` status. `tests/sms-texting.test.ts` prompt test updated. **Not yet replayed against the live model** (no API key in the build environment): watch the next few real conversations on `/app/texting`.
- **Wants-a-call alert (2026-10-22):** when the agent's reply sets `mode: 'call'` (first time), and again when the lead then gives a time, `replyWithAgent` calls `notifyAdmins` (`lib/sms/health-notify.ts`): push to every active admin in the HomeQuote app (type `workflow_alert`, links to `/app/leads/<id>`) plus email to the lead-alert recipients. Generic, lock-screen-safe text (no name or number). Best effort: a failed alert never affects the conversation. The bot's own replies and hand-off behaviour are unchanged.
- **Compliance:** STOP/UNSUBSCRIBE/etc. (`lib/sms/rules.ts isOptOut`) → opt-out row, queued texts cancelled, one confirmation, conversation `opted_out`, never texted again (START re-subscribes to human handoff). HELP gets a canned reply. Texts from numbers we never contacted are ignored. Consent comes from the funnel consent line (already covers "call, text, or email … automated technology … Reply STOP").
- **Tables (0052):** `sms_settings` (singleton: enabled/stopped_at, contractor_funnels_enabled, window hours, daily_cap, bridge_last_seen_at), `sms_opt_outs`, `sms_conversations`, `sms_messages`; admin SELECT RLS only, service-role writes. Admin UI: `/app/texting` (switch, bridge status, settings, conversation list), lead page "Text conversation" panel with take-over / hand-back (`lib/actions/sms.ts`). Tests: `tests/sms-texting.test.ts`.
- **Bridge-down alert (migration 0053):** `checkBridgeHealth` (`lib/sms/health.ts`) runs from the existing 5-minute `POST /api/workflows/tick` (no new secret/scheduler). If texting is on and a due text has sat unsent 5+ min (or a claimed one 3+ min), admins get a push (`workflow_alert` type) and the lead-alert recipients get an email via `lib/sms/health-notify.ts`; repeats at most hourly (`sms_settings.bridge_alert_sent_at`), sends one "Texting is back" on recovery. `/app/texting` also shows how many texts are waiting.
- **Meta Instant Form leads (2026-10-26):** `ingestLead` (`lib/integrations/intake.ts`) calls `startSmsForMetaLead` (`lib/sms/service.ts`) after a new `provider='meta'` lead is created, ONLY when `SMS_BRIDGE_TOKEN` is set, `SMS_META_LEADS=1` is set in Vercel, and `/app/texting` is on. Same queue, texting hours, opt-out, daily cap and AI agent as funnel leads, always sent as the house sender; the project (kitchen/bathroom remodel) is read from the form answers (`metaProject`), and `handleInbound` gives the agent `leads.answers` when there is no funnel session. Skips Meta test leads (answers starting `<test lead`), bad phones and opted-out numbers. Consent: Instant Form leads import with `consent_granted=false` (the forms have no text-consent line), so `SMS_META_LEADS` is deliberately a separate opt-in; confirm the form disclaimer covers texting before turning it on. Contractor Pages: `startSmsForMetaLead(db, leadId, now, {contractorId, senderName})` sends as the Page's sender name (house name if blank) and creates the conversation with that `contractor_id`, but only when `sms_settings.contractor_funnels_enabled` AND `contractors.texting_enabled` are both on (else `contractor_funnel_off`), exactly like contractor funnels. Tests: `tests/sms-texting.test.ts` ("Meta Instant Form leads", "Meta Pages owned by a contractor").
- **Caveats:** iMessage automation is unofficial (use a dedicated Apple ID/number; Mac must stay awake); replies the owner types by hand in Messages are not logged; green-bubble SMS needs a paired iPhone.

## Brand (Oct 2026 rebrand, branch `rebrand`)
Brand Guidelines v1.0 applied: tokens in `app/globals.css` and `app/(marketing)/marketing.css`, logos in `public/brand/` via `components/brand-logo.tsx`, fonts Sora + DM Sans in `app/layout.tsx`. Gold is the CTA colour on Navy marketing/ad pages only. Details and copy flags: `docs/rebrand/REBRAND_NOTES.md`.


## 24. Contractor availability + calendar sync (migration 0047, added 2026-10-14, NOT yet applied/deployed)
- **Data** (all keyed by `contractors.id`): `contractor_availability_settings` (tz, `weekly_schedule_enabled`, notice, buffer, daily cap, default duration), `contractor_availability_rules` (weekly windows, weekday 0=Sun, local minutes), `contractor_availability_exceptions` (blocked/available, date range or weekly repeat, optional hours). RLS: read = staff (admin/setter) or same company; write = admin or contractor **owner** of that company. No settings/rules/exceptions ⇒ the DEFAULT weekly hours apply (`DEFAULT_WEEKLY_RULES` in `lib/availability/slots.ts`, applied in `loadStoredAvailability`; changed 2026-10-23): Sun 9–7, Mon–Thu 9–6:30, Fri 9–3, Sat off. Saving anything on `/app/availability` replaces them; a contractor with an existing settings row keeps their own choice (weekly off ⇒ unrestricted).
- **Calendar tables**: `calendar_connections` (per user; encrypted credentials; clients get column-level SELECT on safe columns only, no client writes), `appointment_calendar_events` (appointment↔external event; no FK so deleted appointments can still be cleaned up), `calendar_sync_jobs` (outbox, one pending job per appointment, filled by trigger `trg_appointments_calendar_sync`, claimed via `claim_calendar_sync_jobs`), `calendar_feed_tokens` (service-role only). Tests: `tests/availability-db.test.ts` (runs the real migration chain in PGlite; `fullSchema({supabaseGrants:true})`).
- **Logic**: `lib/availability/{time,slots}.ts` pure (DST-safe; `unavailableReason`, `bookableSlots`, `unavailableIntervals`), `data.server.ts` loads context (service role), `enforce.server.ts` `checkContractorSlot`. Tests: `availability-slots.test.ts`.
- **Enforcement**: `scheduleAppointment` (`lib/actions/leads.ts`) — admin/setter are rejected for unavailable times unless "Book anyway" (audited as `appointment.availability_override` via service role); contractors are not blocked by their own rules; lookup failures never block. The datetime-local value is now parsed as workspace time (`DEFAULT_TZ`) rather than the server zone. Workflow-created appointments and bookings through the old Calendly/GHL fallback are NOT checked. Calls homeowners book online use the separate booking calendars (§43: own hours, checked under a lock); a contractor's booking calendar treats these on-site visits as busy.
- **Google for HomeQuote hosts (0070)**: `mayConnectGoogleCalendar` (`lib/calendar/google.ts`) also lets active admins / setters connect (no contractor on the connection; they return to `/app/calendar/settings`), so the team / sales booking calendars respect their busy time and receive their calls.
- **Google**: `lib/calendar/{config,google,connections.server,busy.server,sync.server,appointment-event.server}.ts`; OAuth with PKCE + state cookie bound to the user (`hqn_gcal_oauth_*`), scopes `calendar.events` + `calendar.freebusy`, refresh token AES-256-GCM (`CALENDAR_TOKEN_ENCRYPTION_KEY` or `GMAIL_TOKEN_ENCRYPTION_KEY`). Env: `GOOGLE_CALENDAR_CLIENT_ID/_SECRET/_REDIRECT_URI` (dormant until set). Deterministic event ids make retries idempotent; revoked grant ⇒ `needs_reconnect`. Sync is flushed with `flushCalendarSyncSoon()` and retried by `/api/workflows/tick` (`runCalendarMaintenance`). Primary calendar only; busy times read as start/end only.
- **Primary connect path (2026-10-14 follow-up)**: the private subscribe link with "Add to Apple Calendar" / "Add to Google Calendar" (`calendar.google.com/calendar/render?cid=<webcal url>`) buttons needs no keys; the Google OAuth card is hidden unless `GOOGLE_CALENDAR_*` are set or a connection exists.
- **Apple**: no OAuth exists; shipped = private subscribe `.ics` feed + per-appointment `.ics`. Two-way CalDAV NOT built.
- **UI**: `app/app/availability/page.tsx`, `components/availability/*`; nav item "Availability" for admin+contractor only (setter nav is pinned to five sections by `tests/setter-access.test.ts`; setters use "View availability" on `/app/contractors/[id]` and the booking warning in `components/leads/assignment-manager.tsx`). Guide: `docs/contractor-availability-calendar.md`.
- **Known gaps**: no push alert for needs-reconnect; no calendar picker; disconnect leaves already-written events; Google sensitive-scope verification required beyond test users.

## 25. Password reset (own flow, 2026-10-15)
- **Root cause of the old bug**: reset links used `redirectTo = NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` and were sent by Supabase's default mailer; with the env var unset in production (and/or Supabase Auth → URL Configuration still on localhost / missing the live URL in the redirect allow-list) the email led to localhost.
- **Now**: `forgotPasswordAction` and admin `resetPassword` (`lib/actions/team.ts`) call `sendPasswordReset` (`lib/auth/password-reset.ts`): `auth.admin.generateLink({type:'recovery'})` (no Supabase email) → branded email through the HomeQuote Gmail automation sender → link `/reset-password?token_hash=…` on our own domain. The one-time token is only spent when the person presses **Continue** (`continueResetAction`, `verifyOtp`), so email scanners can't burn it; then `/set-password`. Unknown emails are silent (no enumeration). If the Gmail sender isn't connected it falls back to Supabase's email with a corrected redirect.
- `lib/auth/site-url.ts` `publicSiteUrl()` never returns localhost in production (env → `VERCEL_PROJECT_PRODUCTION_URL` → `https://homequotenet.com`). Invites (`inviteUserByEmail`) still use Supabase's mailer but now get the corrected redirect URL. Tests: `tests/password-reset.test.ts`.


## 26. Send a Stripe payment for anything (migration 0048, 2026-10-15)
- **What**: admins can send an ad-hoc Stripe payment from `/app/billing` ("Send payment" button): any amount (50¢ to $100,000), one-time or monthly (+ optional setup fee on monthly), a description shown at checkout, optional customer name/email, optional company link, optional email of the link (HomeQuote Gmail sender, branded). Independent of Growth Tools `service_requests` (those still only get paid after a contractor requests and an admin prices them).
- **How**: `sendPaymentRequest` (`lib/actions/payment-requests.ts`, admin only) saves a `payment_requests` row (service role), creates Stripe Prices + a single-use **Payment Link** (`restrictions.completed_sessions.limit=1`, `managed_payments` off like Growth Tools checkout, metadata `payment_request_id`), stores the URL, writes `audit_logs` `payment_request.created`. `cancelPaymentRequest` deactivates an unpaid link. Validation/email in `lib/billing/payment-request.ts`. UI: `components/billing/send-payment-dialog.tsx`, `payment-links.tsx` (last 25, status, copy link, cancel).
- **Paid status**: the existing `/api/stripe/webhook` handles `checkout.session.completed/async_payment_succeeded` for these sessions in `markPaymentRequestPaid` (`lib/billing/webhook.ts`): matches `metadata.payment_request_id` or the Payment Link id; async bank debits stay "sent" until they clear; Growth Tools handling is unchanged.
- **Table**: `payment_requests` (admin SELECT via RLS; no client writes). Tests: `payment-requests.test.ts`, `payment-requests-db.test.ts`.
- **Needs**: `STRIPE_SECRET_KEY` (must be allowed to create prices and payment links) and the webhook subscribed to the checkout events; `.env.example` now lists the Stripe vars. Recurring renewals of a monthly link are tracked in Stripe, not marked in this table.


## 27. Blank funnel steps fix (2026-10-21, no migration)
- **Symptom**: some question screens rendered empty (just the progress bar). **Cause**: `visibleQuestions()` hides any question whose `showWhen` rules aren't met by the answers so far. The builder's live preview jumps straight to a clicked step (`jumpToStep`) with no answers, so every conditional ("↳") question was hidden and the screen had no question to draw. The kitchen and bathroom presets have 8 of 11 questions conditional, and the same applies to any funnel with branching.
- **Fix**: `previewAnswersForStep()` (`lib/funnels/builder.ts`) fills in answers that satisfy the target's `showWhen` chain (and plausible first options for other earlier questions) when the preview opens a step. `resolveStep()` (`lib/funnels/schema.ts`) is a guard in `components/funnels/funnel-experience.tsx`: if a saved/jumped step names a hidden or missing question it shows the first visible unanswered question instead (and re-syncs the server step) rather than a blank screen. Public visitors were never walked into this by the normal flow (verified over every answer path of all bundled funnels). Tests: `tests/funnel-blank-steps.test.ts`.

## 29. Meta CRM stage events for website funnel leads (migration 0055, 2026-10-22, ships OFF)
Bathroom and kitchen funnels (Pixel/dataset `29178560738497902`) now send Meta **Conversions API for CRM** stage events. `lib/meta/conversions.ts` has a third source kind `website_crm` (`usesWebsiteCrm`: website lead whose `session.pixelId` equals `meta_settings.dataset_id`, passed as `crmDatasetId` into `decide`). Events `lead_received`/`qualified`/`appointment_booked`/`won`, `action_source=system_generated`, `custom_data {event_source:'crm', lead_event_source:'HomeQuote Network'}`, event id `crm:<lead id>:<stage>`, `user_data` = hashed `em`/`ph` arrays + `fn/ln/zp/country`, raw `fbc`/`fbp`, `lead_id` only if a real leadgen id exists. `lib/meta/queue.ts` prepends `lead_received` for these leads like Instant Form leads and passes `crmDatasetId` in both feed and dispatch (so test-mode re-checks route the same way). Migration `0055_meta_website_crm_events.sql` widens the `meta_conversion_events.source_kind` check; **apply it before deploying the code**. The events page labels these "Website · CRM". Nothing is sent until `meta_settings.delivery_mode` = live (type `ENABLE LIVE` on Meta Ads -> Setup), which also needs `META_CONVERSIONS_API_TOKEN` to have access to the dataset. Docs: `docs/meta-ads-setup.md` §3 B2. Tests: `tests/meta-conversions.test.ts` ("website leads on the CRM dataset"). Not verified against real Meta.

## 29. Niche tagging for the shared Meta Pixel (2026-10-23, no migration)

One Pixel, many niches: every WEBSITE event now carries the same custom parameters, so Events Manager can split by niche. `lib/meta/niche.ts` (pure) maps a funnel's `industry` text + slug to a niche (`bathroom`, `kitchen`, `kitchen_bath`, `adu`, `pool`, `roofing`, `hvac`, `fencing`, `remodeling`, `other`; a slug like `bathroom-...` wins over vague industry text) and `nicheDataFor()` returns `{ content_category: 'Bathroom Remodeling', niche: 'bathroom', content_name: '<slug>' }`. Sent on: the browser Pixel (`lib/funnels/tracking.ts` `trackFunnel`, new 5th arg `industry`; ADU quiz `components/adu-quiz/tracking.ts`), the direct Conversions API events (`customData` on `MetaLeadEvent` in `lib/meta/capi.ts`: funnel session route Lead/Schedule, `lib/meta/qualified.ts` QualifiedLead, ADU quiz Lead/QualifiedLead/Schedule), and the queued website-pixel events (`buildPayload` `opts.niche`, loaded in `lib/meta/queue.server.ts`; merged with value/currency for WonJob). NOT added to the Conversions API for CRM events (instant-form and website-CRM stage events): Meta defines their `custom_data`. A new funnel is tagged automatically from its industry text; a new niche needs one rule in `nicheOf`. In Events Manager: Custom conversions / audiences with a rule on `niche` or `content_category` (parameters must have been received once before they appear). Tests: `tests/meta-niche.test.ts`, `tests/funnel-tracking.test.ts`.

## 30. Creative Studio (REMOVED 2026-10-23; replaced by Seret, §31)
The admin-only `/app/creative-studio` page (muapi.ai generator/agent embeds plus an "Add embed" dialog) was removed along with its code (`content/creative-studio.ts`, `components/creative-studio/*`, `lib/actions|data/creative-studio.ts`, `lib/creative-studio/embed.ts`, its tests). `/app/creative-studio` now redirects to `/studio` (`next.config.ts` `redirects`). Migration **0056** and its table `creative_studio_embeds` were left in place (nothing reads them any more; any rows added there are kept, not deleted). Drop the table in a later migration if it is not wanted.

## 31. Seret studio (formerly MOTC) at /studio (2026-10-23, no migration)
Seret (Hebrew סרט, "film"; renamed from MOTC 2026-10-23; "by HomeQuote Network": AI image, video, cinema and lip-sync studio, originally the private repo `tzarcheiliam-lgtm/MOTC-`) now lives in this repo under **`studio/`**: a separate static Vite + vanilla JS + Tailwind 4 app with its own `package.json`/lockfile, not part of the Next app. **Build:** root `npm run build` runs `build:studio` first (`cd studio && npm ci --include=dev && VITE_KIE_KEY= npm run build`; `--include=dev` is required because Vercel builds with NODE_ENV=production and all of the studio's build tools are devDependencies), which writes `public/studio/` (gitignored, regenerated every deploy; `studio/vite.config.mjs` sets `base: '/studio/'`, `outDir: '../public/studio'` and an inline empty PostCSS config so the site's `postcss.config.mjs` is not picked up). **Serving:** `next.config.ts` rewrites `/studio` -> `/studio/index.html`; `/studio/` 308s to `/studio`; **Admins only (2026-10-23):** `lib/supabase/middleware.ts` gates `/studio*` itself (static files have no page to run `requireRole`): signed out -> `/sign-in`; signed in but not an active admin (or no profile row) -> `/app`; Supabase unreachable or not configured -> 503 (fails closed). Images (`.png/.webp/.svg`) skip the middleware matcher, so only the lens pictures stay fetchable; the page, JS and CSS are gated. Tests: `tests/studio-access.test.ts`. Not linked from the marketing site. Admins open it from the portal menu: **Growth > Seret** (`lib/nav.ts`, `newTab: true`, `Clapperboard` icon), which opens `/studio` in a new tab via `components/nav-link.tsx` (plain `<a target=_blank>` for `newTab` items, Next `Link` otherwise) in both the sidebar and the mobile menu. **Keys/cost:** the studio calls kie.ai straight from the browser with each user's own kie.ai key (localStorage `kie_key`), so it runs on no shared account; the build script blanks `VITE_KIE_KEY` so a key can never be baked into the public bundle (tested in `tests/seret-studio.test.ts`). `studio/` and `public/studio/` are excluded from ESLint and `tsconfig.json`. **Look (2026-10-23):** rebranded from black/red to HomeQuote dark: Navy surfaces (`app-bg #06132e`, `panel-bg #0a1b3d`), HomeQuote Blue lifted for contrast on navy (`primary #2f6bff`, hover `#0038b8`), Gold `#f5b700` only for the active-nav dot, Sora headings + DM Sans body (Google Fonts in `studio/index.html`), its own logo in the header and as favicon: `public/brand/seret-icon.svg` (the HomeQuote house as a film frame: sprocket holes down the sides, white frame with a blue play button, gold roof window). Tokens live in `studio/src/styles/global.css` (`@theme`; `--color-black` is deep navy so overlays never read pure black) and `styles/variables.css`. **Redesign (2026-10-24), media-first:** brief in `docs/prompts/seret-redesign.md`.
- **Shell and routes:** `components/Shell.js` (left icon rail on desktop, bottom bar on phones, credits pill) replaces `Header.js`. `lib/router.js` adds hash routes (`#/`, `#/models`, `#/models/<id>`, `#/image|video|lipsync|cinema|projects`), routed in `main.js`. Studios take `?prompt=&model=`: the prompt fills the textarea marked `data-prompt-box`, and the model is accepted only when it's a real id of that kind (saved as the preferred model).
- **Explore** (`ExplorePage.js`, the default page): hero prompt, contractor presets (`lib/presets.js`), your recent creations, and a "Made with Seret" masonry feed.
- **Models gallery and model detail** (`ModelsPage.js`, `ModelDetailPage.js`): specs come only from `inputs` (`lib/specs.js`). Maker, tagline, "best for" and price are hand-written in `lib/modelInfo.js`, keyed by `runsAs`; prices appear only where kie.ai's own site shows them (with source and date). Detail pages say plainly when a listed model runs as a different kie.ai model (e.g. Kling v3.0 Pro runs as Kling 2.1 Pro).
- **Shared code:** `components/media.js` (placeholders, hover-play, viewer with Recreate, masonry) and `lib/creations.js` (reads the four histories).
- **Samples:** `studio/scripts/generate-samples.mjs` is run by hand with `KIE_API_KEY`. It prints the plan and estimated cost (about $6.73 / 1,350 credits for 23 samples; `--images-only` about $0.56) and asks before spending. It downloads results to `studio/public/samples/` (served at `/studio/samples/`) and writes `lib/samples.js` (empty until run; pages show branded placeholders meanwhile). Re-runs only generate missing files. With ffmpeg, downloads are shrunk (videos ≤1280px H.264 + WebP poster, images ≤1600px WebP); `--optimize-existing` does the same for files already there. **Generated 2026-10-24:** 19 samples (9 models + 6 preset covers, 7.9 MB) for about 720 credits.
- **kie.js:** uses `import.meta.env?.` and `globalThis` so the script can reuse it in Node; browser behaviour is unchanged.
- **kie.ai model fixes (2026-10-24, checked against docs.kie.ai):**
  - Model names: Nano Banana is `google/nano-banana` and its edit model `google/nano-banana-edit` (images in `image_urls`). Google and Qwen models only accept `output_format` `jpeg`.
  - Field names: Kling i2v takes one `image_url` and a string duration. Seedance 2 i2v takes `first_frame_url`. Wan always uses `480P`-style resolutions. Veo no longer sends the deprecated `enableFallback`.
  - Polling: a failed generation now stops polling at once. It used to retry until the attempt limit (up to 30 min).
  - Unavailable text-to-video models, each with its reason (`catalog.js` `videoUnavailable`): Kling (kie.ai's Kling 2.1 is image-to-video only), Seedance 1.5 Pro, and Sora 2 / OVI (not in kie.ai's docs).
  - Result: 9 kie.ai models are runnable. Newer kie.ai models (Kling 2.6/3.0, Seedance 2.5, Grok Imagine video, Veo's new jobs API) are not mapped yet.
- **Phones:** the studios' fixed History strip is hidden below `md` (Projects covers it).
- **Tests:** `tests/seret-studio.test.ts` (presets use runnable models and valid aspect ratios; `modelInfo` matches `runsAs`; router round-trip). Studio internals (generation flows) were not restyled beyond the shell, and nothing was verified against live kie.ai.

**Projects tab (2026-10-23):** `studio/src/components/ProjectsPage.js` (route `projects`, last item in the header) lists *In progress* jobs from `kie_pending_jobs` and *Done* items merged from the four per-studio histories (`kie_history`, `video_history`, `lipsync_history`, `cinema_history`; all browser localStorage, so per browser), with a studio filter. It checks running jobs every 10s with `kie.checkTask()` (one request, no waiting) and shows Generating / Ready / Failed, but never writes history itself (the studio that started a job saves it when opened, via its existing resume code, so no studio's list can be overwritten). Same change: `kie._extractUrl()` now also reads the jobs API's `resultJson` string, and the studios' resume code uses it (it read fields kie.ai does not return). Not verified against live kie.ai. To work on it: `cd studio && npm install && npm run dev` (see `studio/README.md`). Not verified against live kie.ai generation in this change (UI, routing and assets verified in Chromium against a production build).


## 30. In-app texting + default-hours controls (migration 0057, added 2026-10-23)
- **Texting page** (`/app/texting`, admin): "What the assistant says" card saves `sms_settings.bot_extra_instructions` (≤1500 chars, appended to the fixed prompt by `systemPromptFor` in `lib/sms/agent.ts`; framed as goal/wording guidance that cannot override STOP/no prices/no links/handoff) and `house_sender_name` (name texts come from on HomeQuote funnels; default "HomeQuote"). `loadSettings` falls back to the old columns until 0057 is applied.
- **Per-contractor texting:** `contractors.texting_enabled` (default false; backfilled true for existing contractors only if contractor-funnel texting was already on). A contractor funnel texts only when BOTH `sms_settings.contractor_funnels_enabled` (master) AND the contractor's switch are on. Toggle on `/app/contractors/[id]` ("Automatic texting", `setContractorTexting`).
- **Default hours editable:** table `availability_defaults` (singleton; `timezone`, `rules` jsonb of `{weekday,startMinute,endMinute}`), editable by admins at the top of `/app/availability` (`saveDefaultHours`). `loadDefaultHours` (lib/availability/data.server.ts) falls back to `DEFAULT_WEEKLY_RULES` if the table is missing. Seeded: Sun 9–7, Mon–Thu 9–6:30, Fri 9–3, Sat off.

## 31. Short house funnels (2026-10-24)
- `bathroom-remodel` and `kitchen-remodel` (preset JSON in `content/funnels/`, and the live published rows) are now five questions: project type, ZIP, "Do you own the home?", "When do you want the work to start?" (asked, not used to qualify) and the property address (timeline and address asked only of homeowners; address required). Qualified = a full-remodel-type project AND homeowner = yes. Renters and small repairs are marked not qualified (`unqualifiedAction` still `review`). The live rows were updated directly in `funnels.config` (same as the builder's save); sessions already in progress keep their own `config_snapshot`.

## 32. Seret API: Claude uses Seret through MCP (migration 0058, 2026-10-24; applied to production 2026-10-27)

### Endpoint: `POST /api/seret/mcp`
- A stateless MCP server over Streamable HTTP (`app/api/seret/mcp/route.ts`). It speaks JSON-RPC and replies with plain JSON.
- GET and DELETE return 405. Notifications return 202.
- **Auth:** the `Authorization: Bearer seret_…` header. Keys are never accepted in the URL.
- The middleware skips this path, so no Supabase session is involved.

### Tools
- `list_models` and `list_presets`
- `generate_image`: waits up to 45s and returns a link.
- `generate_video`: returns a job id right away.
- `get_job`
- `list_recent`

Tool problems (unknown model, bad aspect ratio, kie.ai errors) come back as `isError` tool results, so Claude can read them and fix its request.

### Keys
- `lib/seret/keys.ts` makes keys of the form `seret_` + 256 bits.
- Only the SHA-256 hash is stored, in `seret_api_keys`. The key itself is shown once.
- Revoking a key blocks it immediately.
- Admins create and revoke keys at `/app/seret-api` (nav: Growth > Seret API). The page also shows the setup:
  - Claude Code: `claude mcp add --transport http seret <url> --header "Authorization: Bearer <key>"`.
  - claude.ai / Desktop: Settings → Connectors → Add custom connector → Request headers. This option is in beta per Anthropic's docs.

### Engine (`lib/seret/engine.ts`)
- **Shared code:** it reuses the studio's own `studio/src/lib/{kie,catalog,specs,modelInfo,presets}.js`, so model mapping is identical to the studio.
- **Which kie.ai key it uses:** the server's `KIE_API_KEY` env var, not a browser key. Without it, generating fails with a clear error.
- **Starting a job:** `kie.js` gained `noWait` (start the job and return its task id).
- **Saving results:** rows go in `seret_generations`. On success the file is copied into the private `seret-media` bucket and served through 7-day signed links, because kie.ai's links are temporary `tempfile` URLs.
- **Seret's Projects tab:** a "Made by Claude" section reads `GET /api/seret/generations` (signed-in, active admins only).

### Deploy order
1. ~~Apply 0058~~ — done 2026-10-27 (run by the owner in the Supabase SQL editor; verified: both tables with RLS and admin-only select policies, private `seret-media` bucket).
2. Set `KIE_API_KEY` in Vercel (Production) — not verified from here.
3. Deploy.

### Tests
- `tests/seret-mcp.test.ts`: auth, initialize, tools list, list_models, errors.
- `tests/seret-keys.test.ts`.
- Verified live: kie.ai start-then-check with `noWait` (1K image in 19s).
- Not yet verified end to end against the real database (0058 is now applied; needs a key created on `/app/seret-api` and a real generation).

## 32. Call list "Next" stays in the list you're working (2026-10-26)
- The Calls list carries its view + filters (niche, city, county, service, caller, …) in the URL (`lib/calls/context.ts`). Opening a prospect from the table/cards keeps them as query params; `/app/calls/[id]` and the log form (`list_context` hidden field) use them so **Next** and **Save & next** go to the next prospect in that same list (`nextProspectInContext` in `lib/data/prospects.ts`, same view/filter/sort as the list), not the caller's whole queue. With no narrowed list (plain "mine"), the old behaviour (`nextProspectIdFor`: due callbacks first) is kept. Test: `tests/calls-next-in-list.test.ts`.

## 33. More texting customization (migration 0059, added 2026-10-27; applied to production — its columns were confirmed present 2026-10-27)
- **Opening text template** (`sms_settings.opening_template`; per contractor `contractors.texting_opening_template`): placeholders `{first_name}` (blank → "there"), `{sender}` (required, so the text always says who is texting) and `{project}`. `renderOpening`/`openingTemplateProblem` in `lib/sms/rules.ts`; an invalid template saved by hand falls back to `DEFAULT_OPENING_TEMPLATE`. A contractor's template beats the general one; house funnels use the general one.
- **Per-contractor wording** on `/app/contractors/[id]`: `texting_sender_name` (else the funnel's business name), opening template, and `texting_extra_instructions` (appended to the general instructions as "For <name> specifically: …"; total capped by `MAX_EXTRA_TOTAL`).
- **Timing** on `/app/texting`: `first_text_delay_minutes` (0–1440, pause before the first text; the texting window still applies afterwards) and `max_ai_turns` (2–40, replies before handing off; was fixed at 14). `loadSettings` / `loadContractorTexting` fall back to older columns until 0057/0059 are applied.

## 34. Daily call goal, one-tap calling and stats (migration 0060, 2026-10-27; applied to production 2026-10-27)
Makes cold calling (`/app/calls`) and setters' homeowner calling (`/app/leads`) feel like a game you keep playing. Plan: `docs/calling-dopamine-plan.md`.

**What counts as a call.** Rows in either log, filtered by user: `prospect_call_attempts.caller_id` and `lead_activities` with `type='contact_attempt'` by `actor_id`. Repeat logs on the same prospect/lead within 60s count once (`dedupeEvents`). Days, pace and streaks use the Los Angeles day, and pace measures against the 8:00–17:00 workday. All of this is pure, tested logic in `lib/calls/goals.ts` (`tests/calls-goals.test.ts`).

**Data.** `lib/data/call-stats.ts` reads through the **service role, always filtered to an explicit user id**. The reason: call-attempt RLS only shows attempts on prospects a caller still holds, so reassigning a prospect would otherwise erase calls from their goal. Who may see whose numbers is decided by the pages:
- Your own: everyone.
- Anyone's (`/app/calls/stats?caller=`): admins.
- The team board: admins always; callers/setters only when the leaderboard switch is on.

Reads paginate past the 1000-row API cap. `getGoalSnapshot` is `cache()`d per request, so the layout and the page share one read. `getCallerDashboard`'s all-time numbers are now exact head counts; before, they silently stopped at the first 1000 rows.

**Migration 0060 (`0060_call_goals.sql`):**
- Adds `profiles.daily_call_goal` (default 100, range 1–1000). `guard_profile_privileges()` now also blocks non-admins from changing it.
- Adds a single-row `call_workspace_settings` table (`leaderboard_enabled`, default off). Admins and call agents can read it; only admins can update it.
- **The app runs without 0060**: goals fall back to 100 and the leaderboard stays off. Only saving a goal says the migration is needed.
- Tests: `tests/calls-goals-db.test.ts` and `tests/call-stats-db.test.ts` (PGlite, every real migration; the fake client gained `range()`).

**HUD.** The calls layout and the leads layout (`app/app/calls/layout.tsx`, `app/app/leads/layout.tsx`) mount `GoalProvider` and `GoalHud`. The leads layout does this for **setters only**; contractors and admins see the leads pages as before. If the snapshot read fails, the pages render without the HUD. The HUD shows:
- A ring with an animated count and color tiers (slate → blue → gold at the goal).
- The pace line, a 🔥 streak (workdays; weekends never break it; today joins once the goal is hit), an "on fire" combo after 3 decision-maker conversations in a row, and bookings today.
- Power hour (a session clock in sessionStorage, an optional auto-dial), a link to stats, and a sound toggle (WebAudio, `lib/calls/sound.ts`, off by default).

Optimistic counting: forms call `useGoal().bump()` on submit. A server rejection calls `revert()`, and any fresh server snapshot (`asOf`) replaces the optimistic bumps. Milestones at 10/25/50/75/100% of the goal give a toast plus small confetti. Hitting the goal or booking an appointment gives a banner plus big confetti (`components/calls/goal/celebrations.tsx`). All motion respects `prefers-reduced-motion`.

**Frictionless loop.**
- `QUICK_OUTCOMES` (no answer, voicemail, gatekeeper, spoke with DM, not interested, wrong number) have no required fields, which a test pins. Picking one saves and opens the next prospect in one tap or keypress.
- **Do not call is one tap (2026-10-28).** It is in `QUICK_OUTCOMES`, shown in red, with no "I confirm" checkbox (the `confirm_do_not_call` field is gone). It deliberately has no keyboard key, so a stray keystroke can't block a number. Saving it is the whole job. The 0007 trigger stamps `do_not_call_at`, and from then on:
  - the prospect leaves every calling list and queue, and is shown under the "Do not call" view with a struck-through number;
  - its Call and Email buttons are disabled;
  - the database refuses any further call log;
  - workflow texts and AI calls to that phone number are suppressed (`phone_e164` match).
  Only an admin can lift it.
- Keyboard: 1–9/0 pick outcomes (`OUTCOME_KEYS`), C dials, N/→ skips, Enter saves & next, ? shows the list. Shortcuts are off while typing in a field, except the auto-focused outcome select.
- The workspace prefetches the next prospect.
- Setters on a lead page get the contact log at the top, with one-tap chips and "Log & next lead". `logContactAttempt` takes `intent=save_and_next` and redirects to `nextLeadToCall()` (open lead contacted least recently, under RLS).

**Stats (`/app/calls/stats`, in `CallsSubnav`):**
- Today by hour against the best earlier day (ghost bars).
- Four Monday-aligned weeks of goal days (gold = goal hit).
- The cold-call funnel, today vs the 7-day average.
- Personal bests over 90 days, with "New PB" flags.
- Computed badges.
- The team board, where admins also set each person's goal inline and flip the leaderboard. Goals can also be set on `/app/team/[id]`. Both are audited (`user.daily_call_goal`, `calls.leaderboard`).

Charts are hand-written SVG/CSS (`components/calls/stats/charts.tsx`; no chart library). The Calls page also shows sparklines on the caller KPI tiles and, for admins, a "Team today" strip of mini rings.

**Not changed:**
- The setter sidebar stays at its five sections (`tests/setter-access.test.ts`, which now also pins `requireCallWorkspace()` on the new calls pages and the layout).
- Attempts stay append-only (there is no undo).

**Status:** merged in PR #38 and 0060 applied to production 2026-10-27 (run by the owner in the Supabase SQL editor). Verified: the `daily_call_goal` column (all profiles at 100), its 1–1000 check, the guard covering it, and the `call_workspace_settings` row (leaderboard off) with RLS and both policies. The fallbacks above remain for any environment without 0060.

## 35. Texting guards (migration 0061, added 2026-10-27)
- **Echo guard** (`handleInbound`): an inbound text of ≥20 characters identical (case/spacing-insensitive) to one of our own outbound messages in that conversation in the last 30 minutes is ignored (`reason: 'echo'`, not stored, not answered). Stops loops when the Mac texts its own number. Shorter texts are exempt so a real "Sounds good" still counts.
- **One conversation per phone** (`phoneInUse`): a number that already has a conversation created in the last 14 days is not started again from a second lead (`reason: 'phone_in_use'`), for funnel and Meta leads.
- **"Why wasn't this lead texted" note** (`withSkipNote` / `SKIP_NOTES`): when a new lead isn't texted (off, contractor off, daily limit, bad phone, opted out, number in use, Meta test lead, error) a plain-language "Not texted: …" activity is written on the lead (`metadata.sms_skipped`).
- **Daily assistant-reply cap**: `sms_settings.max_ai_replies_per_day` (default 150, editable on `/app/texting`); past it, conversations hand off to a person. This is separate from `daily_cap` (all texts). `loadSettings` falls back to older columns until 0061 is applied.

## 36. Setter pay + money-first setter dashboard (migration 0062, 2026-10-27; applied to production 2026-10-27)
**Pay rule (owner's decision, 2026-10-27):** setters are paid for each **contractor sales meeting** they booked (`prospect_sales_appointments.partner_id`) that the owner then **sells**. Booking alone pays nothing. A meeting that is held but not sold pays nothing. Homeowner appointments are not part of setter pay. Plan: `docs/setter-dashboard-plan.md` (written before this rule; see its status note).

**Migration 0062 (`0062_setter_pay.sql`):**
- **Profile fields:** `profiles.pay_per_sale` and `profiles.weekly_booking_goal`, both nullable meaning "not set". `guard_profile_privileges()` is extended so only an admin can change them.
- **Sale columns on `prospect_sales_appointments`:**
  - `sale_outcome` (`sold` | `not_sold` | null = undecided);
  - `sale_decided_at` / `sale_decided_by`;
  - `setter_pay_amount`: the pay fixed when the meeting is marked sold. A check keeps it only on sold rows, so later rate changes never rewrite past earnings.
- **New trigger `guard_sales_appointment_pay()`:** non-admins cannot set the sale columns on insert or update, and cannot move `partner_id` (the credit). Setters still update their own meeting's status and confirmation under the existing RLS.
- **Tests:** `tests/setter-pay-db.test.ts` (PGlite, every real migration).

**Money logic:** pure functions in `lib/setter/money.ts` and `lib/setter/queue.ts` (`tests/setter-money.test.ts`).
- **Earned** = sum of `setter_pay_amount` for meetings sold, dated by `sale_decided_at`.
- **Pending** = undecided meetings that are not `no_show`/`cancelled`.
- **Bookings** are dated by when the meeting was booked (`created_at`). Weeks run Monday–Sunday; pace and streaks use the 8–5, Monday–Friday Los Angeles week.

**Data:**
- `lib/data/setter-money.ts`:
  - `loadMeetings` reads through the service role with explicit filters. Sales-appointment RLS hides meetings on prospects a setter no longer holds, which would erase pay. Company names come from a second, chunked read.
  - `loadPartners`.
  - `getPayouts(month)` and `payoutsCsv`.
- `lib/data/setter-dashboard.ts` (`getSetterDashboard(userId)`) returns earned this month and all time, pending, the weekly booking ring with pace, the booking streak, records, close rate, last week, badges, recently sold meetings, upcoming meetings, the ranked queue, and rivals.
  - Rivals are only included when `call_workspace_settings.leaderboard_enabled` is on, and only as teammates' totals.
- **Tests:** `tests/setter-dashboard-db.test.ts`.

**Setter home (`/app` for role `setter`):** `components/setter/*`, one responsive layout. It replaced the old three-count setter dashboard and the phone `MobileHome` for setters; if its read fails, the page falls back to a plain welcome.
- **Money hero:** earned this month (count-up, emerald), "N meetings waiting on a sale · $X if they all sell", and "Every meeting that sells = +$rate". If no rate is set, it says to ask the admin.
- **Weekly booking ring:** uses `GoalRing`, with the pace line, booking streak and a best-week record. When no goal is set, it shows the count only.
- **Last-week recap:** shown once per week until dismissed (localStorage).
- **"Money on the table" queue, in priority order:**
  1. confirm meetings in the next 48 h;
  2. callbacks due;
  3. hot (interested or follow-up due);
  4. rebook no-shows and cancellations from the last 14 days that weren't rebooked;
  5. slipping (interested, with no contact in 7+ days);
  6. open homeowner leads;
  7. never-called prospects (power hour).

  Each prospect appears once, under its most urgent reason.
- **The race:** head-to-head while the leaderboard is on. Next meetings. Seven setter badges.
- **"Sold" celebration:** a jackpot banner when a meeting was marked sold since the setter last looked (localStorage). An in-app notification row (`type 'meeting_sold'`) is also inserted when the admin marks it sold.
- The calling HUD's booking jackpot now says "N of goal booked this week · if it sells, +$rate". `GoalSnapshot` gained `bookedThisWeek`, `weeklyBookingGoal` and `payPerSale`.

**Admin:**
- **`/app/calls/appointments`:** a Sale column with Not decided / Sold / Not sold. Sold uses the partner's rate, or an amount typed in. It fixes the pay, marks an open meeting completed and notifies the setter.
  - The page also has a credit selector (`creditMeeting`), a "Needs a sale decision" filter (`?when=decide`) and a Payouts button.
  - Partner names now come from `listPartners()` (admin/caller/setter); `listCallers()` omitted setters.
- **`/app/calls/payouts`:** per setter: booked, sold, not sold, awaiting a decision, and earned for the month. Below that, the sold-meeting lines and a CSV export.
- **Pay inputs:** pay per sale and weekly booking goal can be set on the team board (`/app/calls/stats`) and on `/app/team/[id]` (callers and setters).
- **Actions** (`lib/actions/setter-pay.ts`): `setPartnerPay`, `recordSale` and `creditMeeting`. All are admin-only and audited (`user.setter_pay`, `sales_appointment.sale`, `sales_appointment.credit`, `calls.payouts_export`).
- `tests/setter-access.test.ts` pins payouts as admin-only.

**Status:** 0062 was applied to production on 2026-10-27 by the owner in the Supabase SQL editor. Verified: both profile columns, all four sale columns, the four checks, the extended profile guard, the pay-guard trigger and the sold index. **Deploy order (other environments):** apply 0062, then deploy. Deploying first is safe: the dashboard and payouts read with `select('*')`, so without 0062 they show no rates or sales. Recording a sale or setting pay returns "needs database migration 0062". The "Needs a sale decision" filter shows nothing.

## 37. One-tap follow-up emails from the call workspace (migration 0063, 2026-10-27; applied to production 2026-10-27)
Plan: `docs/quick-email-plan.md`.
- **Owner decisions:**
  - The email sheet **pops up automatically** after a qualifying outcome.
  - With no decision-maker email, follow-ups (voicemail included) go to the **company's general inbox**.
- **Outcome → email** (`FOLLOW_UP_FOR` in `lib/emails/call-followups.ts`):

  | Outcome | Email |
  |---|---|
  | spoke_with_dm, interested, follow_up_required | "More info after our call" (existing builder) |
  | appointment_booked | "Meeting confirmed", with an `.ics` invite for the next booked sales meeting (`lib/emails/meeting-invite.ts`) |
  | callback_requested | "Talk soon" |
  | left_voicemail | "Sorry I missed you" |
  | gatekeeper | "For the owner" |
  | anything else | none |

  "If anything changes" is available but never auto-offered. `contractor_second_follow_up` ("hold your area") is never a quick action.
- **Five new templates** (`CALL_FOLLOW_UP_SEEDS`, category **Cold Call Follow-Up**) are part of `EMAIL_TEMPLATE_LIBRARY`. `quickTemplates()` uses the database copy when present (admin-edited), else the built-in text. That means the sheet works before the rows are seeded; `scripts/seed-email-templates.ts` inserts them.
- **New merge fields:** `sender.name`, `sender.phone`, `contractor.city`, `appointment.time_zone`, `appointment.how`. Prospect contexts also fill `lead.city`, fixing the blank city in older contractor templates.
- **Log form:** a **Best email** field for those outcomes (`EMAIL_CAPTURE_OUTCOMES`, `decision_maker_email`, validated, saved even if nothing is sent).
  - When the outcome has a follow-up and Gmail can send, "Save and open next" (and the one-tap outcome buttons) submit `intent=save_then_email`. `logCallOutcome` saves, returns `nextId` + `followUp`, and the form opens `QuickEmailSheet`.
  - **Send & next** or **Skip** (Esc) moves on. `E` opens the sheet any time, alongside an Email button in the header and the phone action bar. The `openQuickEmail` event lives in `lib/calls/quick-email-events.ts`.
  - `openQuickEmail` returns whether the sheet opened; if it didn't, the outcome form navigates to the next prospect itself.
  - The sheet adds its window listener once and reads the latest props through a ref. Re-adding it on every render lost the open request, because the save's page refresh lands in the same commit, and "Save, email & next" then stayed on the same prospect (fixed 2026-10-27).
  - Workspace shortcuts are ignored while the sheet (a modal) is open.
- **One send path:** `sendProspectEmailCore` (`lib/emails/prospect-send.server.ts`) is used by the full composer (`sendProspectEmail`) and the sheet (`sendQuickEmail`). It refuses:
  - do-not-call, an email opt-out, or a prospect not assigned to the sender;
  - the same template to the same prospect within 7 days, unless the sender clicks "Send anyway" (`allow_repeat`);
  - more than 100 sends per sender per Los Angeles day.

  Logging is unchanged: pending → sent only with a Gmail id, else failed.
- **Signature and compliance:**
  - Emails are signed by the **sender** (name + phone from their profile), no longer always "Liam". The From name reads "Sam Setter · HomeQuote Network"; ASCII names are left unencoded.
  - Every prospect email carries an opt-out line ("Reply 'stop'…") and, when `EMAIL_MAILING_ADDRESS` is set (server env), the postal address CAN-SPAM requires. Admins see a warning on `/app/calls/emails` until it's set.
  - `buildRawGmailMessage` supports attachments (multipart/mixed) and a From name. Unsafe names and header injection are dropped.
- **Opt-out (0063):**
  - `contractor_prospects.email_opt_out_at`. "Asked to stop emails" on the prospect page (`setEmailOptOut`); only an admin can lift it, and `guard_prospect_email_opt_out()` enforces that in the database. Audited.
  - Before 0063 the column is absent: sends still work, recording an opt-out says the migration is needed.
- **Follow-through:**
  - The setter money queue has a new **Emailed** row (emailed 3–10 days ago, no call or meeting since), ranked after Hot.
  - The Stats page gained a **Follow-up emails** card: sent today and this week, and per template, how many led to a sales meeting within 7 days.
  - Prospect History shows each email's template name.
- **Tests:** `tests/call-followups.test.ts`, `tests/prospect-send-db.test.ts` (PGlite + mocked Gmail, including the 0063 guard), plus updated library counts (54 templates) in `tests/email-templates.test.ts`.
- **Status:** 0063 was applied to production on 2026-10-27 by the owner. Verified: the column, the guard function and its trigger. `EMAIL_MAILING_ADDRESS` is not yet confirmed as set.
- **Deploy (other environments):**
  1. Apply 0063 (sending works without it).
  2. Set `EMAIL_MAILING_ADDRESS` in Vercel.
  3. Optionally seed the five templates so admins can edit them.


## 38. Workflows text through the Mac bridge (migration 0064, 2026-10-27, NOT yet applied)
- **Send text step** (`send_sms` graph node, now `availability: 'ready'`): config `{ body, assistant (default false), onError }`. The executor (`lib/workflows/graph/actions.server.ts`) calls `queueWorkflowText` (`lib/sms/service.ts`), which applies the same rules as the texting assistant: texting on and not stopped, valid US phone, opt-out list, contractor switches (`contractor_funnels_enabled` + `contractors.texting_enabled`) for contractor workflows, one conversation per number (14 days), a person-owned conversation (`paused`/`handoff`) is never texted, daily cap, texting hours (queued with `send_after`). Links stripped / 320-char cap via `finalizeOutbound`. Idempotent per step run (`sms_messages.workflow_step_run_id`, unique). A live test never texts (`test_mode`). A skipped send returns `text_not_sent` (or `contact_suppressed` for an opt-out) and writes "Workflow text not sent: …" on the lead.
- **Replies**: `assistant: false` creates the conversation with `sms_conversations.workflow_owned = true`; `handleInbound` then saves replies but the AI assistant does not answer. `assistant: true` (or an existing assistant conversation) keeps the AI answering. Every real inbound text (not STOP/START) emits `message.received` (`emit_workflow_event`, idempotency `message.received|sms:<messageId>`, payload `{messageId, channel:'sms', leadId, conversationId, hasBody}`), which is now a **ready trigger** and a **wait_event** option ("The homeowner texts back").
- **Publish gate / side panel**: `lib/sms/workflow-readiness.ts` (`loadTextingReadiness`): ready = `SMS_BRIDGE_TOKEN` set + texting on + not stopped; `bridgeConnected` (checked in within 2 min) is shown as a status only. `validate.ts` raises `sms_not_ready` at publish when not ready. Dry run previews the text and the reply handling.
- Tests: `tests/sms-texting.test.ts` ("workflow texts through the Mac bridge", "the workflow Send text step"), updated graph model/config-panel/contract tests.

## 39. AI workflow builder — "Describe a workflow" (migration 0065, 2026-10-27, NOT yet applied/deployed)
Admins only (contractor owners don't get it). An admin describes an automation in plain English and gets an **unpublished draft** in the visual builder (§21). The AI never publishes, enables, enrolls, sends or calls.
- **Code**: `lib/workflows/ai-builder/` — `catalogue.ts` (generated from the graph registries at runtime: ready node types (minus steps that need real ids, e.g. `assign_lead`), config JSON schemas via `zod-json.ts`, ready triggers + filters + merge roots, ready wait events, merge fields `GRAPH_VARIABLES`, ready condition fields, settable statuses, limits; one tool `build_workflow`), `check.ts` (assembles the graph with our own positions/edge ids; `workflowGraphSchema` + `validateGraph` 'edit' + policy: offered steps/triggers/wait events only, no uuids in config, ≥1 step, exit events ≠ trigger; `autoLayout`), `build.server.ts` (admin check → 30/24h cap (fails closed) → model with untrusted-wrapped description (no lead data) → up to 2 repairs with the exact errors → `wfg_create` on the admin's own client for a new draft, or full graph + diff for a change; logs every request), `explain.ts` (model-free plain-English walk, also "Explain this workflow"), `diff.ts`, `config.ts` (cap 30, examples, step labels). Model = `assistantModel()` (`ANTHROPIC_MODEL`, default `claude-sonnet-5-5`), `tool_choice: auto` + one tool + no parallel calls; a reply without that tool is a failed attempt and other tool names are never executed. Because the catalogue follows the code, the Mac-bridge text step and "homeowner texts back" (§38) are offered automatically.
- **API**: `POST /api/workflows/ai-build` (NDJSON: `{type:'step'}` events then one `{type:'result'}`); `mode: 'create'` (optional `contractorId`) or `'change'` (`workflowId`, `expectedRevision`; 409 when the draft revision moved).
- **UI**: `components/workflows/ai/` — `DescribeWorkflowPanel` on `/app/workflows` and `/app/workflows/new` (examples, step progress, inline clarifying questions (≤2), result card: summary, steps, Assumptions, Couldn't do, Open in builder / Discard (= archive)); `ChangeWithAi` in the builder (`BuilderShell` prop `aiRemaining`) shows added/removed/changed steps before "Apply to draft", applied as one undoable edit (`useGraphEditor().replace`) through the normal autosave/revision. Remaining builds shown.
- **Table (0065)**: `workflow_ai_builds` (user_id, mode create|change, prompt ≤2000, model, tokens, cost_micros, attempts, outcome draft_created|change_proposed|needs_answers|invalid|error|limit, error_code, workflow_id). RLS on, admin select only, service-role writes. Cap counts rows from the last 24h with outcome ≠ 'limit'.
- **Tests**: `tests/workflow-ai-builder.test.ts`, `tests/workflow-ai-builder-ui.test.tsx` (fake model). Not exercised against live Anthropic, real Supabase or a browser.
- **Deploy order**: apply 0064 and 0065 before deploying (without 0065 the builder reports "usage could not be checked" and does nothing).

## 40. Texting starter templates, template gallery, plain-English run history (2026-10-27, no migration)
- **Templates** (`lib/workflows/graph/templates.ts`, drafts only): *Text new website leads in 2 minutes* (`lead.created`, entry `lead.source='website'` + consent, wait 2 min, text with the assistant on), *Text new Meta form leads right away* (`lead.source='meta'` + consent), *No reply follow-up* (text → wait up to 1 day for "The homeowner texts back" → text → wait 1 day → note "No reply, marked cold" + alert; a reply alerts "A lead replied"), *Appointment reminders by text* (24 h and 2 h before, checking the appointment is still on), *Alert me when a lead texts back* (`message.received` → alert). The new-lead texts use the step option **`onlyIfNotTexted`** (send_sms config, default false): skipped with reason `already_texting` when the lead already has a text conversation (e.g. the automatic first text), so nobody is texted twice. `GraphTemplate` gained `scope` (`any|network|contractor`), `icon` and `contractorGraph` (wording with `{{contractor.name}}`; network wording says "the HomeQuote team"). `createGraphWorkflowAction` enforces `templateFitsOwner` and uses `templateGraphFor`. The existing email appointment template is now contractor-only.
- **Gallery**: `components/workflows/template-gallery.tsx`, used by `CreateGraphForm` on `/app/workflows/new` (topic filter, "For:", "Starts:", step chips; native radios). Contractor owners don't see network-only templates.
- **Run history**: `lib/workflows/graph/run-story.ts` (`buildRunStory`, `runHeadline`, pure, Pacific time). The run page shows "What happened" first, technical steps behind "Details"; run lists show "What happened last". `getGraphRun` adds `textSkip` (the bridge's exact reason, from the lead's "Workflow text not sent" note).
- **Known gaps**: the Meta template only enrolls leads with recorded consent (stricter than the built-in Meta auto-text; editable). Replies to workflow-owned texts (no-reply, reminders) are saved and passed to workflows only; pair with the reply-alert template.
- **Tests**: `tests/workflow-graph-templates.test.ts`, `tests/workflow-run-story.test.ts`, `tests/workflow-template-gallery.test.tsx`.

## 33. Instant pool estimator (2026-10-27, no migration; example prices, `noindex`)
Homeowner flow (project, shape, size, package or custom choices, property questions, "which look", ZIP/homeowner/timeline, contact) → ballpark price **range** with a line-by-line breakdown → book a free on-site consultation. Full write-up: `docs/pool-estimator.md`.
- **Routes**: `/estimator/[slug]` (route group `app/(estimator)/`, contractor-branded; `noindex, nofollow` while `pricesConfirmed` is false; not in the sitemap), `/embed/estimator/[slug]` (route group `app/(estimator-embed)/`: bare layout with the `.hq` marketing theme, `<Estimator embedded />`, always `noindex`), `POST /api/estimator/[slug]/lead`. All public: middleware only guards `/app` and `/studio`, and `lib/supabase/middleware.ts` returns early for `/estimator/`, `/embed/estimator/` and `/api/estimator/` (no Supabase Auth round trip, like `/estimate/`). No `X-Frame-Options` / `frame-ancestors` header exists anywhere (`next.config.ts`, middleware checked), so the embed can be iframed as is; if a site-wide frame header is added, exempt `/embed/estimator/*`.
- **Contract** (`lib/estimator/types.ts`, change deliberately): `EstimatorTemplate` (questions with fixed ids/roles, packages, geometry, `minimumJob`, `roundTo`, `pricesConfirmed`), `Price` = `{unit, low, high, quantity?}` per unit (`interior_sqft | perimeter_lf | deck_sqft | linear_ft | each | flat`), `ContractorEstimatorConfig` (slug, name, license, `funnelSlug`, financing text, `revealRange`, option overrides keyed `questionId.optionId`, `gallery`). Limits: 4 options per single question, 5 per multi (`DEFAULT_LIMITS`).
- **Code**: `lib/estimator/` (`engine.ts` pure estimate/validation/formatting, `geometry.ts`, `config.ts` `applyContractorConfig`, `registry.ts` `getEstimator(slug)` + `ESTIMATOR_SLUGS` merging `templates/pool.ts` + `catalog/pool.ts` + the contractor config, `lead-client.ts` browser contract, `lead.ts` server mapping), `components/estimator/` (`Estimator` entry, flow hook, screens, summary, swatches, pool shapes), `content/estimators/pool-masters.ts` (the only Pool Masters specifics) + `pool-masters-photos.ts` (photos in `public/estimator/pool-masters/`), `scripts/estimator-price-sheet.mjs` (CSV for the contractor's real prices). Tests: `tests/estimator-*.test.ts(x)`.
- **Data flow**: registry merges template + catalog + contractor config server-side → the page passes `publicTemplate(template, contractor)` to the client `Estimator`. With `revealRange: 'after_contact'` (bathroom-remodel; Pool Masters until 2026-10-29) `publicTemplate` strips every option `price` plus `minimumJob`/`roundTo`, so no price reaches the browser before the contact step and only the lead route computes the range; with `'immediately'` the full template is sent and the client's `LiveSummary` runs `computeEstimate`. Questions may be `optional` (only `extras`, the backyard extras, today): no picks is allowed and never counts as unanswered.
- **Lead path**: the browser posts answers + contact to `POST /api/estimator/[slug]/lead` (never prices); the server recomputes the estimate and files the lead under the contractor's `funnelSlug` (`pool-masters`) through the existing homeowner funnel pipeline (a `funnel_sessions` row, then `save_funnel_session`: same consent, spam handling, rate limits, alerts, delivery). **Consent**: the contact screen shows `estimatorConsentText(contractorName)` (= the funnel's `consentText`, naming HomeQuote Network and the contractor) with Privacy/Terms links; the request carries that `consentText` and the route rejects (409) anything that differs from `consentText(funnel.config)`, so the stored disclosure always equals what was shown — keep `contractorName` equal to the funnel's `clientName`. **Measurement**: an "Allow optional advertising measurement" checkbox (default from `adMeasurement`, Pool Masters `opt_out` = checked, mirroring the funnel's `consentMode`) sends `measurement`; only when true does the browser send Meta ids/event id and the server send the CAPI Lead event and keep fbp/fbc. **Attribution**: `tracking.pageUrl` is the full `window.location.href`, so UTM/click ids reach `captureAttribution` (for the embed, put UTMs on the iframe `src`). Honeypot input is hidden + inert and named `contact_url_2` (autofill ignores it); a filled honeypot answers like a success and saves nothing. Self-serve estimator leads for other contractors must never enter the network `leads` pipeline.
- **Compliance**: ranges only, always "ballpark, not a quote" (the engine never returns low === high: after the minimum job the high end is lifted one `roundTo` step, or 10% without a step); no AI pricing; **no monthly payment amounts** (financing is a plain note plus the lender disclosure); no trademarked product names in the generic catalog/template; "Example prices" label + `noindex` until the owner confirms prices and `pricesConfirmed` is set (also add to the sitemap then).
- **Live pool builder + photoreal render (2026-10-28, no migration)**: for `trade: 'pool'` the flow is a live builder. `buildScene(template, {answers, dimensions})` (`lib/estimator/scene/scene.ts`, visible questions only) → `SceneSpec` (`lib/estimator/scene/types.ts`, the contract) → `layoutScene` + `sceneCamera` (`lib/estimator/scene/geometry.ts`, pure: deck runs into the walk along the house, square coping on rectangle/L pools, kitchen and patio cover against the house, a drone "camera" that frames the design and zooms on the pool for surface/tile/coping) → `<PoolScene>` (`components/estimator/scene/*`, one inline SVG, 1200x800 at 13 units/ft, day/night). `ScenePanel` sits beside the questions (pinned above them on phones, except on the ZIP and contact screens so the keyboard never hides a field); hover/keyboard previews draw a ghost; every pick answers with a chip (with a real job photo for features/extras). Textures/sprites (`public/estimator/scene/`, manifest `lib/estimator/scene/textures.ts`) were generated once with kie.ai by `scripts/generate-scene-textures.mjs` (+ `scripts/scene-assets.py` for seamless/cut-out post-processing) and exported at ~2x on-screen size (256–512 px); nothing is generated while a visitor clicks. Water/fire animations pause off screen, in a hidden tab and while a text field has focus. **Photoreal render (optional, off unless `KIE_API_KEY` is set)**: the lead response carries `renderToken` (HMAC of slug.leadId.expiry, key derived from `ESTIMATOR_RENDER_SECRET` or the service-role key, 2 h TTL; only for a saved lead when renders are on). On the result the photo starts by itself (a "Make my realistic photo" retry only after a retryable failure): the browser rasterizes the day scene (`rasterize.ts`) and calls `POST /api/estimator/[slug]/render` (same-origin, body ≤ ~8 MB, image bytes verified) → kie.ai upload (`kieai.redpandaai.co/api/file-stream-upload`) + `nano-banana-pro` image-edit task (`ESTIMATOR_RENDER_MODEL` may pick `nano-banana-2`); polls `GET /api/estimator/[slug]/render/[taskId]` with the token in the `x-render-token` header (task id signed to the lead; one kie.ai check per task per 2 s per instance). Each render is a `lead_activities` row (`type 'system'`, `metadata.kind 'estimator_render'`, status/task_id/image_url, a hashed `rate_key`; internal visibility = staff only) that doubles as the counter: **reserve-then-count** (insert, count including itself, back out over a limit) so parallel requests cannot exceed 3 per lead, 6 per visitor per hour, `ESTIMATOR_RENDER_DAILY_CAP` (default 100) per 24 h. The render never shows prices; the scene caption "Illustration — your final design is confirmed at the on-site visit" stays. Known gaps: `image_url` is kie.ai's temporary link (~14 days); a render abandoned mid-way stays `running`; the daily-cap count has no supporting index (needs a migration: partial index on `lead_activities(created_at) where metadata->>'kind' = 'estimator_render'`).
- **Branded builder experience (2026-10-28, no migration)**: `/estimator/[slug]` now lives in route group `app/(estimator)/` (same URL; contractor header with license + tap-to-call, `components/estimator/shell/*`, quiet footer with plain-text "Powered by Rendoly", no HomeQuote chrome; `generateMetadata` sets canonical, `noindex` until `pricesConfirmed`, and contractor-specific openGraph/twitter with the design illustration). `Estimator`/`EstimatorFlow` take **`rendersEnabled`** (server-only `rendersEnabled()` in `lib/estimator/render.ts`, read by the page): every visitor-facing promise of a realistic photo (hero copy, the example split, unlock headings/button/preview, reward tracker) shows only when it is true, and the result only starts a photo when it is true. The page is statically generated, so **adding/removing `KIE_API_KEY` needs a redeploy** before the copy changes. Flow: words-only hero (outcome headline) → the builder frame opens on the example design; with renders on it is an example design ⇄ its real render split (`scene/example-compare.tsx`, assets `public/estimator/hero/`, sweeps once, draggable range input) → stage bar with fixed stages Pool / Style / Details / Unlock (`builder-progress.ts`; "Build my own" adds screens inside Style, the current segment fills per screen) → each pick: highlight on the spot (sparkle + ring ping) and a chip (under the picture on phones) → unlock screens (ZIP, contact): reward tracker (Design done, Price and photo locked) and `UnlockPreview` (their design shown clearly, price as number-free placeholder bars, renders on: a "developing" half for the photo) → submit button keeps brand color with "Crunching numbers…"; the page scrolls once to the builder top **before** the result replaces the form (scroll anchoring held off), then the price counts up (`COUNT_DELAY_MS`/`COUNT_MS` in `screens/reveal-styles.tsx`), the line items sit collapsed behind "See what’s included" (rounded to $100 for display), and only `PHOTO_PANEL_DELAY_MS` later does the photo's compact progress chip + slim bar appear over the still-visible design; the photo then dissolves in with a ripple and a before/after slider, captioned "AI-rendered photo of your design…". Render requests have per-request timeouts (`render-client.ts`) and the image preload times out, so "developing" can never hang. Prices still never reach the browser before the contact step (test: `tests/estimator-unlock.test.tsx` "never carries the estimate figures").
- **Open items**: (1) real prices from the owner (all prices are examples); (2) someone with access to poolmastersla.com must paste the iframe, and the embed has no auto-height script yet; (3) service area: the Pool Masters funnel gate now covers the brochure's five counties (LA, Orange, Ventura, Riverside, San Bernardino; `zipPrefixes` 900–918, 922–928, 930, 935, applied to the live `funnels` row 2026-10-27); prefixes are coarse (922 also covers Imperial County, 935 parts of Kern); (4) sitemap/linking once prices are confirmed; (5) a replayed submission that the RPC dedupes onto an existing lead still adds a second estimator timeline row; (6) the result copy for a funnel with `unqualifiedAction: 'stop'` (nothing saved) still says the team will reach out — dormant, Pool Masters uses `review`.
- **Pool Masters one-page configurator (2026-10-29, no migration; example prices, `noindex`)**: Pool Masters opts in with `experience: 'configurator'` + `configurator: POOL_MASTERS_CONFIGURATOR` (`content/estimators/pool-masters-configurator.ts`) + **`revealRange: 'immediately'`** (prices now ship to the browser for this contractor only; still example prices, "Example prices" label, `noindex`). `configuratorSpecFor(contractor)` (`lib/estimator/configurator/engine.ts`, re-exported by the registry) returns the spec only with all three, else the pages fall back to the step-by-step builder; both pages and the lead route use it. Bathroom keeps the builder.
  - **Page** (`components/estimator/configurator/`): one light page (white / warm grey / ink / one blue, DM Sans), big photo with view pills (Aerial / Poolside / Evening) + desktop strip of the other views + a to-scale plan of the chosen size; options column (size cards "Your pool's size" Compact / Classic / Estate, remodel pricing; Go Luxe card; finish, tile & coping, deck, pool features, backyard, equipment); sticky bar with the total **range** + breakdown drop-up + "Review my design" → cost summary (`#summary`) → result + booking (`#book`). Phones: photo `position: fixed` under the header with a spacer (32vh, shrinks to 20vh on scroll, opens for a moment on a pick: no layout shift); `scroll-padding` keeps keyboard focus clear of the photo and the bar. Rows show "from +$X" (low end of the example range), the total stays a range. Design in the query string (`m`, `o`, `lx`), steps in the hash.
  - **Spec/engine contract** (`lib/estimator/configurator/types.ts`, `engine.ts`): models, groups of rows mapped to template answers, `bundle` (Go Luxe, 10% off the summed row deltas, example), `views` with photo `dimensions` (options match on any `rows`, plus `allOf` for "kitchen and cover"), `photos`, `photoNote`, `projects`. `estimateSelection` = `computeEstimate(selectionToAnswers(...))` minus the bundle saving; `viewForRow(spec, row, currentView)` only moves the photo when the current view does not picture the row; `viewsShowingRow` (empty = "Not pictured": Baja shelf, water bowls, fire pit, turf, equipment).
  - **Photo matrix**: 78 keys, 1800 px + 1200 px `-sm` WebP in `public/estimator/pool-masters/configurator/` (~26 MB): aerial `aerial-<deck>[-pebble][-spa][-yard|-kitchen|-cover]` (48), poolside `poolside-<finish>-<classic|premium|stone>[-spa]` (18), evening `evening[-led|-pebble][-fire][-spa]` (12). All from one real Pool Masters job (photos used with permission): kie.ai `nano-banana-pro` edits in `scripts/generate-pool-configurator-photos.mjs` (one per visible change), composited and recoloured by `scripts/pool-configurator-composite.py` (numpy + Pillow), exported by the same mjs. Labelled once on the page "Photos show example designs (AI-assisted, based on Pool Masters projects), not your yard."; real job photos in a "Recent Pool Masters LA projects" strip (`projects/`).
  - **Booking + lead**: contact only at the end (first/last name, mobile, email, ZIP, homeowner, the funnel consent wording; the measurement box is pre-ticked unless the contractor is `adMeasurement: opt_in`; owner decision 2026-10-29). Request adds `configurator` (selection), `submissionId`, optional `timeline`; the route re-prices from the selection (`configuratorLeadDesign`, Go Luxe saving included) and stores `estimator_design`, `estimator_photos`, `estimator_design_url`, `estimator_check_on_site`. The consent check also accepts the estimator page's wording and stores the funnel's canonical text; `originAllowed` accepts the www/apex twin and the site URL. Retries: client timeout 65 s (> route `maxDuration` 60) and one automatic retry with the same `submissionId`; the route's in-memory replay cache is keyed by slug + submissionId + a hash of email/phone, and an in-flight map makes a concurrent retry wait for the first save (per instance; the database contact dedupe covers other instances). Then the booking (since 0070 the native slot picker on the Pool Masters booking calendar, §43; the Calendly `calendarUrl` is only a fallback). Financing in words only (`financingNote` + `financingDisclosure`), no payment amounts.
  - **Docs/tests**: `docs/pool-estimator.md` ("Pool Masters configurator"); `tests/estimator-configurator*.test.ts(x)`, `estimator-lead-reliability`.
- **Pool Masters simple mobile funnel (2026-10-29, no migration; example prices, `noindex`; replaces the configurator for Pool Masters)**: owner's brief "too much going on = too many questions; copy Buildoly's mobile funnel". Pool Masters now has `experience: 'funnel'`, `funnel: POOL_MASTERS_FUNNEL` (`content/estimators/pool-masters-funnel.ts`) and **`revealRange: 'after_contact'`** again (no price reaches the browser before the contact step; `configurator` stays attached because the funnel maps onto it). `funnelSpecFor(contractor)` (`lib/estimator/funnel/engine.ts`) returns the spec only for `experience: 'funnel'`; the configurator and the bathroom builder are untouched and still work for other contractors.
  - **Routes**: landing `/estimator/[slug]` (dark announcement bar, floating header card, two-line headline, one blue button, full-bleed hero with nothing drawn over it (no photo badge anywhere; one quiet footer line on every funnel page, and under the embed's column: "Photos show example designs, AI-assisted from Pool Masters projects." = `FunnelSpec.photoNote`), 3 real projects + licence below the fold); steps `/estimator/[slug]/design?step=1|2|3|contact|book&size=..&finish=..&extras=..` (`noindex`); embed `/embed/estimator/[slug]` starts at step 1 (no footer: the photo note + licence sit under the column; Calendly opens in a new tab instead of a nested iframe).
  - **Flow**: exactly three one-tap questions, "STEP n OF 3" + a photo that swaps instantly (every option layer preloaded, hidden layers `fetchPriority=low`) + option cards + one blue button: size (Compact/Classic/Estate -> configurator models small/medium/large; to-scale plan images `public/estimator/pool-masters/funnel/size-*.webp`, fallback the aerial photo), finish (Standard = configurator base rows; Luxe = rows pebble, edge_glass_travertine, deck_porcelain, **no Go Luxe discount**), extras (Just the pool / Add a spa / The full backyard = spa + outdoor_kitchen + patio_cover + fire_bowls). Then contact, then booking. The URL carries the screen + picks (Continue pushes history, so browser Back works), sessionStorage (`hq-funnel:<slug>`, contact draft `hq-funnel-contact:<slug>`) keeps picks, typed details and the lead result across a refresh. Short phones (<= 640 px tall) and ~900 px laptops get a flatter photo so each step fits one screen.
  - **Conditional follow-up steps (2026-10-29, owner: "keep it simple; these are only design options shown if they choose it")**: `FunnelStep.showWhen {stepId, anyOf}` adds steps only on the path that asks for them: "Choose your spa." (`spa`: flush / raised / zero_edge) when extras = spa or backyard; "Choose your outdoor kitchen." (`kitchen`: grill / full / chef), "Choose your fire feature." (`fire`: pit / fireplace / bowls), "Choose your cabana." (`cabana`: pergola / cabana / lounge) when extras = backyard. "STEP n OF m" counts the path (3 / 4 / 7; `stepCount`, `activeSteps`); `normalizeFunnelSelection` drops picks of hidden steps (changing step 3 forgets stale follow-ups; the URL drops their params); `?step=` indexes the path (`parseScreen(spec, raw, selection)`, `clampScreen`); `FunnelSpec.finalCta` "Get my estimate" is on whichever step is last. Step 2 copy: Standard "Plaster, standard tile, precast coping" (template coping `concrete` relabelled "Precast concrete"; catalog `precast` removed), Luxe "Pebble, glass tile, porcelain coping and deck" (catalog `coping.porcelain` enabled for Pool Masters in place of `coping.unsure`). Pricing: new optional template questions `spaStyle` / `kitchenStyle` / `coverStyle` (price = what each build adds; `features.spa` is now the flush base $15k–28k and the configurator spa row answers `spaStyle: raised`, so the configurator is unchanged) and `extras.fireplace`; `FunnelOption.addAnswers` (union) for the fireplace. Recap: `short: ''` omits a pick ("CLASSIC · LUXE · ZERO-EDGE SPA"). Lead summary: one plain line per shown step; configurator lines of `summaryReplacesGroups` (edge, features, backyard) are left out. Photos: `public/estimator/pool-masters/funnel/{spa-flush,spa-zero-edge,fire-fireplace}` (kie.ai edits) + `{kitchen-full,cabana-lounge}` (aerial crops), others reuse configurator / real job photos; `scripts/generate-pool-funnel-options.mjs`. **Open: Chef's kitchen and Cabana use a placeholder photo** (credits ran out; prompts ready). Details: `docs/pool-estimator.md`.
  - **Contact step** (2026-10-29 update): Name, Email, Phone number, **Home address** (replaces the ZIP field), then **"Are you the homeowner?"** with two segmented buttons "Yes" / "No" (`contactStep.homeowner` copy; values yes / no for the lead's `homeowner`). `askAddress` / `askHomeowner` are gone: ownership is always asked and the lead schema requires `homeowner` again (the "Owns the home (not asked online)" assumption path is removed everywhere; no config used it). **Agree-on-submit consent** (the exact `estimatorConsentText` wording in small print under the button, "By tapping “Get my estimate”: …"; the request sends `consent: true` + that `consentText` and the route still verifies it, 409 on a mismatch), the "Allow optional ad measurement" box is **pre-ticked** unless the contractor is `adMeasurement: opt_in` (owner decision 2026-10-29; the visitor can untick it), one error message at a time (focus moves to it; fields are also checked on blur), Return moves to the next field (the address says "Go" once ownership is answered). **Legal sign-off on button-click TCPA consent is still owed.**
  - **Address autocomplete**: `components/estimator/funnel/contact/address-field.tsx` (ARIA combobox/listbox, 200 ms debounce, ≥3 chars, Buildoly-style overlay list: white, 1px #d0d0d0, 8px radius, 48px rows, "Powered by Google" line; arrows/Return/Escape, closes on blur, scrolls the field up on touch devices; `autocomplete="street-address"`). Server proxies (key never in the browser): **`POST /api/estimator/[slug]/address/autocomplete`** `{input, sessionToken}` → Places API (New) `places:autocomplete` (`includedRegionCodes ['us']`, `includedPrimaryTypes street_address/premise/subpremise`, `locationBias` 50 km circle at 34.05,-118.25, session token passed through) → `{ok, suggestions:[{placeId, main, secondary}]}` (max 5); **`POST /api/estimator/[slug]/address/details`** `{placeId, sessionToken}` → `GET places/{id}` with field mask `formattedAddress,addressComponents,location` (Essentials) → `{ok, address, zip, city, state, lat, lng}`. Logic in `lib/estimator/address.ts` (server) + `lib/estimator/address-client.ts` (browser: `extractZip`, `addressZip`). Guards: same-origin check like the lead route, registered slug, zod caps (input 3–200, body ≤ 2 KB), in-memory per-IP sliding window (hash of IP + day; 90 autocomplete / 30 details per 5 min per instance; no migration), 3 s / 4 s timeouts, no address or key logged. **`GOOGLE_PLACES_API_KEY` is now also used by the estimator** (it is only set in Vercel production): without it the routes answer `{ok:false, reason:'disabled'}` and the field is a plain input. ZIP = the picked place's while the text is unchanged, else a 5-digit ZIP typed at the end / after a state code; none → "Add your ZIP code to the address" (text kept, field focused). The ZIP still gates the service area and the lead route validates it.
  - **Address on the lead**: the request adds `address` (≤300) and optional `addressDetails` `{city, state, lat, lng, verified}` (a bad value is dropped, never a failed lead). `buildLeadPayload` adds `estimator_address` (always ending with the validated ZIP) and `estimator_address_map` (Google Maps link from lat/lng) to the funnel answers, "Home address: … (picked from Google suggestions | typed)", "Map: …" and "Homeowner: …" lines to the timeline, `estimator.address` to the metadata, and fills a funnel `address`-type question if the funnel has one; after `save_funnel_session` the route fills `leads.address` / `city` / `state` **only where `address` is still null** (no schema change).
  - **Non-owners ("No" to "Are you the homeowner?")**: fail the funnel's `homeowner = yes` rule → saved for review as before (`unqualifiedAction: 'review'`), no booking link; the last screen heads "Your ballpark estimate" and says "Your project needs a personal review… the team will review them before we can confirm a fit" (no promised call; `FunnelLeadResult.homeowner`). With `unqualifiedAction: 'stop'` (`saved: false`) it says the details were not saved and to call.
  - **Lead route**: the request adds `funnel` (step id -> option id, bounded zod record); the server normalizes it and re-prices from the picks alone (`funnelLeadDesign` in `lib/estimator/lead.ts`: `funnelAnswers` + `estimateFunnel`, bundle off), stores `estimator.funnel {selection, titles}`, `configurator.selection` (the mapped configurator selection, or null), `estimator_design`/`estimator_photos` (one photo per step)/`estimator_design_url` (`/estimator/[slug]/design?size=..`). The response adds `saved: false` when a funnel set to `unqualifiedAction: 'stop'` saved nothing (the booking screen then says "call us" instead of promising a call).
  - **Booking step**: "Book your free on-site estimate"; price card with a one-line recap of the picks (`FunnelOption.short`, e.g. "CLASSIC · LUXE · WITH SPA"), the server's range only, one sentence "Ballpark price, not a quote…" (+ "Example prices, not yet confirmed." while `pricesConfirmed` is false), "Financing available" + "See details" (the lender disclosure; never a monthly amount — except DEMO ONLY: with `?demo=financing` (kept for the tab in sessionStorage `hq-demo:financing` by `<DemoFlagCapture>` in the estimator layout, so it survives landing → /design → contact → booking; `?demo=off` clears it) the line under the range reads "or from $649/mo*" (low end of the range, standard amortization, rounded up; `lib/estimator/demo-financing.ts`) with a "Demo" pill and "See details" showing "*Example only: 8.99% APR for 180 months, $10.14/mo per $1,000 financed, with approved credit. Not an offer of credit; …" plus the lender disclosure; terms in `POOL_MASTERS_FUNNEL.bookingStep.exampleFinancing` {apr, months, label, disclosure} to be replaced by real lender terms; read only after mount, so no visitor without the flag ever sees a payment); then the booking card: HomeQuote's own slot picker (`<BookingFlow>` with the lead route's booking ticket, one light intro sentence, §43; the Calendly inline (`calendarUrl`, origin-checked postMessage) is only the fallback without a ticket) and "Prefer to talk now? Call". The stored lead result carries the picks it was priced for (`FunnelLeadResult.selection`); the booking step only opens while the current picks equal them (`resultFor`), and the contact step shows "You've already sent this design. See your estimate" instead of inviting a second lead.
  - **Files**: `lib/estimator/funnel/{types,engine}.ts` (generic `FunnelSpec`: landing copy, steps -> options -> configurator model/rows or template answers, photo rules `option` | `view`; reusable for bathroom/kitchen later), `components/estimator/funnel/*` (shell `funnel.tsx`, `landing.tsx`, `step-photo.tsx`, `state.ts`, `contact/`, `booking/`, scoped CSS `funnel.css` under `.es-fn`), font Inter Tight via `next/font` in both estimator layouts (`preload: false`, only `.es-fn` uses it). Tests: `tests/estimator-funnel*.test.ts(x)`. Docs: `docs/pool-estimator.md` ("Pool Masters simple funnel").
  - **Google reviews under the button (2026-10-29, no migration)**: `FunnelLanding.reviews` (`FunnelReviewsConfig {enabled, googlePlaceId?, lookup?, heading?, max?}`, reusable for any funnel contractor). The page (`app/(estimator)/estimator/[slug]/page.tsx`, now `revalidate = 86400`) calls `funnelReviewsFor(contractor)` (`lib/estimator/reviews.server.ts`, server-only, `unstable_cache` 24 h, tag `estimator-reviews:<slug>`) -> `loadGoogleReviews` (`lib/estimator/reviews.ts`, pure + injected fetch): Place Details (Places API New, field mask `id,displayName,googleMapsUri,reviews`, key `GOOGLE_PLACES_API_KEY` in a header only). **Place id**: `googlePlaceId` when set (preferred, no lookup); otherwise a Text Search (`lookup.query`) with strict matching (`matchesBusiness`/`pickPlace`): name must contain `lookup.name`, the state (CA) must match when Google gives one, then the website host (`poolmastersla.com`) or a Sherman Oaks place / ZIP (91403/91413/91423/91495); a website match wins, two address-only matches = ambiguous = nothing. Pool Masters has **no pinned place id yet**: after deploy, `GET /api/estimator/pool-masters/reviews/health` (admin only, `isHqnAdministrator`; returns `{enabled, configured, placeIdKnown, placeIdSource, placeId, count5Star, shown, error}`, never review text or the key) gives the looked-up `placeId` to paste into `content/estimators/pool-masters-funnel.ts`. **Rules** (owner + FTC 16 CFR 465): only `rating === 5` with text, newest first, max 3 (Google returns at most 5), text trimmed to ~220 chars at a word + "…", reviewer "First L." (`shortName`, linked to their Google profile when given), Google's relative time, "★★★★★", G mark + "Google review", "Read on Google" (review `googleMapsUri`, else the place's; only https Google links become hrefs). **Never** the average rating or the review count; heading "What Pool Masters customers say" (default "What {name} customers say"). No key / no qualifying review / Google error -> `null` -> nothing renders (no empty box; the error throws inside the cache so it is not stored); the licence line below is unchanged. **UI** `components/estimator/funnel/reviews.tsx`: SSR'd directly under the button, phone = swipeable scroll-snap row of compact white cards (3-line clamp), desktop = 3 across; the hero photo rises further behind the row (`-mt-[64px]`/`lg:-mt-[96px]` only when reviews exist). Local QA: `NODE_ENV=development` + `ESTIMATOR_REVIEWS_FIXTURE=1` renders made-up sample reviews (never in prod/tests). Tests: `tests/estimator-reviews.test.tsx`.
- **Live bathroom builder (2026-10-29, no migration; example prices, `noindex`)**: `/estimator/bathroom-remodel` (+ `/embed/estimator/bathroom-remodel`) is the same instant-builder experience for bathroom remodels, published for **HomeQuote Network itself** (a contractor-matching network, not a contractor). Config `content/estimators/homequote-bathroom.ts` (`trade: 'bathroom'`, `network: true`, `licenseLabel` "Connects you with licensed local contractors" shown as a plain description, never as a license; facts about the service only; network logo; `funnelSlug: 'bathroom-remodel'`; `revealRange: 'after_contact'`; `adMeasurement: 'opt_out'`; no calendar link, no financing note). Leads file under the existing published `bathroom-remodel` funnel (consent text from its helper, `unqualifiedAction: 'review'`, any ZIP).
  - **Trades seam (kitchen slots in here)**: `EstimatorTrade = 'pool' | 'bathroom'` and `ContractorEstimatorConfig.trade` (default pool); `lib/estimator/registry.ts` `TEMPLATES[trade]` picks template + catalog (`templates/bathroom.ts`, `catalog/bathroom.ts`). Everything trade-specific in the flow goes through a **TradeBuilder adapter** (`components/estimator/builders/`: `types.ts` contract, `pool.tsx` wraps the existing pool scene unchanged, `bath.tsx` + pure words in `bath-words.ts`, `meta.ts` = the server-safe half: hero copy, example media, page description, share image; `getTradeBuilder(trade)` in `index.ts`). The adapter supplies the scene component, two lighting modes, change chips and highlights, the design list, accessible description, close-up question ids (the scene gets the one on screen as `focusOn`), option-tile visuals, rasterizer, result heading and all next-step words (`TradeCopy`). A kitchen = template + catalog + config + one adapter + its scene.
  - **Engine additions**: price unit `floor_sqft` (round(length x width)); `EstimatorOption.siteVisitWhen` (one condition or a list, any one flags; on the size question valid typed dimensions count as their size class, `sizeClassFor` in `lib/estimator/geometry.ts`, the preset nearest on a log scale). Bathroom examples: a freestanding tub + separate shower flags a layout/plumbing check in a small room, on a same-layout refresh or on a tub-to-shower conversion; a tub (or "keep") on a tub-to-shower conversion asks to confirm the plan in person. The engine's pool results are unchanged.
  - **Picture**: `buildBathScene` (`lib/estimator/scene/bath/scene.ts`, visible answers only) -> `BathSceneSpec` (`types.ts`; `renew` = scope items ticked, so a ticked area turns to a clean new neutral before its material is picked) -> `bathLayout` (`geometry.ts`, pure: one-point eye-level camera fitted per room; shower/alcove back-left, always a toilet, vanity right; a freestanding tub stays clear of the shower glass; narrow rooms are drawn wider) -> `<BathScene>` (`components/estimator/scene/bath/`, Canvas 2D `paint.ts`: perspective planes, fixtures, contact shadows, mirror reflections, daylight/evening light map). A pick paints a fast **draft** frame at once (coarser strips, no reflections; ~10 ms) and the sharp frame once picks pause (180 ms); a texture/sprite file arriving repaints only scenes that used it (once per animation frame); the remaining files preload when the page is idle; texture caches are bounded by pixels and released when the last scene unmounts. Before anything new is chosen the picture says "Your bathroom today"; ticking scope items flashes the area. Export for Save/photo: `rasterizeBathScene` (sharp, settled repaint).
  - **Assets**: `public/estimator/scene/bath/{textures,sprites}` (manifest `lib/estimator/scene/bath/textures.ts`), `public/estimator/bathroom/` (AI style ideas: looks gallery + option tiles, labelled "Pictures are AI-generated style ideas."), `public/estimator/hero/bath-*` (example pair: the builder's own export of the Spa retreat package and its kie.ai `nano-banana-pro` render through the production render path, 2026-10-29; clip + poster as fallback). All generated with kie.ai or drawn procedurally by `scripts/generate-bath-assets.mjs` (prompts, post-processing, `touchup` step for procedural paint/concrete, porcelain grout, toilet edge); nothing taken from the web. The pages pick example media from a fixed list (`components/estimator/builders/example-files.ts`, tested against `public/`), not the file system.
  - **Render + lead**: the render route picks the prompt on the server, `renderPromptFor(template.trade)` (`BATHROOM_RENDER_PROMPT`, eye-level photoreal bathroom); render-limit messages name a project specialist for a network, the designer for a contractor. Lead keys: `estimator_room` ("about 10 x 8 ft, 80 sq ft of floor (medium preset)") instead of `estimator_pool`; project -> funnel `service` per trade (`PROJECT_ALIASES`): full -> `full_remodel`, tub_to_shower -> `tub_to_shower`, refresh ("update the look") -> `other`, so cosmetic refreshes go to review instead of being filed as full remodels (add a real service value to the funnel to qualify them).
  - **Words (truthfulness)**: never "we build it" or a network license; the result says "A HomeQuote Network project specialist will call you shortly ... including a free in-home consultation with a licensed local bathroom contractor" (matches the funnel's thank-you page); site-visit items are "Confirmed in person at your free consultation"; the photo badge reads "AI-rendered photo"; the example-price line explains the figures are a typical Southern California range not yet confirmed by a local contractor.
  - **Tests**: `tests/estimator-bath-*.test.ts`, `estimator-lead-bathroom`, `estimator-trade-builders`, `estimator-example-files`. Open: real prices (`pricesConfirmed`), a funnel service value for cosmetic refreshes, vanity-type tile photos show finished cabinets in wood/navy while the picture shows white until a finish is picked.
- **Bathroom simple funnel (2026-10-29, no migration; example prices, `noindex`)**: `/estimator/bathroom-remodel` (+ `/design`, `/my-design`, `/embed/estimator/bathroom-remodel`) now runs the Pool Masters funnel experience (`HOMEQUOTE_BATHROOM_ESTIMATOR.experience = 'funnel'`, spec `content/estimators/homequote-bathroom-funnel.ts`). The builder above is kept working (set `experience: 'builder'` to serve it again; its page tests flip the shared config object temporarily). Landing: "Matched with licensed local bathroom pros" bar, network logo as a round badge + "HomeQuote Network" wordmark (`landing.logo {aspect, wordmark}`), "Bathrooms, remodeled just for you", "Design your bathroom"; hero `funnel/layout-spa-luxe.webp` with `landing.heroFallback` (the page passes `missingFunnelPhotos`, which now includes a hero that has a fallback); no reviews, no projects. Steps: size (guest 5x8 -> template `small`, full 8x10 -> `medium`, primary 12x14 -> `large`), finish (Standard = subway, quartz_white, hex_mosaic, chrome, single white vanity; Luxe = large_porcelain, marble_look, large_stone, brushed_gold, floating wood vanity + extras rain_head, led_mirror), layout (walkin -> `walk_in`, combo -> `tub_shower`, spa -> `tub_and_shower`); follow-ups: shower (walkin/spa: frameless, curbless, bench = frameless + extras bench & niche), tub (spa: soaking, clawfoot, stone), vanity (full/primary only: single, double, floating = catalog `floating_double`, enabled in the config). 3-6 steps; base answers project full, package custom, scope bathing/vanity/floor/walls, paint soft_white. Template additions: optional `showerStyle` (frameless; curbless +$2.5-5.5k, site visit) and `tubStyle` (soaking; clawfoot +$1.5-4k; stone +$5-10k, site visit), both `screen: 'bathing'` so the builder shows them on its shower/tub screen (no new builder screen). Leads: project full -> service `full_remodel` (qualified with homeowner yes); booking on the HomeQuote team calendar ("A quick {minutes}-minute call. {host} will call you at the time you pick." -> "Liam from HomeQuote"). Network words: trust line "Free in-home consultation · Licensed local pros · No obligation", no financing, no licence/years. Photos `public/estimator/bathroom/funnel/<key>.webp` (+`-sm`, 1800/1200 px; `scripts/generate-bath-funnel-photos.mjs`): size-{guest|full|primary} (to-scale plans on one white canvas, `photoFit` contain), layout-{walkin|combo|spa}-{standard|luxe} (one primary-bath room, every photo an edit of `layout-spa-luxe`), shower-{frameless|curbless|bench} (frameless = alias of layout-walkin-luxe), tub-{soaking|clawfoot|stone} (soaking = alias of layout-spa-luxe), vanity-{single|double|floating} (the same room's vanity wall seen straight on, no tub or shower in view, because the vanity step follows any layout; double stands on legs, floating double is wall-hung); each falls back to an existing style idea while missing. Since 2026-10-30 every later step shows the chosen size's own room (see "Size-aware photos" below). Team calendar as seeded by 0070: 10-minute calls on a 15-minute grid, host "Liam from HomeQuote", so the booking line reads "A quick 10-minute call. Liam from HomeQuote will call you at the time you pick." (verify on the live `booking_calendars` row if the owner changed it). Recap (price eyebrow) uses option `short` labels, e.g. "Full bath · Luxe · Spa bath · Curbless shower · Clawfoot tub · Floating double vanity". Known: the step total is a guess until the layout is picked (walk-in assumed, so a spa path reads 2 of 5 then 3 of 6; same rule as the pool); the shared contact step is taller than an iPhone SE screen (one scroll, pool too). **Generic funnel additions** (pool unchanged): photo rule `{kind: 'matrix', stepId, photos[option][otherPick]}` (key `<step>-<option>-<otherPick>`; the finish step shows the layout photo in each finish, the layout step follows the finish), `FunnelStep.photoFit`, `landing.heroFallback/logo/projectsNote`, `bookingStep.noRangeText/followUpText/reviewText`, `FunnelSpec.designDescription` (all default to the pool wording); `plainBookingTitle` also handles "{host} will call". Tests: `tests/estimator-bath-funnel.test.tsx`.
- **Step photo framing (2026-10-30, crop fix)**: the 3:2 funnel photos sit in a wider card (7:4 phones, 2.8:1 under 640 px tall, 16:9 / 2.2:1 desktop), so `cover` cut off their top and bottom and the bathroom's size plans (contained at 1.3) lost their edges. Framing is now per spec / per step: `FunnelStep.photoFit` ('cover' | 'contain'), `photoZoom` (contain only), `photoBackdrop` ('white' | 'blur': a blurred copy of the same file, same srcset, class `.fn-backdrop`), defaults from `FunnelSpec.photoFrame`, resolved by `stepPhotoFrame()` in `lib/estimator/funnel/engine.ts` (`DEFAULT_CONTAIN_ZOOM` 1.3). Unset = the pool's look (option rules contain at 1.3 on white, view/matrix cover); Pool Masters sets nothing and its screenshots are pixel-identical before/after. Bathroom and kitchen: `photoFrame {fit: 'contain', zoom: 1, backdrop: 'blur'}`, size plans `contain`, zoom 1, white. Card size unchanged (no layout shift; every step still fits an iPhone SE / 14 Pro / Pixel 7 screen). On white a fallback still covers; on blur it is shown whole. Tests: `tests/estimator-funnel-photo-frame.test.tsx`.
- **Kitchen simple funnel (2026-10-30, no migration; example prices, `noindex`)**: `/estimator/kitchen-remodel` (+ `/design`, `/my-design`, `/embed/estimator/kitchen-remodel`), HomeQuote Network, same shape and network wording as the bathroom funnel (no licence/years/reviews/projects; HomeQuote team calendar, "Liam from HomeQuote"). Config `content/estimators/homequote-kitchen.ts` (`trade: 'kitchen'`, `experience: 'funnel'`, `funnelSlug: 'kitchen-remodel'`, `revealRange: 'after_contact'`, `adMeasurement: 'opt_out'`), spec `content/estimators/homequote-kitchen-funnel.ts`. New template `lib/estimator/templates/kitchen.ts` + `catalog/kitchen.ts` (`KITCHEN_TEMPLATE`, pricesConfirmed false, validateTemplate clean; project base, cabinets, counter and floor per sq ft of floor, the rest flat; sizes small 10x10 / medium 14x12 / large 18x16; optional `islandStyle`; site visits for an island sink, panel-ready built-ins and an island in a compact kitchen; site questions plumbing/damage/location left for the visit; no packages/scope). Trade `kitchen` is registered in `EstimatorTrade` and `TEMPLATES`; it has **no builder** (`BuilderTrade` = pool | bathroom types `TRADE_META` / `BUILDERS`, so `tradeMeta('kitchen')` and `getTradeBuilder('kitchen')` are null; landing metadata falls back to the funnel's `designDescription`). Steps: size (compact/medium/large -> small/medium/large), finish (Standard = stock shaker, quartz, subway, stainless package, porcelain, recessed lighting, nickel; Luxe = custom, quartzite, slab backsplash, pro range, hardwood, designer lighting, brass), layout (l/u/island -> l_shape/u_shape/island); follow-ups: cabinets (always: white/wood/two_tone `cabinetFinish`), island (layout island: prep/seating/sink `islandStyle`), appliances (Luxe only — Standard's subtitle already promises a stainless package; stainless/pro/panel). 4-6 steps, 180 paths, $32k-$248k example ranges. Lead: project full -> service `full_remodel` (refresh -> `cabinets_counters`, `PROJECT_ALIASES.kitchen`), qualified with homeowner yes. Photos `public/estimator/kitchen/funnel/<key>.webp` (+`-sm`; `scripts/generate-kitchen-funnel-photos.mjs`), each with an Unsplash stock fallback from `content/industry-photos.ts` (alt says "illustrative stock photo"). Keys: size-{compact|medium|large} (to-scale plans on one white canvas), layout-{l|u|island}-{standard|luxe} (one kitchen; every room photo an edit of the master `layout-island-luxe`), cabinets-{white|wood|twotone} (twotone = alias of the master), island-{prep|seating|sink} (seating = alias), appliances-{stainless|pro|panel} (a closer view of the cooking wall, regenerated 2026-10-30 so the three packages read apart on a phone; stainless and panel are edits of pro). Since 2026-10-30 every later step shows the chosen size and the picks so far (see "Size-aware photos" below); the two-tone subtitle reads "White and wood together" so it fits L/U paths too. On an iPhone SE the photo card is small (about 256 x 91 px) because the step must fit one screen. Kitchen nouns: `designNoun()` in `lib/estimator/share.ts` (share text, shared design page), `lib/leads/design.server.ts` NOUN, `lib/booking/recovery-copy.ts` callNames. Lead note "Homeowner: yes, they own the home" for non-pool trades. Tests: `tests/estimator-kitchen-funnel.test.tsx`.
- **Size-aware photos + "Your design" recap (bathroom + kitchen, 2026-10-30, no migration)**: owner: "If I choose small it doesn't show a small bathroom" / "make it feel like they are building it". Every step after the size shows the chosen room with the earlier picks in it. New rooms (kie.ai `nano-banana-pro`, text-to-image masters with the original master as a style reference, then edits; `scripts/generate-{bath,kitchen}-funnel-photos.mjs` `SMALL_JOBS`, `ref`/`refRaw`, `export [key ...]`): bathroom guest 5x8 (`layout-{walkin|combo}-{standard|luxe}-guest`) and full 8x10 (`layout-{walkin|combo|spa}-{standard|luxe}-full`); kitchen compact 10x10 (`layout-{l|u}-{standard|luxe}-compact`) and medium 12x14 (`layout-{l|u|island}-{standard|luxe}-medium`); the primary suite / large kitchen keep the old keys. Follow-ups edited from the matching room photo: `shower-{curbless|bench}-walkin-{standard|luxe}-{full|guest}`, `tub-{clawfoot|stone}-spa-luxe-full`, `cabinets-{wood|twotone}-island-{standard|luxe}-medium`, `cabinets-{wood|twotone}-l-standard-{medium|compact}`, `island-{prep|sink}-luxe-medium`, `appliances-{stainless|panel}-u-compact`; options a room photo already shows reuse it (frameless shower, soaking tub, white cabinets on standard / luxe L-U paths, seating island, compact pro range). Engine: photo rule `variants` (`{by: [{stepId, ordered?}], photos: [{when, photo}]}` in `lib/estimator/funnel/types.ts`; `bestVariant` in `engine.ts`: own option required, others compared in `by` order, same < unnamed < different, ordered steps by distance = nearest size; `photoKey` = file name, so lead `estimator_photos` keys carry the size). Room photos match layout/finish then size (guest spa bath / compact island, site-visit items, show the full / medium room); follow-ups match layout, size, finish. `FunnelSpec.designRecap {label: 'Your design'}`: one truncated line under the photo from step 2 on ("Your design: Full bath · Luxe · Walk-in shower", `designRecap()` in the engine, grows with the current pick; h1 margin 18 -> 10 px with it so the button stays on an iPhone 14 Pro's 660 px; `.fn-recap` hidden at max-height 640 px). Pool: no recap, no variants, unchanged. Fallbacks (budget): spa-path curbless/bench -> the room's walk-in one; primary standard follow-ups -> primary luxe; full standard tubs -> full luxe; vanity step = the original luxe vanity-wall photos for every size/finish; kitchen wood/two-tone only for medium island std/luxe, medium L std, compact L std, large luxe island (wood) — other paths take the nearest same-layout one (U uses L), else nearest size; standard island prep/sink -> luxe of that size; medium appliances -> the large close-ups; compact stainless/panel are U-shaped. Tests: `tests/estimator-funnel-size-photos.test.ts`; full list in `docs/pool-estimator.md` "Size-aware photos".
- **ADU simple funnel (2026-10-30; Buildoly quote-flow format 2026-10-31; no migration; example prices, `noindex`)**: `/estimator/adu` (+ `/design`, `/my-design`, `/embed/estimator/adu`; `/adu` redirects there), HomeQuote Network, network wording as the kitchen funnel (no licence/years/reviews/projects; HomeQuote team calendar, "Liam from HomeQuote"). Config `content/estimators/homequote-adu.ts` (`trade: 'adu'`, `experience: 'funnel'`, `funnelSlug: 'adu'`), spec `content/estimators/homequote-adu-funnel.ts`. **Steps = buildoly.com/design** (owner: "make the ADU one look like Buildoly"): 1 "Select a model." (Studio ~350 / One bedroom ~500 / Two bedroom ~750 / Three bedroom ~1,000 sq ft / Garage conversion ~400; photo = a furnished 3D floor plan on a white card), 2 "Choose your finish." (Standard / Luxe; photo = that model in the backyard), 3 "Design your kitchen." (Standard / Upgraded; the ADU's kitchen in that finish), 4 "Design your bathroom." (Standard: tub + shower, subway tile / Upgraded: walk-in glass shower, large porcelain; added 2026-10-31, owner: "let them design their bathroom as well"), 5 "Choose your storage." (Standard / More closet space; the bedroom; only for 1/2/3 bed, so a studio or garage conversion is 4 steps). 64 paths. Photos fill the card (`photoFrame.fit: 'cover'`; step 1 white contain); no "Your design" line (Buildoly has none). The separate build-type step and the attached addition were dropped (attached stays a template project id for old leads only). Template `lib/estimator/templates/adu.ts` (+ empty `catalog/adu.ts`, `maxSingleOptions: 5` for the five models): every price comes from `lib/adu/pricing-config.ts`, as a range from the figure to ~12% above it; `model` carries `BASE_PRICE` of its tier (`MODEL_TIER`: studio + 1 bed = studio1, 2 bed = b2ba1, 3 bed = b3ba2, garage = garage); Luxe = living room Premium, Upgraded kitchen = kitchen Premium Plus, Upgraded bathroom = bathroom Premium, More closet space = bedroom Premium Plus, each for the model's tier through hidden per-tier yes/no questions (`finishUp_<tier>`, `kitchenUp_<tier>`, `bathUp_<tier>`, `storageUp_<tier>`, shown only for that tier's models; the funnel's pick answers all of them via `upgradeAnswers()`, only the visible one prices). All four together = `luxeUpgrade(tier)`. `project` (detached / garage) is answered from the model (the adu funnel's service value, `PROJECT_ALIASES.adu`). Trade `adu` in `EstimatorTrade` / `TEMPLATES`, excluded from `BuilderTrade`. Nouns: `designNoun('adu')` = "ADU", design.server NOUN, recovery-copy callNames. **Photos** (`public/estimator/adu/funnel/`, `scripts/generate-adu-funnel-photos.mjs`, kie.ai nano-banana-pro, 18 credits each at 1K): exteriors are ONE drone view of one house + lawn + detached garage in the same light (studio built on the master on a painted magenta footprint; 1 bed = `type-detached`, 2 bed, 3 bed (an L-shaped wing) each grow the previous; garage conversion edits the master; each Luxe is an edit of its Standard: `finish-detached-<model>-luxe`, `finish-garage-luxe`; redone 2026-10-31 as MINIMAL (owner: the cedar + deck + lights version was "OD"): the same building with only smooth white stucco, black windows and door and a slim dark standing-seam roof). Plans `plan-<model>` are edits of `plan-1bed` (one style and scale); `plan-garage` (two sofas back to back, bed mid-room) and `plan-3bed` (only two bedrooms) ship fixed edits of themselves (`plan-*-fixed` raws, script ALIASES). Inside: `kitchen-standard` (white frames, grey plank floor) -> `kitchen-luxe` (black frames, oak floor) -> `-upgraded` (oak cabinets, premium appliances); `bedroom-standard` styled from the kitchen -> `bedroom-luxe` -> `-more` (three wardrobes); `bath-standard` styled from the kitchen -> `bath-luxe` (black window frame and fixtures, oak floor) -> `-upgraded`. 27 files, every path has its own exact photo, no fallbacks. Live use needs the `adu` funnel row in `funnels` ("Add house funnels" on `/app/funnels`, then publish). Tests: `tests/estimator-adu-funnel.test.tsx`.
- **Product name**: the self-serve version for other contractors (planned) is called **Rendoly** (one L; the owner holds the domain **rendoly.com**) (e.g. a "Powered by Rendoly" link on contractor estimators). Not built yet; Pool Masters' estimator shows Pool Masters branding. Logo (roofline r: a roof over a lowercase "r") in `public/brand/rendoly/` (SVG masters with the wordmark outlined, PNG icons/favicons, colours and rules in its README); not used by any page yet.

## 41. Add sales appointments to Google / Apple Calendar (migration 0066, 2026-10-28; applied to production 2026-10-28)
- **Where**: `/app/calls/appointments` — every upcoming sales appointment (meeting booked with a contractor prospect) has **Add to Google Calendar** and **Add to Apple Calendar** (component `components/calls/add-to-calendar.tsx`; links built in `lib/calls/calendar-links.ts`). Cancelled or past meetings that were never added show nothing.
- **Apple**: `GET /api/calls/appointments/[id]/ics` (inline `text/calendar`, so iPhone/Mac Safari open it in Calendar). UID `sales-meeting-<id>@homequotenet.com` (`salesMeetingUid`, the same UID as the confirmation-email invite in `lib/emails/meeting-invite.ts`), SEQUENCE = `updated_at` seconds, STATUS:CANCELLED for cancelled meetings. Re-opening updates the same event, never a copy.
- **Google**: the prefilled `calendar.google.com/calendar/render?action=TEMPLATE` link, which cannot detect an existing event. So each add is recorded in **`sales_appointment_calendar_adds`** (migration 0066: appointment, user, provider google/apple, the meeting time added; PK per appointment+user+provider; RLS = own rows only, insert/update only for appointments the user can see; cascades with the appointment) via `markSalesAppointmentAdded` (`lib/actions/sales-calendar.ts`). After adding, the button becomes **In Google Calendar** (opens that day). A rescheduled meeting shows **Time changed: move it in Google** (opens the old day so the event is moved, not re-added); a cancelled one shows **Cancelled: remove from Google**. Apple shows the same states and re-downloads the updated .ics. Read through `listCalendarAdds` (`lib/data/prospects.ts`).
- **Before 0066 is applied**: the buttons still work, but nothing is remembered (the read returns empty and the write fails quietly), so the Google button keeps offering "Add".
- **Not done**: a direct Google Calendar API write (the §24 OAuth is dormant and no connection exists), and a one-time subscribe feed for sales appointments (would sync every meeting automatically).
- Tests: `tests/sales-calendar.test.ts` (links, UID/SEQUENCE, 0066 RLS in PGlite), `tests/add-to-calendar-ui.test.tsx`.
- **Calendar view (2026-10-28, no migration)**: `/app/calls/appointments` has a **List | Calendar** switch (`?view=calendar&month=YYYY-MM`, keeps the partner/status filters; the List-only "When" filter is hidden in calendar mode).
  - `components/calls/appointments-calendar.tsx`: a month grid, Sunday first, 4–6 rows. Days use the calling workspace zone (`CALL_TZ`, Los Angeles), so a 9 PM meeting stays on its day.
  - On desktop each day shows status-coloured chips (time + company, "+N more"); on phones it shows dots.
  - Today is circled and weekends are tinted. Prev/next/Today are links.
  - Picking a day opens its agenda: beside the grid on desktop (sticky), under it on phones (scrolls into view). The agenda shows time (plus the prospect's local time if their zone differs), status, company link, decision maker, call type/contact, who booked it (admins), notes, Call, and compact Google/Apple add buttons.
  - Pure grid math lives in `lib/calls/calendar-grid.ts`; tests in `tests/calendar-grid.test.ts`. `listSalesAppointments` gained `from`/`to`.

## 42. HomeQuote as an MCP server for Claude — "Claude connector" (migration 0067, 2026-10-28; applied to production 2026-10-28)
- **Endpoint** `POST /api/mcp` (`app/api/mcp/route.ts`): stateless MCP over Streamable HTTP, plain JSON-RPC replies; GET/DELETE 405; notifications 202. Auth `Authorization: Bearer hq_…` only (middleware skips the path). Same shape as the Seret MCP (§32).
- **Keys** (`lib/mcp/keys.ts`, table `mcp_api_keys`): `hq_` + 256 bits, only the SHA-256 hash stored, shown once; `scopes` ⊆ {read, write, text} (read always). A key acts for the admin who created it (`created_by`) and stops working if they are no longer an active admin or the key is revoked. Managed at `/app/claude-connector` (nav: Claude connector; admin only), which also shows setup (Claude Code `claude mcp add --transport http homequote <url> --header "Authorization: Bearer <key>"`; claude.ai/Desktop custom connector + request header) and the last 25 tool calls.
- **Tools** (`lib/mcp/tools.ts`, service role, filtered by scope): read — `business_summary`, `search_leads`, `get_lead` (contact, project, qualification/consent, activity, text conversation, assignments, appointments), `list_appointments`, `list_contractors`, `texting_overview`, `list_workflows`, `explain_workflow`, `get_workflow` (a visual workflow's current draft as `{nodes, edges, settings}` + its `revision`; classic workflows are refused), `workflow_building_guide` (the AI-builder catalogue text); write — `add_lead_note`, `update_lead_status`, `create_workflow_draft` (checked with `checkGraph` + catalogue, saved as an unpublished draft by direct insert attributed to the key's admin; never published), `update_workflow_draft` (replaces an existing visual workflow's draft: same `checkGraph` against the workflow's own contractor, archived refused, optimistic concurrency via `update workflow_graph_drafts … where revision = <from get_workflow>` → revision+1, `content_hash` from the shared `lib/workflows/graph/hash.ts` (`hashGraph`, also used by `saveGraphDraftAction`), keeps canvas positions when the step ids are unchanged, audit `workflow.graph.mcp_update`; never published — a live workflow keeps running its published version); text — `send_text` (via `queueWorkflowText`, all texting rules, note "Text from Claude queued", max 30 per key per 24h); assign — `propose_lead_assignment` + `list_pending_approvals`: Claude can only PROPOSE assigning a lead to contractors. It writes `mcp_pending_actions` (pending, 24h expiry, max 20 open per key) and pushes "Claude needs your OK" to the key's admin; the assignment runs only when a signed-in admin clicks **Approve** on `/app/claude-connector` (`decideMcpAction`, claims the row first so a double click runs once; `lib/leads/assign.server.ts` mirrors the lead page's assignLead: pricing agreement, status → assigned, timeline note "proposed by Claude, approved by …"). No publish, delete, direct assignment, calls or billing.
- **Booking appointments (migration 0071, 2026-10-29)**: assign-scope tool `propose_appointment` (`lead_id`, `date_time` as Pacific wall time `YYYY-MM-DDTHH:mm`, optional `contractor_id` when the lead has several open assignments, `notes`, `reason`): checks future/≤90 days, an open assignment, no duplicate, reports a contractor-availability conflict in the summary; writes `mcp_pending_actions` kind `book_appointment` + push. On Approve, `decideMcpAction` calls `bookAppointmentAs` (`lib/appointments/book.server.ts`, service role; same steps as the lead page's `scheduleAppointment`: appointment row, assignment + lead → `appointment_set`, timeline note "proposed by Claude, approved by …", availability override audited because the admin approved it), then flushes notifications/calendar and runs the reminder texts. Migration 0071 widens the `kind` check (constraint-only; listed as undetectable in `tests/migration-plan.test.ts`). `scheduleAppointment` itself is unchanged.
- **Audit**: every `tools/call` writes `mcp_tool_calls` (key, tool, short summary without message bodies, ok). Tool problems return `isError` results Claude can read.
- **Tests**: `tests/homequote-mcp.test.ts` (keys incl. revoked/non-admin owner, scope filtering, reads, note/status, workflow draft valid/invalid, texting rules + daily cap). Not verified against live Supabase or a real Claude client.

## 43. Reminder texts + no-reply follow-ups — no-show prevention (migration 0068, 2026-10-29; applied to production 2026-10-29)
Built-in, always-on (switchable) texting through the Mac bridge, with every texting rule (master switch, texting hours in the recipient's zone via `nextEligible`, `sms_opt_outs`, daily cap). Settings: **Texting → Reminders & follow-ups** (`components/texting/reminders-form.tsx`, saved by `saveReminderSettings` in `lib/actions/sms.ts` into `sms_settings.reminder_config`; only changed wording is stored, blank = default in `lib/sms/reminder-config.ts`).
- **Migration 0068**: `sms_conversations` / `sms_messages` get `prospect_id` (contractor prospects can be texted), `lead_id` becomes nullable, CHECK exactly one of the two; `sms_messages.reminder_kind/ref/step`; table **`sms_reminders`** (kind `sales_meeting|home_appointment|no_reply`, ref_id, step, `anchor_at` = meeting time (or follow-up anchor), status `queued|skipped|alerted|confirmed|reschedule`, UNIQUE (kind, ref_id, step, anchor_at): a step is claimed before its text is queued so nothing sends twice, and a rescheduled meeting re-arms); RLS admin select. Before 0068 the runner and the settings card are inert.
- **Schedule** (`lib/sms/reminder-plan.ts`, pure, meeting's own zone): `booked` (right away, if 2h+ out), `four_days` (10:00, only when booked 7+ days ahead), `day_before` (10:00, "Reply YES to confirm or R to reschedule"; skipped once confirmed, and when booked after 10:00 the day before), `morning_of` (**8:00 AM**, meetings at 9:30+), `two_hours`; steps within 60 min of an earlier one (90 min for two_hours after morning_of) are dropped; each has an `until` and is skipped rather than sent late. `no_show`: one "sorry we missed you" 30 min after a meeting is marked no-show.
- **Runner** `runTextReminders` (`lib/sms/reminders.ts`): every 5 minutes from `/api/workflows/tick`, and immediately (`runTextRemindersSoon`, `after()`) when a sales meeting is booked/updated (`logCallOutcome`, `setSalesAppointmentStatus`) or a homeowner appointment is scheduled/updated (`lib/actions/leads.ts`). (1) **Sales meetings** (`prospect_sales_appointments`): texts the phone in `contact_info` if it parses, else the company phone; never do-not-call/archived/opted-out; host "Liam" + brand "HomeQuote" (editable); one prospect conversation per prospect. If `day_before` went out and no YES by 8:00 on the day → push `workflow_alert` "Meeting not confirmed" to admins + the booking partner (once, step `unconfirmed_alert`). (2) **Homeowner appointments** (`appointments` → `lead_assignments` → lead): same steps, sender = contractor texting name/name; a conversation started by a reminder is `handoff` (a person handles free-text replies). (3) **No-reply follow-ups**: active, non-workflow-owned lead conversations: never replied → texts on days 1/3/7 (configurable, max 3) after the first text, the last closes the conversation + lead note; replied then went quiet on our message → nudge after 1 day and 3 days. 12h grace each. A reply to a follow-up-closed conversation reopens it to the assistant.
- **Replies** (`lib/sms/reminder-replies.ts`, from `handleInbound`): prospect conversations never reach the homeowner assistant or `message.received`: YES → meeting `confirmed` + `confirmed_at` + "You're all set" reply; R/"can't make it" → push "Wants to reschedule"; anything else → push with the text. Lead conversations: only when our last text (48h) was an appointment reminder: YES → note + reply; R → `handoff`, note, push. Otherwise the normal flow.
- **Appointments page**: chips per sales meeting from `sms_reminders` (`lib/sms/reminder-status.ts`): "Confirmed by text", "Asked to reschedule by text", "Not confirmed. Call them", "Day-before reminder sent"… (admins only via RLS).
- The **Appointment reminders by text** workflow template now notes it duplicates the built-in reminders.
- **Known gaps**: a next-day meeting booked after 10:00 gets no YES-request text (and so no unconfirmed alert); homeowner time zone comes from state/ZIP (fallback LA); reschedules done outside the app actions are picked up by the 5-minute tick.
- **Calls booked on a HomeQuote calendar (§45, migration 0070)**: this runner is their only source of reminder texts (no "booked" step: the booking system's confirmation text covers it; who-calls line; lead consent required; R points to the manage link in the email). Booking confirmations / reschedules / cancellations and all emails stay in `lib/booking`. Details in §45 "Reminders: one set per booking".
- **Nurture for every lead (2026-10-29, no migration):**
  - **Reminders for calls booked on a calendar:** they no longer need the form's consent flag when the homeowner has texted us back (any inbound `sms_messages` for the lead). Meta Instant Form leads, most leads, never carry the flag but are in a two-way conversation. Visits never needed it.
  - **Re-offer times (step 4 of `runTextReminders`):**
    - When the assistant hands a conversation off to get a time booked (a visit request, a call request, or a booking that failed / was taken with no other times), `markAwaitingBooking` writes an `sms_reminders` marker (`kind no_reply`, `step await_booking`, anchor = handoff). Upset, off-topic, closed and unqualified handoffs get none.
    - A day later (`rebook_1`) and three days later (`rebook_2`), if the conversation is still `handoff`, the lead is still open, nobody has texted them by hand (outbound `ai=false`, not a reminder / workflow), no `contact_attempt` / `appointment` activity was logged, and nothing is booked, the assistant texts three real open times (`rebookText` + `threeSpread`, visit or call by the conversation's mode).
    - It then sets the conversation back to `active`, so their reply gets booked.
    - The ordinary no-reply follow-ups skip conversations with a marker in the last 10 days.
  - **Leads from other connected sources:** non-Meta intake leads (`ingestLead`) that arrive with `consent_granted` get the opening text, assistant and follow-ups (`startSmsForConsentedLead`); never without consent.
  - **Still not nurtured automatically:** leads typed in by staff (`createLead`) and leads with no consent and no reply. Email nurture is not built.
  - **Keep texting until STOP (owner decision 2026-10-29, `followups.keepGoing`, default on, `everyDays` default 3):**
    - The day-7 "I'll close out your request" text is not sent, and the conversation is never closed. From the last follow-up day (never replied), or from day 3 + every (went quiet after replying), one text every `everyDays` (`planKeepGoing`: `keep_1`, `keep_2`, …).
    - Wording: `keepGoingText` rotates six lines, three with real open times from `loadBookingOptions`, each ending "Text STOP to stop these." (fewer junk reports on the Apple ID).
    - Stops on a reply (which moves the anchor), STOP / opt-out, a live appointment, an archived lead, a lead no longer new / contact_attempted / qualified / assigned, or a person taking over (status not active).
    - Texting hours and the daily cap apply. The conversation query looks back 400 days instead of 30.
    - Settings: Texting → Reminders & follow-ups → "Keep texting until they reply or text STOP" + "Every how many days". Tests in `tests/sms-reminders.test.ts`.
  - Automation Map entries: `sms_consented_first_text`, `sms_rebook`. Tests in `tests/sms-booking.test.ts` and `tests/booking-reminders-single.test.ts`.
- **Tests**: `tests/sms-reminders.test.ts` (planner incl. DST, wording, replies, chips; PGlite: contractor texts once per step, YES/R, unconfirmed alert once, DNC/company phone/STOP, reschedule re-arm, cancelled, switches, homeowner reminders + YES, follow-ups 1/3/7 → close → reply reopens, a reply stops them).

## 44. Automation Map — every automation in one place (migration 0069, 2026-10-29; applied to production 2026-10-29)
- **Page** `/app/automations` (nav: Automation Map, Administration, admin only): every built-in automation grouped by area (schedulers, texting, leads & alerts, workflow engine, Meta, calls, calendar/documents/quizzes, payments, Claude connector), each with when it runs, what it does, status (**On**, **Needs a look**, **Off**, **Not active** = a required env var is missing (names only, never values), **Not set up** = its table/migration is missing), last ran, count in the last 7 days, a Settings link, known gaps, and technical details; then every user-built workflow (live/draft/paused, trigger, runs and failures in 7 days). GET filters `?area=&state=&q=`. Component `components/automations/automation-map.tsx`.
- **Registry** `lib/automations/registry.ts` (pure, `AUTOMATIONS`): **add an entry for every new automation.** `tests/automations-map.test.tsx` fails when a scheduled `.github/workflows/*.yml` job or a job awaited in `app/api/workflows/tick/route.ts` isn't listed, and checks every `settingsHref` page exists.
- **Live status** `lib/automations/status.server.ts` (`automationStatuses(db, now)`, `workflowSummary`): settings rows (`sms_settings` incl. `reminder_config` and bridge check-in, `meta_settings.delivery_mode`, `meta_studio_settings`, `ai_calling_settings`), env presence, and per-record last/7-day/failed counts; every query is guarded so a missing table shows "Not set up". Needs a look: scheduler without a run for 15 min (90 for the hourly Studio tick), bridge offline while texting is on, texts waiting for the bridge, failures in 7 days.
- **Heartbeat** (migration 0069): `automation_runs` (job `workflow_tick|meta_tick|meta_studio_tick|ai_calling_tick`, started/finished, ok, small summary; admin-select RLS), written best effort by `recordAutomationRun` (`lib/automations/runs.server.ts`) from the four tick routes; the workflow tick prunes rows older than 30 days. Before 0069 the scheduler rows show "Not set up".
- **Claude connector**: read tool `list_automations` (optional `state` filter) returns the same map plus workflows with links.
- **Known gap surfaced on the page**: `/api/funnels/deliver` (CRM delivery retry) has no schedule; failed CRM deliveries only retry after a new lead or by hand.
- Test helper: `fakeSupabase` now supports `.not(col, 'is', null)`.

## 45. HomeQuote booking system — own calendars, Calendly retired (migration 0070, 2026-10-29, NOT yet applied/deployed; renumbered from 0068 when main shipped 0068_text_reminders / 0069_automation_runs)
Owner decision 2026-10-29: no more Calendly for homeowner or contractor bookings; HomeQuote runs its own calendars. Homeowners book a free call (phone/video) right after the funnel, Buildoly-style ("Book your free call": day headings over stacked full-width blue time buttons). Default for every calendar ("go ahead use 9-5 for now"): **Mon–Fri 9:00–17:00 America/Los_Angeles**, 2 h minimum notice, 14-day horizon, no daily cap.
- **Call lengths (owner, 2026-10-29)**: Liam personally calls every homeowner to qualify and book the on-site visit, so **homeowner calls are a quick 10 minutes**: the HomeQuote team calendar, the Pool Masters calendar and every contractor calendar created on demand (`ensure_contractor_booking_calendar`) are 10-min calls, 15-min grid (9:00, 9:15, 9:30 …), 5-min buffer (`HOMEOWNER_CALL` in `lib/booking/types.ts`). The **sales calendar** (contractor prospects) stays 30 / 30 / 15 (the column defaults, `DEFAULT_CALENDAR`). Homeowner copy derives the length from the calendar: `callLengthPhrase` ("A quick 10-minute call", "quick" only ≤ 15 min); the pool funnel intro is `bookingTitle: 'Pick a time for a quick {minutes}-minute call with {host}.'` (`BookingFlow` `intro` fills `{minutes}` / `{host}` once the calendar loads, `fillIntro`; a skeleton line until then).
- **Host contact ("who calls", 0070 columns `booking_calendars.host_display_name / host_first_name / host_org / host_phone (E.164) / host_email / host_photo_path (/images/… only) / host_note ({minutes})`)**: stored on the calendar (DB, not TS) so the person, number or logo can change without a deploy; editable on `/app/calendar/settings` → "Who calls the homeowner" (`saveBookingCalendarSettings`, phone normalized with `vcardPhone`). Seeds: team + sales = "Liam from HomeQuote" / HomeQuote Network / +17472175713 / `homequote-network-logo.webp`; Pool Masters = "Liam from Pool Masters" / Pool Masters LA / +17472175713 / `poolmasters-logo.png` / "Your free {minutes}-minute pool design call…". Null fields fall back in `lib/booking/host-contact.ts` (`resolveHostContact`: team / sales → Liam at `site.contact.phoneHref`; a contractor calendar with nothing set → no host: wording names the company, no card). Public shape `PublicHostContact` on `PublicCalendar.host` / `PublicBooking.host` (`publicHost` in `app/api/booking/_lib/resolve.ts`; business details only). Wording: "A quick 10-minute call. **Liam from Pool Masters** will call you at the number ending 0123."
- **vCard** `GET /api/booking/contact/<calendarId>.vcf` (`app/api/booking/contact/[file]/route.ts`, `lib/booking/vcard.ts`, `lib/booking/host-photo.server.ts`): vCard 3.0, `text/vcard; charset=utf-8`, `Content-Disposition: inline; filename="Liam - Pool Masters.vcf"` (inline so iOS / Android open their Add Contact sheet), FN + N (whole display name as given name, so caller ID reads "Liam from Pool Masters"), ORG, `TEL;TYPE=CELL,VOICE`, EMAIL if set, URL (contractor's https website, else homequotenet.com), NOTE, `PHOTO;ENCODING=b;TYPE=JPEG` (logo → 256 px square baseline JPEG on white via `sharp`, now a direct dependency; read from disk — traced in `next.config.ts` — else fetched from the site; cached per instance; omitted if conversion fails). CRLF, folded at 75 octets (UTF-8 safe). Public, active calendars with a number only (else 404), rate limit `contact` 30 / 10 min per IP, `Cache-Control: public, max-age=3600`. Not opened automatically after booking (the booking's network round trip ends the tap's user activation, and leaving the page would interrupt the confirmation): the booked screen makes "Save Liam's number" the primary button instead.

- **Whose calendar**: a funnel / estimator tied to one contractor (Pool Masters) books that **contractor's** calendar; a network funnel with no contractor (bathroom-remodel, kitchen-remodel, pool-remodeling, the bathroom estimator) books the **HomeQuote team** calendar (project specialists; staff match a contractor later; trigger `attach_calendar_appointments_to_assignment` moves a booking on a contractor's calendar onto the assignment when the lead is assigned to that contractor); the contractor sales funnel (`/contractor-appointments/check-fit`) books the **HomeQuote sales** calendar. `lib/booking/calendars.server.ts` `calendarForFunnel` / `calendarForEstimator` / `calendarForContractorFunnel`.
- **Schema (0070)**:
  - `booking_calendars` (kind contractor|team|sales; one team + one sales; one per contractor; timezone checked against `pg_timezone_names`; duration / step / buffer / notice / horizon / max_per_day / meeting_type phone|video / video_link / active), `booking_calendar_rules` (weekday 0=Sun, local start/end minute), `booking_calendar_exceptions` (blocked / extra-available, date range or weekly repeat), `booking_calendar_members` (hosts, `notify`). Separate from the contractor on-site availability tables (§24): those mean "no schedule = unrestricted, 60-min visits" and are live with contractors' own choices.
  - Seeds: "HomeQuote team" + "HomeQuote sales" (active admins as hosts) and the Pool Masters calendar (company owners as hosts; found by its `pool-masters*` funnel, then by name, skipped if absent). Contractor calendars are created on demand (`ensure_contractor_booking_calendar`).
  - `appointments` gains `lead_id` (the anchor; backfilled without touching `updated_at`, then filled from the assignment by trigger), `calendar_id`, `ends_at`, `time_zone`, `invitee_time_zone`, `source`, `meeting_type`, `contact_name/phone/email`, `manage_token_hash`, `cancelled_at`, `cancel_reason`, `rescheduled_from_id` (unused: a reschedule moves the row), `reschedule_count`, `confirmed_at`, `reminder_24h_sent_at`, `reminder_1h_sent_at`, `cancel_notified_at`. **`assignment_id` is NULLABLE** (check: assignment_id or lead_id); `booked_via` allows `'website'`.
  - `prospect_sales_appointments` gains calendar_id, ends_at, source, manage_token_hash, cancelled_at, cancel_reason, reschedule_count, `booking_confirmed_at` (`confirmed_at` already means "the setter confirmed"), reminder stamps, `cancel_notified_at`. `contractor_funnel_submissions.sales_appointment_id`; booking_status also 'cancelled'. `calendar_connections.contractor_id` nullable (team / sales hosts' own Google).
  - Existing triggers (workflow events, `appointment_changed` push, outcome ledger, calendar sync) fall back to lead_id and the contractor calendar; payloads carry `calendarId`, `source`, `endsAt`.
- **Double booking**: every RPC re-checks under `pg_advisory_xact_lock(hashtextextended('booking_calendar:'||id,0))`, and BEFORE triggers `trg_appointments_booking_guard` / `trg_sales_appointments_booking_guard` take the same lock for ANY write that puts a row on a calendar or moves it (PostgREST, lead page, held→scheduled undo) and refuse an overlap with another live booking there (errcode 23505 → `slot_taken`). Sales meetings setters add by hand (no calendar) take the sales lock and count as busy. Partial unique indexes on (calendar_id, scheduled_at) are the backstop. Starts must sit on the calendar's grid in its own wall clock (9:00, 9:30 …, whole minutes; `invalid_time` otherwise). "Book anyway" (staff) skips hours / notice / horizon / cap / grid, never a real overlap. A slot must sit inside one local day; DST via Postgres' tz database (the TS picker skips the spring-forward gap and the fall-back repeat).
- **RLS**: staff (admin, setter) see all appointments; a contractor sees rows whose assignment it owns or on its own contractor calendar (never team / sales / other companies) and writes only rows that stay inside its company, for leads assigned to it. Calendars / rules / exceptions / members: staff + own company read; admins + the contractor owner write. **Hosts** must be eligible (SQL `eligible_booking_calendar_host` in the members WITH CHECK): a contractor calendar takes only that company's active users, team / sales only active admins / setters. anon: no table access; internal helpers (`appointment_contractor_id`, the RPCs) are not callable by anon / authenticated. Homeowners never get table access.
- **RPCs** (security definer, service_role only, jsonb `{ok,...}`): `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `book_sales_appointment`, `reschedule_sales_appointment`, `cancel_sales_appointment`; helpers `booking_slot_problem`, `booking_calendar_busy`, `ensure_contractor_booking_calendar`, `claim_booking_reminders`, `booking_switch_funnels_to_native` (deploy step, below).
  - `book_appointment` with a funnel / estimator session requires a submitted, **qualified**, not-yet-booked session (a session whose calls were all cancelled may book again) and keeps every old side effect: `funnel_bookings` (provider `homequote`, verified), `funnel_sessions.booked_at`, `funnel_events appointment_booked`, `lead_activities`, assignment + lead `appointment_set` (also for a team-calendar specialist call: it counts as the lead's appointment stage; marking it held does NOT move the lead to appointment_completed — that stays for the contractor's visit), workflow `appointment.*` (homeowner actor = `contact`), push, ledger (a team call is network-level, contractor_id null), Meta `Schedule`.
  - Sales: a funnel self-booking has `partner_id` NULL (no setter pay, 0062). A setter booking on someone's behalf from the Calendar passes themselves; the Calendar refuses a second live sales meeting for the same prospect, and a setter may move / cancel / mark only meetings they booked (admins any), so a self-booked meeting can't be re-credited by cancel + rebook.
  - Error codes + homeowner wording: `lib/booking/types.ts` `BOOKING_ERROR_MESSAGES`.
- **TypeScript**: `lib/booking/*` — `slots.ts` (pure, mirrors the SQL check incl. the grid), `slots.server.ts` (`getSlots`; hosts' Google busy via `loadHostBusy`: the contractor company's connections, or team / sales members' own; an outage never blocks), `book.server.ts` (book / reschedule / cancel + by manage token), `tokens.ts` (`managePath()` = `/booking/manage/<token>`), `format.ts`, `notify.server.ts` / `reminders.server.ts` / `sms-copy.ts` (notices), `lib/emails/booking.ts`. Server actions for the app: `lib/actions/booking.ts`; role rules `components/calendar/access.ts`.
- **Public API** (`app/api/booking/**`; same-origin + per-IP rate limits (in memory, per instance: best effort), `no-store`, no referrer): `GET /slots` (grant in `X-Booking-Grant`; an already-booked grant gets its live booking back WITH the manage link; a cancelled one gets fresh times), `POST /book`, `POST /callback` ("None of these times work" / no open times: a flagged lead timeline entry, or a dated review note + `next_callback_at` for the sales funnel), `GET/POST /manage/[token]`, `GET /manage/[token]/slots`. **Grants**: funnel / estimator ticket `hqb1.<f|e>.<sessionId>.<exp>.<sig>` (HMAC with `BOOKING_TICKET_SECRET`, 7 days; issued by the funnel session route for a qualified session on a homequote calendar step and by the estimator lead route for a saved qualified non-demo lead); sales funnel `hqc1.<submissionId>.<token>` (checked against the stored hash in constant time); manage link = the token in the path. The book route sends Meta CAPI `Schedule` (`<session>:Schedule` event id, pixel + consent only, `/estimate/` or `/estimator/` source URL, audit row linked to the appointment); `booked_via 'website'` → Meta action_source `website`.
- **Homeowner UI** (`components/booking/**`): `<SlotPicker>` (3 days then "Show more days", 6 times a day then "N more times"; one column on phones, 2–3 columns when wide; names the zone, "Pacific Time" without PDT/PST when the list crosses a DST change; offers the calendar's zone; listbox + arrow keys), `<BookingFlow grant>` (pick → confirm → "You're booked": soft check, the start time set large ("9:15 AM", "to 9:25 AM PDT"), who calls, the host contact card (`HostContactCard`: logo avatar, name, number, org, primary "Save Liam's number" → the vCard) then Add to Google / Apple-Outlook .ics side by side when wide, then Reschedule or cancel; the manage page shows the same card with a quiet button; also after a refresh; "taken meanwhile" returns to fresh times; a failed confirm says nothing was booked; no open times → a primary "Request a callback"; load failure → "Try again" (skeleton) or ask for a call; the picker keeps its expanded days when going back from confirm; `bk-on-dark` for dark hosts). Used by the pool funnel booking step (light intro sentence instead of a second heading, so times show above the fold on small phones), the configurator result, the step-by-step estimator result, the old funnels' calendar step (`funnel-experience.tsx`) and the contractor sales funnel (its own h1 "Your call is booked."; the flow hides its duplicate heading and promises email only).
- **Manage page**: `/booking/manage/[token]` (server-rendered, `noindex`, no login; token = HMAC of the booking id (256-bit), only its SHA-256 stored; the `(booking)` layout keeps the funnel typeface and shows the contractor's name or the HomeQuote logo) + `calendar.ics` (single invite, served inline so iOS offers "Add to Calendar"); `/book/manage/[token]` redirects there. Reschedule with the same picker, cancel with an optional reason; past / cancelled calls are read-only with a tap-to-call button for the host (contractor phone, else HomeQuote). A manage link cannot change a call after its time and has no other expiry.
- **Notices (automatic, not dependent on any workflow)**: `notifyBookingSoon()` after each book / reschedule / cancel, and `/api/workflows/tick` → `runBookingNotifications()` as the backstop (unsent confirmations; `claim_booking_reminders` 24 h / 1 h reminder **emails**; cancellations of homeowner calls AND sales meetings, each claimed once via `cancel_notified_at`). Homeowner email (own zone, .ics with stable UID, METHOD:CANCEL on cancel) + a booking / reschedule / cancellation text (never a reminder text, see "Reminders: one set per booking" below) via `queueWorkflowText` (all texting rules, consent, opt-outs, quiet hours, bridge must be online; a text that would be held past the call is skipped). Texts carry no link (the SMS pipeline strips links; they point to the email); with a host contact they say who calls and spell out the number to save ("Hi Pat, you’re booked: a quick 10-minute call with Liam from Pool Masters, Tue, Nov 3 · 9:30 AM PST. Liam will call you at (310) 555-0100. Save (747) 217-5713 so you know it’s us. …"). Emails name the host ("Your call with Liam from Pool Masters is booked: …", "Liam will call you at … from (747) 217-5713.") and, on confirmations / reschedules / reminders (not cancellations), carry a contact block with "Save Liam's number: <vcard link>"; the .ics title is "Phone call with Liam from Pool Masters". Sales calls: email only from here; their texts (incl. the "booked" one) come from `runTextReminders` (§43). Hosts: email (members with notify, else the contractor's users) + push (`lib/notifications/routing.ts` adds calendar hosts for `payload.calendarId`) + Google sync. Claimed notices that then fail are logged, not retried. **Old workflow templates**: workflows cloned from "Appointment Confirmation" / "Appointment booked → confirmation → reminder" are skipped by both engines for calendar bookings (`lib/workflows/native-booking.ts`; graph runs log `native_booking_notices`), so homeowners never get two confirmations; they still run for on-site visits. Custom `appointment.booked` workflows still run.
- **Reminders: one set per booking (reconciled with §43, 2026-10-29)**. Both systems used to text a homeowner ~24 h / ~1 h before the same call. Now:
  - **Reminder TEXTS = `runTextReminders` only** (`lib/sms/reminders.ts`, §43) for on-site visits, calendar calls (homeowner) and sales meetings: day before 10:00 with "Reply YES to confirm or R to reschedule", 4 days before (booked 7+ days out), 8:00 morning-of, 2 hours before, no-show; `sms_reminders` dedupe, texting switch / hours / daily cap / opt-outs, unconfirmed alert (sales). For a call with `appointments.calendar_id`: anchored on `lead_id` when there is no assignment yet (team calendar), the homeowner's own `invitee_time_zone`, **lead consent required** (skipped "The homeowner did not agree to texts."), its **"booked" step is dropped** (our confirmation text covers it), `{how}` = "quick 10-minute call" / "30-minute call" / "video call" (`homeownerHow`; on-site visits stay "free estimate visit"), `{host}` = the calendar's host contact ("Liam from Pool Masters"), and a phone call's text ends "Liam will call you from (747) 217-5713.". The default homeowner wording now uses `{how}` instead of the hard-coded "free estimate visit" (identical output for visits; a stored custom template keeps its own words).
  - **YES / R** for calendar bookings work through `lib/sms/reminder-replies.ts` (the conversation our booking text opened is `workflow_owned`; reminder replies are handled before that check). YES → "You're all set, talk to you …", note "Confirmed the call"; R → handoff + push + `MANAGE_REPLY` ("You can pick a new time with the link in your confirmation email, or we’ll reach out shortly.") when the guest has an email (homeowner: `contact_email` / lead email; sales: prospect email), so the self-service reschedule link is never lost (texts cannot carry links: `finalizeOutbound` strips them).
  - **lib/booking keeps**: the instant confirmation / reschedule / cancellation TEXT (homeowner calls only; sales meetings get main's "booked" text), every EMAIL (guest confirmation / reschedule / cancel with .ics, 24 h + 1 h reminder emails with the manage link, host emails). `sendBookingReminder` no longer texts (`sms: 'text_reminders'`). On a reschedule / cancel, `voidQueuedTexts` also fails the still-queued `runTextReminders` texts for the old time (via `sms_reminders.message_id` + `anchor_at`; all of them on cancel); the new time re-arms by its own anchor.
  - The tick runs `runBookingNotifications` BEFORE `runTextReminders`, and records both in the automation-run body (`bookings`, `reminders`). Automation Map entry `booking_notices`.
  - Known gaps: main's homeowner reminders don't check the contractor's own texting switch (our booking text does), so a Pool Masters calendar call gets reminder texts even when Pool Masters texting is off; if our booking text could not start a conversation and a reminder later opens a `handoff` one, later booking texts (reschedule / cancel) are skipped as `person_took_over` (the emails still go).
  - Tests: `tests/booking-reminders-single.test.ts` (one reminder text per step per booking across both runners, reminder emails still sent, YES / R for calendar calls and sales meetings, reschedule / cancel voiding, consent), `tests/sms-reminders.test.ts` (team-calendar call without assignment), `tests/booking-notify.test.ts` (reminder emails, no texts).
- **Google sync**: contractor-calendar calls sync to the company's connections; team-calendar calls with no contractor to the hosts' own connections (`calendar_connections.contractor_id` null). Admins / setters connect on `/app/calendar/settings` → "Your Google Calendar" (OAuth start / callback accept them, return there, backfill `backfillHostedAppointments`). Event length uses `ends_at`. Sales meetings are not pushed to Google yet (no sync trigger on `prospect_sales_appointments`).
- **In-app Calendar** (`/app/calendar`, `?cal`, `?view=day|week`, `?date`, `?contractor` for staff; `/app/calendar/settings?cal`): day / week grid (60 px/hour; 30-min chips show "9:30 Name"), phone week list ("Closed" on days without hours), status colours, open-hour shading, now line, details sheet (lead, phone, estimator design summary + photo, notes), held / no-show, reschedule, cancel, "Book a call" on behalf with the slot picker (staff "book anyway" audited as `appointment.availability_override`). Contractors see only their own calendar; setters may open it but are not in the sidebar (tests/setter-access.test.ts). Settings: on/off, name, zone, length, step, buffer, notice, horizon, cap, phone/video, who calls (host contact), weekly hours, hosts, own Google (staff). No editor yet for calendar exceptions (time off).
- **Configs**: `content/funnels/clients/pool-masters-la.json`, the bathroom / kitchen / pool-remodeling network funnels, `content/estimators/pool-masters.ts` and the bathroom estimator use `homequote`; `content/site.ts` contractor booking link is `/contractor-appointments/check-fit`. Calendly / GHL stay as fallbacks behind `calendarProvider` (`lib/funnels/calendly.ts`, `record_calendly_booking`), used by no shipped config. **Live funnels read `funnels.config` from the database**: after the code deploy run `select public.booking_switch_funnels_to_native();` (dry run) then `select public.booking_switch_funnels_to_native(true);` — it switches every Calendly funnel plus `pool-masters*`, `bathroom-remodel`, `kitchen-remodel`, `pool-remodeling`, drops calendarUrl / calendarId, moves open sessions that have not reached the contact step, leaves GHL funnels alone (listed) and reports any config still mentioning calendly.com. It must not run before the deploy (older code rejects `homequote`).
- **Deploy order**: (1) set `BOOKING_TICKET_SECRET` and `BOOKING_LINK_SECRET` in Vercel (both fall back to the service role key, with a warning in production; never rotate `BOOKING_LINK_SECRET` casually: it breaks every manage link already sent); (2) apply `0070_native_booking_calendars.sql` (after 0068_text_reminders and 0069_automation_runs; it touches no sms_* / automation_runs objects); (3) deploy the code; (4) run `booking_switch_funnels_to_native(true)`; (5) check the hosts on `/app/calendar/settings` (team / sales: all active admins by default; add setters / specialists) and that the Pool Masters calendar exists with its owner as host (it is created on first use otherwise); (6) optionally connect each host's Google Calendar (needs the `GOOGLE_CALENDAR_*` env, §24).
- **Tests**: `tests/booking-db.test.ts` (real migration chain in PGlite: seeds, RLS incl. host eligibility, RPCs, guard triggers, grid, rebook after cancel, funnel switch), `booking-slots`, `booking-api` (incl. the vCard route: fields, folding, JPEG photo, headers, 404s, DB checks, rate limit; 10-min / 15-min grid slots), `booking-vcard`, `booking-ui`, `booking-notify`, `estimator-demo-financing`, `booking-calendar(-db,-ui)` (incl. setter credit rules), `funnel-native-booking`, `contractor-funnel-native-settings`, `appointment-event-fallback`, `push-routing`, `workflow-native-booking`. PGlite is one connection, so the lock is exercised only serially; a real two-connection race test against Postgres is still to do. Browser-checked on iPhone 14 Pro + desktop against `next dev` with stubbed APIs; not yet against a real database.

## 46. Lead recovery: speed-to-lead alerts, no-show / missed-call recovery, share my design, never-booked follow-up (2026-10-29, NO migration)
Reuses what exists: `sms_reminders` (0068) is the one claim table (unique kind + ref + step + anchor, so nothing sends twice), the Mac-bridge queue with every texting rule, `sendPushNotification`, the Gmail sender, the public booking API. Switches: `sms_settings.reminder_config.recovery` {`speedAlert`, `noShow`, `heldPrompt`, `missedCall`, `unbooked`} (all default on), shown on **Texting → Reminders & follow-ups → Lead recovery** (`components/texting/reminders-form.tsx`, saved by `saveReminderSettings`). Code: `lib/booking/recovery.server.ts` (jobs), `lib/booking/recovery-copy.ts` (all wording, pure), `lib/booking/unbooked.server.ts`, `lib/sms/recovery.ts` (`queueRecoveryText`: texting on, valid phone, opt-out, consent = form flag or they texted us, contractor texting switch, daily cap, texting hours via `send_after`, links stripped; filed as a reminder so R/YES work; a conversation it starts is `handoff`), `lib/leads/design.server.ts` (`loadLeadDesign`: the estimator timeline entry → noun / tier / recap / range / main photo / signed share URL).
- **Claims** (`sms_reminders`): `no_reply`/<lead id>: `speed_submitted`, `unbooked` (text), `unbooked_email` (anchor 1970 = once per lead); `home_appointment`/<appointment id>: `speed_booked` (1970), `held_prompt`, `no_show_email` (anchor = call time), `missed_call` (anchor = the minute sent; at most one per 6 h).
- **1. Speed-to-lead** (`sendSpeedToLeadAlert`, `speedAlertSoon` after the response): estimator lead route + funnel session route on a real contact submit (`submitted`), and the public book route (session + rebook grants) on booking (`booked`). Push (type `new_lead` / `appointment_booked`) to active admins + calendar hosts that may see the lead (staff, or the calendar's own company holding an assignment), lock-screen safe: "🔥 New Luxe pool lead — booked Tue 10:15 AM" / "Calabasas · Classic · Luxe · Zero-edge spa" (no name/phone/money, per the push rule). Email to `leadAlertRecipients()` + host emails: subject "🔥 New Luxe pool lead: Jordan R., Calabasas — booked Tue 10:15 AM" (or "— not booked yet"), picks, ballpark, booked time + host, tap-to-call `tel:`, "Open the lead", "See their design", photo. **No SMS to the owner**: no admin-alert SMS path exists. Not hooked: calls the texting assistant books (`bookCall`; it already pushes "A lead booked a call") and staff bookings. The older generic "🚨 New Lead" / "📅 Appointment Booked" pushes still fire too.
- **2. No-show**: TEXT = `runTextReminders`' existing homeowner `no_show` step (30 min after it is marked; gated by `recovery.noShow`), reworded when the stored template is the default: "Sorry we missed you, Jordan! Want to pick a new time for your free pool design call? Check your email for a link to pick a new time, or reply R." (no email: "…Just reply R and we’ll find one."; visits: "free estimate visit"). EMAIL from `runRecovery` (tick) with "Pick a new time" → `/booking/pick/<hqr1 grant>` + "Your design". **Held prompt**: a calendar call still `scheduled` 30 min after `ends_at` → one push to its hosts (else admins) "Did you reach them? (10:15 AM call)" → `/app/calendar?cal=…&view=day&date=…`; the status is never changed automatically.
- **3. "Couldn’t reach them"** (calendar details sheet, `reportMissedCall` in `lib/actions/booking.ts` → `sendMissedCallRecovery`): a homeowner call whose time came and is still scheduled. Text "Hi Jordan, Liam from Pool Masters here — tried calling you for your design call. Reply here or check your email to pick a new time." (host = `resolveHostContact` of the calendar), email with the pick link, `contact_attempt` activity; refused within 6 h ("Already sent at …"). Not added to the appointments list (server-rendered cards, not trivial).
- **R / YES to a recovery text** (`handleRecoveryReply` in `lib/sms/reminder-replies.ts`, steps no_show / missed_call / unbooked): handoff, needs-attention note, push "Wants a new time", reply `RECOVERY_REPLY`.
- **"Pick a new time" grant** `hqr1.<appointmentId>.<exp>.<sig>` (`signRebookGrant`, 14 days, `BOOKING_TICKET_SECRET`) in `app/api/booking/_lib/grant.ts`; `resolveGrant` kind `rebook` (calendar = the call's, or the lead's contractor calendar for a visit; held / cancelled / lost / sold / archived → `not_active`). Book route: a missed call still `scheduled` is **rescheduled in place**; a no-show (or visit) gets a **new call** for the lead; an upcoming live call is returned instead of booking twice. Page `app/(booking)/booking/pick/[grant]/page.tsx` (also takes the normal `hqb1` session ticket for the never-booked email).
- **4. Share my design**: `ShareDesignButton` (`components/estimator/funnel/booking/share-design.tsx`, Web Share API → copy → show link) under the price card on the funnel booking screen (before and after booking). Link = `/estimator/<slug>/my-design?size=..&finish=..&extras=..[&spa=..]&v=<sig>` (`lib/estimator/share*.ts`; only picks; `v` = HMAC of slug+picks, key from `ESTIMATOR_RENDER_SECRET`/service role, issued by the lead route as `shareUrl`). Page `app/(estimator)/estimator/[slug]/my-design/page.tsx` + `components/estimator/share/shared-design.tsx`: main photo, picks with photos, ballpark **only with a valid signature** (price stays behind the contact step), "Design your own pool"; noindex; OG/Twitter image = main design photo (absolute via `NEXT_PUBLIC_SITE_URL`, WebP). The booking confirmation **email** now has a "Your design" block (`designHtml` in `lib/emails/booking.ts`) and its **text** adds "We emailed you your design.".
- **5. Never booked**: qualified funnel/estimator sessions on a native calendar (`calendarProvider: homequote` or `calendar_viewed`), contact 2–26 h ago, `booked_at` null (`findUnbookedLeads`). Blockers (`unbookedBlocker`): any non-cancelled appointment, lead moved on/archived, a `contact_attempt`/`appointment` activity or a hand-typed text since. TEXT = new step 5 of `runTextReminders` (skipped if they already replied to the assistant): "Hi Jordan, your Luxe pool design and ballpark are ready. Want a quick 10-minute call with Liam from Pool Masters to go over it? Reply with a good time, or check your email for a link to pick one." EMAIL (`runRecovery`) with "Pick a time" → `/booking/pick/<session ticket>` + design. Regular no-reply follow-ups still run on their days for assistant conversations.
- **Tick / map**: `runRecovery` after `runTextReminders` (body key `recovery`); Automation Map entries `speed_to_lead_alert`, `no_show_recovery`, `sms_unbooked_followup` (switches read in `status.server.ts`).
- **Known gaps**: email sends are claimed first and never retried; the shared page's main photo is the extras-step aerial (shows a raised spa for any spa pick, as the configurator maps it); WebP og:image (most previewers support it); test helper `fakeSupabase` now understands `col->key` filters.
- **Tests**: `tests/lead-recovery-copy.test.ts`, `lead-recovery-db.test.ts` (PGlite: dedupe, consent, opt-out, quiet hours, once-only, switches, host wording, R reply, confirmation design block), `booking-rebook.test.ts`, `lead-recovery-ui.test.tsx`, updated `reminders-form`, `automations-map`.

## 45. One sales meeting per contractor + Edit button (migration 0072, 2026-10-29; NOT yet applied)
- **Bug fixed**: saving "Appointment booked" again on a contractor prospect (to reschedule or fix details) inserted a second `prospect_sales_appointments` row. `logCallOutcome` (`lib/actions/prospects.ts`) now updates the prospect's OPEN meeting (scheduled/confirmed/rescheduled) when there is one, and inserts only when there isn't. Same rule as `bookCallOnBehalf`. `partner_id` never changes (setter credit stays). Only RLS-visible meetings are found (a caller re-booking someone else's meeting still inserts; admins see all).
- **Edit**: `updateSalesAppointment` (admin or the partner who booked it; open meetings only) changes date/time, zone, call type, contact info, decision maker, notes in place. A moved time sets status `rescheduled`, clears `confirmed_at`, shifts `ends_at` by the same duration, syncs `contractor_prospects.appointment_at`; reminder texts re-arm (keyed on the meeting time). UI `components/calls/edit-appointment.tsx` (Dialog, bottom sheet on phones) on `/app/calls/appointments` (cards + table) and the prospect page (`#meeting`). The outcome form shows "This updates their existing meeting (…)" when one is open (`existingMeeting` prop).
- **Calendar**: meetings booked from a call (no `calendar_id`, `CalendarEvent.handBooked`) show **Edit or reschedule** linking to the prospect page instead of the slot-picker Reschedule (which needs a booking calendar).
- **Migration 0072** (data only): per prospect, keeps the most recently updated open meeting and marks older open duplicates `cancelled` (reason + note "Duplicate of an updated meeting (cleaned up 2026-10-29)", `cancel_notified_at` set so no cancellation notice goes out; `trg_prospect_appointments_notify` disabled during the update so the team isn't pushed). Preview query in the file header. No unique index (the funnel's self-booking RPC would hit it).
- Tests: `tests/sales-meeting-edit.test.ts`, `tests/edit-appointment-ui.test.tsx`.
