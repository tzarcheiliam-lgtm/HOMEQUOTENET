# Instant pool estimator

A homeowner on Pool Masters LA's site (or an iframe embed of it) answers a short flow, sees a **ballpark price range**
with a line-by-line breakdown, and books a free on-site consultation. Leads go into the existing Pool Masters homeowner
funnel pipeline. Everything is data-driven so the same template can later be self-serve for other pool contractors:
Pool Masters specifics live in one config file.

Always labeled "ballpark, not a quote". No AI pricing. No monthly payment amounts anywhere (lending disclosure rules).

**Pool Masters now uses the simple mobile funnel** (`experience: 'funnel'`, see "Pool Masters simple funnel" below), a
copy of Buildoly's mobile flow: a landing page, three one-tap questions (size, finish, extras) over pre-rendered photos,
a four-field contact step, then the range and the booking calendar (`revealRange: 'after_contact'`). The one-page
configurator ("Pool Masters configurator") and the step-by-step flow described next still work: the configurator is the
price/photo mapping the funnel reuses, and the builder is what `/estimator/bathroom-remodel` uses.

## Homeowner flow (step-by-step builder)

Under about two minutes. One screen at a time (order and rules in `components/estimator/use-estimator-flow.ts`):

1. Project (remodel, or pool + backyard), pool shape, pool size (or typed dimensions)
2. Package (Refresh / Signature / Transformation) or "Build my own"; custom builds pick "what to include", then the
   detail questions (surface, tile + coping, deck, features, equipment, backyard extras)
3. Property questions (cracks, access, hillside): "Yes" or "Not sure" flags the estimate for a site visit
4. "Which look do you like?" photos (not priced), then ZIP, homeowner, timeline and contact
5. With `revealRange: 'after_contact'` the range appears after the contact step, with the breakdown, the financing
   note and disclosure (plain text, no payment amounts) and a booking button

Limits: at most 4 options on a single question and 5 on a multi (`DEFAULT_LIMITS`).

## Routes

| Route | What |
| --- | --- |
| `/estimator/[slug]` | Public page in the marketing group: heading, intro with contractor name and license, the estimator. `noindex` while `pricesConfirmed` is false. Not in the sitemap. |
| `/embed/estimator/[slug]` | Bare page for iframes (no site header/footer, same `.hq` theme), compact layout, always `noindex`. |
| `POST /api/estimator/[slug]/lead` | Lead capture (see Lead path). |
| `POST /api/estimator/[slug]/render` | Optional photoreal render of the finished design (see Live pool builder). Off without `KIE_API_KEY`. |
| `GET /api/estimator/[slug]/render/[taskId]` | Poll one render; the renderToken goes in the `x-render-token` header. |

Both pages and the lead route are public: `lib/supabase/middleware.ts` only guards `/app` (and `/studio`) and returns
early for `/estimator/`, `/embed/estimator/` and `/api/estimator/` (no Auth refresh). Unknown slugs return 404.

The pages pass `publicTemplate(...)` to the browser. With `revealRange: 'after_contact'` (bathroom-remodel) every option
price and the minimum job/rounding are stripped, so the range cannot be read from the page source before the contact
step. With `'immediately'` (Pool Masters, configurator) the prices ship, which is what lets the configurator price every
click in the browser; they are still example prices, the page says so and stays `noindex`.

## File map

