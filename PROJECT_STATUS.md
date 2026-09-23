# HomeQuote Network — Project Status

## UI standard (mandatory)

**All future UI work must use the Claude Frontend Design skill and follow
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).** Before building or changing any screen:

1. Invoke the Frontend Design skill.
2. Reuse the shared primitives (`PageHeader`, `KpiCard`, `EmptyState`,
   `StatusBadge`, `ConfirmAction`, `Table`, `Card`) rather than re-implementing.
3. Keep the "money is emerald" rule and the spacing/typography standards.

## Phase status

- ✅ Phase 1 — Foundation: auth, 3 roles, RLS, app shell
- ✅ Phase 2 — Contractors + pricing agreements
- ✅ Phase 3 — Lead management (capture, attribution, qualification, distribution)
- ✅ Phase 4 — Outcomes & revenue (estimates, sales, commission, billing, sales dashboard)
- ✅ Phase 5 — Team management (users, roles, status, audit log)
- ✅ Admin UI refinement pass — design system + consistent admin experience
- ✅ Phase 6 — Integration framework + Lead Intake Engine + Meta connector
- ⏳ Next — reporting depth & revenue reconciliation (or further connectors)

## Migrations applied to the live database

- `0001_initial_schema.sql`
- `0002_phase4_outcomes.sql`
- `0003_phase5_team.sql`
- `0004_phase6_integrations.sql`

## Explicitly not built yet (do not start without a new instruction)

Meta / Google Ads / Brevo integrations, AI agents, lead-routing automation,
marketplace, public-facing contractor portal, external API integrations.

## Known follow-ups

- "Last admin" safeguard (prevent demoting/deleting the only admin).
- Lead attachments are URL-based; Supabase Storage uploads are a future add-on.
- Invitations & password resets require Supabase SMTP to be configured.

## Phase 8 — Partner calling workspace

Cold-calling portal for HomeQuote partners at `/app/calls`, backed by
`supabase/migrations/0007_contractor_prospecting.sql` (additive; verified in a
rolled-back transaction with `scripts/verify-migration-rollback.mjs`).

- New `caller` role: not staff, so existing RLS keeps homeowner data away from
  callers with no policy changes. Callers see only prospects assigned to them.
- Tables: `contractor_prospects`, `prospect_call_attempts` (append-only),
  `prospect_sales_appointments` (sales calls *with* contractors — distinct from
  homeowner `appointments`).
- Views are filters on one table (My list, Liam's, Nadav's, All, New, Callbacks
  due, Interested, Booked, Do not call). Admin assigns/bulk-assigns; audited.
- Outcome logging with per-outcome required fields; do-not-call refused by UI,
  action and trigger; "Save and open next"; caller metrics defined once in
  `lib/calls/metrics.ts`; call logs; sales appointments with status workflow.
- Sign-in now honours a validated `?next=`, routes callers to `/app/calls`, and
  the previously broken invite/reset flows land on `/auth/callback` →
  `/set-password`. "Forgot your password?" added.
- Import: `node scripts/import-prospects.ts list.csv [--apply]` — report first.
- Tests: `tests/calls-*.test.ts` (rules, metrics, redirect guard, import) plus
  `tests/calls-rls.test.ts`, which runs the real RLS policies with synthetic
  users in a rolled-back transaction once 0007 is applied.

**Status:** `0007_contractor_prospecting.sql` was applied to the Supabase
project on 2026-09-23 and the RLS suite passes against it. Remaining setup:
bootstrap an admin (README step 6), then create caller accounts at
`/app/team/new`.
