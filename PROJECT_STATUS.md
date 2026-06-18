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