| File | Role |
| --- | --- |
| `lib/estimator/types.ts` | The shared contract (template, questions, prices, estimate, contractor config). |
| `lib/estimator/engine.ts` | Pure: `visibleQuestions`, `applyPackage`, `computeEstimate`, `validateTemplate`, `formatUsd`, `formatRange`. |
| `lib/estimator/geometry.ts` | `poolGeometry`: shape + size or typed dimensions to surface, perimeter, interior and deck areas. |
| `lib/estimator/templates/pool.ts` | The generic pool remodel template (questions, packages, **example prices**). |
| `lib/estimator/catalog/pool.ts` | Optional extra options a contractor can switch on. |
| `lib/estimator/config.ts` | `applyContractorConfig`: merges a contractor's overrides into a template. |
| `lib/estimator/registry.ts` | `getEstimator(slug)` / `ESTIMATOR_SLUGS`: template + catalog + contractor config, merged. Server-safe. |
| `content/estimators/pool-masters.ts` | Pool Masters LA's settings (name, license, funnel slug, financing text, photos). |
| `content/estimators/pool-masters-photos.ts` | Gallery and per-option photos (files in `public/estimator/pool-masters/`). |
| `lib/estimator/lead-client.ts` | Browser side of lead capture: request/response types, `submitEstimatorLead`, `LEAD_TIMELINES`. |
| `lib/estimator/lead.ts`, `app/api/estimator/[slug]/lead/route.ts` | Server side of lead capture. |
| `components/estimator/*` | `Estimator` (entry), flow hook, screens, summary, `pool-shapes.tsx`, `swatches.tsx`. |
| `app/(estimator)/estimator/[slug]/page.tsx`, `app/(estimator)/layout.tsx` | Public, contractor-branded page (header, words-only hero, builder, footer); reads `rendersEnabled()` server-side. |
| `components/estimator/shell/*` | Branded header/footer, hero copy (`heroCopy`), stage bar, reward tracker, contractor facts. |
| `components/estimator/builder-progress.ts` | Stages (Pool, Style, Details, Unlock), rewards, unlock copy (photo only when `rendersEnabled`). |
| `components/estimator/scene/example-compare.tsx`, `scene/hero-images.ts` | Renders on: the example design beside its real render in the builder frame before the first answer. |
| `components/estimator/screens/unlock-preview.tsx`, `screens/reveal-styles.tsx` | Unlock step preview (no prices, placeholder bars) and the reveal timing/motion. |
| `app/(estimator-embed)/` | Embed layout + `embed/estimator/[slug]/page.tsx`. |
| `scripts/estimator-price-sheet.mjs` | Price sheet CSV for the contractor to fill in. |
| `lib/estimator/scene/*` | Live builder: `types.ts` (SceneSpec contract), `scene.ts` (`buildScene`), `geometry.ts` (`layoutScene`, `sceneCamera`), `textures.ts` (asset manifest), `rasterize.ts` (scene to PNG). |
| `components/estimator/scene/*`, `builder.ts`, `motion.tsx` | `PoolScene` renderer (yard, water, sprites, night), `ScenePanel`, chips/preview/summary helpers, builder motion. |
| `components/estimator/screens/design-result.tsx` | Finished design on the result: save as PNG, share, the automatic realistic photo (starts only when `rendersEnabled` and the lead response has a render token; its progress appears after the price lands) with before/after. |
| `lib/estimator/render.ts`, `lib/estimator/render-client.ts`, `app/api/estimator/[slug]/render/**` | Photoreal render: tokens, limits, kie.ai calls; browser side. |
| `scripts/generate-scene-textures.mjs`, `scripts/scene-assets.py` | One-off generation of the scene textures/sprites (kie.ai + seamless/cut-out post-processing). |
| `tests/estimator-*.test.ts(x)` | Engine, geometry, template, config, screens and page/registry tests. |

## How prices work

Each priced option carries a `Price`: `{ unit, low, high, quantity? }`, whole US dollars **per unit**. The unit decides
the quantity:

- `interior_sqft`: pool floor + walls (plaster, quartz, pebble)
- `perimeter_lf`: pool edge length (tile, coping)
- `deck_sqft`: deck area from the deck-size answer
- `linear_ft` / `each`: a default `quantity` (seating wall, LED lights)
- `flat`: one price (automation, baja shelf)

`poolGeometry` turns the shape and size presets (or typed length, width, depth) into those quantities: surface area =
L x W x areaFactor, perimeter = 2(L + W) x perimeterFactor, interior = surface + perimeter x average depth. Shape and size
factors live in `template.geometry`. `computeEstimate` sums the lines, applies `minimumJob`, rounds the low end down and
the high end up to `roundTo`, and reports a status: `incomplete`, `site_visit` or `ready`.

## Replacing the example prices

Every price in `lib/estimator/templates/pool.ts` is an **example** (`pricesConfirmed: false`). While false, the page says
"Example prices" and is `noindex`.

1. Generate the price sheet: `node scripts/estimator-price-sheet.mjs sheet.csv` (older Node needs
   `--experimental-strip-types`). It lists every option with its unit and example price and blank contractor columns.
2. The owner fills in real per-unit low/high prices and package contents, and says which optional catalog items to offer.
3. Put the confirmed prices in `content/estimators/pool-masters.ts` as `options` overrides keyed `questionId.optionId`
   (for example `'features.baja': { price: { low: 6500, high: 9500 } }`), plus `minimumJob` and `packages` if they changed.
   Update the template itself only for prices that should change for every contractor.
