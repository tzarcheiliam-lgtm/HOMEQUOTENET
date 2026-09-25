# Contractor portal: Growth Tools (upsells)

Premium add-ons that HomeQuote sets up for contractors, requested from
**Growth Tools** (`/app/growth`). A request creates a record and emails the
HomeQuote team. Nothing is purchased, charged or enrolled automatically; your
team follows up and sets things up.

Migrations: `0018_contractor_service_requests.sql` (applied 2026-09-24) and
`0021_growth_tools_upsells.sql` (**not applied yet**, see below).

## What contractors see

`/app/growth`, top to bottom:

1. **Hero:** "Answer faster. Follow up every time. Close more jobs."
2. **Featured: AI Receptionist.** A dark navy card with light blooms and a faint grid, the requested copy and five benefits, a "How it works" flow (call answered → qualified → booked → confirmation sent), and a white **Request AI Receptionist** button.
3. **Growth tools**, as large cards with 3–5 benefit bullets and a CTA:
   - Automated Follow-Up
   - CRM & Pipeline Upgrade
   - Custom Lead Funnel
   - Website & Landing Page
   - Old Lead Reactivation
   - Call & Lead Tracking
4. **Marketing services**, as compact cards:
   - Brochures & Sales Materials
   - Logo & Brand Identity
   - Social Media Ad Creative
   - Photo & Video Content
   - Review Generation
   - Local SEO & Google Business Profile
5. **Your requests**, with statuses.

**Badges:**
- **Recommended** appears on Website & Landing Page when the company has no saved website and hasn't asked about one (`lib/growth/recommend.ts`). That card gets a solid CTA.
- **Most Popular** and **Starting at…** are supported by the catalog, but none are set. There's no popularity data or pricing yet, so nothing is invented. To use them, set `badge: 'most_popular'` or `startingAt: 'Starting at …'` on a service in `lib/growth/catalog.ts`.

**Adding an upsell:** add an entry to `GROWTH_SERVICES` in `lib/growth/catalog.ts` (with its tier, benefits, CTA and notes hint), an icon in `components/growth/service-icon.tsx`, and the slug to the service check constraint in a new migration.

**Dashboard:** the "Growth Tools" card stays last in the right rail (and last on mobile), below the lead workflow.

## Request flow

1. Clicking a CTA opens a modal (Radix dialog: focus trap, Escape to close, and focus returns to the button).
2. The modal shows the service, its benefits, and the account it will be filed under: company, requested-by name, email and contractor ID. All of these come from the session, so nothing is re-entered.
3. The notes field is optional (up to 2,000 characters), with a service-specific hint.
4. The button is the service's CTA (for example "Request AI Receptionist"). While sending it shows "Sending request…" and is disabled.
5. On success the modal shows "Request received. Our team will reach out to you shortly to get this set up." The card then shows **Requested · New** instead of the CTA.

**Double submission** is blocked three ways:
- The button is disabled while a request is sending.
- The form is replaced by the confirmation once it succeeds.
- The database allows only one open request (New, Contacted or In Progress) per company per service. A second attempt gets a friendly "already has an open request" message.

Each request stores: service, notes, source (Growth Tools page or service page), company, requesting user, status and timestamps. The per-service pages (`/app/growth/[service]`) still work for direct links and use the same form.

## Email notification

Every new request emails the HomeQuote team through the existing HomeQuote
Gmail connection (`lib/emails/gmail.ts`). There's no second email system.

- **Subject:** `New HomeQuote Upsell Request — [Upsell Name]`
- **Body:** "New Upsell Request", then Contractor, Requested Service, Requested By, Email, Contractor ID, Notes and Submitted (Pacific time), plus Source. It ends with buttons to **Open contractor account** (`/app/contractors/[id]`) and **Review requests**.
- **Recipients (server-only):** `UPSELL_REQUEST_NOTIFICATION_EMAIL` (comma-separated) if set. Otherwise the existing team list `LEAD_ALERT_EMAILS`, which defaults to Liam and Nadav. Recipients are never sent to the browser; the built client bundles were checked for the addresses and variable names.
- **Timing:** the email is sent after the response (`after()`), so the contractor never waits on Gmail.
- **Delivery tracking:** stored on the request: `notification_status` (pending / sending / sent / failed), `notification_attempts`, `notification_error` and `notified_at`.
- **Failure handling:** the request is always saved first. If Gmail fails, the error is logged and recorded, the contractor still sees "Request received", and the admin page shows **Failed** with a **Resend email** button.
- **Resend safety:** a send first "claims" the request, so a resend can never double-send. A send that crashed mid-way can be retried after 5 minutes.

Code: `lib/growth/request-email.ts` (builder) and `lib/growth/notify.ts` (sender and recipients).

## Admin visibility

**Service Requests** (`/app/service-requests`, admins only):
- Filter tabs with counts: New, Contacted, In Progress, Completed, Declined.
- Table columns: company (links to the account), requester name, email and phone, service, notes, submitted time and source, **Team email** status with **Resend email**, and an inline status select.
- A banner appears when any team email failed.

## Tracking

