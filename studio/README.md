# Seret by HomeQuote Network

"Seret" is Hebrew for film (סרט). Formerly MOTC.

AI image, video, cinema and lip sync studio. A static single-page app (Vite + vanilla JS + Tailwind) that calls kie.ai directly from the browser.

## Develop

```bash
npm install
cp .env.example .env.development.local   # optional: add VITE_KIE_KEY for local testing
npm run dev
```

## Build

```bash
npm run build      # outputs ../public/studio/
```

## How it is part of the HomeQuote site

This folder lives inside the HomeQuote Network repo. The site's `npm run build` runs `npm run build:studio` first, which installs this folder's dependencies and builds it into `public/studio/` (gitignored, rebuilt on every deploy). The site serves it at `/studio` to signed-in admins only (enforced in the site's middleware). Admins open it from the portal menu (Growth > Seret), which opens it in a new tab.

`vite.config.mjs` uses `base: '/studio/'`, so asset paths are absolute under `/studio/`. Files in `public/` here (e.g. `assets/cinema/*.webp`) must be referenced with `import.meta.env.BASE_URL` in front.

## Sample images and videos

Explore, the Models gallery and model pages show samples from `src/lib/samples.js`. Generate them once with your own kie.ai key:

```bash
KIE_API_KEY=xxxx node studio/scripts/generate-samples.mjs            # shows the plan and estimated cost, asks before spending
KIE_API_KEY=xxxx node studio/scripts/generate-samples.mjs --images-only
```

Files are saved in `public/samples/`. Re-running only generates what's missing. Commit `public/samples/` and `src/lib/samples.js` afterwards.

## API key — important

- In production the app asks each user for their own kie.ai key (stored in that browser's localStorage, sent only to kie.ai). This is the safe default for a public site.
- `VITE_KIE_KEY` is for local dev only. Anything in a built bundle is public: if you ship a build with the owner's key inside, anyone can read it and spend the owner's credits.
- To use one shared key on a public site, add a small server-side proxy that attaches the key (kie.ai base URL is set in `src/lib/kie.js`, `KIE_BASE`) and don't expose the key to the browser.
- Credits pill: 1 credit ≈ $0.005 (`VITE_CREDIT_USD` to change). Confirm against kie.ai billing.

## Layout

- `src/main.js`: entry; renders the page for the current hash route (`src/lib/router.js`).
- `src/components/Shell.js`: left rail, phone bottom bar, credits pill.
- `src/components/`:
  - Explore, Models, ModelDetail and Projects pages
  - the Image, Video, LipSync and Cinema studios
  - `media.js`: placeholders, viewer and masonry.
- `src/lib/kie.js`: the kie.ai client. `src/lib/catalog.js`: model id → kie.ai mapping.
- `src/lib/models.js`: generated model definitions. Specs come from here via `src/lib/specs.js`.
- `src/lib/modelInfo.js`: hand-written maker, tagline and "best for", plus prices only where kie.ai shows them.
- `src/lib/presets.js` and `src/lib/samples.js`: Explore presets and the generated samples manifest.

Note: many model ids in `models.js` have no kie.ai equivalent; the Models page marks those unavailable.