4. Set `pricesConfirmed: true` in the same file, then add `/estimator/pool-masters` to the sitemap
   (`app/sitemap.ts`) and decide whether the public page should be linked from the site.

## Embed

```html
<iframe
  src="https://<site>/embed/estimator/pool-masters"
  title="Pool remodel price estimator"
  width="100%"
  height="1100"
  style="border:0;max-width:760px;width:100%"
  loading="lazy"
></iframe>
```

Recommended height: 1100 px on desktop, and about 1400 px on narrow phones (long screens scroll inside the frame).
There is no auto-height script yet: the page does not post its height to the parent. If the owner's site needs it, add a
`postMessage({ type: 'estimator:height', height })` from the embedded layout and a small listener on the host page.

Attribution: the lead records the full page URL, so add UTMs to the iframe `src`
(`/embed/estimator/pool-masters?utm_source=site&utm_campaign=...`) to keep them on embed leads.

Framing: the app sets no `X-Frame-Options` or CSP `frame-ancestors` header on any path (`next.config.ts` and middleware
checked), so the embed can be framed today. If a site-wide frame header is ever added, exempt `/embed/estimator/*` and
nothing else.

## Lead path

At the contact step the browser calls `POST /api/estimator/[slug]/lead` (types in `lib/estimator/lead-client.ts`). The
server looks the estimator up by slug, **recomputes the estimate itself** (the client never sends prices), and files the
lead under the contractor's `funnelSlug` through the existing Pool Masters homeowner funnel pipeline, so spam handling,
rate limiting, internal alerts and delivery are the same as a funnel lead.

- **Consent.** The contact screen shows the funnel's own consent wording (`estimatorConsentText`, which names HomeQuote
  Network and the contractor) with Privacy and Terms links. The request carries the wording that was shown, and the route
  rejects it (409) if it differs from what the funnel stores, so the saved disclosure always matches the screen.
  `contractorName` in the contractor config must equal the funnel's `clientName`.