HomeQuote has no product-analytics platform; the only tracking is the funnel's
Meta Pixel. So no new one was built. `lib/growth/track.ts` emits browser
`hqn:upsell` events in the same style as the funnel's existing `hqn:funnel`
event:
- `upsell_viewed`: once per card per page load, when half the card is on screen.
- `upsell_clicked`: when a request modal opens.
- `upsell_requested`: on success.

Each event carries `contractor_id`, `upsell_type` and `timestamp`, and no PII. An analytics tool can subscribe to these later. The requests themselves are the durable record.

## Data and security

`service_requests` (from 0018; extended by 0021):
- **Services:** 7 growth tools and 6 marketing services. `landing_pages` is retired (merged into Website & Landing Page); it's still valid in the database so older requests display, but it can't be requested.
- **Statuses:** new → contacted → in_progress → completed / declined. Existing rows are mapped: proposal_sent → in_progress, accepted → completed, closed → declined.
- **New columns:** `source`, `notification_status`, `notification_attempts`, `notification_claimed_at`, `notification_error` and `notified_at`.

A contractor can't file under another account:
1. The server action takes the company and user from the session, never from the form.
2. The zod schema has no company, user, status or notification fields, so any extra form fields are ignored.
3. The RLS insert policy requires the requester's own company, the requester's own user id, status `new`, and fresh (pending) notification fields.

Access by role:
- **Contractor:** reads only their own company's rows. Can't update or delete.
- **Admin:** reads all rows and updates status.
- **Setter and caller:** no access.
- **Email bookkeeping:** written by the service role only.

## Migration 0021 (must be applied before deploying)

```
! cd /c/Users/tzarc/Desktop/BusinessOSDevTools/hqn-contractor-portal-upsells && node --env-file=../fullappcreator/.env.local scripts/funnels.mjs migrate supabase/migrations/0021_growth_tools_upsells.sql
```

- **Safety:** additive and safe to re-run. It was verified against the production schema inside a rolled-back transaction by `tests/service-requests-db.test.ts`.
- **Numbering:** it's numbered 0021 because `0019_funnel_builder` is live and `0020_workflow_*` files exist.
- **The existing request:** production's one current request (Brochures, New) keeps its status. Its team email is shown as "Not confirmed", because deliveries weren't tracked before 0021; you can resend it.
- **Order matters:** deploying this code before applying 0021 would break the request insert (the new `source` column) and the admin page.

## Tests

- `growth-services.test.ts`
  - The featured card and its exact copy.
  - The seven growth tools.
  - Every card has a title, subtitle, 3–5 benefits and a non-"Submit" CTA.
  - Legacy slugs are still valid.
  - The catalog matches migration 0021.
  - No invented prices, badges or claims.
  - Validation: retired services and unknown sources; form tampering is ignored.
  - Nav label and placement.
- `service-request-actions.test.ts`
  - Identity comes from the session even when the form is tampered with.
  - Only `service_requests` is written.
  - Retired and unknown services are rejected.
  - Duplicate requests get a friendly message.
  - Raw database errors are hidden.
  - Admin-only status updates and email resend.
- `service-request-email.test.ts`
  - The exact subject, and body field order.
  - The link to the contractor account.
  - HTML escaping and header injection.
  - Recipient configuration and its fallbacks.
  - Sent, failed (the request is kept and only notification fields change), retry after failure, no double-send, and crash recovery.
- `growth-tracking.test.ts`: event shape, one view per card, and a no-op on the server.
- `service-requests-db.test.ts` (real RLS, rolled back):
  - Cross-company inserts, spoofed requesters, preset statuses and preset email state are rejected.
  - Setters have no access; contractors can't update or delete.
  - One open request per service.
  - Check constraints on the new statuses and sources.

## Files

New:
- `supabase/migrations/0021_growth_tools_upsells.sql`
- `components/ui/dialog.tsx`
- `components/growth/request-dialog.tsx`, `featured-service-card.tsx` and `upsell-view-tracker.tsx`
- `lib/growth/track.ts`
- `tests/growth-tracking.test.ts`

Changed:
- `lib/growth/catalog.ts`, `notify.ts` and `request-email.ts`
- `lib/validation/service-request.ts`, `lib/actions/service-requests.ts` and `lib/data/service-requests.ts`
- `components/growth/*`: cards, form, icons, status badge, page view, detail view, admin view and dashboard card
- `app/app/growth/page.tsx` and `app/app/growth/[service]/page.tsx`
- `lib/nav.ts`: label changed to "Growth Tools"
- Tests: `growth-services`, `service-request-actions`, `service-request-email` and `service-requests-db`
- This doc and the screenshots

## Known issues

- **`main` currently fails to build.** This isn't from this work. Commit `31f8852` made `lib/workflows/index.ts` export `./evaluator` and `./planner`, but those files are only uncommitted in the main `fullappcreator` folder. Vercel's deploy of `ba8aac6` failed, so production is serving the previous build. Whoever owns the workflow work needs to commit those files (or remove the exports) before anything else can deploy.
- **No mobile navigation.** The app sidebar is `md` and up only. On phones, contractors reach Growth Tools from the dashboard card.
