# Codex handoff: Emails v1

Updated: 2026-09-23

## What changed

- Added **Calls → Emails** at `/app/calls/emails` for one-at-a-time, manually reviewed sending. There are no sequences, schedules, or bulk-send paths.
- Added the single **More info after our call** template. It uses only known contact name, company name, pool services, and signed-in sender name; absent data is omitted and no placeholder is shown.
- The recipient, subject, and plain-text message remain fully editable before send.
- Sending saves `decision_maker_name` and the new `decision_maker_email` on the selected prospect, including when Gmail later returns an error.
- Added server-side Google OAuth using only `https://www.googleapis.com/auth/gmail.send`. OAuth state is checked in an HttpOnly SameSite cookie. Refresh tokens are AES-256-GCM encrypted before storage and never sent to the browser.
- Every attempt creates a pending `prospect_email_logs` row before contacting Gmail. It is finalized as `sent` only after Gmail returns a message ID, or `failed` with the provider error. A failed request is never marked sent.
- Prospect detail now has one chronological activity history containing calls and outbound emails, including sender, recipient, subject, timestamp, status, message, and failure reason.
- Emailing a prospect marked `do_not_call` is blocked.

## Database

Added and applied `supabase/migrations/0009_prospect_emails.sql`:

- `contractor_prospects.decision_maker_email`
- `prospect_email_logs` with RLS-scoped read access and no app-user write policy
- `gmail_connections`, a singleton encrypted-token store with admin-only read access and service-role writes

Migration `0009` was applied successfully to the configured Supabase project. Existing prospects, assignments, call attempts, and prior history were not reset or rewritten.

## Gmail configuration

Required server-only environment variables:

- `GOOGLE_GMAIL_CLIENT_ID`
- `GOOGLE_GMAIL_CLIENT_SECRET`
- `GMAIL_OAUTH_REDIRECT_URI`
- `GMAIL_FROM_EMAIL`
- `GMAIL_TOKEN_ENCRYPTION_KEY` (base64-encoded 32-byte key)

Exact Google Cloud, redirect URI, key-generation, Vercel, and connection steps are in `README.md` and `.env.example`. After configuration/deployment, an administrator opens **Calls → Emails**, clicks **Connect Gmail**, and authorizes the HomeQuote Gmail account. Keep the encryption key stable; changing it requires reconnecting.

## Files added or changed

- `.env.example`, `README.md`, `CODEX_HANDOFF.md`
- `supabase/migrations/0009_prospect_emails.sql`
- `app/app/calls/emails/page.tsx`
- `app/api/integrations/gmail/oauth/start/route.ts`
- `app/api/integrations/gmail/oauth/callback/route.ts`
- `components/calls/email-composer.tsx`
- `components/calls/calls-subnav.tsx`
- `components/calls/activity-timeline.tsx`
- `app/app/calls/[id]/page.tsx`
- `lib/actions/emails.ts`
- `lib/data/emails.ts`, `lib/data/prospects.ts`
- `lib/emails/template.ts`, `lib/emails/gmail-message.ts`, `lib/emails/token-crypto.ts`, `lib/emails/gmail.ts`
- `lib/types.ts`
- `tests/prospect-emails.test.ts`, `tests/calls-rls.test.ts`

## Tests and results

- `npm run test` with the live database URL: **15 files, 193 tests passed**. The real RLS tests run in a transaction and roll back all synthetic data.
- Email template tests cover personalization, missing optional data, accurate offer language, banned claims, and visible-placeholder prevention.
- Gmail security/transport tests cover authenticated refresh-token encryption, wrong-key rejection, MIME generation, successful provider response, non-ASCII subject encoding, and provider failure without a false success.
- Live RLS tests cover saving a contact only on the assigned company, email-history visibility, and refusal of forged app-user activity rows.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed, including the new page and OAuth routes.
- Authenticated headless browser smoke test as Liam: loaded 60 selectable companies, selected a company, entered contact details, generated an editable personalized preview with the required offer/no placeholders, and confirmed sending was disabled while Gmail is unconfigured. It did not mutate a prospect or send an email.

Not verified:

- A live Gmail send could not be tested because none of the five Gmail environment variables are configured and no Gmail account is connected. After configuration, verify OAuth consent, send one reviewed message to a controlled inbox, confirm its Gmail message ID is logged as `sent`, then open the prospect detail and confirm the activity entry.
- The mocked transport and database policy tests cover success/failure logic, but the Google OAuth exchange itself requires the real Google client credentials.

## Deployment status

Migration `0009` is live. The verified code is committed and pushed to `origin/main` as part of this handoff. The project deploys through Vercel, but Codex does not have evidence that the production deployment completed or that its environment contains the Gmail variables.

## Repository note

The worktree already contained unrelated modified and untracked files. They must remain intact and must not be included in the Emails commit. `lib/types.ts` was already modified before this task, so only the Emails-specific type hunks should be staged.

---

# Previous handoff: refreshed call-list assignment fix

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
