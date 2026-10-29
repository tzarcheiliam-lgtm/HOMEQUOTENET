# Contractor availability + calendar sync

Shipped in migration `0047_contractor_availability_calendar_sync.sql`. Read `HOMEQUOTE_CONTEXT.md` §24 for the technical summary.

> **Two kinds of hours (since migration 0068).** This page is about **on-site visits** that HomeQuote staff schedule for a contractor. The free **30-minute calls homeowners book online** (and contractor prospects book with HomeQuote sales) run on HomeQuote's own **booking calendars**, set up on `/app/calendar/settings`: Mon–Fri 9:00–17:00 Pacific by default, 30-minute calls, 15-minute buffer, 2 hours' notice, 14 days ahead. See `HOMEQUOTE_CONTEXT.md` §43. A contractor's booking calendar treats its on-site visits as busy time, and the same Google connection blocks busy time on both.

## What contractors get (`/app/availability`)
- **Booking rules**: time zone, default appointment length, buffer between appointments, minimum notice, max appointments per day, and the switch "only take appointments during my weekly hours".
- **Weekly hours**: any number of windows per day; a day with none is a day off.
- **Time off & extra hours**: month calendar + form to block whole days, hour ranges, multi-day ranges, or weekly repeats (until a date), or to add extra availability on a day off. Blocks always win over extra availability.
- **Calendar connections**: Google (one click) and an Apple/any-app private subscribe link.
- Owners (and HQN admins) edit; company staff and setters see it read-only. A contractor who sets nothing is unrestricted.

## What HomeQuote staff get
- Admins: nav **Availability**, then pick a contractor. Admins and setters: **View availability** on a contractor's page.
- Scheduling an appointment from a lead (`scheduleAppointment`) checks the contractor's availability **on the server** as the time is typed (live warning) and again on save. Admins and setters can tick **Book anyway**; the override is written to `audit_logs` as `appointment.availability_override`. Contractors scheduling their own work are not blocked by their own rules.
- Busy times from a connected Google calendar count as unavailable (`calendar_busy`). Only start/end are read — never event titles.
- Calls homeowners book in a funnel now go on the booking calendar (§43), which checks its own hours, buffer, notice, existing bookings and the hosts' Google busy time, under a lock. Appointments created by workflows, or by a funnel still on the old Calendly/GHL fallback, are not checked against these on-site hours (they are still synced to calendars).
- **HomeQuote team and sales hosts** (admins, setters) connect their own Google Calendar on `/app/calendar/settings` → "Your Google Calendar" (same OAuth flow, no contractor on the connection). Their busy time is then never offered to callers, and calls on the calendars they host are added to their calendar.

## Quick path: no keys needed
Contractors tap **Add to my calendar** on `/app/availability`, then **Add to Apple Calendar** or **Add to Google Calendar**. It subscribes their calendar to a private link, so no Google Cloud setup is required. It is one-way (HomeQuote → calendar); busy times on their own calendar are not read back, so they block those under "Time off". Calendar apps refresh subscriptions on their own schedule (Apple: hours; Google: up to ~a day).

## Optional: direct Google sign-in (not needed)
Everything below is only for the optional two-way Google sign-in (instant updates + busy-time import). The button stays hidden until these variables are set.

## Google setup (optional, one-time, by you)
1. Google Cloud Console → create/choose a project → **APIs & Services → Library → enable "Google Calendar API"**.
2. **OAuth consent screen**: External, app name HomeQuote, support email, authorized domain `homequotenet.com`, privacy policy URL. Add scopes `…/auth/calendar.events` and `…/auth/calendar.freebusy` (plus `openid`, `email`). These are **sensitive scopes**: until Google verifies the app, only listed *test users* can connect and refresh tokens expire after 7 days; verification is also needed to go past 100 users. Submit for verification before onboarding contractors broadly.
3. **Credentials → Create OAuth client ID → Web application**. Authorized redirect URI: `https://<your-domain>/api/integrations/google-calendar/oauth/callback` (and the same on your Vercel preview/localhost if you test there).
4. Set the env vars in `.env.example` (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`); `GMAIL_TOKEN_ENCRYPTION_KEY` is reused unless you set `CALENDAR_TOKEN_ENCRYPTION_KEY`.
5. Apply migration 0047 **before** deploying the code. The existing `/api/workflows/tick` GitHub Actions scheduler already retries failed syncs every 5 minutes (no new cron).

Until all three Google vars are set the "Connect Google Calendar" button is replaced by a "not set up yet" message; availability still works.

## Apple
Apple offers no OAuth calendar API to web apps, so there is no one-click Apple sign-in. What ships:
- A private, revocable **subscribe link** (`webcal://…/api/calendar/feed/<token>.ics`) with an "Open in Apple Calendar" button. Works in Apple Calendar, Google, Outlook. One-way (HomeQuote → calendar) and refreshed on the calendar app's schedule (often hours), not instantly. Cancelled appointments stay in the feed as `STATUS:CANCELLED` for 30 days.
- Per-appointment **.ics download** (`/api/calendar/appointment/<id>`).
- **Not built**: two-way iCloud CalDAV (app-specific password). It needs a maintained CalDAV client and a credentials-handling UI; recommended as the next step if Apple busy-time import is needed. Until then Apple users block their own busy times in HomeQuote.

## How sync works
`appointments` insert/update/delete → trigger → `calendar_sync_jobs` (one pending job per appointment) → `processCalendarSyncJobs` (kicked off after the request, plus every 5 min) → for each of the company's active Google connections with "add appointments" on: create/patch/delete the event using a deterministic event id (`hqn` + sha1(appointment, connection)), so retries never duplicate. A failure never blocks the appointment; transient errors retry with backoff (6 attempts); a revoked/expired grant marks the connection `needs_reconnect` (shown to the contractor) and stops retrying. Connecting a calendar backfills the company's upcoming appointments.

## Known limits
- Google writes go to the account's **primary** calendar (no calendar picker yet).
- No push notification when a connection needs reconnecting — it shows on the Availability page only.
- Disconnecting revokes the token and deletes our credentials but leaves events already written on the calendar.
- On-site visits use the contractor's default duration (they have no end time); booking-calendar calls carry their own `ends_at` (30 minutes by default).
- Sales meetings (`prospect_sales_appointments`) are not pushed to Google yet (no sync trigger on that table); their busy time is still respected on the sales calendar.
- `datetime-local` values in the schedule form are now read as the workspace zone (America/Los_Angeles, as every appointment list displays) instead of the server's zone.
