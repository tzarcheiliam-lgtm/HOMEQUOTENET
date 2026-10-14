# Prompt: Contractor availability + Google/Apple calendar sync

Paste everything below the line into a new Claude Code / Codex session on this repo.

---

You are working on HomeQuote Network (Next.js 15 App Router, Supabase Postgres + RLS, Zod, Vitest, Tailwind v4/shadcn, deployed on Vercel). **Before changing anything, read `HOMEQUOTE_CONTEXT.md` at the repo root** (routes, roles/RLS, workflows, integrations, known issues), and inspect the current code rather than assuming. Follow §16 "Rules for Future AI/Developers": don't break existing auth/RLS, never expose secrets, check existing migration numbers before adding one (latest is around `0046`; confirm and use the next free number), clearly separate implemented vs. planned, and **update `HOMEQUOTE_CONTEXT.md` when done**.

Build two connected features. Do them in order; ship Part 1 fully working before Part 2.

## Part 1 — Contractor availability (weekly/monthly "when I can't take appointments")

**Goal:** Contractors can tell HomeQuote when they are NOT available to take appointments, so admins/setters never book them into those times.

**Contractor UI** (new page under `app/app/`, e.g. `/app/availability`, added to `lib/nav.ts` for the `contractor` role; admins and setters get a read view per contractor, e.g. a tab on `/app/contractors/[id]`):
- **Recurring weekly schedule:** for each day of the week, mark the day fully unavailable, or set available hours (start/end), with support for multiple windows per day (e.g. 8–12 and 1–5). Include a timezone selector (default from contractor's state/service area; store IANA tz).
- **Date-specific blocks (month view):** a month calendar where they can block whole days or specific hour ranges (vacation, jobs, sick day), with optional note and optional "repeat weekly/until date". Also allow adding *extra* availability on a normally-off day.
- Settings: minimum notice (hours), max appointments per day, buffer between appointments (minutes), default appointment length.
- Must work well on mobile (the app has a mobile UI layer + PWA — follow `components/mobile` patterns) and desktop. Use existing brand tokens/components.
- Contractor `staff` vs `owner`: owners edit the company's availability; decide sensibly for staff (read-only unless company has per-user availability) and document it.

**Data model** (new migration; follow existing conventions for RLS helpers `is_admin()`, `is_staff()`, `auth_contractor_id()`):
- `contractor_availability_rules` (recurring weekly windows), `contractor_availability_exceptions` (date-specific blocks / extra availability), `contractor_availability_settings` (tz, notice, buffer, max/day, default duration).
- RLS: contractors read/write only their own `contractor_id`; admin full; setter/caller-style staff read (setters need it to book). Add tests that verify a contractor cannot read or write another contractor's rows.
- Appointments currently hang off `lead_assignments` (`appointments.assignment_id → lead_assignments → contractor_id`, `scheduled_at timestamptz`). Reuse that to derive a contractor's existing bookings.

**Core logic** (pure, unit-tested module, e.g. `lib/availability/`): `getContractorBusyAndFree(contractorId, range)` that combines weekly rules + exceptions + existing appointments (+ buffer, notice, daily cap, + external calendar busy times from Part 2) and returns bookable slots. Everything in UTC internally, convert with the contractor's tz; **test DST transitions, overnight windows, and overlapping blocks**.

**Enforcement:** wherever an appointment is created/rescheduled with a contractor (inspect `lib/actions/`, `app/app/appointments`, `lib/appointments/view.ts`, the funnel calendar step, and workflow `create_calendar_event`/appointment actions):
- Show the contractor's availability/blocked times to admins/setters in the scheduling UI (grey out unavailable slots).
- Server-side validate on create/reschedule: if the time falls in a blocked slot, reject with a clear message — but allow an admin/setter **explicit override** (checkbox + audit log entry in `audit_logs`). Never rely on UI-only checks.
- Don't change behavior for contractors who haven't set any availability (no rules ⇒ treat as unrestricted, so nothing existing breaks).

## Part 2 — One-click Google / Apple calendar connection + auto-add appointments

**Goal:** A contractor clicks "Connect Google Calendar" or "Connect Apple Calendar" in HomeQuote. After that: (a) their busy times from that calendar show up in HomeQuote as unavailable slots (visible to admins/setters when scheduling), and (b) whenever an appointment is assigned/scheduled/rescheduled/cancelled for them, the event is created/updated/deleted on their calendar automatically.

**Google Calendar (real one-click OAuth):**
- Model it on the existing Gmail OAuth flow (`lib/emails/gmail.ts`, `token-crypto.ts` AES-256-GCM encrypted refresh tokens, routes `app/api/integrations/gmail/oauth/{start,callback}`). Add `app/api/integrations/google-calendar/oauth/{start,callback}`. Use a **separate** consent/scopes from Gmail; request least privilege: `calendar.events` + `calendar.freebusy` (or `calendar.readonly` only if truly needed) with `access_type=offline`, `prompt=consent`, signed/expiring `state` bound to the signed-in user, and PKCE if practical. Reuse the existing token-encryption helper (new key env var only if the existing one can't be reused; never log tokens).
- Table `calendar_connections` (user/contractor, provider `google|apple`, encrypted creds, calendar id chosen, status, last_synced_at, last_error, revoked_at) with strict RLS (a user only sees their own; tokens never selectable from the client — expose only a safe view).
- Busy-time sync: query Google **freebusy** for the connected calendar on demand (with short cache) and/or incrementally; feed into `getContractorBusyAndFree`. Store only busy start/end — **never copy event titles/details** of the contractor's personal calendar into HomeQuote.
- Push appointments out: on appointment create/reschedule/cancel (hook the same place workflow events like `appointment.booked/rescheduled/cancelled` are emitted, and the notification outbox pattern in `lib/notifications/outbox.ts`), create/patch/delete a Google event with: title (service + customer first name), start/end, location/address, notes with a link back to the HomeQuote appointment, reminders. Store `external_event_id` per appointment+connection so updates/deletes are idempotent; **never create duplicates on retry** (use a deterministic event id or idempotency key). Retries with backoff; a failure must never block or fail the appointment itself — log to a sync-status table and surface "sync failed — reconnect" to the contractor.
- Handle token revocation/expiry gracefully (mark connection `needs_reconnect`, notify the contractor), and add a "Disconnect" button that revokes the token at Google and deletes stored credentials.

**Apple Calendar (be honest about constraints):** Apple has **no OAuth calendar API for third-party web apps**; iCloud uses CalDAV with app-specific passwords. Implement in this order and tell me which you shipped:
1. **Subscribe feed (ship first, works for Apple, Google, Outlook):** a per-user, unguessable, revocable ICS feed URL (`/api/calendar/feed/[token].ics`) of their HomeQuote appointments, with a one-tap "Add to Apple Calendar" (`webcal://`) button and copy-link. Update/cancel via UID + SEQUENCE + STATUS so changes propagate. Note: subscribed feeds refresh on Apple's schedule (not instant) — say so in the UI.
2. **Optional CalDAV connect for two-way (busy times in + events out):** contractor enters iCloud email + app-specific password (link to Apple's instructions); store encrypted; use CalDAV REST/`free-busy-query`. Only build this if feasible with a maintained library; otherwise document it as the next step rather than half-building it.
3. Also provide per-appointment `.ics` download and attach an ICS invite to the appointment-assigned notification/email so it works for any calendar app.

**UI:** a "Calendar connections" section (on `/app/availability` and/or `/app/integrations` for the contractor): provider cards with status (Connected / Needs reconnect / Not connected), the connected account, last sync time, a calendar picker, "Connect Google", "Add to Apple Calendar", "Disconnect", and a toggle "Add new appointments to my calendar". Admins see connection status per contractor (status only, never tokens) and busy blocks in the scheduling views.

## Env / config / ops
- Document new env vars (e.g. `GOOGLE_CALENDAR_CLIENT_ID/SECRET`, redirect URI) in `docs/` and `.env.example`; the feature must **degrade gracefully and invent nothing** when unconfigured (like `GOOGLE_PLACES_API_KEY` does): buttons show "not configured", Part 1 still works.
- Tell me exactly what I must do manually: create the Google Cloud OAuth client, enable the Calendar API, add redirect URIs, configure the OAuth consent screen (sensitive scopes ⇒ Google verification is needed before >100 users; call this out), and apply the migration(s). Do **not** apply migrations to production yourself.
- If periodic sync is needed, use the existing GitHub Actions tick pattern, not Vercel Cron.

## Quality bar
- Add Vitest tests: slot computation (DST, overlaps, buffers, caps), RLS isolation, OAuth `state` validation, idempotent event upsert/delete, enforcement rejection + admin override audit, ICS output (UID/SEQUENCE/escaping/timezones).
- Run lint, typecheck, and the test suite; verify the contractor, admin, and setter experiences on desktop and mobile widths.
- Keep changes scoped; don't refactor unrelated code. Commit in logical steps on the branch you were given, push, and **don't open a PR unless I ask**.
- Finish with a summary: what shipped, what is dormant/unconfigured, what Apple support is real vs. subscribe-only, and the manual steps I need to do.
