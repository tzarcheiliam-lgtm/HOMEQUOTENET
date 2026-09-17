# Marketing Site — HomeQuote Network

The public, prospect-facing site that sells the pay-per-qualified-lead offer to
contractors. Separate from the `/app` CRM in every way that matters: its own
route group, its own theme, its own content layer.

---

## Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `app/(marketing)/page.tsx` | Full homepage — all twelve sections |
| `/pool-contractors` | `app/(marketing)/pool-contractors/page.tsx` | Cold-call follow-up landing page, form embedded |
| `/lead-standards` | `app/(marketing)/lead-standards/page.tsx` | The valid-lead standard in full |
| `/apply` | `app/(marketing)/apply/page.tsx` | Contractor application (`?track=managed` preselects the managed option) |
| `/privacy`, `/terms` | `app/(marketing)/{privacy,terms}/page.tsx` | Legal templates — **need counsel review** |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.ts`, `app/robots.ts` | Marketing routes only; `/app`, `/api`, auth pages excluded |

`/` previously redirected to `/sign-in`. That redirect is gone — the CRM is
reached from "Partner login" in the header and footer.

---

## Theming

All marketing pages render inside `<div class="hq">` (set in
`app/(marketing)/layout.tsx`). Every dark-theme token in
`app/(marketing)/marketing.css` is scoped under `.hq`, so the CRM keeps the
light shadcn tokens from `globals.css` untouched.

Tokens: `--hq-bg`, `--hq-surface`, `--hq-line`, `--hq-text`, `--hq-text-muted`,
`--hq-accent` and friends. Helper classes: `.hq-card`, `.hq-glow`, `.hq-grid`,
`.hq-rule`, `.hq-glass`, `.hq-rise`.

Reduced motion is respected globally for the whole `.hq` subtree.

---

## Content model

Copy lives in `content/`, not in components — so a new niche is a data file, not
a rewrite.

```
content/
  site.ts            Brand, nav, footer, CTAs, standing disclaimers
  types.ts           The Niche type every vertical satisfies
  lead-standards.ts  Valid-lead criteria, what is not promised, dispute process
  niches/
    pool.ts          Pool remodeling — hero, problems, process, services, FAQ…
