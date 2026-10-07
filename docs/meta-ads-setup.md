# Meta Ads analytics and outcome feedback

Migration **0042** (renumbered from 0041, see "Migrations and merge order"). Everything ships **dormant**: conversion delivery is OFF,
no campaign is touched, no backfill runs, and nothing was verified against live Meta (no credentials in the build environment).

## What it does
1. **Reporting (read-only)** - imports ad accounts, campaigns, ad sets, ads, daily ad-level insights, ad-set `promoted_object` and
   ad `tracking_specs` through the Marketing API into `meta_*` tables. `/app/meta-ads` shows them beside HQN first-party outcomes
   (drill-down campaign -> ad set -> ad -> HQN leads). `/app/meta-ads/setup` (admin) holds connection health, account->contractor
   mapping, the dataset check, Instant Form readiness, delivery switch and eligibility report. `/app/meta-ads/events` (admin) is the redacted delivery view.
2. **Outcomes** - `lead_outcome_events` is an append-only ledger written by DB triggers on `leads.qualification_status`, `appointments`,
   `sales`, `lead_assignments.status`. It audits the existing tables; it is not a second status system.
3. **Feedback to Meta** - `meta_conversion_events` is a durable outbox fed from the ledger. `POST /api/meta/tick` (5-minute worker) feeds and sends.
   Events the funnel/QualifiedLead sender transmits directly are also recorded there (origin `legacy_direct`) so they are visible and cannot be re-sent.

## Verified event mappings (against Meta documentation read 2026-10-07)
Two different Meta mechanisms; never mixed.

### A. Website leads (HQN funnels; Pixel dataset; Conversions API web events)
| HQN outcome | Event | Standard/custom | `action_source` | event_id | Status |
|---|---|---|---|---|---|
| Lead submitted | `Lead` | standard | `website` | `<session>:Lead` (= browser Pixel id) | **Valid, unchanged.** Sent by the funnel session route. Queue never re-sends it. |
| Calendly booking | `Schedule` | standard | `website` | `<session>:Schedule` | **Valid, unchanged.** Visitor action on the site. |
| GHL-calendar booking | `Schedule` | standard | `website` | `<session>:Schedule` | **Gap fixed.** The browser fired it but no server event existed; the queue now sends it with the browser's id. |
| Portal / staff / AI-recorded appointment | `Schedule` | standard | `other` (`phone_call` if actor is an AI call) | `<session>:Schedule:<appointment id>` | **Corrected.** Not a website conversion, so not labeled `website`. Separate appointments are separate events. |
| Qualified by a person | `QualifiedLead` | **custom** | `other` | `<session>:QualifiedLead` (once per lead) | **Corrected in the queue.** The pre-existing direct sender used `website` (kept running until you cut over, see rollout). |
| Won job | `WonJob` | **custom** | `other` | `<session>:WonJob:<sale id>` | **Corrected.** Value+currency only if a real sale amount exists. Never `Purchase`. Two sales = two events. |

- Matching: `fbp`/`fbc` (stored write-once at submit) + SHA-256 of normalized email, phone, first/last name, zip. IP/user-agent are not stored, so not sent for these later events. An ad id alone is never a match key.
- `event_source_url` is sent only when `action_source=website` (Meta requires it only there).
- Only sent when the visitor allowed advertising measurement; re-checked at send time.
- **Not verifiable from documentation:** whether Meta will use a custom event with `action_source=other` for ad-set optimization or a custom conversion. Meta's documented definition of `website` is "conversion made on your website", so labeling staff-recorded outcomes `website` would misstate the source; whether the `other` events still feed optimization must be confirmed in **Events Manager -> Test events** and then on the dataset. If Meta shows them as unusable, the fallback is to keep them for reporting only.

### B. Instant Form leads (Conversions API for CRM / Conversion Leads)
| HQN outcome | `event_name` | `action_source` | event_id |
|---|---|---|---|
| Lead received (initial stage, queued before the first later stage) | `lead_received` | `system_generated` | `crm:<leadgen id>:lead` |
| Qualified by a person | `qualified` | `system_generated` | `crm:<leadgen id>:qualified` |
| Appointment booked | `appointment_booked` | `system_generated` | `crm:<leadgen id>:appointment` |
| Won | `won` | `system_generated` | `crm:<leadgen id>:won` |

