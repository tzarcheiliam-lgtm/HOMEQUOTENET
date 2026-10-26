# ADU quiz landing page (`/adu-quiz`)

Standalone, paid-traffic landing page (Google and Meta ads). It works like a visual ADU builder: six design steps
(placement, size, style, color and material, extras, goal) each update a live image of the visitor's ADU, then ten
short screening questions qualify the homeowner (the image stays on screen). After the screening the contact step is
framed as a reveal ("Your ADU is ready. Where should we send your price?"): submitting unblurs the design and shows
the estimated price range. Qualified leads then see a GoHighLevel booking calendar; everyone else sees their design,
the estimate and a friendly nurture message. `noindex`. No site navigation; the only links are Privacy and Terms
(footer and consent text).

## Files

| File | Role |
| --- | --- |
| `lib/adu-quiz/config.ts` | **Single source of truth** for everything you change per buyer (see checklist below). |
| `lib/adu-quiz/quiz.ts` | Screening questions and the pure qualification rules. Reads thresholds from config; no hard-coded numbers. |
| `lib/adu-quiz/design.ts` | Build steps and options (placement, size, style, colors, materials, extras, goal), chips, alt text. No prices. |
| `lib/adu-quiz/estimate.ts` | Server-only price range from `PRICING`. Returns `null`, never a guess, if any needed number is unset. |
| `components/adu-quiz/layers.tsx` | **`ADU_LAYERS`**, the one config map behind the live image (drawn SVG by default, or your own images). |
| `components/adu-quiz/adu-preview.tsx` | The live image: stacked layers, crossfade, blur/unblur, reduced-motion support. |
| `lib/adu-quiz/submission.ts` | Zod request schema and the exact webhook payload builder (pure). |
| `lib/adu-quiz/leads.server.ts` | Store the lead, POST the webhook with retries, scheduled retry, server-side Meta events. |
| `app/api/adu-quiz/lead/route.ts` | `POST` a finished quiz. Qualification is decided here from the answers. |
| `app/api/adu-quiz/booked/route.ts` | `POST` when a booking finished (records it, sends the Meta `Schedule` event). |
| `app/adu-quiz/{layout,page}.tsx` | Lean shell, hero, FAQ, legal footer. |
| `app/adu-quiz/booked/page.tsx` | Calendar redirect target; tells the quiz page (parent window) the booking finished. |
| `components/adu-quiz/adu-quiz.tsx`, `tracking.ts` | The quiz (client) and browser tracking. |
| `supabase/migrations/0054_adu_quiz_leads.sql` | `adu_quiz_leads` table: durable copy + webhook retry queue. Applied by the owner. |
| `tests/adu-quiz*.test.ts` | Rules, design, estimate, payload, and the whole lead pipeline against the real migration. |

## Placeholders to fill in before ads go live

All in `lib/adu-quiz/config.ts` unless noted.

| Setting | What | Until set |
| --- | --- | --- |
| `MIN_BUDGET` | Default `150000` | Already set; change per buyer |
| `DQ_TIMELINES` | Default `12_plus`, `researching` | Already set; change per buyer |
| `PRICING` | Price per sq ft by placement, multiplier by style, add-on price per extra, and the low/high range factors (all `null` now). See "Pricing" below. | Any `null` the design needs = no number; the page says the builder confirms the range |
| `BOOKING_URL` | GoHighLevel calendar embed URL (https) | Result screen says the team will text to schedule |
| `LEAD_WEBHOOK_URL` | GoHighLevel inbound webhook (server only) | Leads are stored only, flagged `webhook_not_configured` |
| `META_PIXEL_ID` | Pixel/dataset id | No Meta events |
| `GOOGLE_TAG_ID` | `G-…` / `AW-…` | Google tag not loaded |
| `BRAND_NAME` | Defaults to the site name | Used in the consent text |

### Pricing (server only, shown only after the contact step)

```
estimate = sqft x basePerSqft[placement] x styleMultiplier[style] + sum(extraPrice[extra])
range    = estimate x rangeFactor.low  ..  estimate x rangeFactor.high   (rounded to $100)
```
Sizes are 400 / 600 / 800 / 1,000 sq ft. While building, the page shows only "Your estimate updates as you build".
`PRICING` is read only on the server (`lib/adu-quiz/estimate.ts`); the numbers are not in any browser script, and the
price is sent to the browser only in the response to the contact-step submit.

### Live image layers (`ADU_LAYERS`)

All layers are 900 x 520 px, transparent PNG or WebP, served from `/public`. Until you set a path the page draws clean
flat SVG illustrations, so **no image files are required**. To use your own renders, set these in
`components/adu-quiz/layers.tsx`:

