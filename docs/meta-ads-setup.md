# Meta Ads analytics and outcome feedback

Migration **0042**. Everything ships **dormant**: conversion delivery is OFF, no campaign or ad-account setting is touched, no backfill runs.
Nothing here has been verified against live Meta or a real Supabase project (no credentials in the build environment); §10 separates what is
tested locally from what is not.

## 1. What it does
1. **Reporting (read-only)** - imports ad accounts, campaigns, ad sets, ads, daily ad-level insights, ad-set `promoted_object` and ad `tracking_specs`
   via the Marketing API into `meta_*` tables. `/app/meta-ads` shows them beside HQN first-party outcomes. `/app/meta-ads/setup` (admin) has connection health,
   account -> contractor mapping, the dataset check, Instant Form readiness, delivery switch and eligibility report. `/app/meta-ads/events` (admin) is the redacted delivery view.
2. **Outcomes** - `lead_outcome_events` is an append-only ledger written by DB triggers on `leads.qualification_status`, `appointments`, `sales`, `lead_assignments.status`. It audits the existing tables; it is not a second status system.
3. **Feedback to Meta** - `meta_conversion_events` is a durable outbox fed from the ledger by `POST /api/meta/tick` (5-minute worker). Events the funnel / the original QualifiedLead sender transmit directly are recorded there too (origin `legacy_direct`).

