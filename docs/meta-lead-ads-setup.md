# Meta lead capture — setup and test checklist (Pool Masters)

Status: code written and unit-tested; **not deployed, migration 0035 not applied, nothing verified end to end.**

## 0. Before deploying

1. Run `supabase/scripts/meta-duplicate-leads.sql` step 1 in the Supabase SQL editor (read-only).
   Zero rows → continue. Rows → review them, then use step 3 (non-destructive; it ends in ROLLBACK until you change it to COMMIT).
   Migration 0035 itself aborts with an explanatory error, changing nothing, if duplicates still exist.
2. Apply `supabase/migrations/0035_meta_leadgen_hardening.sql` (adds `leads.answers/page_id/fbp/fbc`,
   `lead_intake_events.page_id`, unique index `uq_leads_meta_external`).
3. Apply `supabase/migrations/0036_funnel_measurement_choice_and_contact_matching.sql` (adds `funnel_sessions.measurement_allowed`,
   replaces `save_funnel_session` with conservative contact matching). **Apply 0036 before deploying the app code**: the app writes
   the new column and, if it is missing, fails safe by sending no server Meta events.

## 1. Meta setup (Instant Forms)

1. developers.facebook.com → your app → add **Webhooks** and Lead Ads access.
2. Business Settings → Users → **System users** → create one, assign the Pool Masters **Page** (and ad account), generate a token with
   `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`.
   Meta's retrieval doc does not say whether App Review / advanced access / Business Verification is required — check the
   permission screen in the app dashboard ("Standard" vs "Advanced access"). Standard access normally only covers people with a role
   on the app, so real leads from the live Page may need advanced access.
3. Webhooks → **Page** → Callback URL `https://<site>/api/integrations/meta/webhook`, verify token = your `META_WEBHOOK_VERIFY_TOKEN`,
   subscribe to the **leadgen** field. Subscribe the app to the Page (`POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`).
4. Token upkeep: a System User token does not expire like a user-derived token, but stops working if the system user, its Page
   assignment, the app permission or the app secret is removed or reset. When retrieval fails, `/app/integrations/meta` shows an error
   ("reconnect it") and the webhook answers 500 so Meta redelivers.

## 2. Vercel env vars (Production; never in chat or git)

`META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`, optional `META_GRAPH_VERSION` (default v26.0), and the
existing `META_CONVERSIONS_API_TOKEN`. Then at `/app/integrations/meta` set the Page ID and enable the integration, and redeploy.
Verification only (temporary): `META_TEST_EVENT_CODE` — see §4. **Correction (2026-10-07):** Meta's Conversions API docs say events sent with `test_event_code` "are not dropped. They flow into Events Manager and are used for targeting and ads measurement purposes" - it is NOT a sandbox and does not hide real events. Remove it from production when the check is done; use a separate test dataset for experiments.

## 3. End-to-end checklist — Instant Form

- [ ] Webhooks page: Meta's verification handshake succeeds (GET returns 200).
- [ ] Lead Ads Testing Tool (developers.facebook.com/tools/lead-ads-testing): create a test lead for the Page + form.
- [ ] Lead appears in HomeQuote within a minute: name, phone, email, city/ZIP, timeline/budget/project, `source=meta`, platform,
      form id, page id, Meta lead id; campaign/ad set/ad IDs if the test lead carries them (test leads may not).
- [ ] Re-deliver the same lead: **no second lead**, no extra activity rows.
- [ ] Same phone, different name → new lead + "possible duplicate" activity (not merged, not dropped).
- [ ] Break the token on purpose in a non-production setup: webhook returns 500, integration shows the error, the lead imports after the
      token is fixed and Meta redelivers. Record how long redelivery takes (Meta's retry schedule isn't in the docs I could read).
- [ ] Bad `X-Hub-Signature-256` → 401.
- [ ] Consent: Instant Form leads import with `consent_granted=false` unless the form has a consent question (see §6).

## 4. End-to-end checklist — website lead (one production test lead, deleted afterwards)

Set `META_TEST_EVENT_CODE`, redeploy, open Events Manager → dataset 933962709362966 → **Test events** and copy the code.

- [ ] Open `https://<site>/estimate/<slug>?fbclid=TESTCLICK&utm_source=test&utm_campaign=verify&campaign_id=1&adset_id=2&ad_id=3`
      in a normal browser with measurement allowed (keep the Test events page open).
- [ ] Submit with a test email/phone, then run:
      `select utm_source, utm_campaign, campaign_id, ad_set_id, ad_id, fbclid, fbp, fbc, service_area_valid from leads where email = '<test>';`
      Every field populated (`fbp`/`fbc` need the Pixel cookies).