```

### Adding a niche (fencing, roofing, ADUs, kitchens, baths, outdoor living)

1. Create `content/niches/<niche>.ts` exporting a `Niche`.
2. Add any new icon names to `IconName` in `content/types.ts` and register the
   Lucide component in `components/marketing/icon.tsx`.
3. Create `app/(marketing)/<niche>-contractors/page.tsx` — copy
   `pool-contractors/page.tsx` and swap the imported niche.
4. Add the route to `app/sitemap.ts`.

No component changes are required. Every section component takes `niche` as a
prop.

---

## The contractor application

```
components/marketing/application-form.tsx   Client form, useActionState
lib/validation/application.ts               Zod schema + option lists
lib/actions/applications.ts                 Server action
lib/applications/state.ts                   Form state (must NOT live in the action file)
lib/applications/spam.ts                    Honeypot + fill-time checks (pure, tested)
lib/applications/deliver.ts                 Webhook + Supabase delivery
supabase/migrations/0006_contractor_applications.sql
```

> **Gotcha:** a `'use server'` module may only export async functions. The
> initial form state therefore lives in `lib/applications/state.ts`. Moving it
> back into the action file makes it arrive as `undefined` on the client and the
> form crashes during prerender.

### Delivery

Submissions go to every configured sink, in parallel:

| Env var | Sink |
|---|---|
| `CONTRACTOR_APPLICATION_WEBHOOK_URL` | POST JSON — GoHighLevel, Zapier, Make, n8n, or your own endpoint |
| `CONTRACTOR_APPLICATION_WEBHOOK_SECRET` | Optional; sent as `X-HomeQuote-Secret` |
| `SUPABASE_SERVICE_ROLE_KEY` (already set) | Insert into `contractor_applications` |
| `CONTRACTOR_APPLICATIONS_TABLE` | Override the table name |

Behaviour:

- **At least one sink succeeds** → applicant sees the success panel.
- **Some succeed, some fail** → success, failure logged as a warning.
- **All configured sinks fail** → applicant is shown a fallback message, and the
  full payload is written to the server log marked
  `[contractor-application] DELIVERY FAILED` so it can be recovered.
- **Nothing configured at all** → log-only mode; the payload is logged with
  `[contractor-application] NO DELIVERY SINK CONFIGURED`.

The webhook payload includes `primary_services` as an array *and*
`primary_services_text` as a comma-joined string, for CRMs that cannot read
arrays.

### Spam protection

- **Honeypot** — a hidden `company_url` field. If filled, the submission is
  discarded and a generic success is returned so a bot learns nothing.
- **Fill time** — submissions faster than `MIN_FILL_SECONDS` (3s) are discarded
  the same way. A missing, zero, or unparseable timestamp is *never* treated as
  spam, so a real applicant is never rejected because JavaScript failed.

Both are pure functions in `lib/applications/spam.ts` and covered by tests.

---

## Proof-asset placeholders

`components/marketing/proof-placeholder.tsx` renders dashed slots marking where
real CRM screenshots, campaign screenshots, lead forms, calendars, testimonials,
and project photos belong.

- Visible in development, hidden in production.
- `NEXT_PUBLIC_SHOW_PROOF_PLACEHOLDERS=true` / `=false` forces either way.

Replace a `<ProofSlot>` with the real asset and delete the slot. See
[`sales-assets/08_PROOF_ASSET_CHECKLIST.md`](sales-assets/08_PROOF_ASSET_CHECKLIST.md).

---

## Compliance rules baked into the copy

The site deliberately contains **no** invented testimonials, client logos,
awards, counters, revenue figures, or case studies, and makes no performance
promise. `content/site.ts` exports the standing disclaimers used across pages:

- `disclaimers.noGuarantee` — no guaranteed estimates, appointments, sales,
  revenue, or profitability.
- `disclaimers.agreementGoverns` — the partner agreement defines final terms.
- `disclaimers.pricing` — pricing depends on inputs and is confirmed before
  launch; no fixed public price per lead.
- `disclaimers.systemPreview` — the system preview is an example workflow.

Keep these rules when editing copy. The equivalent rules for sales material are
in [`sales-assets/README.md`](sales-assets/README.md).

---

## Social sharing image

`app/(marketing)/opengraph-image.tsx` generates the 1200x630 OG image with
`next/og` — code, not a binary asset, so the copy and brand colours stay in
version control. Edit that one file to change it.

`/pool-contractors`, `/lead-standards` and `/apply` each hold a one-line
re-export of it. That is required, not redundant: those pages declare their own
`openGraph` metadata block, which replaces the parent layout's object wholesale
and drops the inherited image. A file-based image in the route's own segment is
applied regardless. `/privacy` and `/terms` declare no `openGraph` block, so
they inherit normally and need no re-export.

It renders through Satori, which supports only a subset of CSS: every container
needs an explicit `display: flex` and CSS custom properties are unavailable, so
the brand colours are repeated as literals in that file.

## Brand

The palette is sampled from the real logo (`LOGOFORHOMEQUOTE.png`), not invented:

| Token | Value | From the logo | Role |
|---|---|---|---|
| `--hq-navy` | `#042247` | roofline mark, "HOME" / "NETWORK" | branded surfaces, photo scrims |
| `--hq-slate` | `#656a74` | "QUOTE", tagline | borders, dividers |
| `--hq-accent` | `#196dcc` | navy hue (212°) lifted | CTA fill — 5.13:1 with white |
| `--hq-accent-bright` | `#55a0f6` | same hue, lighter | links, eyebrows — 7.35:1 on `--hq-bg` |
| `--hq-text-dim` | `#767e8c` | slate, lifted | muted text — 4.9:1, AA |

The logo navy is deliberately **not** the interactive colour. At `#042247` on a
near-black page a filled button reads as an empty box, so the accent is the same
hue raised until white text clears AA on it. The navy keeps its own job: the
scrim over every photograph, which is what makes imagery from different shoots
look like one brand.

### Logo assets