Required by Meta's CRM payload spec: `event_name`, `event_time`, `action_source=system_generated`, `user_data` (at least one customer parameter),
`custom_data.event_source=crm`, `custom_data.lead_event_source`, access token, and a dataset. The request HQN builds includes all of those; `user_data.lead_id`
(the 15-17 digit leadgen id from the webhook) is Meta's highest-priority identifier and its documented example payload carries only that. HQN sends **no hashed email/phone** on this path
(Meta says if email/phone are sent they must be hashed; HQN simply doesn't send them). If a lead has no valid leadgen id the event is recorded as skipped (`missing_meta_lead_id`), not sent with weaker identifiers.
- One event per lead per **stage** (Meta's funnel model), not per appointment/sale.
- **Dataset:** Meta's setup page recommends a *separate CRM dataset* (or, when converting an existing web dataset, event names distinct from web events - HQN's are). The integration is Pixel-based; don't switch datasets after it is working. Enter it on Setup.
- Event names are free-form lead stages per Meta; `lead_received` replaces the earlier `lead` so it can't be confused with the web `Lead`.
- **Optimization eligibility (Meta):** Instant Form campaigns only; Leads objective, conversion location Instant forms, goal "Conversion Leads" (not available in personal/lightweight ad accounts; can't be changed on a published campaign - duplicate it). Meta's fit guidelines: >=200 leads/month, the target stage within 28 days of lead creation, stage rate 1-40%, uploads at least daily. Setup shows these measured on your data. Meta decides.
- Not verifiable offline: that Meta accepts this exact payload for your Page/dataset (Test events), and that the lead id needs no other form (string vs number).

### Time windows
Meta's Conversions API reference: `event_time` may be up to **7 days** old and a request containing an older event is rejected whole. The CRM page repeats 7 days ("backfill up to 7 days"), and requires the event to be **after the lead was generated**. I found no documented longer window for any source in the pages read, so both paths use 7 days, and HQN never re-dates an event. (I did not rely on remembered 62-day offline limits.)

## Duplicate prevention and coverage
- Unique `(dataset_id, event_id, test_mode)`: repeated saves, replayed ledger rows, webhook retries and a direct-send audit row all collapse to one event.
- Browser/server pairing only exists for `Lead` and `Schedule` (visitor actions). They share the browser's event id; Meta de-duplicates within 48h.
- Every appointment creation path reaches the ledger because the trigger sits on `appointments`: portal, funnel Calendly, funnel GHL (`record_funnel_booking`, tested), workflow/AI inserts. A visitor-booked appointment is recognized through `funnel_bookings`; anything else is "recorded in HQN".
- Meta also dedupes by `event_id`+`event_name` only for events it receives from both channels; for server-only events the unique index is the safeguard.

## Dataset mismatch (`933962709362966` vs `2057270381542607`)
Trace: in the code, the browser Pixel (`lib/funnels/tracking.ts`, initialised from `config.trackingPixels.metaPixelId`) and the server events (`app/api/funnels/[slug]/session/route.ts`) read the **same** single value, `933962709362966`, from `content/funnels/clients/pool-masters-la.json` (the live config is the `funnels.config` row, which the builder can edit). `2057270381542607` appears **only** in the notes; no code references it. It was observed once in Ads Manager ("Pixel not active"); it could not be checked here (the Facebook Ads connector is unauthorized in this environment and no Meta credentials exist).
Conclusion: unverified. Two benign explanations (an old/unused dataset in the ads' tracking specs while the ad set optimizes on the funnel's dataset, or a stale warning) and one harmful one (the ad sets optimize on a dataset the funnel never sends to, so Meta sees no conversions).
Smallest safe correction path, none applied: (1) after a sync, open **Meta Ads -> Setup -> Dataset check** - it compares each ad set's `promoted_object.pixel_id` and each ad's `tracking_specs` with the funnel pixel (and the pixel recent sessions actually carried); (2) if ad sets use `2057...`, change the **ad set's dataset in Ads Manager** to `933...` (or, if `2057...` is the dataset you intend, change the funnel's Pixel ID in the funnel builder) - one value in one place, not both; (3) confirm in Events Manager that the chosen dataset shows `Lead` events.

## Access requirements (Meta documentation, 2026-10-07)
- Reporting reads need **`ads_read`**. Meta: for **your own** ad accounts, Standard access to `ads_read` is enough; for **client** ad accounts you need Advanced access (App Review) - so what matters is who *owns* each ad account, not who runs the ads. Pool Masters' account ownership is unknown to me: if it is owned by your Business, Standard works; if it is the client's own Business and shared to you as a partner, plan for Advanced access.
- Advanced access needs App Review per permission and keeping >=500 Marketing API calls in 15 days with <15% errors. Business verification is not mentioned on the pages read; Meta may still require it for Advanced access in practice - confirm in the App Dashboard.
- Marketing API **access tier**: *Limited* (default, development-only, tight rate limits: score 60, 300s block) vs *Full* (app review; 9000 score). Insight pulls are small and cached, but Limited tier will rate-limit larger accounts; the client backs off on error codes 4, 17, 32, 613, 80000-80014.
- System User token (Business Settings -> System users): doesn't expire, server-to-server, less likely to be invalidated than a user token. Limited tier allows one system user + one admin system user.
- Conversions API: access token generated in Events Manager (dataset -> Settings); needs no extra permission beyond dataset access.
- Existing Instant Form webhook/lead retrieval (`META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`) is untouched. Which app powers what: the Lead Ads webhook app owns `META_APP_SECRET`; the new reporting token is a System User token (`META_MARKETING_ACCESS_TOKEN`) that may belong to any app with `ads_read`. `META_APP_ID` (optional) must be the SAME app as `META_APP_SECRET` - used only to show token expiry.
- Versions: Graph **v26.0** (introduced 2026-07-29) is the newest; v25.0 is supported until 2028-07-29. The Marketing API changelog lists **v25.0** as current, so reporting defaults to v25.0 (`META_MARKETING_API_VERSION`) and the Conversions API to v26.0 (`META_GRAPH_VERSION`). The connection check proves what Meta accepts.

## QualifiedLead behavior change and rollout (no reporting gap)
Before this work, a person-qualified website lead triggered a direct `QualifiedLead` server event (action_source `website`). The queue replaces it but ships OFF, which would have stopped that signal. Fix: `meta_settings.legacy_direct_qualified` (default **true**) keeps the original direct sender running while the queue is Off, so deploy changes nothing. The queue and the direct sender never both send real events: only Live retires the direct sender (Test leaves it running); the event id is identical (`<session>:QualifiedLead`), so a handover cannot double count. Rollback: set delivery Off and tick "keep the original direct sender".
Recommended sequence: deploy (nothing changes) -> **Test** mode with the Test Events code (the queue sends corrected `action_source=other` events to Test events only; the direct sender keeps sending real events, so there is no gap) -> verify in Events Manager -> **Live** (retires the direct sender in the same save; same event id, so no double count). Between deploy and Live you are on today's behavior. Rollback from Live: set delivery Off and tick "keep the original direct sender running".
Caveat: while the direct sender is active it keeps today's `action_source=website` label; if Test shows `other` events are not usable for optimization, decide before cutover which label you want.

## Migrations and merge order
- `main` ends at **0040**. The visual workflow builder branch `claude/magical-ride-pmer7r` adds `0041_visual_workflow_builder.sql`; this work originally also used 0041. No Meta branch other than this one exists; nothing is applied to a shared database from here. Because 0041 may already be applied to staging/production for the workflow builder, **it is not renumbered**; this work is **0042** (it has no dependency on 0041: it touches only `meta_*`, `lead_outcome_events`, `meta_conversion_events`, new columns on `leads`/`sales`).
- Apply order: 0040 -> 0041 (workflow builder) -> 0042. 0042 also applies without 0041.
- Code merge order: workflow builder first (it changes `tests/helpers/pglite-supabase.ts`, `vitest.config.ts`, `tsconfig.json`, `lib/nav.ts`-adjacent code), then this branch. Expected conflicts: `lib/nav.ts`/`components/nav-icons.ts` (one added item each), `HOMEQUOTE_CONTEXT.md` (appended sections), `lib/types.ts`. The workflow branch requires a *confirmed appointment* for "Booked"; this ledger independently records an appointment only when an `appointments` row exists, which is the same bar.
- Integration point if another Meta dashboard appears: `/app/meta-ads` is the single Meta area; extend `lib/data/meta-ads.ts` (`loadMetaReport`) and `components/meta/*`; tokens live in env only; one queue (`meta_conversion_events`); one settings row (`meta_settings`). No other session or branch with Meta dashboard work was found.

## What is tested (and how)
- Unit tests with mocked `fetch`/in-memory store: Graph error classification, retry/backoff/paging, redaction, metric math, timezone/DST ranges, mapping/eligibility, event ids, queue feed/dispatch, consent re-check, 7-day window, direct-send audit, legacy handover.
- Local database tests: migration 0042 on a disposable in-process Postgres built from **all real migrations 0001-0040 + 0042** (`tests/helpers/full-migrations.ts`): triggers on real tables, funnel GHL booking RPC, RLS tenant isolation, queue uniqueness/claim, append-only ledger.
- Browser: desktop (1280px) and phone (390px) render of the report, filters and delivery form with clearly labeled fixture data - no horizontal overflow, no console errors. The real pages need Supabase auth and were not exercised end to end.
- **Not verified against real Meta or a real Supabase:** Marketing API import, token health check, Test Events delivery, `action_source=other` usability, CRM payload acceptance, rate-limit behavior, staging migration application.

## Corrections
Changing a status adds a ledger entry (and a `correction` for refunded/cancelled sales); history is never edited. A Meta event already **accepted is not retracted**. "Accepted" means the API returned success with `events_received >= 1` - not that Meta matched an ad or will optimize on it. Retries reuse the same `event_id`; accepted, legacy-direct and >7-day-old events cannot be retried.

## Known limits
- Cost per *acquired contractor* is not computed (no ad -> signed contractor link in the data).
- Reach is only shown for a single ad on a single day.
- Activity-basis "won" doesn't subtract a refund that occurs after the selected period.
- AI-call booking is labeled `phone_call` only when its ledger actor is `ai`; today no writer sets that (AI-created appointments appear as `system` -> `other`). The workflow-builder branch should mark such appointments when it merges.
- AI qualification is recorded with evidence if a writer sets `qualification_source='ai'` + `qualification_evidence`, and is never sent to Meta.
