# Instant pool estimator

A homeowner on Pool Masters LA's site (or an iframe embed of it) answers a short flow, sees a **ballpark price range**
with a line-by-line breakdown, and books a free on-site consultation. Leads go into the existing Pool Masters homeowner
funnel pipeline. Everything is data-driven so the same template can later be self-serve for other pool contractors:
Pool Masters specifics live in one config file.

Always labeled "ballpark, not a quote". No AI pricing. No monthly payment amounts anywhere (lending disclosure rules).

## Homeowner flow

Under about two minutes. One screen at a time (order and rules in `components/estimator/use-estimator-flow.ts`):

1. Project (remodel, or pool + backyard), pool shape, pool size (or typed dimensions)
2. Package (Refresh / Signature / Transformation) or "Build my own"; custom builds pick "what to include", then the
   detail questions (surface, tile + coping, deck, features, equipment, backyard extras)
3. Property questions (cracks, access, hillside): "Yes" or "Not sure" flags the estimate for a site visit
4. "Which look do you like?" photos (not priced), then ZIP, homeowner, timeline and contact
5. The range appears after the contact step (`revealRange: 'after_contact'`), with the breakdown, the financing note and
   disclosure (plain text, no payment amounts) and a booking button

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

With `revealRange: 'after_contact'` (Pool Masters) the pages pass `publicTemplate(...)` to the browser: every option price
and the minimum job/rounding are stripped, so the range cannot be read from the page source before the contact step.

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
- **Advertising measurement.** An "Allow optional advertising measurement" checkbox (checked by default for Pool Masters,
  mirroring the funnel's `opt_out` mode). Only when it is on are Meta browser ids sent and the server Lead event fired.
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

## Open items

- **Real prices.** All prices are examples until the owner fills in the price sheet.
- **Site access for the embed.** Someone with access to poolmastersla.com has to paste the iframe; auto-height is not built.
- **Service area (resolved 2026-10-27).** The Pool Masters funnel's qualification gate now matches the brochure: Los
  Angeles, Orange, Ventura, Riverside and San Bernardino counties (ZIP prefixes 900–918, 922–928, 930, 935). Prefixes are
  coarse: 922 also covers Imperial County and 935 parts of Kern County, so a few out-of-area ZIPs still qualify.
- **Sitemap and linking** once prices are confirmed.
- **Duplicate timeline rows.** A replayed submission that `save_funnel_session` dedupes onto an existing lead still adds a
  second estimator timeline entry.
- **`unqualifiedAction: 'stop'` copy.** For such a funnel nothing is saved, but the result still says the team will reach
  out. Dormant: Pool Masters uses `review`.
- **Photoreal render follow-ups.** Confirm the kie.ai upload host with one real call on a staging key before setting
  `KIE_API_KEY` in production. The stored `image_url` is kie.ai's temporary link (about 14 days): copy finished renders to
  Supabase Storage if they should last. A render abandoned mid-way stays `running` on the lead. The daily-cap count has no
  supporting index (needs a migration: partial index on `lead_activities (created_at)` where
  `metadata->>'kind' = 'estimator_render'`). Renders are staff-only on the timeline; decide whether contractors should see them.
