# Codex handoff: refreshed call-list assignment fix

Updated: 2026-09-23

## Bug cause

The refresh pipeline and the call-list tabs disagreed about who could own prospects:

- `lib/prospecting/run.ts` treated active `admin` and `caller` profiles as assignees.
- `lib/data/prospects.ts` loaded only profiles whose role was `caller` for the Liam/Nadav tabs and assignment controls.
- The live Liam and Nadav profiles are both active admins. Refresh therefore stored their real profile UUIDs in `contractor_prospects.assigned_to`, but the named tabs could not resolve either admin profile and queried with an empty sentinel UUID.
- The refresh request also sent the labels `liam`, `nadav`, or `both` and repeated name resolution on the server. That allowed the UI selection and persisted assignee to drift if matching accounts changed.

`My Calls` was already intended to query `assigned_to = signed-in profile id`. Regression coverage now makes that account-specific behavior explicit.

## How the fix works

- Active `admin` and `caller` profiles now share one `CALL_ASSIGNEE_ROLES` definition for refresh, tabs, and manual assignment.
- The server-rendered calls page passes its resolved assignees into the refresh dialog.
- The dialog converts Liam/Nadav to the exact profile UUID(s) and posts `callerIds`.
- The API validates one or two UUIDs. The refresh runner revalidates that every UUID still belongs to an active call-capable profile before creating a run or prospect.
- New prospects continue to persist the selected UUID in `contractor_prospects.assigned_to`, with `assigned_at` and `assigned_by`.
- Liam and Nadav tabs resolve to those same profile UUIDs. `My Calls` resolves directly to the current signed-in profile UUID.
- Manual reassignment now accepts active admins as well as callers, matching the live account model and refresh behavior.

No existing prospect, assignment, refresh run, or call-attempt row is updated or replaced by this change.

## Files changed

- `lib/calls/callers.ts`
- `lib/data/prospects.ts`
- `lib/prospecting/run.ts`
- `app/api/calls/refresh/route.ts`
- `components/calls/refresh-prospects-dialog.tsx`
- `app/app/calls/page.tsx`
- `lib/actions/prospects.ts`
- `tests/calls-callers.test.ts`
- `CODEX_HANDOFF.md`

## Tests and verification

Completed:

- `npm run test -- tests/calls-callers.test.ts` — 7 tests passed.
- `npx tsc --noEmit` — passed.
- Read-only live database verification before editing: Liam is an active admin with 10 assigned prospects; Nadav is an active admin with 50; 60 total prospects are assigned; 8 call-attempt rows exist.

- `npm run test` with `.env.local` loaded — 14 files and 185 tests passed, including the live Supabase calls RLS suite. Its synthetic users, prospects, and calls ran in a transaction that was rolled back.
- `npm run build` — production build passed.
- ESLint on every changed TypeScript/TSX file — passed with no findings.
- Two independent read-only live database connections returned identical assignment state: Liam 10 prospects, Nadav 50 prospects, and 9 persisted call-attempt rows at final verification.

Not verified:

- No passwords or already-authenticated browser sessions for both real accounts were available, so Codex did not perform a two-browser manual login/click-through. The exact profile-id selection, Liam/Nadav tab resolution, separate signed-in-user `My Calls` resolution, production build, database policies, and persistence across fresh database reads are covered; a manual browser smoke test under both real sessions remains recommended after deployment.

## Database changes

None. No migration or data rewrite is required. Existing `assigned_to` UUIDs and append-only `prospect_call_attempts` remain intact.

## Deployment status

Validated fix committed and pushed to `origin/main` as part of this handoff. The project documentation says production is hosted on Vercel, but Codex did not run a separate deployment command and did not verify the Vercel deployment result.

## Repository note

The worktree contained unrelated modified and untracked files before this fix. They belong to other ongoing work and must not be discarded or included in this fix's commit unless intentionally reviewed.