The source is a circular badge on an **opaque black square** — there is no alpha
channel. The committed copies are clipped to the badge's own circle with
transparency added, so the logo sits on the dark background without a visible
plate behind it. Nothing is recoloured, redrawn, upscaled or stretched; the
aspect ratio stays 1:1 and the artwork inside the circle is untouched. The
source file is treated as read-only and is never modified.

To regenerate these, downscale the source to the sizes below and clip to a
centred circle of the full width, exporting with an alpha channel.

| Output | Size | Use |
|---|---|---|
| `public/images/brand/homequote-network-logo.webp` | 512² | header, footer |
| `public/images/brand/homequote-network-logo.png` | 512² | OG image (Satori has no WebP decoder) |
| `app/icon.png` | 256² | browser tab |

The lockup pairs the badge with the business name in **live text** (`Wordmark`).
Two reasons: the badge's own tagline is unreadable below ~150px, and a text
wordmark keeps the name in the document for search and screen readers. The image
is therefore `alt=""` and `aria-hidden` — the adjacent text already names the brand.

## Photography

Sources live outside the repo and are treated as strictly read-only: they are
read, never renamed, moved, overwritten or re-compressed in place. The committed
files in `public/images/pools/` are WebP copies re-encoded at quality 0.78.

Each image is sized to the widest it is ever rendered, not to a single blanket
maximum — only the two heroes keep 1920px, and the mosaic frames are capped near
1100px because they never render wider than about 620px. Metadata (path,
intrinsic dimensions, factual alt text) lives in `content/photos.ts` so pages
never hardcode a path. If you replace an image, update its `width`/`height`
there too or it will shift the layout while loading.

**Positioning — non-negotiable.** HomeQuote Network is a lead-generation company
and did not build or remodel any pool shown. `imageryDisclosure` from
`content/photos.ts` appears under the first photograph on both photo-led pages.
Never add project claims, locations, client attribution or performance figures
near this imagery, and never remove a watermark from a source photo.

Alt text describes only what is visible in frame.

### Rendering rules

`components/marketing/photo.tsx` wraps `next/image` so three things stay
consistent: the navy scrim, an explicit `aspect-ratio` (no layout shift), and a
**required** `sizes` prop so a phone never downloads a desktop-width file. Only
the two heroes set `priority`; everything else is lazy.

Scrim variants in `marketing.css`: `.hq-scrim-hero` (heavy, falloff holds to 72%
because the copy column runs that far), `.hq-scrim-soft` (tint only),
`.hq-scrim-band` (closing CTA). The mobile hero scrim is a separate, stronger
gradient — on a phone the copy covers most of the frame.

> **Blind spot to know about:** automated contrast checking resolves the nearest
> opaque background colour, so it cannot measure text sitting over a photograph.
> Any text placed on an image has to be checked by eye. That is why the hero's
> supporting copy uses `--hq-text-muted` rather than `--hq-text-dim` — the dim
> tone passes against the flat background and fails against the photo.

## Accessibility and responsive baseline

The site was built and verified against these, and they should hold for any
future change:

- Every text colour meets WCAG AA contrast (4.5:1 normal, 3:1 large) against
  its background. The tokens in `marketing.css` carry their measured ratios in
  a comment — do not darken `--hq-text-dim` or `--hq-accent` without
  re-checking, since `--hq-accent` is a fill carrying white text.
- No horizontal overflow at 375 / 768 / 1440.
- No text below ~12px.
- Interactive controls are at least 32px tall, except links rendered inline
  inside a sentence, which WCAG 2.5.8 exempts.
- The mobile sheet unmounts the header toggle while open, so only one control
  carries `aria-label="Close menu"` and focus moves into the sheet.
- Anchored sections clear the sticky header via `scroll-margin-top`.
- `prefers-reduced-motion` is respected across the whole `.hq` subtree.

## Testing

```bash
npm run test     # 52 tests — includes the application schema and spam screening
npm run build    # must pass with no warnings
```

`tests/application.test.ts` covers schema validation, website normalization,
null-field handling (so Zod's raw enum errors never reach a user), and both spam
checks.