- **Advertising measurement.** An "Allow optional advertising measurement" checkbox. The step-by-step flow ticks it by
  default for an `adMeasurement: 'opt_out'` contractor (mirroring the funnel's mode); the configurator's booking form
  never pre-ticks it (an explicit opt-in). Only when it is on are Meta browser ids sent and the server Lead event fired.
- **Attribution.** The full page URL (with UTMs and click ids) is recorded, as on funnel leads. Self-serve estimator leads for
other contractors must never enter the network `leads` pipeline.

## Live pool builder and photoreal render

For pool templates the flow is a live builder, Buildoly style: a straight-down drone-view picture of the homeowner's pool
and backyard sits beside the questions (pinned above them on phones) and redraws instantly on every pick.

- **Pipeline.** Answers + typed dimensions → `buildScene` (visible questions only, so stale answers never show) →
  `SceneSpec` → `layoutScene` (pure, fuzz-tested: nothing overlaps or leaves the canvas, every extra finds a place) →
  `<PoolScene>` (one inline SVG). The deck runs into the walk along the house, rectangle and L pools get square,
  wide coping, the kitchen and patio cover stand against the house, and `sceneCamera` frames it like a drone shot: tight
  on a simple pool, pulled back for a full backyard, and close on the pool while surface, tile and coping are chosen.
- **Feedback.** Hover (after a real pointer move) or keyboard focus previews an option as a ghost; every pick shows a chip
  ("Fire pit added" with a photo of a real job, "Signature package applied", "Equipment added to your plan",
  "We'll help you pick a finish"); the chip clears on a new screen. Phones do not pin the picture on the ZIP and contact
  screens, so the keyboard never covers a field.
- **Assets.** Textures and sprites in `public/estimator/scene/` were generated once (kie.ai nano-banana-2, then made
  seamless / cut out) and exported at about twice their on-screen size (256–512 px, ~0.9 MB total). Nothing is generated
  while a visitor clicks. Caustics are white light in the alpha channel (no blend mode). Animations pause off screen, in a
  hidden tab, while a text field has focus, and under reduced motion; touch screens run one caustic layer.
- **Photoreal render (optional).** On only when `KIE_API_KEY` is set. A saved lead's response carries `renderToken`
  (HMAC over slug, lead id and expiry; key derived from `ESTIMATOR_RENDER_SECRET`, falling back to the service-role key;
  valid 2 hours). On the result the photo starts by itself (only with `rendersEnabled`; a retry button only after a retryable failure): the browser rasterizes the day scene and posts it;
  the server uploads it to kie.ai (`https://kieai.redpandaai.co/api/file-stream-upload`) and starts an image-edit task
  (`nano-banana-pro`, or `nano-banana-2` via `ESTIMATOR_RENDER_MODEL`) that keeps the layout; the browser polls with the
  token in the `x-render-token` header and shows a before/after slider.
- **Limits and records.** Each render is a `lead_activities` row (`type 'system'`, `metadata.kind 'estimator_render'`,
  status, task id, image URL, a hashed per-visitor `rate_key`), internal visibility (staff see it on the lead timeline).
  The row is inserted before counting and removed again over a limit, so parallel requests cannot exceed 3 renders per
  lead, 6 per visitor per hour or `ESTIMATOR_RENDER_DAILY_CAP` (default 100) per 24 hours. Polls hit kie.ai at most once
  per task every 2 seconds per server instance.

## Compliance checklist

- Range only, labeled "ballpark, not a quote", with the template disclaimer and the "not included" list
- No monthly payment amounts anywhere; financing is a plain note plus the lender disclosure
- No trademarked product names (for example PebbleTec) in the generic catalog or template
- "Example prices" label and `noindex` until `pricesConfirmed` is true; the page is not in the sitemap meanwhile
- Contact consent line is the funnel's stored wording (server-checked), required before submitting, with Privacy/Terms links
- Optional advertising measurement checkbox; no Meta event without it
- No prices in the page source before the contact step (`publicTemplate`)
- Pool Masters photos are used with the owner's permission (from the brochure)
- The live picture and the photoreal render show no prices; the caption "Illustration — your final design is confirmed at
  the on-site visit" stays under the picture
- The builder's result keeps "Ballpark, not a quote" directly above the booking button; other trades keep the button last

## Bathroom builder (`/estimator/bathroom-remodel`)

The same live-builder experience for bathroom remodels, published for HomeQuote Network (a matching network, not a
contractor). Full technical summary: `HOMEQUOTE_CONTEXT.md` §33, "Live bathroom builder". In short:

- **Config** `content/estimators/homequote-bathroom.ts` (`trade: 'bathroom'`, `network: true`), template
  `lib/estimator/templates/bathroom.ts` (example Southern California prices, `floor_sqft` unit, `siteVisitWhen` layout
  checks), catalog `lib/estimator/catalog/bathroom.ts`. Leads file under the `bathroom-remodel` funnel; a cosmetic
  "update the look" project is filed as `other` and goes to review.
- **Trade adapters** (`components/estimator/builders/`): the flow and the scene panel never branch on the trade; the pool
  adapter wraps the pool scene unchanged. A kitchen builder needs a template, a catalog, a config, an adapter and a scene.
- **Picture**: an eye-level Canvas 2D bathroom (`components/estimator/scene/bath/`), drawn from `buildBathScene` and
  `bathLayout`; instant draft frame on every pick, sharp frame when picks pause.
- **Images**: all generated with kie.ai or drawn procedurally (`scripts/generate-bath-assets.mjs`), labelled as AI style
  ideas or AI-rendered; never photos from the web.

## Pool Masters configurator

`/estimator/pool-masters` and `/embed/estimator/pool-masters` render `components/estimator/configurator/` instead of the
builder when `configuratorSpecFor(contractor)` returns a spec: `experience: 'configurator'`, a `configurator` spec, and
`revealRange: 'immediately'` (with `after_contact` the prices would be stripped, so the pages fall back to the builder).
The lead route uses the same check.

**Page.** One page, Buildoly-style, light theme (white, warm grey, ink, one blue). Desktop: the photo fills the left
column with pill tabs for the views (Aerial / Poolside / Evening), a strip of the design's other views under it, and a
small to-scale plan of the chosen size on the photo; the options column on the right; a sticky bar with the total
range, a breakdown drop-up and "Review my design". Phone: the photo is fixed under the header (32vh, shrinks to 20vh
once the options are scrolled, opens again for a moment when a pick changes it; a spacer keeps its place so nothing
moves), options below, the same sticky bar. Then a cost summary (`#summary`), then the result and booking step
(`#book`): the design in every view, "Here's your pool.", the design in plain words with the total range (breakdown
in a "See the cost breakdown" disclosure), the booking form, financing in words, real projects.

**Spec** (`lib/estimator/configurator/types.ts`, plain JSON; Pool Masters' is
`content/estimators/pool-masters-configurator.ts`): `models` (size cards: Compact 24 x 12, Classic 30 x 15, Estate
36 x 18 ft, described as the size of the existing pool: prices are remodel prices), `groups` of radio or checkbox rows
mapped to template answers, `bundle` (Go Luxe: pebble, glass tile + travertine coping, porcelain deck, spa, fire bowls
for 10% off the summed row deltas, an example figure), `views` with photo `dimensions`, `photos` (every key),
`photoNote`, `projects` (real job photos). Pricing is `computeEstimate` on `selectionToAnswers(...)` with the bundle
saving taken off (`estimateSelection` in `lib/estimator/configurator/engine.ts`); the total is always a range. Rows show
the low end of their example range ("from +$5,400"), size cards "from $14,500", Go Luxe "from +$44,100", the struck-out
sum and "Save $4,800+" with "Example prices and saving" while `pricesConfirmed` is false.

**Photos.** 78 pre-rendered keys (`public/estimator/pool-masters/configurator/<key>.webp` 1800 px and `<key>-sm.webp`
1200 px), all of one real Pool Masters job (`034` aerial and `039` poolside of the same house, used with permission):

| View | Key | Shows |
| --- | --- | --- |
| Aerial (48) | `aerial-<resurface/pavers/porcelain>[-pebble][-spa][-yard/-kitchen/-cover]` | deck, pebble water, spa, outdoor kitchen and/or patio cover (`yard` = both) |
| Poolside (18) | `poolside-<plaster/quartz/pebble>-<classic/premium/stone>[-spa]` | finish, tile + coping (premium = glass + travertine, stone = natural stone), spa |
| Evening (12) | `evening[-led/-pebble][-fire][-spa]` | LED lights (wins over the finish at night), pebble water, fire bowls, spa |

A dimension option may need several rows at once (`allOf`, used for kitchen + cover). Each view shows the picks it can;
Baja shelf, water bowls, fire pit, turf and equipment are priced, not pictured (their rows say "Not pictured", the toast
says "priced, not pictured", and the result gallery names them). A click only switches the view when the current view
does not picture the row. Made by `scripts/generate-pool-configurator-photos.mjs` (kie.ai `nano-banana-pro` edits, one
per visible change: prompts in `STEPS`) and `scripts/pool-configurator-composite.py` (numpy + Pillow: spa, fire bowls,
yard corner, landscaped slope and stone edge pasted in; pebble/quartz water recoloured from the poolside edits;
softer LED blue), then `export`. The page labels them once: "Photos show example designs (AI-assisted, based on Pool
Masters projects), not your yard." Loading: the other views' current photos are fetched at once, the one-click
neighbours when idle and only without Save-Data or a 2G/3G connection; `sizes` gives phones and 1x desktops the 1200 px
file.

