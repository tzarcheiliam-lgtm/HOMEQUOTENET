# HomeQuote Network

The contractor lead-generation operating system. Generate homeowner leads through
advertising, distribute them to contractors, and track every lead from first
contact through appointment, estimate, sale, and revenue.

## Tech stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — PostgreSQL, Auth, and Row Level Security
- **shadcn/ui** components
- Deploys to **Vercel**

## Two applications, one codebase

| Surface | Routes | Audience |
|---|---|---|
| **Public marketing site** | `/`, `/pool-contractors`, `/lead-standards`, `/apply`, `/privacy`, `/terms` | Contractors being prospected |
| **Internal CRM** | `/app/*` | Admin, setters, contractors (auth required) |

The marketing site lives in the `app/(marketing)/` route group with its own dark
theme, scoped to a `.hq` wrapper in `app/(marketing)/marketing.css` so it cannot
affect the CRM's light shadcn tokens. See
[`MARKETING_SITE.md`](MARKETING_SITE.md) for the content model, the contractor
application form, and how to add a new niche.

## Core architecture

A few decisions you should know before touching the code:

- **Leads are many-to-many with contractors.** A lead is never owned by one
  contractor. It is distributed via `lead_assignments`, and the sales funnel
  (appointment → estimate → sale → billing) lives on the *assignment*. The same
  lead sold to two contractors tracks two independent outcomes.
- **Monetization is flexible.** A `pricing_agreement` (contractor × vertical ×
  model: per-lead / per-appointment / revenue-share / hybrid / subscription)
  drives `billing_events` generated as an assignment progresses.
- **Three roles, enforced in the database.** `admin`, `setter`, `contractor`.
  Access is enforced with Postgres Row Level Security, so a contractor cannot
  read another contractor's data even if the app has a bug.