| Layer | Key | File (suggested) |
| --- | --- | --- |
| Lot + main house | `ADU_LAYERS.base.src` | `/adu-quiz/layers/base.webp` |
| ADU body (64 combinations) | `ADU_LAYERS.body.overrides['<placement>:<size>:<style>']` | `/adu-quiz/layers/body-<placement>-<size>-<style>.webp` |
| Color tint (6, optional, drawn over a body image) | `ADU_LAYERS.color.overrides['<color>']` | `/adu-quiz/layers/color-<color>.webp` |
| Solar panels | `ADU_LAYERS.extras.solar.src` | `/adu-quiz/layers/extra-solar.webp` |
| Covered porch or deck | `ADU_LAYERS.extras.porch.src` | `/adu-quiz/layers/extra-porch.webp` |
| Landscaping | `ADU_LAYERS.extras.landscaping.src` | `/adu-quiz/layers/extra-landscaping.webp` |
| Large windows or sliding doors | `ADU_LAYERS.extras.large_windows.src` | `/adu-quiz/layers/extra-large-windows.webp` |

Placements: `backyard`, `garage_conversion`, `attached`, `above_garage`. Sizes: `studio`, `1br`, `2br`, `3br`. Styles:
`modern`, `craftsman`, `mediterranean`, `farmhouse`. Colors: `white`, `gray`, `sage`, `navy`, `clay`, `charcoal`. Any
image you set is preloaded on first load; anything you leave unset keeps using the drawn version. Material
(stucco, wood, board and batten) is drawn onto the SVG body and is not a separate image layer.

### "Save my design" email

Not built. The site has no transactional email path for homeowners wired to this page (Gmail is connected for team
email only), so the button was skipped rather than faked. The design and estimate are in the webhook payload, so
GoHighLevel can send the follow-up email.

Environment overrides (win over the config file): `ADU_QUIZ_LEAD_WEBHOOK_URL`, `ADU_QUIZ_BOOKING_URL`,
`NEXT_PUBLIC_ADU_QUIZ_META_PIXEL_ID`, `NEXT_PUBLIC_ADU_QUIZ_GOOGLE_TAG_ID`. Server-side Meta events also need the
existing `META_CONVERSIONS_API_TOKEN`.

Also required outside the repo:
1. Migration `0054_adu_quiz_leads.sql` has been applied by the owner.
2. In the GoHighLevel calendar, set the booking confirmation to **redirect to `https://<your domain>/adu-quiz/booked`**.
   That is how the Schedule event fires. (Not verified against a live GoHighLevel account: confirm the redirect option
   and that the widget prefills from `first_name`, `last_name`, `email`, `phone` URL parameters.)
3. Point the webhook at a GoHighLevel inbound webhook workflow and map the fields below.

## Qualification

Rules are applied identically to everyone, using only the quiz answers. The quiz never stops early: every visitor
finishes the quiz and the contact step so the lead is captured. Only the last screen differs.

The ZIP is captured and sent to the CRM but is not a qualification rule, because leads go to several buyers.

Not qualified: `not_owner`, `not_on_title`, `property_type`, `budget`, `timeline`, `credit`,
`bankruptcy`, `decision_makers`. "Not sure" (title, credit) and "I'd rather discuss" (bankruptcy) continue and set
`title_unverified`, `credit_unverified`, `bankruptcy_unverified`. The browser never decides: `/api/adu-quiz/lead`
recomputes qualification from the answers.

## Lead delivery ("never lose a lead")

1. The lead is stored in `adu_quiz_leads` (answers, qualification, exact consent text, timestamp and page URL, tracking).
2. It is POSTed to the webhook (3 inline tries, `Idempotency-Key` = submission id).
3. If the webhook fails, the row stays `pending` and `/api/workflows/tick` (every 5 minutes) retries with backoff.
4. If the database is unavailable the lead goes straight to the webhook. If both fail the API returns 503 and the
   browser keeps the answers so the visitor can retry. Logs hold submission ids and error codes only, never contact data.

Webhook JSON: `source`, `submission_id`, `submitted_at`, `first_name`, `last_name`, `email`, `phone` (E.164),
`answers` (screening answers plus the design), `design` (`placement`, `size`, `sqft`, `style`, `color`, `material`, `extras`,
`goal`, `estimated_range` = `{ low, high }` or `null`), `qualified`, `dq_reason`, `dq_reasons`, `title_unverified`, `credit_unverified`, `bankruptcy_unverified`,
`consent { text, timestamp, page_url }`, `tracking { utm_*, gclid, fbclid, fbp, fbc, landing_page_url, referrer,
timestamp, device_type }`.

## Tracking

Events: `BuildStart` (Start tapped), `BuildStep` (step 1-6 and the choice, e.g. `modern`), `DesignComplete` (after the
last build step), `QuizStart` (first screening question), `QuizStep` (1-10), `Lead`, `QualifiedLead`, `Schedule`. Funnel
drop-off by step comes straight from these counts (BuildStep 1-6, QuizStep 1-10, Lead, Schedule). Each has an event id
`<submissionId>:<Event>` shared by the browser and the Meta Conversions API (server events: Lead, QualifiedLead,
Schedule) so Meta deduplicates. No answers or contact data go in any event. The site has no Google Tag Manager; events
go to the Meta Pixel, the Google tag (if an id is set), `window.dataLayer`, and an `hqn:adu-quiz` DOM event. Tags load
after the page is idle, only when measurement is allowed. `MEASUREMENT_MODE` is `opt_out` (on unless the visitor unticks
"Allow optional advertising measurement"); set `opt_in` for the stricter, homeowner-funnel default.