**URL.** The design is the query string (`?m=large&o=pebble,spa&lx=1`, `replaceState` on every change, decoded after
hydration); steps are hashes so Back works.

**Booking.** First and last name, mobile, email, ZIP, "do you own the home", the funnel consent wording and the optional
measurement box (pre-ticked unless the contractor is `opt_in`). The request carries `configurator` (the selection), `answers`
(`selectionToAnswers`, for logs), `submissionId` and an optional timeline; the server re-prices from the selection only
(`configuratorLeadDesign`) and stores `estimator_design`, `estimator_photos`, `estimator_design_url` and
`estimator_check_on_site` (the property questions the page never asked). Reliability: one automatic retry on a network
error or a 65 s timeout (longer than the route's 60 s `maxDuration`) with the same `submissionId`; the route answers a
retry from an in-memory replay cache keyed by slug + submissionId + a hash of the contact's email and phone, and a retry
that arrives while the first copy is still saving waits for it (per server instance). The consent check also accepts the
estimator page's own wording and stores the funnel's canonical text. After a saved lead: the thank-you (same height as
the form, so nothing jumps), then the Calendly link from `calendarUrl`, prefilled with name and email (inline on our own
page, a new tab in the iframe).

## Pool Masters simple funnel

The owner's brief: "too much going on = too many questions; it should feel straightforward and simple". Pool Masters'
config (`content/estimators/pool-masters.ts`) sets `experience: 'funnel'`, `funnel: POOL_MASTERS_FUNNEL`
(`content/estimators/pool-masters-funnel.ts`), `revealRange: 'after_contact'` and keeps `configurator` attached.
`funnelSpecFor(contractor)` (`lib/estimator/funnel/engine.ts`) picks the experience for the pages and the lead route.

**Routes.** `/estimator/pool-masters` is the landing page (announcement bar "Serving LA, OC, Ventura & the Inland
Empire", floating header card with the logo and a menu, "Backyard pools, remodeled just for you", one line, a blue
"Design your pool" button, the evening hero photo (nothing drawn over it); below the fold three
real projects and the licence). No photo carries a badge: one quiet footer line on every funnel page (and under the
embed's column) says "Photos show example designs, AI-assisted from Pool Masters projects." (`FunnelSpec.photoNote`). `/estimator/pool-masters/design?step=1|2|3|contact|book&size=..&finish=..&extras=..`
holds the steps (`noindex`; follow-up picks ride along as `&spa=..&kitchen=..&fire=..&cabana=..`). `/embed/estimator/pool-masters` starts at step 1.

**Steps.** One question per screen: "STEP n OF m", the photo (all option photos stacked and loaded, so a tap swaps it
instantly), the question, option cards, one blue button. m counts only the steps on the homeowner's path: 3 for just
the pool, 4 with a spa, 7 for the full backyard (owner, 2026-10-29: "keep it simple; these are only design options
shown if they choose it"). Follow-up steps carry `showWhen: { stepId: 'extras', anyOf }`; a hidden step has no pick
(`normalizeFunnelSelection` drops it, so changing step 3 forgets follow-ups that no longer apply), no URL param and no
price. The last step on the path says `finalCta` "Get my estimate"; the others "Continue".

| Step (id) | Options (ids) | Maps to | Photo |
| --- | --- | --- | --- |
| Select your pool size. (`size`) | Compact / Classic / Estate | configurator model small / medium / large | to-scale plan `funnel/size-*.webp` (fallback: aerial) |
| Choose your finish. (`finish`) | Standard "Plaster, standard tile, precast coping" / Luxe "Pebble, glass tile, porcelain coping and deck" | base rows + coping concrete (labelled "Precast concrete") / pebble + edge_glass_travertine + deck_porcelain + coping **porcelain** | poolside view |
| Add the extras. (`extras`) | Just the pool / Add a spa / The full backyard | none / spa / spa + outdoor_kitchen + patio_cover | aerial view |
| Choose your spa. (`spa`, extras = spa or backyard) | Flush spa `flush` / Raised spa `raised` (default) / Zero-edge spa `zero_edge` | `spaStyle` | `funnel/spa-flush`, configurator `poolside-pebble-premium-spa`, `funnel/spa-zero-edge` |
| Choose your outdoor kitchen. (`kitchen`, backyard) | Grill island `grill` / Full kitchen `full` (default) / Chef's kitchen `chef` | `kitchenStyle` | real `outdoor-kitchen-slab-counter`, `funnel/kitchen-full` (aerial crop), real `covered-outdoor-kitchen-bar` (PLACEHOLDER) |
| Choose your fire feature. (`fire`, backyard) | Fire pit `pit` / Outdoor fireplace `fireplace` / Fire bowls `bowls` (default) | row fire_pit / addAnswers extras fireplace / row fire_bowls | real `fire-pit-stone-wall-seating`, `funnel/fire-fireplace`, configurator `evening-pebble-fire-spa` |
| Choose your cabana. (`cabana`, backyard) | Pergola `pergola` / Cabana `cabana` / Covered lounge `lounge` (default) | `coverStyle` pergola / cabana / covered_lounge | real `covered-lounge-pool-dusk`, real `covered-outdoor-kitchen-bar` (PLACEHOLDER), `funnel/cabana-lounge` (aerial crop) |

**Template additions (example prices).** Optional single questions, each shown only after its base pick, so the
step-by-step builder can ask them too and the configurator (which never answers them) prices exactly as before:
`spaStyle` (after `features.spa`; flush +$0, raised +$3k–7k, zero-edge +$10k–17k; `features.spa` itself is now the
flush build at $15k–28k, and the configurator's spa row answers `spaStyle: raised`, so its spa stays $18k–35k:
flush $15k–28k < raised $18k–35k < zero-edge $25k–45k), `kitchenStyle` (after `extras.kitchen` $8k–25k: grill +$0,
full +$10k–18k, chef +$25k–40k), `coverStyle` (after `extras.patio_cover` $9k–22k: pergola +$0, cabana +$6k–12k,
covered lounge +$12k–25k), and `extras.fireplace` ($8k–20k; fire pit $2.5k–7k, fire bowls 2 × $1.8k–3.5k). The
template's concrete coping is relabelled "Precast concrete" (the catalog's separate `precast` option is gone);
porcelain coping ($60–90/ft) comes from the catalog, enabled for Pool Masters in `content/estimators/pool-masters.ts`
in place of coping "Help me choose" (the coping question allows four options). The Go Luxe bundle is unchanged (the
funnel never uses it).

Prices: `estimateFunnel` = `computeEstimate` on `funnelAnswers` (the configurator's `selectionToAnswers`, then each
pick's `answers` replace and `addAnswers` add), with **no Go Luxe discount**. Examples, medium pool, Standard: just the
pool $20,000–32,000; a spa adds $15k–28k / $18k–35k / $25k–45k by type. No equipment or site questions: those are
checked at the free on-site visit (the lead lists them).

**Recap and lead.** The price card's line uses each pick's `short` ('' leaves a pick out): "CLASSIC · LUXE · ZERO-EDGE
SPA", "ESTATE · LUXE · FLUSH SPA · CHEF'S KITCHEN · FIREPLACE · CABANA", "CLASSIC · STANDARD · POOL ONLY". The lead
summary has one plain line per step on the path ("Choose your spa: Zero-edge spa (Overflows on all four sides)"), then
the configurator lines except the groups `summaryReplacesGroups` names (tile & coping, pool features, backyard: the
steps say them exactly); one photo per step shown.

**Follow-up photos** (`public/estimator/pool-masters/funnel/`, `scripts/generate-pool-funnel-options.mjs`, prompts in
the script): kie.ai nano-banana-pro edits of this yard's configurator photos for `spa-flush`, `spa-zero-edge` and
`fire-fireplace`; `kitchen-full` and `cabana-lounge` are crops of configurator aerials (`crops`); the rest reuse a
configurator photo or a real Pool Masters job photo. **Open:** kie.ai credits ran out (2026-10-29), so Chef's kitchen and
Cabana show a real photo of this yard's pergola kitchen bar as a placeholder (no pizza oven / curtains). Top up, run
`generate kitchen-chef cabana-curtains` + `export`, and point those two options at `funnel/<key>.webp`.

**Contact step.** "Your estimate is ready. / Where should we send it?" Name, Email, Phone number, **Home address**
(Google address suggestions, see below), then "Are you the homeowner?" with two buttons "Yes" / "No"
(`contactStep.homeowner`; the lead's `homeowner` yes / no, always asked and required by the route, never
assumed), the button, the trust line, and the consent wording in small print under the button: tapping "Get my
estimate" is the agreement (the request sends `consent: true` with that exact `consentText`; the route still checks the
wording). The optional ad-measurement box is pre-ticked unless the contractor is `opt_in`. One error at a time; Return moves to the next field.

**Address autocomplete.** `components/estimator/funnel/contact/address-field.tsx` (ARIA combobox + listbox; 200 ms
debounce, 3+ characters, white list with 1px #d0d0d0 border, 8px radius, 48px rows, arrows / Return / Escape, closes on
blur, overlays the page, scrolls the field to the top on touch devices; `autocomplete="street-address"`). It calls
`POST /api/estimator/[slug]/address/autocomplete` and `/address/details` (`lib/estimator/address.ts`), server proxies for
Google Places API (New) with `GOOGLE_PLACES_API_KEY` (never sent to the browser): US street addresses biased to a 50 km
circle around downtown LA, session token passed through, details with the Essentials field mask
`formattedAddress,addressComponents,location` -> `{address, zip, city, state, lat, lng}`. Same-origin check, registered
slug only, input caps, an in-memory per-IP limit (90 suggestions / 30 picks per 5 min per instance), 3-4 s timeouts,
nothing logged. Without the key the autocomplete route answers `{ok:false, reason:'disabled'}` and the field is a plain
input. ZIP: the picked place's (while the text is unchanged), else a 5-digit ZIP typed at the end of the address or
after a state code (`extractZip`); none -> "Add your ZIP code to the address". The ZIP still gates the service area
and is validated by the lead route.

**Non-owners.** "No" fails the funnel's `homeowner = yes` rule: the lead is saved for review
(`unqualifiedAction: 'review'`), no booking link; the last screen says "Your ballpark estimate" and "Your project needs
a personal review" (no promised call). With `unqualifiedAction: 'stop'` it says the details were not saved and to call.

**Booking step.** "Book your free on-site estimate", a price card (picks on one line, the server's range, "Ballpark
price, not a quote…", "Example prices, not yet confirmed." while unconfirmed, "Financing available · See details" with
the lender disclosure), then the Calendly scheduler inline (a button in the embed) and "Prefer to talk now? Call". The
result is stored with the picks it was priced for: change a pick and the booking step closes until the contact step is
sent again; the contact step says "You've already sent this design" while the picks are unchanged.

**State.** The URL holds the screen and the picks (Continue pushes history, browser Back works); sessionStorage keeps the
picks, the typed details and the lead result through a refresh.

**Lead.** The request carries `funnel` (step id → option id); the server re-prices from it alone (`funnelLeadDesign`)
and stores the picks in words, one photo per step, a link back to the design and the mapped configurator selection.
The request also carries `address` (+ `addressDetails` {city, state, lat, lng, verified} from a picked place): the lead
gets `estimator_address` / `estimator_address_map` answers, "Home address: …" and "Homeowner: …" lines on its timeline,
`estimator.address` in the metadata, a funnel Address question (if the funnel has one) and `leads.address` / `city` /
`state` filled where still empty.

**Reuse.** `FunnelSpec` (`lib/estimator/funnel/types.ts`) is plain data: landing copy, steps, options mapped to
configurator models/rows or to template answers, photo rules per option or per configurator view. A bathroom or
kitchen funnel needs a spec and photos, no new components.

## Open items

- **Agree-on-submit consent.** The funnel's consent is "by tapping the button" instead of a checkbox (the wording and the
  server check are unchanged). Get legal sign-off for the TCPA wording used this way.
- **Google attribution.** The suggestion list shows a text "Powered by Google" line; check it against Google's current
  attribution rules (they may want the logo).

- **Pool Masters calendar.** `calendarUrl` is `https://calendly.com/homequotenetwork/30min` (HomeQuote's account). Swap
  in a Pool Masters calendar when they have one.
- **Configurator photo size.** The pool's size is shown by the size cards and the to-scale plan on the photo, not in the
  photos (one example pool). Deck, kitchen and cover show only from above; the stone edge and glass tile only poolside.

- **Real prices.** All prices are examples until the owner fills in the price sheet.
- **Site access for the embed.** Someone with access to poolmastersla.com has to paste the iframe; auto-height is not built.
- **Service area (resolved 2026-10-27).** The Pool Masters funnel's qualification gate now matches the brochure: Los
  Angeles, Orange, Ventura, Riverside and San Bernardino counties (ZIP prefixes 900–918, 922–928, 930, 935). Prefixes are
  coarse: 922 also covers Imperial County and 935 parts of Kern County, so a few out-of-area ZIPs still qualify.
- **Sitemap and linking** once prices are confirmed.
- **Duplicate timeline rows.** A replayed submission that `save_funnel_session` dedupes onto an existing lead still adds a
  second estimator timeline entry.
- **`unqualifiedAction: 'stop'` copy.** For such a funnel nothing is saved, but the builder's result still says the team
  will reach out (the simple funnel reads the route's `saved: false` and says "call us"). Dormant: Pool Masters uses
  `review`.
- **Photoreal render follow-ups.** Confirm the kie.ai upload host with one real call on a staging key before setting
  `KIE_API_KEY` in production. The stored `image_url` is kie.ai's temporary link (about 14 days): copy finished renders to
  Supabase Storage if they should last. A render abandoned mid-way stays `running` on the lead. The daily-cap count has no
  supporting index (needs a migration: partial index on `lead_activities (created_at)` where
  `metadata->>'kind' = 'estimator_render'`). Renders are staff-only on the timeline; decide whether contractors should see them.
