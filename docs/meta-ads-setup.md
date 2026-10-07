# Meta Ads analytics and outcome feedback

Migration **0041**. Everything ships **dormant**: conversion delivery is OFF, no campaign is touched, no backfill runs.

## What it does
1. **Reporting (read-only)** — imports ad accounts, campaigns, ad sets, ads and daily ad-level insights (spend, impressions,
   link clicks, `actions`; reach per ad per day) through the Marketing API into `meta_*` tables. `/app/meta-ads` shows them
   next to HQN first-party outcomes with a campaign → ad set → ad → HQN-lead drill-down.
2. **Outcomes** — `lead_outcome_events` is an append-only ledger written by DB triggers on the existing source tables
   (`leads.qualification_status`, `appointments`, `sales`, `lead_assignments.status`). It is an audit trail, not a second status system.
3. **Feedback to Meta** — `meta_conversion_events` is a durable outbox. `/api/meta/tick` (every 5 min) feeds it from the ledger and sends.

## Two different Meta mechanisms (never mixed)
| HQN outcome | Website lead (funnel, Pixel dataset) | Instant Form lead (Conversions API for CRM) |
|---|---|---|
| Lead | `Lead` standard — already sent by the funnel; **not re-sent** | `lead` (initial stage, queued lazily before later stages) |
| Qualified (by a person) | `QualifiedLead` **custom** | `qualified` |
| Appointment booked | `Schedule` standard (Calendly bookings already sent by the funnel; queue sends only manual ones) | `appointment_booked` |
| Won | `WonJob` **custom**, with `value`+`currency` only when the real sale amount is recorded. **Not `Purchase`.** | `won` |

- Website: `action_source=website`, `event_source_url`, `fbp`/`fbc` + SHA-256 email/phone/name/zip (normalized), shared
  `event_id` `<funnel session id>:<EventName>` so Meta de-duplicates against the browser Pixel; only when the visitor allowed advertising measurement (rechecked at send time).
- Instant Form: `action_source=system_generated`, `user_data.lead_id` = Meta leadgen id (15–17 digits), `custom_data.event_source=crm`,
  `custom_data.lead_event_source=HomeQuote Network`. **Only the lead id is sent — no PII.**
- Never sent: notes, transcripts, qualification reasons, AI summaries, IP/user-agent (not stored).
- An ad id alone is never treated as a match key.

Meta constraints enforced: `event_time` ≤ 7 days old (older → permanent failure `event_too_old`, never re-dated), after lead creation, real occurrence time.
Same-day sales keep the true insert time; back-dated sales are `date` precision and are skipped if outside the window.

## Meta-side configuration you must do
- **Marketing API token**: Business Settings → System users → create an *admin or employee* System User → assign the ad accounts (view) → generate a token with **`ads_read`** → `META_MARKETING_ACCESS_TOKEN`. Standard access is enough for ad accounts owned by your own Business; reading client-owned accounts needs Advanced access via App Review.
- **Conversions API token**: Events Manager → dataset → Settings → Generate access token → `META_CONVERSIONS_API_TOKEN` (already used by the funnel).
- **Dataset ID** for Instant Form (CRM) events: enter it on Meta Ads → Setup. Instant Form leads must come from the Page connected to that dataset.
- **Test first**: Events Manager → Test events → copy the code → Setup → *Test* mode. Test rows are flagged and never counted.
- **Optimization (manual, in Ads Manager — nothing here edits campaigns)**: Instant Form campaigns → Leads objective with the conversion-leads optimization once stages are flowing. Website campaigns → create a **custom conversion** on `QualifiedLead` / `WonJob` (they are custom events), then choose it as the ad set's conversion event.
- Env: `META_TICK_SECRET` (+ GitHub secrets `META_TICK_SECRET`, `META_TICK_URL`) for the worker. Optional `META_APP_ID`/`META_APP_SECRET` for token-expiry display.
- **Token expiry/revocation**: System User tokens don't expire but can be revoked; a revoked/expired token (Graph code 190) shows as a banner and as `auth` sync/delivery failures; replace the env var.

## Go-live steps (needs approval)
1. Apply migration 0041, deploy, set env vars + GitHub secrets.
2. Sync, map each ad account → contractor (Setup). Unmapped accounts are admin-only.
3. Switch delivery to **Test**, record a qualification on a test lead, confirm it appears under Events Manager → Test events.
4. Review the eligibility report and the event mapping table on Setup. Approve or change the event names.
5. Switch to **Live** (type `ENABLE LIVE`). Only outcomes recorded after the switch are queued.

## Corrections
Changing a status adds a ledger entry (and `correction` for refunded/cancelled sales); history is never edited. A Meta event that was already **accepted is not retracted** (neither API offers it). Future events and HQN reports reflect the corrected state.
"Accepted" means the API returned success with `events_received ≥ 1` — not that Meta matched an ad or will optimize on it.
Retries reuse the same `event_id`; accepted events cannot be retried; events older than 7 days cannot be retried.

## Known limits
- Cost per *acquired contractor* is not computed (no ad → signed contractor link in the data).
- Reach is only shown for a single ad on a single day (non-additive).
- Activity-basis "won" doesn't subtract a refund that happened after the selected period.
- One `WonJob` per lead (a second sale on the same lead is de-duplicated by event id).
- AI-call qualification is **recorded** with evidence if a future writer sets `qualification_source='ai'` + `qualification_evidence`, but is never sent to Meta; no AI writer exists yet.
