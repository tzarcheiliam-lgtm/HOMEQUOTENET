# Contractor portal: Grow Your Business

Optional marketing and business services that contractors can ask HomeQuote
about from inside the portal. **Version 1 only collects interest.** Nothing is
purchased, charged or enrolled. A request is a note to the HQN team that a
contractor wants to talk.

Branch: `contractor-portal-upsells` · Migration: `0017_contractor_service_requests.sql`

## What contractors see

| Place | What | Why it's there |
| --- | --- | --- |
| Sidebar | **Grow Your Business** (`/app/growth`), listed after My Leads and Appointments | Easy to find without competing with lead work |
| Dashboard | Compact "Grow your business" card, **last** in the right rail (below Upcoming appointments and Recent activity; last on mobile) | Available but never ahead of leads |
| `/app/growth` | One optional suggestion, the 10 service cards, and "Your requests" with statuses | The services page |
| `/app/growth/[service]` | Description, "Typically includes" deliverables, and the request form | Selecting a service opens this page |

Services: brochures and sales materials, logo and brand identity, website
creation or redesign, landing pages, social media ad creative, photo and video
content, lead follow-up automation, CRM setup and optimization, review
generation, and local SEO / Google Business Profile. The copy lives in
`lib/growth/catalog.ts`. It has no prices, results, percentages or
testimonials, and a test enforces that.

**Request flow:** pick a service → read the description and deliverables → add
optional notes (up to 2,000 characters) → **Request info** → confirmation
("Request sent … Nothing has been purchased and you haven't been charged.").
The form shows the company and requesting user it will file under. Those are
display only: the server takes both from the session.

**States:**
- **Loading:** `app/app/growth/loading.tsx` skeleton; the button reads "Sending…" while submitting.
- **Success:** a confirmation panel replaces the form and gets keyboard focus.
- **Error:** an inline `role="alert"` message. Database errors are never shown raw.
- **Duplicate:** a company can have only one *open* request per service. The page shows the existing request's status instead of the form. After a request is Accepted or Closed, the company can ask again.
- **No company:** a login not yet linked to a contractor gets an empty state and no form.
- **Empty requests:** "You haven't requested anything yet."

**Contextual suggestion (used sparingly):** at most one suggestion. Today there
is exactly one rule: suggest **Website** when the company has no saved website
and has never asked about websites. Otherwise nothing is shown. See
`lib/growth/recommend.ts`. There are no popups, and no upsells appear on lead
pages, customer details or qualification forms.

## What HQN admins see

Admins get **Service Requests** (`/app/service-requests`) in the sidebar. It
has filter tabs with counts (All / New / Contacted / Proposal Sent / Accepted /
Closed) and a table showing company (linked), requester name, email and phone,
service, notes, submitted time, and an inline status select. Changing the
status records `status_changed_at` and `status_changed_by`.

Admins can also set a company **Website** on the contractor form. That field
drives the website suggestion.

## Data and security

`service_requests`: `id, contractor_id, requested_by, service, notes, status,
status_changed_at, status_changed_by, created_at, updated_at`. Statuses are
`new | contacted | proposal_sent | accepted | closed`, and a check constraint
limits `service` to the 10 slugs.

A contractor can't file for another company. This is enforced in three places:
1. `requestServiceInfo` never reads the company or user from the form. It uses `profile.contractor_id` and `profile.id`.
2. The zod schema has no company, user or status fields, so any extra form fields are dropped.
3. **RLS insert policy:** `contractor_id = auth_contractor_id() and requested_by = auth.uid() and status = 'new'`. Tampered rows are rejected by the database itself.

Access by role:
- **Contractor:** reads only their own company's requests. Can't update or delete.
- **Admin:** reads all requests and updates status.
- **Setter and caller:** no access.
- **Delete:** no one, through the API. Closing a request is a status.

**What wasn't touched:** existing RLS policies, the auth helpers, lead
distribution, contractor permissions and the app layout. The new table's
policies reuse the existing `is_admin()` and `auth_contractor_id()` helpers.
The only change to an existing table is the additive, nullable
`contractors.website` column.

## Migration requirements

`supabase/migrations/0017_contractor_service_requests.sql` is additive and
idempotent (`if not exists` / `drop … if exists`). **It has not been applied
anywhere.** Apply it **before** deploying this branch, because the contractor
form now saves `website` and the growth pages read `service_requests`:

```
node --env-file=.env.local scripts/funnels.mjs migrate supabase/migrations/0017_contractor_service_requests.sql
```

If the migration is missing, the dashboard hides the growth card and keeps
working. `/app/growth` and contractor saves would fail.

**Numbering:** check for a clash with any migration from the parallel
roles/permissions work before merging. If both branches use `0017`, rename
this file to the next free number; nothing depends on the name.

## Files

New:
- `supabase/migrations/0017_contractor_service_requests.sql`
- `lib/growth/catalog.ts`, `lib/growth/recommend.ts`
- `lib/validation/service-request.ts`, `lib/data/service-requests.ts`, `lib/actions/service-requests.ts`
- `app/app/growth/page.tsx`, `app/app/growth/[service]/page.tsx`, `app/app/growth/loading.tsx`
- `app/app/service-requests/page.tsx`
- `components/growth/*`: views (data-free, previewable), cards, form, badges, status select, dashboard card
- `tests/growth-services.test.ts`, `tests/service-request-actions.test.ts`, `tests/service-requests-db.test.ts`
- `docs/contractor-portal-upsells.md`, `docs/contractor-portal-upsells-screenshots/`

Changed (small, additive):
- `lib/nav.ts`: two nav items
- `components/app-sidebar.tsx`: two icons
- `app/app/page.tsx`: loads growth context, with a fallback to no card
- `components/dashboard/contractor-dashboard.tsx`: optional `growth` prop and card
- `components/contractors/contractor-form.tsx`, `lib/actions/contractors.ts`, `lib/types.ts`: company `website`

## Tests

- `growth-services.test.ts`: catalog completeness, a match with the migration's constraints, a no-pricing/no-claims copy check, recommendation rules, validation (form tampering is ignored), and nav placement and role visibility.
- `service-request-actions.test.ts`: identity comes from the session even when the form is tampered with; only `service_requests` is written; unlinked logins, unknown services, duplicate requests and raw-error hiding; admin-only status updates.
- `service-requests-db.test.ts`: real RLS in a transaction that always rolls back (cross-company insert, spoofed requester, preset status, setter access, update/delete denial, status stamping, one-open-request rule, check constraints). Runs only when `SUPABASE_DB_URL` is set, like the other DB suites.

## Known gaps / follow-ups

- **No admin notification yet.** New requests show on the admin page but don't send an email. The Gmail sender used for lead alerts could be reused; this needs a decision.
- **No mobile navigation in the app.** The sidebar is `md:` and up only. This affects every contractor page, not just this feature. On phones, contractors reach services from the dashboard card. The layout was left alone to avoid conflicting with the roles work.
- Admin-only internal notes on a request were left out. Contractors can read their own rows, so internal notes need a separate table.