The full schema and security policies live in
[`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

In the [Supabase dashboard](https://supabase.com/dashboard) create a project (or
use your existing one).

### 3. Run the database migration

Open **SQL Editor** in the Supabase dashboard, paste the contents of
`supabase/migrations/0001_initial_schema.sql`, and run it. This creates all
tables, the three-role security policies, and seeds the default verticals
(Fencing, ADUs, Home Improvement).

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from
**Project Settings → API**:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret key (server-only) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Create your admin account

1. Go to `/sign-up` and create your account. New accounts are created
   **inactive** (this prevents stray sign-ups from gaining access).
2. In the Supabase SQL Editor, promote yourself to an active admin:

   ```sql
   update public.profiles
     set role = 'admin', is_active = true
   where email = 'you@example.com';
   ```

3. Sign in at `/sign-in`.

> Tip: once you're set up, consider disabling public sign-ups in
> **Supabase → Authentication → Providers → Email** and create staff/contractor
> accounts from inside the app instead.

## Roles

| Role | Can do |
| --- | --- |
| **admin** | Everything: leads, distribution, contractors, pricing, billing, analytics, team, calling workspace + prospect assignment |
| **setter** | Capture/qualify leads, manage appointments. No billing or pricing access |
| **contractor** | See only their own assigned leads; report appointments, estimates, sales |
| **caller** | Partner cold-calling only (`/app/calls`): the contractor prospects assigned to them, their own call log and sales appointments. **Not** staff — sees no homeowner leads, contractors or billing |

## Partner calling workspace (`/app/calls`)

Where HomeQuote partners cold call pool-remodeling contractors to sell the
pay-per-appointment service. Backed by `supabase/migrations/0007_contractor_prospecting.sql`.

- **Tables:** `contractor_prospects` (the business being called),
  `prospect_call_attempts` (append-only call log — no update/delete policy for
  anyone), `prospect_sales_appointments` (a sales call *with* a contractor; not
  the homeowner `appointments` sold *to* one).
- **One list, many views.** "Liam's list" and "Nadav's list" are filters on
  `assigned_to`, never copies. Admins assign and reassign; a caller can only
  change calling fields (disposition, callback, notes) on their own prospects —
  enforced by RLS *and* a column-guard trigger, not just the UI.
- **Do-not-call** is refused three times over: the call button disappears, the
  server action refuses, and a trigger rejects any new attempt. Only an admin
  can lift it, and that is written to `audit_logs`.
- **Metrics** are defined once in `lib/calls/metrics.ts` — contact rate =
  decision-maker conversations ÷ attempts; interest rate = interested ÷
  conversations; booking rate = appointments ÷ conversations — and rendered as a
  dash, not 0%, when there is no data.

**Sign-in:** every role uses `/sign-in`. Callers land on `/app/calls`; everyone
else on `/app`. A deep link into `/app/*` is remembered through sign-in via a
validated `?next=` parameter. Invitation and reset emails land on
`/auth/callback` → `/set-password`; there is a "Forgot your password?" link.

**Creating a caller account:** `/app/team/new` → *Create with password* → role
**Partner (Caller)** → tick *Activate*. Hand over the temporary password
out-of-band. (If no admin exists yet, bootstrap one with step 6 above first.)

**Importing a prospect list:**

```bash
node scripts/import-prospects.ts list.csv            # report only — nothing written
node scripts/import-prospects.ts list.csv --apply --batch=liam-2026-09
```

Columns are in `scripts/prospect-import-template.csv`. The report shows counts of
duplicates (phone → domain → name+city), missing/invalid phones, cleaning-only
businesses and rows per assignee before anything is written; rows already in the
database (by phone) are skipped. Never prints company names or phone numbers.

**Verifying a migration before applying it:**

```bash
node scripts/verify-migration-rollback.mjs supabase/migrations/0007_contractor_prospecting.sql
```

Runs every statement inside a transaction and rolls it back. `npm run test`
includes `tests/calls-rls.test.ts`, which exercises the real RLS policies with
synthetic users inside a rolled-back transaction once 0007 is applied (it skips
itself until then).

## Project structure

```
app/
  sign-in, sign-up, pending   Auth pages
  app/                        Authenticated CRM (protected by middleware)
    page.tsx                  Role-aware dashboard
    leads, contractors, ...   Modules (built out by phase)
lib/
  supabase/                   Browser, server, admin, and middleware clients
  actions/                    Server actions (auth, …)
  auth.ts                     getProfile / requireProfile / requireRole
  nav.ts                      Role-based navigation config
  types.ts                    Domain types mirroring the schema
supabase/migrations/          SQL schema + Row Level Security
```

## Build roadmap

1. ✅ Foundation — auth, 3 roles, RLS, app shell
2. ✅ Contractors + pricing agreements (CRUD, verticals served, all 5 pricing models)
3. ✅ Lead management — capture w/ full attribution, sub-services, 10-stage pipeline,
   qualification, economics, search/filters/bulk actions, activity timeline, notes,
   attachments, distribution to multiple contractors, setter tools, contractor portal,
   analytics foundation, appointments list
4. ✅ Outcomes & revenue — per-assignment estimates, sales (status + dates),
   auto-calculated commission from the pricing agreement (admin override), auto-generated
   billing events, admin sales dashboard, admin billing management, contractor outcome workflow
5. ✅ Team management — user directory, create/invite users, activate/suspend/disable,
   role changes, contractor linking/reassignment, password reset, soft delete, account
   status system, and an admin audit log (no more Supabase dashboard for user admin)
6. ✅ Integration framework + Lead Intake Engine + Meta Lead Ads connector
   (provider-agnostic pipeline: source → connector → intake → dedupe → attribution → lead)
7. Reporting depth & revenue tracking (ROAS by campaign, ad-spend entry, billing reconciliation)

## Refresh Prospects (`/app/calls` → Refresh Prospects)

Sources **real** contractor businesses by niche for Los Angeles and Ventura
County and adds them to the call list, assigned to Liam, Nadav or both. Backed
by `supabase/migrations/0008_prospect_refresh.sql` and the Google Places API
(New) — nothing is ever invented; without a key the run explains what is
missing and adds nothing.

- **Set up:** create a Google Cloud API key with *Places API (New)* enabled and
  set `GOOGLE_PLACES_API_KEY` in Vercel (Production) and `.env.local`. Server-side
  only. A 100-per-caller run is roughly 15–30 billed Text Search requests.
- **Duplicate protection** checks the entire prospect history — archived,
  do-not-call, any assignment — on provider id, phone, website domain and
  name + city, and never gives Liam and Nadav the same company in one run.
- **Qualification** drops closed businesses, listings with no usable phone,
  anything outside the two counties, and results that match the niche by
  neither type nor name. Pool listings that read as cleaning-only are flagged,
  not dropped.
- Every run is recorded in `prospect_refresh_runs` (parameters, progress log,
  counts) and in `audit_logs`; the selected niche is saved on each prospect and
  drives the **Niche** filter on `/app/calls`.
- Code: `lib/prospecting/catalog.ts` (pure rules, unit-tested),
  `lib/prospecting/google-places.ts` (provider), `lib/prospecting/run.ts`
  (orchestrator), `app/api/calls/refresh/route.ts` (streams progress),
  `components/calls/refresh-prospects-dialog.tsx`.

## Manual prospect email (`/app/calls/emails`)

For the reusable homeowner estimate funnel engine at `/estimate/[slug]` and its
admin conversion report at `/app/funnels`, see [FUNNELS.md](FUNNELS.md). It covers
configuration-driven publishing, migration 0012, progressive persistence,
GoHighLevel calendar/webhook setup, attribution, tracking and browser verification.

The Calls workspace has an **Emails** tab for one-at-a-time, manually reviewed
follow-ups. Version 1 includes only **More info after our call**. Selecting a
prospect loads any saved decision-maker name/email, builds an editable draft,
and sends only when a user clicks **Send email**. Successful and failed sends
are recorded in that prospect's activity history; failed Gmail requests are
never marked sent.

The template describes HomeQuote's homeowner qualification and scheduled
contractor appointments without adding pricing or claims that were not
discussed. Pool services are included only when the reviewer enters them in
**Pool services discussed**; those reviewed details are saved on the prospect
for the next email. The editable body is rendered into the same Gmail-safe HTML
shown in the sent-email preview. Its compact Liam signature uses the public,
transparent logo at
`https://homequote-eight.vercel.app/images/email/homequote-logo-transparent.png`
and includes readable text and alt text when images are blocked.

### Gmail OAuth setup

1. In Google Cloud Console, use the project that will own the integration and
   enable **Gmail API**.
2. Configure the OAuth consent screen. If the app is in Testing, add the
   HomeQuote Gmail account as a test user.
3. Create an **OAuth client ID** with application type **Web application**.
4. Add the exact authorized redirect URI for each environment:
   - Local: `http://localhost:3000/api/integrations/gmail/oauth/callback`
   - Production: `https://YOUR-DOMAIN/api/integrations/gmail/oauth/callback`
5. Generate the token-encryption key once:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

6. Set these server-side variables in `.env.local` and in Vercel Production:

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_GMAIL_CLIENT_ID` | OAuth Web client ID |
   | `GOOGLE_GMAIL_CLIENT_SECRET` | OAuth Web client secret |
   | `GMAIL_OAUTH_REDIRECT_URI` | Exact URI registered in step 4 |
   | `GMAIL_FROM_EMAIL` | HomeQuote Gmail address being connected |
   | `GMAIL_TOKEN_ENCRYPTION_KEY` | Base64 key generated in step 5 |

7. Apply `supabase/migrations/0009_prospect_emails.sql` and
   `supabase/migrations/0010_email_template_html.sql`, deploy/restart the app,
   sign in as an administrator, open **Calls → Emails**, click **Connect
   Gmail**, and authorize the HomeQuote account. Until the variables are
   present, the page shows **Configure Gmail** and links to the setup error.

The OAuth request asks only for
`https://www.googleapis.com/auth/gmail.send`. The refresh token is encrypted
server-side with AES-256-GCM before database storage. OAuth credentials and
tokens are never returned to the browser. Keep the encryption key stable;
changing it requires reconnecting Gmail.
