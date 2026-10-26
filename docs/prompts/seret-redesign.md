# Prompt: full redesign of the Seret studio

Paste everything below the line into a new Claude Code session on the HOMEQUOTENET repo.

---

## Goal

Redesign **Seret** (HomeQuote Network's AI image / video / lip-sync studio, served at `/studio`) so it feels like its own premium AI creative platform in the spirit of Higgsfield: **media-first**, every screen full of real images and video, and every model easy to understand at a glance. It must be clearly **Seret's own product**. Borrow layout ideas (explore feed, model gallery, model detail pages, preset tiles), but do **not** copy Higgsfield's name, logo, copy, icons, images or exact layouts.

Read `HOMEQUOTE_CONTEXT.md` §31 and `studio/README.md` before starting.

## What exists today (do not break)

- `studio/` is a separate **Vite + vanilla JS + Tailwind 4** app (no React). Its build lands in `public/studio/` and is served at `/studio`. It is **admin-only** (gated in `lib/supabase/middleware.ts`) and opened from the portal menu (Growth > Seret, new tab).
- **Pages:** Image, Models, Video, Lip Sync, Cinema Studio and Projects, routed by `src/main.js` with no URLs. Each studio is one large component in `src/components/`.
- **Models:** `src/lib/models.js` (generated, about 260 KB) holds 51 text-to-image, 42 text-to-video, 57 image-to-image, 61 image-to-video, 1 video-to-video and 9 lip-sync models. Each has an `id`, a `name` and `inputs`: aspect ratios, resolutions, durations, quality and max images, read through the `getXForModel` helpers, sometimes with `description` and `examples` prompts. `src/lib/catalog.js` maps each model to what kie.ai actually runs (`runsAs`). Only **31 of 93** image/video models run on kie.ai; the rest are marked unavailable.
- **kie.ai calls:** made from the browser with each user's own key (`src/lib/kie.js`).
- **Browser storage (keep these keys working):**
  - `kie_key`
  - `kie_pending_jobs`
  - the four history lists: `kie_history`, `video_history`, `lipsync_history`, `cinema_history`
  - each user's preferred model: `motc_model_image` and `motc_model_video`
- **Brand:**
  - Colors: HomeQuote dark. Navy surfaces `#06132e` / `#0a1b3d`, blue `#2f6bff` (hover `#0038b8`), gold `#f5b700` used sparingly.
  - Fonts: Sora headings, DM Sans body.
  - Logo: `public/brand/seret-icon.svg`.
  - Tokens live in `studio/src/styles/global.css` (`@theme`).
- **Tests to keep passing:** `tests/seret-studio.test.ts` and `tests/studio-access.test.ts`.

## What to build

### 1. App shell and real URLs
- **Hash routes** so links, refresh and the back button work: `#/`, `#/models`, `#/models/<id>`, `#/image`, `#/video`, `#/lipsync`, `#/cinema`, `#/projects`.
- **Menu:** a persistent left icon rail on desktop and a bottom bar on mobile, with the Seret logo, the pages, and the kie.ai credits pill.
- **Default page:** the new **Explore** home.

### 2. Explore (new home)
- **Hero:** a big prompt bar ("What do you want to make?") with an Image / Video switch. Submitting opens the matching studio with the prompt filled in.
- **Contractor presets:** a row of tiles, each with a cover image, that fill in a prompt, model and settings. For example: kitchen remodel reveal, bathroom before/after, drone flyover of a backyard pool, roof replacement, ADU walkthrough, contractor talking-head intro (Lip Sync).
- **Feed:** a masonry feed of curated sample outputs (see *Photos* below) mixed with the user's own recent creations.
  - Videos play muted on hover (tap on mobile).
  - Clicking an item opens a viewer showing its prompt, model and settings, with **"Recreate"**, which loads all of them into the right studio.

### 3. Models gallery
- **Cards:** one per model, each with:
  - cover media, the name and the maker (Google, ByteDance, Kuaishou, OpenAI, xAI, Alibaba…)
  - type: Text→Image, Text→Video, Image→Video, Edit, Lip Sync
  - capability chips taken from its inputs, such as "up to 10s", "1080p", "16:9 · 9:16 · 1:1", "up to 4 reference images"
  - a price hint and a **Use model** button.
- **Filters:** by type and capability, plus search and sorting (newest / fastest / cheapest where known).
- **Unavailable models:** hidden by default, behind "Show models not on kie.ai".

### 4. Model detail (`#/models/<id>`)
- **Media:** a large sample gallery for that model.
- **Text:** a one-line tagline, a short description, and "Best for" (written for home-service ads).
- **Specs table** generated from `inputs`: aspect ratios, resolutions, durations, quality options and max reference images.
- **Example prompts:** click one to try it.
- **Kie.ai details:** what kie.ai runs it as, and approximate cost.
- **Actions:** **Open in Image/Video Studio with this model** (this also sets the user's preferred model).

### 5. Studios (Image, Video, Lip Sync, Cinema)
- Keep every feature and the way they call kie.ai. Restyle them into the shared shell:
  - a big result canvas
  - a slim settings bar
  - a right-hand rail of recent results
  - skeleton states while generating.
- Pick up `?model=` and a prompt from the route so Explore, presets and model pages can deep-link in.

### 6. Projects
- Keep the *In progress* / *Done* split and the 10-second status checks.
- Show *Done* as a masonry gallery with the same viewer and **Recreate** as Explore.

## Model details: where the data comes from
- **Specs:** only from `inputs` via the existing helpers. Never invent specs.
- **Curated text:** maker, tagline, description, "best for" and price go in a new hand-written file, `studio/src/lib/modelInfo.js`, keyed by model id.
  - Fill it **only for the 31 available models**.
  - Check every price and capability against kie.ai's own model and pricing pages, and give each entry a `source` URL.
  - Anything not confirmed: leave it empty and show nothing. Never guess.
  - Show prices as "≈ $X per image / per 5s" using `VITE_CREDIT_USD`, and label them approximate.

## Photos: where they come from
- **Never** hotlink or copy images from Higgsfield, kie.ai marketing pages, or anywhere else without a license.
- **Real samples:** add `studio/scripts/generate-samples.mjs`.
  - It reads a kie.ai key from an env var, generates one or two samples per available model and per preset from a fixed list of home-service prompts, and saves them under `studio/public/samples/`.
  - It writes `studio/src/lib/samples.js`, a manifest of model id → `[{ url, prompt, settings }]`.
  - It prints the estimated credit cost and asks before spending.
  - The owner runs it once; never run it automatically during a build.
- **Until samples exist:** show branded placeholders (navy gradient, model initials, type icon), so the layout never looks broken.
- **The user's own history** fills the Explore feed and the "Your creations" rows.
- **Video samples:** generate a poster frame for each one and lazy-load everything.

## Look and feel
- **Media:** edge-to-edge, `rounded-2xl` cards, a slight lift and border glow on hover.
- **Text over media:** generous spacing and readable contrast on top of images; use a gradient scrim under text.
- **Gold:** only for highlights (active nav, "New" badges, the logo window).
- **Motion:** restrained. Fades and slides of about 200 ms, video previews on hover, and nothing that moves without a reason.
- **Mobile:** must work at 390px wide. One-column feed, bottom nav, prompt bar pinned to the bottom.

## Rules
- No new runtime dependencies unless clearly needed (vanilla JS stays). Keep the initial bundle lean and lazy-load page modules.
- Don't change access control, the build script (`build:studio` in the root `package.json`), how kie.ai keys are stored, or the localStorage key names.
- Escape every user-supplied or model-supplied string put into HTML.

## How to work
1. **Plan:** before writing code, read the studio components and post a short plan (routes, new files, what moves where) for approval.
2. **Phases:** build in phases, committing each one:
   1. shell and routing
   2. Explore
   3. Models and model detail
   4. studio restyles
   5. Projects masonry
   6. the samples script and manifest
3. **After each phase:**
   - run `npm run build:studio`
   - screenshot every page in Chromium at 1440px and 390px wide
   - confirm there are no console errors or failed requests
   - run the full test suite.
4. **Finish:** update `HOMEQUOTE_CONTEXT.md` §31 and `studio/README.md`, open one pull request, and list what wasn't verified against live kie.ai.

## Decisions for the owner (ask before phase 2)
- Run the sample generator with your kie.ai key? Give the estimated credit cost first.
- Should Explore be the default page, or keep Image Studio as the default?
- Which contractor presets matter most (pools, remodels, roofing, ADUs, HVAC…)?