- [ ] Test events shows **Lead** from Browser and Server with the same event_id `<session>:Lead`, deduplicated.
- [ ] Repeat once with the footer box **unchecked** before submitting: lead saves, **no** Server Lead event, `fbp`/`fbc` null.
- [ ] Uncheck the box after submitting, then book: no Schedule event.
- [ ] Book the Calendly slot → **Schedule** (Server, with fbp/fbc, event_id `<session>:Schedule`).
- [ ] Tennessee ZIP → no appointment, no Lead event, `service_area_valid=false`.
- [ ] Remove `META_TEST_EVENT_CODE`, redeploy, delete the test lead. (Test-coded events were NOT hidden from the dataset: expect the test events to remain counted there.)

## 5. Phase 2 (NOT implemented): CRM events for Instant Forms — for review

From Meta's "Send a CRM event" guide (read 2026-10-01 in Events Manager) and Meta's CRM integration page:

- Per event: `action_source: "system_generated"`, `custom_data.event_source: "crm"`, `custom_data.lead_event_source: "<CRM name>"`,
  `event_name`, `event_time` (UNIX time the lead changed to that stage), `user_data.lead_id` (15–17 digit Meta lead id — already stored
  as `leads.external_lead_id`), plus hashed `em`/`ph`.
- Endpoint `POST /v26.0/933962709362966/events`, authenticated with the dataset's access token.
- "A trigger must occur for every stage of your funnel, including the initial raw lead stage"; upload at least daily.
- **Not stated by Meta:** event names (only the example `Lead`; the guide says the name is the CRM stage name), whether lost/cancelled
  must be sent beyond "every stage", maximum event age, dedupe guidance. Confirm names in Events Manager or with Meta before building.
  Meta's suitability thresholds: ≥200 leads/month, target stage reached within 28 days, 1–40% of leads reaching it.
- Proposed mapping (names are PROPOSALS, using real stage-change timestamps, no sale amounts):

| HomeQuote | Meta event_name |
|---|---|
| lead created (`new`) | `Lead` |
| `contact_attempted` | `ContactAttempted` |
| marked qualified by a person (`leads.qualified` / qualification status — **not** `assigned`) | `QualifiedLead` |
| `appointment_set` | `AppointmentSet` |
| `appointment_completed` | `AppointmentCompleted` |
| `estimate_sent` | `EstimateSent` |
| `sold` | `Sold` (no `value`) |
| `lost` | `Lost` |
| `cancelled` | `Cancelled` |
| `assigned` | not sent |

Open questions: whether HomeQuote records a timestamp for each status change (`lead_activities` may); `qualified` is currently
a person's decision stored separately from `status`.

## 6. Consent behavior now implemented (policy wording still needs your/legal's decision)

- The visitor's "Allow optional advertising measurement" choice is sent with the contact submit and the Calendly booking, saved on
  `funnel_sessions.measurement_allowed`, and checked before **every** server Meta event (Lead, Schedule) and before `fbp`/`fbc` are stored.
  Opt-out → the lead is still saved and the funnel works; nothing is sent to Meta and no Meta cookie ids are stored.
- A later change (opting out after submitting, before booking) is honored at Schedule time and persisted.
- Sessions with no recorded choice (created before this change) fall back to the funnel default: `opt_out` funnels (Pool Masters) on, `opt_in` off.
- First-party attribution from the landing URL (utm_*, `fbclid`, campaign/ad ids) is still stored on the lead; it is not sent to Meta.
- Instant Form leads import with `consent_granted=false` unless the form asks for consent.

## 7. DRAFT privacy wording — for legal review, NOT published

The live privacy page (`app/(marketing)/privacy/page.tsx`, "Cookies & tracking") and the funnel consent text are unchanged.
Proposed replacement/addition for counsel:

> **Advertising measurement.** If you allow it, we use Meta's pixel (a cookie-based tool) and Meta's Conversions API to tell Meta when
> you submit a request or book an appointment, so we can measure and improve our ads. This can include your email address, phone number,
> first and last name and ZIP code (each scrambled with a one-way hash before sending), your IP address and browser details, and Meta's
> advertising cookie identifiers, together with the ad or page you came from. Meta may match this to your Meta account and use it as
> described in Meta's privacy policy. We do not send your street address or the details of your project. You can turn this off at any
> time with the "Allow optional advertising measurement" control at the bottom of the form; if you do, we will not send these details to
> Meta from that point on. Turning it off does not affect your request. We still keep the campaign information in the link you used to
> reach us (for example the ad and campaign) with your request.

Proposed checkbox label: "Allow advertising measurement (shares limited, hashed contact details and device information with Meta)".

Items for counsel (not decided here): whether default-on (opt-out) is acceptable for a California-only audience; California
"sharing" / opt-out-of-sharing disclosures and Global Privacy Control handling; whether the TCPA consent text should stay separate from
this notice; wording for Instant Form disclosures; retention of the stored identifiers.