## 2. Database procedure (migrations)
`main` contains migrations **0001-0041** (0041 = visual workflow builder, merged via PR #6); this work adds **0042**. There is no migration-history table to trust
(migrations have been applied by hand and `scripts/apply-migrations.mjs` does not record them), so use the read-only planner, which inspects the database for what each file creates:

```
STAGING_PROJECT_REF=<ref> STAGING_CONFIRM=I-understand-this-is-not-production SUPABASE_DB_URL=<direct connection string> \
  node scripts/staging/migration-plan.mjs
```
It refuses production unless you pass `--allow-production` (still read-only), never prints the connection string, and ends with the exact ordered list to apply.

- **Fresh Supabase project:** the plan is **all 43 files, 0001 -> 0042, in filename order** (not just 0040-0042: 0042 needs `profiles`, `contractors`, `leads`, `lead_assignments`, `appointments`, `sales`, `set_updated_at`, `is_admin/is_staff/auth_contractor_id`, `integrations`; 0041 needs the workflow, AI-calling and signing tables). Two files share the number 0027 - both are applied (`0027_email_templates_call_workspace`, `0027_workflow_retention`); sorted filename order is correct.
  Dry-run everything in one rolled-back transaction, then apply for real:
  `node scripts/apply-migrations.mjs --dry-run supabase/migrations/*.sql` then `node scripts/apply-migrations.mjs supabase/migrations/*.sql` (each file in its own transaction, stops at the first failure, reads `SUPABASE_DB_URL`, never prints it).
  This exact chain was applied in an in-process PostgreSQL (PGlite) with Supabase's platform pieces stubbed (`tests/helpers/full-migrations.ts`); a real Supabase project is the remaining proof.
- **Existing staging project:** run the planner. Expected outcomes: *Every migration present* (nothing to do); *Apply, in this order: 0041..., 0042...* (it stops at 0040); a **GAP** or **PARTIAL** report means stop and compare by hand - never apply on top of it. 0042 has no dependency on 0041's tables, but apply in numeric order anyway.
- Three files (0022, 0027_email_templates_call_workspace, 0033) only change policies/triggers and cannot be auto-detected; the planner lists them as "assumed to follow their neighbours".
- **Never renumber an applied migration.** 0041 belongs to the workflow builder and may already be applied somewhere; Meta Ads is 0042.

## 3. Event mappings and the REAL event source
Two Meta mechanisms, never mixed. `action_source` is derived from **where the underlying action happened** (Meta: `website` = "conversion was made on your website", `phone_call` = "over the phone", `email`, `chat` = "via a messaging app, SMS...", `physical_store` = "in person", `other` = "not listed"), **not** from whether a person, AI or system wrote the database row.

### A. Website leads (HQN funnels; funnel Pixel dataset; web events)
| Outcome | Event (std/custom) | `action_source` | event_id |
|---|---|---|---|
| Lead submitted | `Lead` (standard) | `website` | `<session>:Lead` (= browser Pixel id) - sent directly by the funnel |
| Visitor books in the funnel (Calendly) | `Schedule` (standard) | `website` | `<session>:Schedule` - sent directly by the funnel |
| Visitor books in the funnel (GHL calendar) | `Schedule` | `website` | `<session>:Schedule` - **was missing server-side**; now sent by the queue with the browser's id |
| Any other appointment | `Schedule` | recorder's stated channel (phone/email/chat/in person) -> `phone_call`/`email`/`chat`/`physical_store`; else an AI call that **reported a booking before the appointment was recorded** -> `phone_call`; else `other` | `<session>:Schedule:<appointment id>` |
| Qualified by a person | `QualifiedLead` (**custom**) | how the confirmation happened (reason code): by call -> `phone_call`, text -> `chat`, email -> `email`; else `other` | `<session>:QualifiedLead` (once per lead) |
| Won job | `WonJob` (**custom**) | `other` (a sale is recorded off-platform; channel not captured) | `<session>:WonJob:<sale id>`, value+currency only if a real recorded amount exists. **Never `Purchase`.** |

- **AI appointments (resolved with the workflow integration):** the workflow builder's AI "booked" result is only a *claim*; **a person records the appointment** (it never creates one). So the *author* of the row is irrelevant. HQN uses the workflow's own `resolveCallOutcome` rule: a completed AI call for the same lead + contractor whose analysis says booked, and which began before the appointment was recorded (within 72 h), is evidence the booking happened on a phone call -> `phone_call`. A person's explicit "How was it booked?" choice on the appointment form (new optional field `appointments.booked_via`) overrides it. No evidence -> `other`. This is a documented heuristic; correct it by choosing a channel when recording.
- Matching: `fbp`/`fbc` (stored at submit) + SHA-256 of normalized email, phone, names, zip. No IP/user-agent for later events (not stored). An ad id is never a match key. `event_source_url` only when `action_source=website` (Meta requires it only there). Only sent when the visitor allowed advertising measurement (rechecked at send time).
- Separate appointments and separate sales on one lead are separate events (ids above). Qualification is once per lead.

### B. Instant Form leads (Conversions API for CRM / Conversion Leads)
Events `lead_received`, `qualified`, `appointment_booked`, `won`; `action_source=system_generated`; `user_data.lead_id` = the 15-17 digit leadgen id; `custom_data.event_source=crm`, `custom_data.lead_event_source=HomeQuote Network`; event_id `crm:<leadgen id>:<stage>` (one per lead per stage, Meta's funnel model). Names are free-form stages per Meta; `lead_received` avoids colliding with the web `Lead` (Meta: if you convert an existing web dataset, CRM events need different names).
Required by Meta's payload spec (all present in HQN's request): `event_name`, `event_time`, `action_source`, `user_data` with at least one customer parameter, `custom_data.event_source`, `custom_data.lead_event_source`, an access token, a dataset. `lead_id` is the highest-priority identifier and Meta's example payload carries only it; HQN sends no hashed email/phone here. **The lead id alone is not "a complete request" - the other fields above are what make it complete.** A lead without a valid leadgen id is recorded as skipped (`missing_meta_lead_id`), not sent with weaker identifiers.

### Time windows
Meta's Conversions API reference: `event_time` may be up to **7 days** before sending, and one older event rejects **the whole request**. The CRM page: "backfill up to 7 days", event must be after the lead was generated. No longer window is documented for any source on the pages read, so both paths use 7 days and HQN never re-dates an event. (Do not assume a longer window for "offline-style" sources.)

## 4. Delivery is not optimization (five separate checks)
Test Events proves very little. Verify each stage separately and don't proceed on the earlier one alone.
1. **Delivery accepted** - Graph answers 200 with `events_received >= 1` (HQN shows "Accepted by Meta"; it also keeps `fbtrace_id`). Source: [Conversions API - using the API](https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api).
2. **Received in the intended dataset** - Events Manager -> the dataset -> Overview shows "the number of raw, matched and attributed events we received" and the connection method; Meta says verification should be possible "within 20 minutes". The **Test Events window only shows that a request arrived**. **Test events are not sandboxed**: Meta states "Events sent with `test_event_code` are not dropped. They flow into Events Manager and are used for targeting and ads measurement purposes." (same page). HQN therefore requires a **separate test dataset** for Test mode and refuses one that real events use. The old `META_TEST_EVENT_CODE` env var gives **no** protection - remove it from production.
3. **Matched** - Event Match Quality / customer-parameter coverage per event; Meta: matching needs the customer information parameters sent with each event ([end-to-end implementation guide](https://developers.facebook.com/documentation/ads-commerce/conversions-api/guides/end-to-end-implementation.md)). Browser/server de-duplication is verified in Events Manager by sending the pair and checking the correct one is dropped (same `event_id` + `event_name`, same Pixel, within 48 h).
4. **Attributed** - conversions show against ads in Ads Manager under the ad set's attribution setting; timing matters: Meta says events sent in real time/within 1 hour can be used for attribution, >2 h late "can cause a significant decrease in performance", >=24 h late may have significant attribution issues. (HQN's queue sends within minutes of the outcome being recorded, but the outcome itself is often recorded later than the real action - which is a business-process limit on attribution, not a bug.)
5. **Eligible to optimize** - a campaign setting Meta documents per source:
   - *Instant Form / CRM*: native Instant Form campaigns only; Leads objective, conversion location "Instant forms", goal **Conversion Leads** (unavailable in personal/lightweight ad accounts; cannot be changed on a published campaign - duplicate it). Fit guidelines: >=200 leads per month, the target stage within 28 days of the lead, stage rate 1-40%, at least daily uploads. CRM events need a **Pixel/dataset set up as CRM** (Events Manager -> Connect Data Sources -> CRM); Meta recommends a new dedicated dataset. Source: [Conversions API for CRM](https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration.md), [getting started](https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration/crm-integration/2-getting-started-with-integration.md), [payload spec](https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration/payload-specification.md). *Setup shows these measured on your data.*
   - *Website custom events*: `QualifiedLead` / `WonJob` are custom events; an ad set can optimize for one only through a custom conversion (or the event as a custom-event objective) on the dataset that receives it, and the ad set must use that same dataset. **I could not find official text on dataset-timing or other prerequisites for custom conversions, and none on whether an `action_source=other/phone_call` custom event is eligible for optimization; treat that as unverified until Events Manager/Ads Manager accepts it.** Standard `Lead`/`Schedule` have no such step.

## 5. Which dataset receives which event (verify BEFORE changing anything)
| Source | Dataset | Must match |
|---|---|---|
| Website `Lead`, `Schedule`, `QualifiedLead`, `WonJob` | the funnel's Pixel (`funnels.config.trackingPixels.metaPixelId`; Pool Masters today `933962709362966` per the repo) | the ad set's `promoted_object.pixel_id` (and the ads' `tracking_specs`) |
| Instant Form CRM stages | the dedicated **CRM dataset** (Setup -> "Dataset ID for Instant Form events") | the dataset connected to the lead-ads integration |
| Test mode (any source) | a **separate test dataset** (Setup -> "Separate TEST dataset ID") | nothing - never a dataset real events or ads use |

Reported mismatch (`933962709362966` funnel vs `2057270381542607` once seen in Ads Manager): in code both the browser Pixel and the server events read the same single value (`933962709362966`); `2057270381542607` appears only in notes. After the first sync, **Setup -> Dataset check** reports, from Meta's own configuration, which dataset each ad set optimizes on and each ad tracks, and which dataset recent sessions actually used. Only change ONE side after reading it (the ad set's dataset in Ads Manager, or the funnel's Pixel ID in the funnel builder). Nothing is changed automatically.

## 6. Direct-sender handoff (proven, see §10)
The original direct `QualifiedLead` sender keeps running until Live (`meta_settings.legacy_direct_qualified`, default true), so deploying causes no reporting gap.
- **Off (default):** direct sender active; queue silent.
- **Test:** direct sender stays active and keeps sending REAL events to the real dataset; the queue sends a copy **only to the separate test dataset** with the test code. No test event reaches a production dataset.
- **Live:** saving Live retires the direct sender and moves the ledger cursor to "now" (only outcomes recorded afterwards are queued - no historical sweep). Same event id, so a handover cannot double count.
- **Off again:** direct sender resumes only if you tick "keep the original direct sender running"; otherwise nothing is sent (explicit, visible).
- **Reservation:** a direct send first writes a `processing` row; the unique index (dataset, event id, test_mode) over **non-failed** rows means the queue and the direct sender can never both own an event. An in-flight direct request blocks a queue send, and the reverse.
- **Failed rows never block a retry:** the index excludes `failed`. A failed direct send is retried through the delivery view (creates a queue row, `retry_of`, SAME event id). A crashed direct send is swept to `failed` (`interrupted_ambiguous`, "may or may not have reached Meta") after 10 minutes and is then retryable. Retries of accepted / in-flight / >7-day-old events are refused.
- Residual risk: a failed request that actually reached Meta (timeout) and is then retried can be counted twice; the shared event id lets Meta de-duplicate where it supports that (documented for browser+server pairs; not for server-only repeats).

## 7. Credentials: exact requirements
Your situation: **the Pool Masters ad account is owned by your client; you have full admin on the Page.** Page admin does **not** give access to the ad account or to the dataset - both are separate Business assets.

| Item | Required? | What exactly |
|---|---|---|
| Ad-account access for reporting | **Required** for reporting | The client must share the ad account with **your Business** as a partner (Business Settings -> Users -> Partners; "view/analyst"-level is enough for reading; admin level only if you will later manage ads) - menu labels vary, confirm in the live UI. Then assign that ad account to a **System User** in your Business (view performance). Official: for other people's ad accounts the app needs **Advanced access** to `ads_read`; for your own accounts Standard is enough ([Authorization](https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization.md)). |
| `ads_read` Advanced access (App Review) | **Required for a client-owned account** in production | Per-permission App Review; Meta requires **Business Verification** "if your app will access sensitive data"; keep >=500 Marketing API calls per 15 days with <15% errors to keep Advanced/Full tier. Do **not** request `ads_management` (HQN never edits ads) or `business_management` (not needed for reading assigned accounts). |
| Interim path while review is pending | optional | Meta states app admins/developers can make calls on behalf of ad-account admins/advertisers at the default tier. A *user* token needs the client to add the **person** as an ad-account admin and the person to hold an app role; it expires (~60 days) and ties to one individual - use only to try the import, not for production. |
| `META_MARKETING_ACCESS_TOKEN` | **Required** (reporting) | System User token with `ads_read` only. System users don't expire but can be revoked. Limited tier allows 1 system user + 1 admin system user. Stored only as a Vercel server env var. |
| Dataset access for sending events | **Required** (events) | The Pixel `933962709362966` is owned by whoever created it. If it is the **client's**, the client must share the dataset with your Business and you assign it to the System User (at least "use events dataset"/manage pixel permission - per Meta's guidance and partner docs; confirm labels in the live UI). If you own it, assign it directly. |
| `META_CONVERSIONS_API_TOKEN` | **Required** (events; already exists for the funnel) | Generated in Events Manager -> dataset -> Settings -> Conversions API (or for the System User). Meta does not store tokens - save it once into Vercel. Must have access to the **CRM dataset** and, for Test mode, the **test dataset**. |
| CRM dataset | **Required** for Instant Form events | Events Manager -> Connect Data Sources -> **CRM**; new dedicated dataset recommended; its ID goes in Setup. Needs admin access to create/convert a Pixel. Don't change datasets after it is working. |
| Test dataset | **Required** for Test mode | A throwaway dataset used for nothing else + its Test Events code. |
| `META_TICK_SECRET` + GitHub secrets `META_TICK_SECRET`, `META_TICK_URL` | **Required** (worker) | Random string; URL `https://<prod domain>/api/meta/tick`. |
| `META_APP_ID` | optional | Same app as `META_APP_SECRET`; only to show token expiry. |
| `META_MARKETING_API_VERSION` / `META_GRAPH_VERSION` | optional | Defaults v25.0 (Marketing API changelog's current) / v26.0 (newest Graph, introduced 2026-07-29; v25.0 supported to 2028-07-29). |
| Existing Lead Ads webhook secrets | unchanged | `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`. Page admin is what these use. |
| Access tier | informational | Default **Limited** access = development rate limits (score 60, 300 s block); **Full** needs review. Insight pulls are small and cached. |

## 8. Rollout (no reporting gap) and rollback
**Order matters; production delivery stays Off until the end.**
1. Merge the integration branch; apply migrations to **staging** (planner first, §2); verify the 0041 runbook and the Meta checks (§9).
2. Production: run the planner **read-only** (`--allow-production`) to see what is missing; dry-run; apply 0041 (if absent) then 0042; deploy. **Behavior is unchanged**: legacy QualifiedLead keeps sending; the queue is Off.
3. Set the production env vars (§7), run a sync, map each ad account to a contractor, read **Setup -> Dataset check**.
4. Create/confirm the CRM dataset and the test dataset; enter IDs on Setup.
5. **Test** mode on production only after a test dataset exists; verify acceptance (check 1-2), then matching (3), then attribution (4) on the real dataset using the direct sender's events.
6. Decide the `QualifiedLead` `action_source` (still `website` while the direct sender runs; `phone_call`/`chat`/`email`/`other` once Live).
7. **Live** (type `ENABLE LIVE`) - retires the direct sender in the same save.
8. After Live: create custom conversions and adjust campaign optimization yourself (Meta-side; nothing here does it).
**Rollback:** Live -> Off with "keep the original direct sender" ticked restores today's behavior immediately; accepted events cannot be retracted. Code rollback: revert the deploy; 0042 is additive and can stay. (`supabase/rollback/` has the workflow builder's soft rollback only; 0042 needs none.)

## 9. Staging test checklist
1. Planner on staging; apply remaining files; planner again = "Every migration present".
2. `scripts/staging/verify-0041.mjs` (workflow builder) passes.
3. Create admin, contractor-owner (A), contractor-owner (B); map an ad account to A; B sees nothing of A's; A sees spend only after opt-in.
4. Qualify a test lead (delivery Off): the direct sender runs (needs a staging Pixel/token) or nothing is sent if none configured; outcome history shows it.
5. Test mode with a separate test dataset: queue copy visible in delivery view as accepted; appears in that dataset's Test Events; **nothing** appears in any production dataset.
6. Switch Live (staging dataset), qualify another lead: exactly one real event; delivery view "Accepted by Meta".
7. Fail a send (bad token on staging): row `failed`, **Retry** works, same event id, one accepted.
8. Off with rollback ticked: direct sender resumes.

## 10. What is tested, and how
- **Unit (mocked fetch / in-memory store):** Graph error classification and backoff, metric math, timezone/DST, mappings and `action_source` provenance, event ids, queue feed/dispatch, consent re-check, 7-day window, direct-send reservation.
- **Disposable database from every real migration (PGlite):** ledger triggers on real tables incl. the GHL booking RPC; RLS tenant isolation; unique-index/retry semantics; the migration planner against fresh / full / stops-at-0040 / partial databases; **the Off -> Test -> Live -> Off handoff** with in-flight, failed, retried and crashed direct sends (`tests/meta-handoff.test.ts`), asserting no event id is ever accepted twice as a real conversion and no test event reaches a production dataset.
- **Browser:** report, filters and delivery form at desktop and phone widths with labeled fixture data (earlier session); real pages need Supabase auth and were not exercised end to end.
- **Not verified:** anything against real Meta (import, token check, Test Events, matching, attribution, optimization eligibility, `other`-source custom events), a real Supabase project, the 16 DB suites that need `SUPABASE_DB_URL`.

## Known limits
Cost per acquired contractor is not computed. Reach is only shown for one ad on one day. Activity-basis "won" doesn't subtract a later refund. AI-qualification is recorded with evidence if a writer sets it but is never sent to Meta. Won-job `action_source` is always `other` (channel not captured).
