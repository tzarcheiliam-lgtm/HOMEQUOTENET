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
| **admin** | Everything: leads, distribution, contractors, pricing, billing, analytics, team |
| **setter** | Capture/qualify leads, manage appointments. No billing or pricing access |
| **contractor** | See only their own assigned leads; report appointments, estimates, sales |

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
